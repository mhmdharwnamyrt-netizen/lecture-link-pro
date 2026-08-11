DROP POLICY IF EXISTS "materials_insert_own" ON public.course_materials;

CREATE POLICY "materials_insert_own" ON public.course_materials
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.role = 'doctor' OR p.is_ta = true)
  )
);