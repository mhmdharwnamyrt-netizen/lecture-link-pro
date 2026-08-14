-- ============ chat reports ============
CREATE TABLE public.chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  message_id uuid REFERENCES public.study_group_messages(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL,
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE,
  content_snapshot text,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.chat_reports TO authenticated;
GRANT ALL ON public.chat_reports TO service_role;

ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_reports_insert_own" ON public.chat_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "chat_reports_select_own_or_admin" ON public.chat_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "chat_reports_update_admin" ON public.chat_reports
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_chat_reports_status ON public.chat_reports(status, created_at DESC);

-- ============ user blocks ============
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_blocks_select_own" ON public.user_blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());

CREATE POLICY "user_blocks_insert_own" ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND blocked_id <> auth.uid());

CREATE POLICY "user_blocks_delete_own" ON public.user_blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- ============ notifications for group replies ============
CREATE OR REPLACE FUNCTION public.sgm_notify_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE parent_sender uuid; sender_name text; pref boolean; g_name text;
BEGIN
  IF NEW.reply_to_id IS NULL THEN RETURN NEW; END IF;
  SELECT sender_id INTO parent_sender FROM public.study_group_messages WHERE id = NEW.reply_to_id;
  IF parent_sender IS NULL OR parent_sender = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT replies INTO pref FROM public.notification_preferences WHERE user_id = parent_sender;
  IF NOT COALESCE(pref, true) THEN RETURN NEW; END IF;
  SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT COALESCE(name_ar, name) INTO g_name FROM public.study_groups WHERE id = NEW.group_id;
  INSERT INTO public.notifications(user_id, title, message, type, related_id)
  VALUES (parent_sender, 'رد جديد في ' || COALESCE(g_name, 'المجموعة'),
          COALESCE(sender_name, 'مستخدم') || ': ' || LEFT(COALESCE(NULLIF(NEW.content,''), 'مرفق'), 90),
          'group_chat', NEW.group_id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sgm_notify_reply
AFTER INSERT ON public.study_group_messages
FOR EACH ROW EXECUTE FUNCTION public.sgm_notify_reply();

-- ============ notifications for group reactions ============
CREATE OR REPLACE FUNCTION public.sgr_notify_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE msg RECORD; actor_name text; pref boolean; g_name text;
BEGIN
  SELECT sender_id, group_id, content INTO msg FROM public.study_group_messages WHERE id = NEW.message_id;
  IF msg.sender_id IS NULL OR msg.sender_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT likes INTO pref FROM public.notification_preferences WHERE user_id = msg.sender_id;
  IF NOT COALESCE(pref, true) THEN RETURN NEW; END IF;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT COALESCE(name_ar, name) INTO g_name FROM public.study_groups WHERE id = msg.group_id;
  INSERT INTO public.notifications(user_id, title, message, type, related_id)
  VALUES (msg.sender_id, 'تفاعل جديد في ' || COALESCE(g_name, 'المجموعة'),
          COALESCE(actor_name, 'مستخدم') || ' تفاعل مع رسالتك',
          'group_chat', msg.group_id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sgr_notify_reaction
AFTER INSERT ON public.study_group_reactions
FOR EACH ROW EXECUTE FUNCTION public.sgr_notify_reaction();

-- ============ realtime ============
ALTER TABLE public.study_group_reads REPLICA IDENTITY FULL;
ALTER TABLE public.study_group_reactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_reads; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;