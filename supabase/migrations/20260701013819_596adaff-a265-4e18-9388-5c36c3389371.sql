CREATE OR REPLACE FUNCTION private.current_user_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION private.current_user_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_user_profile_role() TO authenticated, service_role;

DROP POLICY IF EXISTS "Doctors view student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students view doctor profiles" ON public.profiles;

CREATE POLICY "Doctors view student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'student'
  AND private.current_user_profile_role() = 'doctor'
);

CREATE POLICY "Students view doctor profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'doctor'
  AND private.current_user_profile_role() = 'student'
);