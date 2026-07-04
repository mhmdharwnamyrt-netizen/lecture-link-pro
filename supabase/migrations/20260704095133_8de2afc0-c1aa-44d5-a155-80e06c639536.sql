
DROP POLICY IF EXISTS "msg attach upload own folder" ON storage.objects;
CREATE POLICY "msg attach upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "msg attach read authenticated" ON storage.objects;
CREATE POLICY "msg attach read authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "msg attach delete own" ON storage.objects;
CREATE POLICY "msg attach delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
