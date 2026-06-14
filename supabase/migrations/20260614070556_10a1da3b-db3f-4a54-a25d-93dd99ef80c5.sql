
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(students bigint, doctors bigint, lectures bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'student'),
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'doctor'),
    (SELECT COUNT(*) FROM public.lectures);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
