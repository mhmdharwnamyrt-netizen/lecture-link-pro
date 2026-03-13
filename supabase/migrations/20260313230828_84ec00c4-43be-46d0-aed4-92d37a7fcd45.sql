
-- Fix overly permissive policies
DROP POLICY "Authenticated can insert subjects" ON public.subjects;
CREATE POLICY "Doctors can insert subjects" ON public.subjects FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'));

DROP POLICY "Notifications can be inserted" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);
