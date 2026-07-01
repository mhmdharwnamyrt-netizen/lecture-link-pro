
-- =============================================================
-- 1. Move SECURITY DEFINER helper out of the exposed public schema
-- =============================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- Recreate all policies that referenced public.has_role, now pointing at private.has_role
DROP POLICY IF EXISTS "Admins view all logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins view all logs"
  ON public.admin_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert logs"
  ON public.admin_logs FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage user_roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

-- Drop public copies (no longer callable via PostgREST)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.get_public_stats();

-- =============================================================
-- 2. profiles — hide sensitive columns (phone, disabled_*)
-- =============================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Doctors see student profiles (for grading / contact)
CREATE POLICY "Doctors view student profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    role = 'student'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'doctor'
    )
  );

-- Students see doctor profiles (for office hours / messaging)
CREATE POLICY "Students view doctor profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    role = 'doctor'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'student'
    )
  );

-- Public directory view (safe columns only) for cross-role search
CREATE OR REPLACE VIEW public.profile_directory AS
  SELECT id, user_id, full_name, role, avatar_url, academic_title,
         department_id, student_id, level, points
  FROM public.profiles;
GRANT SELECT ON public.profile_directory TO authenticated, anon;

-- =============================================================
-- 3. face_templates — restrict SELECT
-- =============================================================
DROP POLICY IF EXISTS "Face templates viewable by authenticated" ON public.face_templates;

CREATE POLICY "Students view own face template"
  ON public.face_templates FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins view face templates"
  ON public.face_templates FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors view face templates"
  ON public.face_templates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor'
  ));

-- =============================================================
-- 4. lecture_ratings — restrict SELECT
-- =============================================================
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.lecture_ratings;

CREATE POLICY "Students view own ratings"
  ON public.lecture_ratings FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Doctors view own lecture ratings"
  ON public.lecture_ratings FOR SELECT TO authenticated
  USING (lecture_id IN (
    SELECT l.id FROM public.lectures l
    WHERE l.doctor_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ));

CREATE POLICY "Admins view all ratings"
  ON public.lecture_ratings FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- =============================================================
-- 5. notifications — restrict INSERT
-- =============================================================
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Restricted notification insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor')
    OR user_id = auth.uid()
  );

-- =============================================================
-- 6. Storage: face-photos + new avatars bucket
-- =============================================================
-- Drop existing overly-broad storage policies on face-photos
DROP POLICY IF EXISTS "Anyone can view face photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload face photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own face photos" ON storage.objects;

-- New path-scoped policies (first folder segment must equal auth.uid())
CREATE POLICY "face-photos owner select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'face-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR private.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor')
    )
  );

CREATE POLICY "face-photos owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'face-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "face-photos owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'face-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "face-photos owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'face-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars bucket policies (public read; owner writes)
CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
