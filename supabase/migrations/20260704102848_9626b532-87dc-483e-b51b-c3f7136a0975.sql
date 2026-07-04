
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  actor_id UUID,
  actor_name TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON public.activity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_kind ON public.activity_events (kind);
CREATE INDEX IF NOT EXISTS idx_activity_events_department ON public.activity_events (department_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_severity ON public.activity_events (severity);

GRANT SELECT, INSERT, DELETE ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read activity" ON public.activity_events
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "system inserts activity" ON public.activity_events
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins delete activity" ON public.activity_events
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;

CREATE OR REPLACE FUNCTION public.log_attendance_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE dept UUID; s_name TEXT;
BEGIN
  SELECT department_id, full_name INTO dept, s_name FROM public.profiles WHERE id = NEW.student_id;
  INSERT INTO public.activity_events(kind, entity_type, entity_id, actor_id, actor_name, department_id, severity, title, details)
  VALUES ('attendance.recorded','attendance', NEW.id, NEW.student_id, s_name, dept,
          CASE WHEN NEW.status='absent' THEN 'warning' ELSE 'info' END,
          COALESCE(s_name,'Student') || ' - ' || NEW.status,
          jsonb_build_object('lecture_id', NEW.lecture_id, 'method', NEW.method, 'status', NEW.status));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.log_excuse_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE dept UUID; s_name TEXT;
BEGIN
  SELECT department_id, full_name INTO dept, s_name FROM public.profiles WHERE id = NEW.student_id;
  IF TG_OP='INSERT' THEN
    INSERT INTO public.activity_events(kind, entity_type, entity_id, actor_id, actor_name, department_id, severity, title, details)
    VALUES ('excuse.submitted','excuse',NEW.id,NEW.student_id,s_name,dept,'info',
            'Excuse submitted by '||COALESCE(s_name,'student'),
            jsonb_build_object('lecture_id',NEW.lecture_id,'reason',NEW.reason));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_events(kind, entity_type, entity_id, actor_id, actor_name, department_id, severity, title, details)
    VALUES ('excuse.'||NEW.status,'excuse',NEW.id,NEW.student_id,s_name,dept,
            CASE WHEN NEW.status='rejected' THEN 'warning' ELSE 'success' END,
            'Excuse '||NEW.status||' for '||COALESCE(s_name,'student'),
            jsonb_build_object('lecture_id',NEW.lecture_id));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.log_warning_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE dept UUID; s_name TEXT;
BEGIN
  SELECT department_id, full_name INTO dept, s_name FROM public.profiles WHERE id = NEW.student_id;
  INSERT INTO public.activity_events(kind, entity_type, entity_id, actor_id, actor_name, department_id, severity, title, details)
  VALUES ('warning.raised','warning',NEW.id,NEW.student_id,s_name,dept,
          CASE NEW.risk_level WHEN 'critical' THEN 'critical' WHEN 'high' THEN 'warning' ELSE 'info' END,
          'Warning ('||NEW.risk_level||') for '||COALESCE(s_name,'student'),
          jsonb_build_object('message',NEW.message,'absence_count',NEW.absence_count));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.log_booking_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s_name TEXT;
BEGIN
  SELECT full_name INTO s_name FROM public.profiles WHERE id = NEW.student_id;
  IF TG_OP='INSERT' THEN
    INSERT INTO public.activity_events(kind, entity_type, entity_id, actor_id, actor_name, severity, title, details)
    VALUES ('booking.created','booking',NEW.id,NEW.student_id,s_name,'info',
            'Office hour booked by '||COALESCE(s_name,'student'),
            jsonb_build_object('slot_id',NEW.slot_id,'booking_date',NEW.booking_date));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_events(kind, entity_type, entity_id, actor_id, actor_name, severity, title, details)
    VALUES ('booking.'||NEW.status,'booking',NEW.id,NEW.student_id,s_name,'info',
            'Booking '||NEW.status, jsonb_build_object('slot_id',NEW.slot_id));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.log_message_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s_name TEXT;
BEGIN
  SELECT full_name INTO s_name FROM public.profiles WHERE user_id = NEW.sender_id;
  INSERT INTO public.activity_events(kind, entity_type, entity_id, actor_id, actor_name, severity, title, details)
  VALUES ('message.sent','message',NEW.id,NEW.sender_id,s_name,'info',
          'Message from '||COALESCE(s_name,'user'),
          jsonb_build_object('recipient_id',NEW.recipient_id));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_attendance ON public.attendance;
CREATE TRIGGER trg_log_attendance AFTER INSERT ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.log_attendance_event();

DROP TRIGGER IF EXISTS trg_log_excuse ON public.excuses;
CREATE TRIGGER trg_log_excuse AFTER INSERT OR UPDATE ON public.excuses
  FOR EACH ROW EXECUTE FUNCTION public.log_excuse_event();

DROP TRIGGER IF EXISTS trg_log_warning ON public.warning_alerts;
CREATE TRIGGER trg_log_warning AFTER INSERT ON public.warning_alerts
  FOR EACH ROW EXECUTE FUNCTION public.log_warning_event();

DROP TRIGGER IF EXISTS trg_log_booking ON public.office_hour_bookings;
CREATE TRIGGER trg_log_booking AFTER INSERT OR UPDATE ON public.office_hour_bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_event();

DROP TRIGGER IF EXISTS trg_log_message ON public.messages;
CREATE TRIGGER trg_log_message AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.log_message_event();

CREATE OR REPLACE FUNCTION public.notify_admins_on_critical()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE admin_row RECORD;
BEGIN
  IF NEW.severity IN ('warning','critical') THEN
    FOR admin_row IN SELECT user_id FROM public.user_roles WHERE role='admin'::public.app_role LOOP
      INSERT INTO public.notifications(user_id,title,message,type)
      VALUES (admin_row.user_id, '['||upper(NEW.severity)||'] '||NEW.title,
              COALESCE(NEW.details->>'message', NEW.title), 'system');
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_admins_activity ON public.activity_events;
CREATE TRIGGER trg_notify_admins_activity AFTER INSERT ON public.activity_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_critical();

CREATE OR REPLACE FUNCTION public.db_health_snapshot()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result JSONB;
BEGIN
  IF NOT private.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT jsonb_build_object(
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'tables', (SELECT jsonb_agg(jsonb_build_object(
        'name', relname,'rows', n_live_tup,'dead_rows', n_dead_tup,
        'size', pg_size_pretty(pg_total_relation_size(relid))
      ) ORDER BY n_live_tup DESC) FROM pg_stat_user_tables WHERE schemaname='public'),
    'connections', (SELECT count(*) FROM pg_stat_activity),
    'checked_at', now()
  ) INTO result;
  RETURN result;
END; $$;

GRANT EXECUTE ON FUNCTION public.db_health_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.rebuild_statistics()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r RECORD; cnt INT := 0;
BEGIN
  IF NOT private.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'admin only'; END IF;
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE 'ANALYZE public.'||quote_ident(r.tablename);
    cnt := cnt + 1;
  END LOOP;
  RETURN 'analyzed '||cnt||' tables';
END; $$;

GRANT EXECUTE ON FUNCTION public.rebuild_statistics() TO authenticated;

CREATE OR REPLACE FUNCTION public.db_integrity_check()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result JSONB;
BEGIN
  IF NOT private.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT jsonb_build_object(
    'orphan_attendance', (SELECT count(*) FROM public.attendance a WHERE NOT EXISTS(SELECT 1 FROM public.lectures l WHERE l.id=a.lecture_id)),
    'orphan_bookings', (SELECT count(*) FROM public.office_hour_bookings b WHERE NOT EXISTS(SELECT 1 FROM public.office_hours o WHERE o.id=b.slot_id)),
    'orphan_messages', (SELECT count(*) FROM public.messages m WHERE m.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=m.sender_id)),
    'stale_typing', (SELECT count(*) FROM public.typing_indicators WHERE updated_at < now() - interval '5 minutes'),
    'unresolved_warnings', (SELECT count(*) FROM public.warning_alerts WHERE is_resolved=false),
    'checked_at', now()
  ) INTO result;
  RETURN result;
END; $$;

GRANT EXECUTE ON FUNCTION public.db_integrity_check() TO authenticated;
