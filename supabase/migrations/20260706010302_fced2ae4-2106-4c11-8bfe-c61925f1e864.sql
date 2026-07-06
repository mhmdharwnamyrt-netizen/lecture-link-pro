
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video','text')),
  media_path TEXT,
  media_mime TEXT,
  text_content TEXT,
  background TEXT,
  duration_seconds INT NOT NULL DEFAULT 5 CHECK (duration_seconds > 0 AND duration_seconds <= 60),
  views_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read active stories" ON public.stories
  FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "Author inserts own stories" ON public.stories
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Author updates own stories" ON public.stories
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Author deletes own stories" ON public.stories
  FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE INDEX idx_stories_expires ON public.stories(expires_at DESC);
CREATE INDEX idx_stories_author ON public.stories(author_id, created_at DESC);

CREATE TABLE public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

GRANT SELECT, INSERT ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewer inserts own view" ON public.story_views
  FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());
CREATE POLICY "Author or viewer reads view" ON public.story_views
  FOR SELECT TO authenticated USING (
    viewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_id = auth.uid())
  );

CREATE INDEX idx_story_views_story ON public.story_views(story_id, viewed_at DESC);

CREATE OR REPLACE FUNCTION public.story_views_bump()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_story_views_bump
  AFTER INSERT ON public.story_views
  FOR EACH ROW EXECUTE FUNCTION public.story_views_bump();
