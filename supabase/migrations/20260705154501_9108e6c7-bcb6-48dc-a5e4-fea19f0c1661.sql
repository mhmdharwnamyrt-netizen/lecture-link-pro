
-- 1) Extend trainings table
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS application_mode text NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS max_applicants int,
  ADD COLUMN IF NOT EXISTS applications_count int NOT NULL DEFAULT 0;

ALTER TABLE public.trainings ALTER COLUMN apply_url DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.trainings ADD CONSTRAINT trainings_mode_check
    CHECK (application_mode IN ('external','internal'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.trainings ADD CONSTRAINT trainings_apply_url_required
    CHECK (application_mode = 'internal' OR (apply_url IS NOT NULL AND length(apply_url) > 0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Replace RLS policies to allow any authenticated user to create trainings
DROP POLICY IF EXISTS "trainings_admin_insert" ON public.trainings;
DROP POLICY IF EXISTS "trainings_admin_update" ON public.trainings;
DROP POLICY IF EXISTS "trainings_admin_delete" ON public.trainings;

CREATE POLICY "trainings_insert_authenticated" ON public.trainings
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "trainings_update_owner_or_admin" ON public.trainings
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "trainings_delete_owner_or_admin" ON public.trainings
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) training_form_fields
CREATE TABLE IF NOT EXISTS public.training_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  label_ar text,
  field_type text NOT NULL CHECK (field_type IN ('short_text','long_text','number','email','phone','select','checkbox','file')),
  required boolean NOT NULL DEFAULT false,
  options jsonb,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(training_id, field_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_form_fields TO authenticated;
GRANT ALL ON public.training_form_fields TO service_role;

ALTER TABLE public.training_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tff_select_all_auth" ON public.training_form_fields
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tff_owner_write" ON public.training_form_fields
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id
                 AND (t.created_by = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id
                 AND (t.created_by = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))));

CREATE INDEX IF NOT EXISTS idx_tff_training ON public.training_form_fields(training_id, order_index);

-- 4) training_applications
CREATE TABLE IF NOT EXISTS public.training_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(training_id, applicant_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_applications TO authenticated;
GRANT ALL ON public.training_applications TO service_role;

ALTER TABLE public.training_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ta_select_own_or_owner" ON public.training_applications
  FOR SELECT TO authenticated USING (
    applicant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id
               AND (t.created_by = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role)))
  );

CREATE POLICY "ta_insert_self" ON public.training_applications
  FOR INSERT TO authenticated WITH CHECK (
    applicant_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND t.is_active = true)
  );

CREATE POLICY "ta_update_owner_admin" ON public.training_applications
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id
            AND (t.created_by = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role)))
  ) WITH CHECK (true);

CREATE POLICY "ta_delete_self_or_owner" ON public.training_applications
  FOR DELETE TO authenticated USING (
    applicant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id
               AND (t.created_by = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role)))
  );

CREATE INDEX IF NOT EXISTS idx_ta_training ON public.training_applications(training_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ta_applicant ON public.training_applications(applicant_id);

CREATE TRIGGER training_applications_touch
  BEFORE UPDATE ON public.training_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Trigger: bump count + auto-close + notify creator
CREATE OR REPLACE FUNCTION public.training_applications_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_count int;
  cap int;
  owner uuid;
  training_title text;
  applicant_name text;
BEGIN
  UPDATE public.trainings
    SET applications_count = applications_count + 1
    WHERE id = NEW.training_id
    RETURNING applications_count, max_applicants, created_by, title
    INTO new_count, cap, owner, training_title;

  IF cap IS NOT NULL AND new_count >= cap THEN
    UPDATE public.trainings SET is_active = false WHERE id = NEW.training_id;
  END IF;

  IF owner IS NOT NULL AND owner <> NEW.applicant_id THEN
    SELECT full_name INTO applicant_name FROM public.profiles WHERE user_id = NEW.applicant_id;
    INSERT INTO public.notifications(user_id, title, message, type, related_id)
    VALUES (owner, 'تقديم جديد على تدريبك',
            COALESCE(applicant_name,'مستخدم') || ' قدّم على "' || COALESCE(training_title,'') || '"',
            'system', NEW.training_id);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_training_apps_bump ON public.training_applications;
CREATE TRIGGER trg_training_apps_bump
  AFTER INSERT ON public.training_applications
  FOR EACH ROW EXECUTE FUNCTION public.training_applications_after_insert();

CREATE OR REPLACE FUNCTION public.training_applications_after_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.trainings
    SET applications_count = GREATEST(applications_count - 1, 0)
    WHERE id = OLD.training_id;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_training_apps_unbump ON public.training_applications;
CREATE TRIGGER trg_training_apps_unbump
  AFTER DELETE ON public.training_applications
  FOR EACH ROW EXECUTE FUNCTION public.training_applications_after_delete();
