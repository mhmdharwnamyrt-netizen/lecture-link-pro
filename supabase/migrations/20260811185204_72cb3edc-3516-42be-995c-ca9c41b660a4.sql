DROP POLICY IF EXISTS "materials_insert_own" ON public.course_materials;

CREATE POLICY "materials_insert_own" ON public.course_materials
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());