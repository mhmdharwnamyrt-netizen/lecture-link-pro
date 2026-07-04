
-- Extra profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hobbies TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS favorites TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

-- Follows table
CREATE TABLE IF NOT EXISTS public.community_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

GRANT SELECT, INSERT, DELETE ON public.community_follows TO authenticated;
GRANT ALL ON public.community_follows TO service_role;

ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows readable by authenticated"
  ON public.community_follows FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "users create their own follows"
  ON public.community_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "users delete their own follows"
  ON public.community_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.community_follows(following_id);

-- Counters trigger
CREATE OR REPLACE FUNCTION public.community_follows_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE actor_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE user_id = NEW.following_id;
    -- Notify followed user
    SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.follower_id;
    INSERT INTO public.notifications(user_id, title, message, type, related_id)
    VALUES (NEW.following_id, 'متابع جديد', COALESCE(actor_name,'مستخدم') || ' بدأ بمتابعتك', 'community', NEW.follower_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE user_id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_follows_counters ON public.community_follows;
CREATE TRIGGER trg_community_follows_counters
  AFTER INSERT OR DELETE ON public.community_follows
  FOR EACH ROW EXECUTE FUNCTION public.community_follows_counters();
