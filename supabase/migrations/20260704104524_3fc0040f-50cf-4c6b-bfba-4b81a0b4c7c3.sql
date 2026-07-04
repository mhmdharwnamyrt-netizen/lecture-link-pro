
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by UUID,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CHECK ((post_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own reports" ON public.community_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reporter or admin can view" ON public.community_reports
  FOR SELECT TO authenticated USING (
    auth.uid() = reporter_id OR private.has_role(auth.uid(),'admin'::public.app_role)
  );
CREATE POLICY "admin can update" ON public.community_reports
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "admin can delete" ON public.community_reports
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.community_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY,
  likes BOOLEAN NOT NULL DEFAULT true,
  comments BOOLEAN NOT NULL DEFAULT true,
  replies BOOLEAN NOT NULL DEFAULT true,
  pins BOOLEAN NOT NULL DEFAULT true,
  mentions BOOLEAN NOT NULL DEFAULT true,
  community BOOLEAN NOT NULL DEFAULT true,
  system BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS pinned_by UUID;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.community_comments_edit_tracker()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN NEW.edited_at := now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_community_comments_edit ON public.community_comments;
CREATE TRIGGER trg_community_comments_edit BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_comments_edit_tracker();

CREATE OR REPLACE FUNCTION public.community_post_pin_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pref BOOLEAN; pinner_name TEXT;
BEGIN
  IF NEW.is_pinned = true AND (OLD.is_pinned IS DISTINCT FROM true) THEN
    NEW.pinned_at := now();
    NEW.pinned_by := auth.uid();
    SELECT pins INTO pref FROM public.notification_preferences WHERE user_id = NEW.author_id;
    IF COALESCE(pref, true) AND NEW.author_id IS NOT NULL AND NEW.author_id <> COALESCE(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid) THEN
      SELECT full_name INTO pinner_name FROM public.profiles WHERE user_id = auth.uid();
      INSERT INTO public.notifications(user_id, title, message, type, related_id)
      VALUES (NEW.author_id, 'تم تثبيت منشورك', COALESCE(pinner_name,'المشرف')||' ثبّت منشورك في الملتقى', 'community', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_community_post_pin ON public.community_posts;
CREATE TRIGGER trg_community_post_pin BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_post_pin_notify();

CREATE OR REPLACE FUNCTION public.community_bump_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE post_author UUID; comment_author UUID; sender_name TEXT; pref BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'community_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
      SELECT author_id INTO post_author FROM public.community_posts WHERE id = NEW.post_id;
      SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.author_id;
      IF post_author IS NOT NULL AND post_author <> NEW.author_id THEN
        SELECT comments INTO pref FROM public.notification_preferences WHERE user_id = post_author;
        IF COALESCE(pref, true) THEN
          INSERT INTO public.notifications(user_id,title,message,type,related_id)
          VALUES (post_author, 'تعليق جديد', COALESCE(sender_name,'مستخدم')||' علّق على منشورك', 'community', NEW.post_id);
        END IF;
      END IF;
      IF NEW.parent_id IS NOT NULL THEN
        SELECT author_id INTO comment_author FROM public.community_comments WHERE id = NEW.parent_id;
        IF comment_author IS NOT NULL AND comment_author <> NEW.author_id AND comment_author <> post_author THEN
          SELECT replies INTO pref FROM public.notification_preferences WHERE user_id = comment_author;
          IF COALESCE(pref, true) THEN
            INSERT INTO public.notifications(user_id,title,message,type,related_id)
            VALUES (comment_author, 'رد جديد', COALESCE(sender_name,'مستخدم')||' ردّ على تعليقك', 'community', NEW.post_id);
          END IF;
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
        SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.user_id;
        IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
          SELECT likes INTO pref FROM public.notification_preferences WHERE user_id = post_author;
          IF COALESCE(pref, true) THEN
            INSERT INTO public.notifications(user_id,title,message,type,related_id)
            VALUES (post_author, 'إعجاب جديد', COALESCE(sender_name,'مستخدم')||' أعجب بمنشورك', 'community', NEW.post_id);
          END IF;
        END IF;
      ELSIF NEW.comment_id IS NOT NULL THEN
        UPDATE public.community_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        SELECT author_id INTO comment_author FROM public.community_comments WHERE id = NEW.comment_id;
        IF comment_author IS NOT NULL AND comment_author <> NEW.user_id THEN
          SELECT likes INTO pref FROM public.notification_preferences WHERE user_id = comment_author;
          IF COALESCE(pref, true) THEN
            SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.user_id;
            INSERT INTO public.notifications(user_id,title,message,type,related_id)
            VALUES (comment_author, 'إعجاب بتعليقك', COALESCE(sender_name,'مستخدم')||' أعجب بتعليقك', 'community', NEW.comment_id);
          END IF;
        END IF;
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
END $function$;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reports; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_tags ON public.community_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_community_posts_content_trgm ON public.community_posts USING GIN(content gin_trgm_ops);
