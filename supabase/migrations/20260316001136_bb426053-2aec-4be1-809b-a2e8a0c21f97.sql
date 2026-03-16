
-- Schedule uploads table for AI schedule parsing
CREATE TABLE public.schedule_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  parsed_data JSONB,
  lectures_created INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own schedule uploads" ON public.schedule_uploads
  FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'doctor'));

CREATE POLICY "Doctors can insert schedule uploads" ON public.schedule_uploads
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'doctor'));

CREATE POLICY "Doctors can update own schedule uploads" ON public.schedule_uploads
  FOR UPDATE TO authenticated
  USING (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'doctor'));

-- Early warning alerts table
CREATE TABLE public.warning_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'absence_risk',
  message TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  absence_count INTEGER DEFAULT 0,
  total_lectures INTEGER DEFAULT 0,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warning_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own warnings" ON public.warning_alerts
  FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can insert warnings" ON public.warning_alerts
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'doctor'));

CREATE POLICY "Doctors can update own warnings" ON public.warning_alerts
  FOR UPDATE TO authenticated
  USING (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view own warnings" ON public.warning_alerts
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Add day_of_week and time fields to lectures for calendar integration
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS day_of_week TEXT;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.lectures ADD COLUMN IF NOT EXISTS end_time TIME;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
