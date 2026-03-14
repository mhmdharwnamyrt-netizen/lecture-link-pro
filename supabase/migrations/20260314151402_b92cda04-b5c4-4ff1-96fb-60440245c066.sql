
-- Allow anonymous users to insert subjects (for registration flow)
CREATE POLICY "Anon can insert subjects" ON public.subjects FOR INSERT TO anon WITH CHECK (true);
