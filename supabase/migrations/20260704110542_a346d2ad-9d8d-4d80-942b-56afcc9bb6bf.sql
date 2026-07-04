
-- Categories on posts
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'discussion'
    CHECK (category IN ('discussion','question','resource','announcement')),
  ADD COLUMN IF NOT EXISTS is_answered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saves_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_score ON public.community_posts(score DESC);

-- Saved posts (bookmarks)
CREATE TABLE IF NOT EXISTS public.community_saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_saved_posts TO authenticated;
GRANT ALL ON public.community_saved_posts TO service_role;
ALTER TABLE public.community_saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saves select" ON public.community_saved_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saves insert" ON public.community_saved_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saves delete" ON public.community_saved_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.community_saved_posts(user_id, created_at DESC);

-- Save count trigger
CREATE OR REPLACE FUNCTION public.community_saved_posts_bump()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.community_posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.community_posts SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_community_saved_posts_bump ON public.community_saved_posts;
CREATE TRIGGER trg_community_saved_posts_bump
  AFTER INSERT OR DELETE ON public.community_saved_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_saved_posts_bump();

-- Mentions
CREATE TABLE IF NOT EXISTS public.community_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL))
);
GRANT SELECT, INSERT ON public.community_mentions TO authenticated;
GRANT ALL ON public.community_mentions TO service_role;
ALTER TABLE public.community_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentions self read" ON public.community_mentions FOR SELECT TO authenticated USING (auth.uid() = mentioned_user_id OR auth.uid() = actor_id);
CREATE POLICY "mentions insert own" ON public.community_mentions FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON public.community_mentions(mentioned_user_id, created_at DESC);

-- Mention notify trigger
CREATE OR REPLACE FUNCTION public.community_mention_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_name TEXT; related UUID;
BEGIN
  IF NEW.mentioned_user_id = NEW.actor_id THEN RETURN NEW; END IF;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.actor_id;
  related := COALESCE(NEW.post_id, NEW.comment_id);
  INSERT INTO public.notifications(user_id,title,message,type,related_id)
  VALUES (NEW.mentioned_user_id, 'أشار إليك', COALESCE(actor_name,'مستخدم')||' أشار إليك في الملتقى', 'community', related);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_community_mention_notify ON public.community_mentions;
CREATE TRIGGER trg_community_mention_notify
  AFTER INSERT ON public.community_mentions
  FOR EACH ROW EXECUTE FUNCTION public.community_mention_notify();

-- Score maintenance: score = likes*3 + comments*2 + shares*2 + saves*4 (freshness handled client-side)
CREATE OR REPLACE FUNCTION public.community_recompute_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.score := (COALESCE(NEW.likes_count,0)*3)
             + (COALESCE(NEW.comments_count,0)*2)
             + (COALESCE(NEW.shares_count,0)*2)
             + (COALESCE(NEW.saves_count,0)*4);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_community_post_score ON public.community_posts;
CREATE TRIGGER trg_community_post_score
  BEFORE INSERT OR UPDATE OF likes_count, comments_count, shares_count, saves_count
  ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_recompute_score();

-- Leaderboard function (top contributors last N days)
CREATE OR REPLACE FUNCTION public.community_leaderboard(days INT DEFAULT 30, lim INT DEFAULT 10)
RETURNS TABLE(user_id UUID, full_name TEXT, avatar_url TEXT, role TEXT,
              posts_count BIGINT, comments_count BIGINT, likes_received BIGINT, score BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH posts AS (
    SELECT author_id AS uid, COUNT(*) AS c, COALESCE(SUM(likes_count),0) AS lk
    FROM public.community_posts
    WHERE created_at > now() - (days || ' days')::interval AND is_hidden = false
    GROUP BY author_id
  ),
  cmts AS (
    SELECT author_id AS uid, COUNT(*) AS c
    FROM public.community_comments
    WHERE created_at > now() - (days || ' days')::interval AND is_hidden = false
    GROUP BY author_id
  ),
  merged AS (
    SELECT COALESCE(p.uid, c.uid) AS uid,
           COALESCE(p.c,0) AS posts_count,
           COALESCE(c.c,0) AS comments_count,
           COALESCE(p.lk,0) AS likes_received
    FROM posts p FULL OUTER JOIN cmts c ON p.uid = c.uid
  )
  SELECT m.uid, pr.full_name, pr.avatar_url, pr.role::text,
         m.posts_count, m.comments_count, m.likes_received,
         (m.posts_count*5 + m.comments_count*2 + m.likes_received*3)::BIGINT AS score
  FROM merged m
  LEFT JOIN public.profiles pr ON pr.user_id = m.uid
  WHERE m.uid IS NOT NULL
  ORDER BY score DESC
  LIMIT lim;
$$;
GRANT EXECUTE ON FUNCTION public.community_leaderboard(INT, INT) TO authenticated;

-- Backfill scores
UPDATE public.community_posts SET score = (likes_count*3 + comments_count*2 + shares_count*2 + saves_count*4);
