
-- Lecture ratings (anonymous)
CREATE TABLE public.lecture_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lecture_id, student_id)
);
ALTER TABLE public.lecture_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can rate lectures" ON public.lecture_ratings FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'student'));
CREATE POLICY "Anyone can view ratings" ON public.lecture_ratings FOR SELECT TO authenticated USING (true);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated
  USING (sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own received messages" ON public.messages FOR UPDATE TO authenticated
  USING (receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Office hours slots
CREATE TABLE public.office_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_bookings INTEGER NOT NULL DEFAULT 5,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.office_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view office hours" ON public.office_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can manage office hours" ON public.office_hours FOR INSERT TO authenticated
  WITH CHECK (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'doctor'));
CREATE POLICY "Doctors can update office hours" ON public.office_hours FOR UPDATE TO authenticated
  USING (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'doctor'));
CREATE POLICY "Doctors can delete office hours" ON public.office_hours FOR DELETE TO authenticated
  USING (doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'doctor'));

-- Office hour bookings
CREATE TABLE public.office_hour_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID NOT NULL REFERENCES public.office_hours(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  booking_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(slot_id, student_id, booking_date)
);
ALTER TABLE public.office_hour_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can book" ON public.office_hour_bookings FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'student'));
CREATE POLICY "View own bookings" ON public.office_hour_bookings FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM office_hours oh JOIN profiles p ON p.user_id = auth.uid() WHERE oh.id = office_hour_bookings.slot_id AND oh.doctor_id = p.id));
CREATE POLICY "Doctors can update bookings" ON public.office_hour_bookings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM office_hours oh JOIN profiles p ON p.user_id = auth.uid() WHERE oh.id = office_hour_bookings.slot_id AND oh.doctor_id = p.id));
