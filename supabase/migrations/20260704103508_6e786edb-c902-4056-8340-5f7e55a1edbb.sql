
-- Community: posts, comments (nested), reactions (like), shares
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  image_url TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  shares_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_read" ON public.community_posts FOR SELECT TO authenticated USING (is_hidden = false OR author_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "posts_insert" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts_update_own" ON public.community_posts FOR UPDATE TO authenticated USING (author_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "posts_delete_own" ON public.community_posts FOR DELETE TO authenticated USING (author_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));

CREATE INDEX idx_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX idx_posts_dept ON public.community_posts(department_id);

CREATE TABLE public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  likes_count INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read" ON public.community_comments FOR SELECT TO authenticated USING (is_hidden = false OR author_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "comments_insert" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments_update_own" ON public.community_comments FOR UPDATE TO authenticated USING (author_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "comments_delete_own" ON public.community_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));

CREATE INDEX idx_comments_post ON public.community_comments(post_id, created_at);
CREATE INDEX idx_comments_parent ON public.community_comments(parent_id);

CREATE TABLE public.community_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((post_id IS NOT NULL) <> (comment_id IS NOT NULL)),
  UNIQUE (user_id, post_id, comment_id, reaction)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_reactions TO authenticated;
GRANT ALL ON public.community_reactions TO service_role;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_read" ON public.community_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "reactions_insert" ON public.community_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reactions_delete_own" ON public.community_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.community_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.community_shares TO authenticated;
GRANT ALL ON public.community_shares TO service_role;
ALTER TABLE public.community_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shares_read" ON public.community_shares FOR SELECT TO authenticated USING (true);
CREATE POLICY "shares_insert" ON public.community_shares FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Triggers to keep counters + notifications
CREATE OR REPLACE FUNCTION public.community_bump_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_author UUID; comment_author UUID; sender_name TEXT;
BEGIN
  IF TG_TABLE_NAME = 'community_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
      SELECT author_id INTO post_author FROM public.community_posts WHERE id = NEW.post_id;
      SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.author_id;
      IF post_author IS NOT NULL AND post_author <> NEW.author_id THEN
        INSERT INTO public.notifications(user_id,title,message,type)
        VALUES (post_author, 'تعليق جديد', COALESCE(sender_name,'مستخدم')||' علّق على منشورك', 'community');
      END IF;
      IF NEW.parent_id IS NOT NULL THEN
        SELECT author_id INTO comment_author FROM public.community_comments WHERE id = NEW.parent_id;
        IF comment_author IS NOT NULL AND comment_author <> NEW.author_id AND comment_author <> post_author THEN
          INSERT INTO public.notifications(user_id,title,message,type)
          VALUES (comment_author, 'رد جديد', COALESCE(sender_name,'مستخدم')||' ردّ على تعليقك', 'community');
        END IF;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'community_reactions' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.post_id IS NOT NULL THEN
        UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        SELECT author_id INTO post_author FROM public.community_posts WHERE id = NEW.post_id;
        SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.user_id;
        IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
          INSERT INTO public.notifications(user_id,title,message,type)
          VALUES (post_author, 'إعجاب جديد', COALESCE(sender_name,'مستخدم')||' أعجب بمنشورك', 'community');
        END IF;
      ELSIF NEW.comment_id IS NOT NULL THEN
        UPDATE public.community_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.post_id IS NOT NULL THEN
        UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
      ELSIF OLD.comment_id IS NOT NULL THEN
        UPDATE public.community_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'community_shares' THEN
    UPDATE public.community_posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_comments_count AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_bump_counts();
CREATE TRIGGER trg_reactions_count AFTER INSERT OR DELETE ON public.community_reactions
  FOR EACH ROW EXECUTE FUNCTION public.community_bump_counts();
CREATE TRIGGER trg_shares_count AFTER INSERT ON public.community_shares
  FOR EACH ROW EXECUTE FUNCTION public.community_bump_counts();

CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reactions;
