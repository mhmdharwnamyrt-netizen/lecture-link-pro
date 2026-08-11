CREATE POLICY "material_files_upload_own_folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "material_files_update_own_folder" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "material_files_delete_own_folder" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'course-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "material_files_read_allowed" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.can_access_material_path(name)
  )
);