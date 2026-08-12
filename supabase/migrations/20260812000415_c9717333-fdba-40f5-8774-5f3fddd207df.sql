-- ============ STUDY GROUPS ============
CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  level int NOT NULL,
  name text NOT NULL,
  name_ar text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, level)
);

GRANT SELECT ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

-- membership resolver (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid, _uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE g RECORD; p RECORD;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  SELECT * INTO g FROM public.study_groups WHERE id = _group;
  IF NOT FOUND OR NOT g.is_active THEN RETURN false; END IF;

  IF private.has_role(_uid, 'admin'::public.app_role) THEN RETURN true; END IF;

  SELECT id, role, is_ta, department_id, level INTO p FROM public.profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN false; END IF;

  IF p.role = 'doctor' OR p.is_ta = true THEN
    RETURN EXISTS (
      SELECT 1 FROM public.doctor_departments d
      WHERE d.doctor_id = p.id AND d.department_id = g.department_id AND d.level = g.level
    );
  END IF;

  RETURN p.department_id = g.department_id AND p.level = g.level;
END $$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

CREATE POLICY "groups_select_member" ON public.study_groups
  FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()));

-- ============ MESSAGES ============
CREATE TABLE public.study_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  media_type text,
  media_path text,
  media_mime text,
  media_name text,
  media_size bigint,
  duration_seconds numeric,
  reply_to_id uuid REFERENCES public.study_group_messages(id) ON DELETE SET NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  likes_count int NOT NULL DEFAULT 0,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sgm_group_created ON public.study_group_messages(group_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_messages TO authenticated;
GRANT ALL ON public.study_group_messages TO service_role;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sgm_select_member" ON public.study_group_messages
  FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "sgm_insert_member" ON public.study_group_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "sgm_update_own" ON public.study_group_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "sgm_delete_own_or_admin" ON public.study_group_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.sgm_touch_edited()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content AND NEW.is_deleted = false THEN
    NEW.edited_at := now();
  END IF;
  NEW.group_id := OLD.group_id;
  NEW.sender_id := OLD.sender_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sgm_touch_edited BEFORE UPDATE ON public.study_group_messages
  FOR EACH ROW EXECUTE FUNCTION public.sgm_touch_edited();

-- ============ REACTIONS ============
CREATE TABLE public.study_group_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.study_group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.study_group_reactions TO authenticated;
GRANT ALL ON public.study_group_reactions TO service_role;
ALTER TABLE public.study_group_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sgr_select_member" ON public.study_group_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.study_group_messages m
            WHERE m.id = message_id AND public.is_group_member(m.group_id, auth.uid())));
CREATE POLICY "sgr_insert_own" ON public.study_group_reactions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.study_group_messages m
            WHERE m.id = message_id AND public.is_group_member(m.group_id, auth.uid())));
CREATE POLICY "sgr_delete_own" ON public.study_group_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sgr_bump()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.study_group_messages SET likes_count = likes_count + 1 WHERE id = NEW.message_id;
    RETURN NEW;
  ELSE
    UPDATE public.study_group_messages SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.message_id;
    RETURN OLD;
  END IF;
END $$;
CREATE TRIGGER trg_sgr_bump AFTER INSERT OR DELETE ON public.study_group_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sgr_bump();

-- ============ READ RECEIPTS ============
CREATE TABLE public.study_group_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.study_group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT ON public.study_group_reads TO authenticated;
GRANT ALL ON public.study_group_reads TO service_role;
ALTER TABLE public.study_group_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sgread_select_member" ON public.study_group_reads
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.study_group_messages m
            WHERE m.id = message_id AND public.is_group_member(m.group_id, auth.uid())));
CREATE POLICY "sgread_insert_own" ON public.study_group_reads
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.study_group_messages m
            WHERE m.id = message_id AND public.is_group_member(m.group_id, auth.uid())));

-- ============ MEMBERS LISTING RPC ============
CREATE OR REPLACE FUNCTION public.study_group_members(_group uuid)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, role text, is_ta boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE g RECORD;
BEGIN
  IF NOT public.is_group_member(_group, auth.uid()) THEN RAISE EXCEPTION 'not a member'; END IF;
  SELECT * INTO g FROM public.study_groups WHERE id = _group;
  RETURN QUERY
    SELECT p.user_id, p.full_name, p.avatar_url, p.role::text, p.is_ta
    FROM public.profiles p
    WHERE p.is_disabled = false
      AND (
        (p.role = 'student' AND p.department_id = g.department_id AND p.level = g.level)
        OR EXISTS (SELECT 1 FROM public.doctor_departments d
                   WHERE d.doctor_id = p.id AND d.department_id = g.department_id AND d.level = g.level)
      )
    ORDER BY (p.role = 'student'), p.full_name;
END $$;
REVOKE EXECUTE ON FUNCTION public.study_group_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_group_members(uuid) TO authenticated;

CREATE TRIGGER trg_study_groups_updated BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.study_group_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_reactions;

-- Seed one group per department × level 1..4
INSERT INTO public.study_groups (department_id, level, name, name_ar)
SELECT d.id, lv,
       d.name || ' — Year ' || lv,
       COALESCE(d.name_ar, d.name) || ' — الفرقة ' || lv
FROM public.departments d CROSS JOIN generate_series(1,4) AS lv
ON CONFLICT (department_id, level) DO NOTHING;