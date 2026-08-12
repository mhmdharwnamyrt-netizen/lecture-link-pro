REVOKE EXECUTE ON FUNCTION public.sgr_bump() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sgm_touch_edited() FROM PUBLIC, anon, authenticated;

-- Path convention: <group_id>/<user_id>/<filename>
CREATE OR REPLACE FUNCTION public.can_access_group_media(_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE gid uuid;
BEGIN
  BEGIN
    gid := (string_to_array(_path, '/'))[1]::uuid;
  EXCEPTION WHEN others THEN RETURN false;
  END;
  RETURN public.is_group_member(gid, auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION public.can_access_group_media(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_group_media(text) TO authenticated;

CREATE POLICY "group_media_read_members" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'group-media' AND public.can_access_group_media(name));

CREATE POLICY "group_media_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'group-media'
    AND public.can_access_group_media(name)
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

CREATE POLICY "group_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'group-media'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );