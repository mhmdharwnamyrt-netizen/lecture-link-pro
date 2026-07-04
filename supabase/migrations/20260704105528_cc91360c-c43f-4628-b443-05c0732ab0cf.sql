ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_content_check;

ALTER TABLE public.community_posts
  ALTER COLUMN content SET DEFAULT '';

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_content_length_check CHECK (char_length(content) <= 5000);