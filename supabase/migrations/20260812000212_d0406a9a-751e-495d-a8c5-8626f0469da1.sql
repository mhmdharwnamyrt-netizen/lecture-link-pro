GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_materials TO authenticated;
GRANT ALL ON public.course_materials TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_material_files TO authenticated;
GRANT ALL ON public.course_material_files TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.material_views TO authenticated;
GRANT ALL ON public.material_views TO service_role;

GRANT SELECT, INSERT ON public.material_downloads TO authenticated;
GRANT ALL ON public.material_downloads TO service_role;