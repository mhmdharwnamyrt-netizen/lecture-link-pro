
-- Allow anonymous users to read departments
CREATE POLICY "Departments readable by anon" ON public.departments FOR SELECT TO anon USING (true);

-- Allow anonymous users to read subjects  
CREATE POLICY "Subjects readable by anon" ON public.subjects FOR SELECT TO anon USING (true);
