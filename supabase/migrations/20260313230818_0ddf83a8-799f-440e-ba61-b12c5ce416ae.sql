
-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_ar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert departments
INSERT INTO public.departments (name, name_ar) VALUES
  ('Information Technology', 'تكنولوجيا المعلومات'),
  ('Mechatronics', 'الميكاترونكس'),
  ('Electronics', 'الإلكترونيات'),
  ('Renewable Energy', 'الطاقة المتجددة'),
  ('Industrial Process Control', 'التحكم في العمليات الصناعية'),
  ('Refrigeration & Air Conditioning', 'التبريد والتكييف'),
  ('Railway', 'السكة الحديد'),
  ('Marketing', 'التسويق');

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default subjects
INSERT INTO public.subjects (name) VALUES
  ('Mathematics'), ('English'), ('Physics'), ('IoT'),
  ('Programming'), ('Electronics'), ('Database'), ('Networking'),
  ('Control Systems'), ('Thermodynamics'), ('Power Systems');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'student')),
  academic_title TEXT,
  student_id TEXT,
  department_id UUID REFERENCES public.departments(id),
  level INTEGER CHECK (level BETWEEN 1 AND 4),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Doctor-department-level mapping
CREATE TABLE public.doctor_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  UNIQUE(doctor_id, department_id, level)
);

-- Doctor-subject mapping
CREATE TABLE public.doctor_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  UNIQUE(doctor_id, subject_id)
);

-- Lectures table
CREATE TABLE public.lectures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lecture', 'section')),
  subject_id UUID REFERENCES public.subjects(id),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  hall_number INTEGER,
  description TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  points INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'excused', 'absent')) DEFAULT 'present',
  location_verified BOOLEAN NOT NULL DEFAULT false,
  biometric_verified BOOLEAN NOT NULL DEFAULT false,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  synced BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, lecture_id)
);

-- Excuses table
CREATE TABLE public.excuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Departments: readable by all authenticated
CREATE POLICY "Departments readable by all" ON public.departments FOR SELECT TO authenticated USING (true);

-- Subjects: readable by all, anyone can insert
CREATE POLICY "Subjects readable by all" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert subjects" ON public.subjects FOR INSERT TO authenticated WITH CHECK (true);

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Doctor departments
CREATE POLICY "Doctor departments viewable by all" ON public.doctor_departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can manage own departments" ON public.doctor_departments FOR INSERT TO authenticated 
  WITH CHECK (doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'));
CREATE POLICY "Doctors can delete own departments" ON public.doctor_departments FOR DELETE TO authenticated 
  USING (doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'));

-- Doctor subjects
CREATE POLICY "Doctor subjects viewable by all" ON public.doctor_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can manage own subjects" ON public.doctor_subjects FOR INSERT TO authenticated 
  WITH CHECK (doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'));
CREATE POLICY "Doctors can delete own subjects" ON public.doctor_subjects FOR DELETE TO authenticated 
  USING (doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'));

-- Lectures
CREATE POLICY "Lectures viewable by all authenticated" ON public.lectures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can create lectures" ON public.lectures FOR INSERT TO authenticated 
  WITH CHECK (doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'));
CREATE POLICY "Doctors can update own lectures" ON public.lectures FOR UPDATE TO authenticated 
  USING (doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'));
CREATE POLICY "Doctors can delete own lectures" ON public.lectures FOR DELETE TO authenticated 
  USING (doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'));

-- Attendance
CREATE POLICY "View own or doctor attendance" ON public.attendance FOR SELECT TO authenticated 
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) 
    OR EXISTS (SELECT 1 FROM public.lectures l JOIN public.profiles p ON p.user_id = auth.uid() WHERE l.id = lecture_id AND l.doctor_id = p.id));
CREATE POLICY "Students can register attendance" ON public.attendance FOR INSERT TO authenticated 
  WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'student'));
CREATE POLICY "Attendance can be updated" ON public.attendance FOR UPDATE TO authenticated 
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) 
    OR EXISTS (SELECT 1 FROM public.lectures l JOIN public.profiles p ON p.user_id = auth.uid() WHERE l.id = lecture_id AND l.doctor_id = p.id));

-- Excuses
CREATE POLICY "View own excuses or as doctor" ON public.excuses FOR SELECT TO authenticated 
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) 
    OR EXISTS (SELECT 1 FROM public.lectures l JOIN public.profiles p ON p.user_id = auth.uid() WHERE l.id = lecture_id AND l.doctor_id = p.id));
CREATE POLICY "Students can submit excuses" ON public.excuses FOR INSERT TO authenticated 
  WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'student'));
CREATE POLICY "Doctors can update excuses" ON public.excuses FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.lectures l JOIN public.profiles p ON p.user_id = auth.uid() WHERE l.id = lecture_id AND l.doctor_id = p.id));

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Notifications can be inserted" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lectures_updated_at BEFORE UPDATE ON public.lectures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_excuses_updated_at BEFORE UPDATE ON public.excuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_department ON public.profiles(department_id);
CREATE INDEX idx_lectures_doctor ON public.lectures(doctor_id);
CREATE INDEX idx_lectures_department_level ON public.lectures(department_id, level);
CREATE INDEX idx_attendance_student ON public.attendance(student_id);
CREATE INDEX idx_attendance_lecture ON public.attendance(lecture_id);
CREATE INDEX idx_excuses_student ON public.excuses(student_id);
CREATE INDEX idx_excuses_lecture ON public.excuses(lecture_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
