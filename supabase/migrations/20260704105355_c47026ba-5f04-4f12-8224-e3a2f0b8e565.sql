CREATE TABLE IF NOT EXISTS public.community_post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video','audio')),
  mime_type TEXT,
  file_name TEXT,
  file_size BIGINT,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.community_post_media TO authenticated;
GRANT ALL ON public.community_post_media TO service_role;

ALTER TABLE public.community_post_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_media_read" ON public.community_post_media;
CREATE POLICY "post_media_read" ON public.community_post_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id
        AND (p.is_hidden = false OR p.author_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
    )
  );

DROP POLICY IF EXISTS "post_media_insert_own_posts" ON public.community_post_media;
CREATE POLICY "post_media_insert_own_posts" ON public.community_post_media
  FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "post_media_delete_owner_admin" ON public.community_post_media;
CREATE POLICY "post_media_delete_owner_admin" ON public.community_post_media
  FOR DELETE TO authenticated
  USING (
    uploader_id = auth.uid()
    OR private.has_role(auth.uid(),'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_community_post_media_post ON public.community_post_media(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_post_media_uploader ON public.community_post_media(uploader_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_post_media_storage_path ON public.community_post_media(storage_path);

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image','video','audio')),
  ADD COLUMN IF NOT EXISTS media_mime TEXT,
  ADD COLUMN IF NOT EXISTS media_name TEXT;

DROP POLICY IF EXISTS "community attachments upload own folder" ON storage.objects;
CREATE POLICY "community attachments upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "community attachments update own folder" ON storage.objects;
CREATE POLICY "community attachments update own folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );