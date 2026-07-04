
-- ============ MESSAGES enhancements ============
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS reaction text;

CREATE INDEX IF NOT EXISTS idx_messages_pair ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages(receiver_id) WHERE read = false;

-- Allow senders to update (edit/delete/react) their own messages; receivers to mark reactions & read
DROP POLICY IF EXISTS "Users update own sent messages" ON public.messages;
CREATE POLICY "Users update own sent messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Receivers can mark read" ON public.messages;
CREATE POLICY "Receivers can mark read" ON public.messages
  FOR UPDATE TO authenticated
  USING (receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users delete own sent messages" ON public.messages;
CREATE POLICY "Users delete own sent messages" ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Set edited_at automatically when content changes on update
CREATE OR REPLACE FUNCTION public.messages_set_edited_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content AND NEW.deleted_at IS NULL THEN
    NEW.edited_at := now();
  END IF;
  IF NEW.read = true AND OLD.read = false THEN
    NEW.read_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_messages_edited ON public.messages;
CREATE TRIGGER trg_messages_edited BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_set_edited_at();

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Typing indicators (transient, upsert per pair)
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  user_id uuid NOT NULL,
  peer_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, peer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_indicators TO authenticated;
GRANT ALL ON public.typing_indicators TO service_role;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own typing" ON public.typing_indicators;
CREATE POLICY "Users manage own typing" ON public.typing_indicators
  FOR ALL TO authenticated
  USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users read typing about them" ON public.typing_indicators;
CREATE POLICY "Users read typing about them" ON public.typing_indicators
  FOR SELECT TO authenticated
  USING (peer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;

-- ============ OFFICE HOURS enhancements ============
ALTER TABLE public.office_hours
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.office_hour_bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

-- Enforce capacity per slot per date
CREATE OR REPLACE FUNCTION public.check_booking_capacity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  cap int;
  cnt int;
BEGIN
  IF NEW.status IN ('pending','confirmed') THEN
    SELECT max_bookings INTO cap FROM public.office_hours WHERE id = NEW.slot_id;
    SELECT count(*) INTO cnt FROM public.office_hour_bookings
      WHERE slot_id = NEW.slot_id
        AND booking_date = NEW.booking_date
        AND status IN ('pending','confirmed')
        AND id <> COALESCE(NEW.id, gen_random_uuid());
    IF cap IS NOT NULL AND cnt >= cap THEN
      RAISE EXCEPTION 'Slot is fully booked for this date';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_booking_capacity ON public.office_hour_bookings;
CREATE TRIGGER trg_booking_capacity BEFORE INSERT OR UPDATE ON public.office_hour_bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_capacity();

-- Allow student to cancel own booking
DROP POLICY IF EXISTS "Students cancel own booking" ON public.office_hour_bookings;
CREATE POLICY "Students cancel own booking" ON public.office_hour_bookings
  FOR UPDATE TO authenticated
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
