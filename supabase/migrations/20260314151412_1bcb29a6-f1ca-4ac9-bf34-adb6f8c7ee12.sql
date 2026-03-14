
-- Remove overly permissive anon insert policy
DROP POLICY "Anon can insert subjects" ON public.subjects;
