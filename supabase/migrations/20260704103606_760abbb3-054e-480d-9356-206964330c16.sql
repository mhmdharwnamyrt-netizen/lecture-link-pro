
CREATE OR REPLACE FUNCTION public.community_bump_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_author UUID; comment_author UUID; sender_name TEXT;
BEGIN
  IF TG_TABLE_NAME = 'community_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
      SELECT author_id INTO post_author FROM public.community_posts WHERE id = NEW.post_id;
      SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.author_id;
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
        SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.user_id;
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
