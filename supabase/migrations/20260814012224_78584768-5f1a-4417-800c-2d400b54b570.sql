-- 1. search_path + anon execute hardening
CREATE OR REPLACE FUNCTION public.check_lecture_expiry_trigger()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
    IF NEW.is_active = true AND NEW.day_of_week IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        IF NEW.day_of_week != trim(to_char(now(), 'Day')) OR now()::time > NEW.end_time THEN
            NEW.is_active := false;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_default_avatar_url(p_role text, p_gender text, p_is_ta boolean DEFAULT false)
RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
  v_sprite_set text;
  v_seed text;
BEGIN
  IF p_role = 'doctor' THEN
    IF p_is_ta THEN v_sprite_set := 'initials'; ELSE v_sprite_set := 'avataaars-neutral'; END IF;
  ELSE
    v_sprite_set := 'adventurer-neutral';
  END IF;
  v_seed := CASE WHEN p_gender = 'female' THEN 'girl' || floor(random() * 100)::text ELSE 'boy' || floor(random() * 100)::text END;
  RETURN 'https://api.dicebear.com/7.x/' || v_sprite_set || '/svg?seed=' || v_seed;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.deactivate_expired_lectures() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.material_downloads_bump() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.material_views_bump() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_lecture_expiry_trigger() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_default_avatar_url(text, text, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_default_avatar_url(text, text, boolean) TO authenticated;

-- 2. profiles_public: security invoker view over a controlled definer function
CREATE OR REPLACE FUNCTION public.profiles_public_rows()
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, avatar_url text, cover_url text,
  role text, academic_title text, student_id text, department_id uuid, level int,
  points int, bio text, skills text[], interests text[], hobbies text[], favorites text[],
  followers_count int, following_count int, is_ta boolean, gender text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT p.id, p.user_id, p.full_name, p.avatar_url, p.cover_url, p.role, p.academic_title,
         p.student_id, p.department_id, p.level, p.points, p.bio, p.skills, p.interests,
         p.hobbies, p.favorites, p.followers_count, p.following_count, p.is_ta, p.gender, p.created_at
  FROM public.profiles p
  WHERE p.is_disabled = false AND auth.uid() IS NOT NULL;
$function$;

REVOKE EXECUTE ON FUNCTION public.profiles_public_rows() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.profiles_public_rows() TO authenticated;

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public WITH (security_invoker = true) AS
  SELECT * FROM public.profiles_public_rows();
REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;

-- 3. face_templates: scope doctor/TA access
CREATE OR REPLACE FUNCTION public.can_view_face_template(_student uuid, _uid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE s RECORD; v RECORD;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF private.has_role(_uid, 'admin'::public.app_role) THEN RETURN true; END IF;
  SELECT department_id, level INTO s FROM public.profiles WHERE id = _student AND role = 'student';
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT id, role, is_ta INTO v FROM public.profiles WHERE user_id = _uid;
  IF NOT FOUND OR NOT (v.role = 'doctor' OR v.is_ta = true) THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.doctor_departments d
    WHERE d.doctor_id = v.id AND d.department_id = s.department_id AND d.level = s.level
  ) OR EXISTS (
    SELECT 1 FROM public.lectures l
    WHERE l.doctor_id = v.id AND l.department_id = s.department_id AND l.level = s.level
  );
END $function$;

REVOKE EXECUTE ON FUNCTION public.can_view_face_template(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_face_template(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Doctors view face templates" ON public.face_templates;
CREATE POLICY "Assigned teaching staff view face templates"
ON public.face_templates FOR SELECT TO authenticated
USING (public.can_view_face_template(student_id, auth.uid()));

-- 4. quiz_attempts: no direct client updates
DROP POLICY IF EXISTS "students update own attempts" ON public.quiz_attempts;
REVOKE UPDATE ON public.quiz_attempts FROM authenticated;

-- 5. quiz_answers: only selection fields, only while in progress
DROP POLICY IF EXISTS "students manage own answers" ON public.quiz_answers;

CREATE POLICY "students read own answers"
ON public.quiz_answers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = quiz_answers.attempt_id AND a.student_id = auth.uid()));

CREATE POLICY "students insert own answers"
ON public.quiz_answers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = quiz_answers.attempt_id AND a.student_id = auth.uid() AND a.status = 'in_progress'));

CREATE POLICY "students update own answers"
ON public.quiz_answers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = quiz_answers.attempt_id AND a.student_id = auth.uid() AND a.status = 'in_progress'))
WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = quiz_answers.attempt_id AND a.student_id = auth.uid() AND a.status = 'in_progress'));

CREATE OR REPLACE FUNCTION public.quiz_answers_protect_grading()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF COALESCE(current_setting('app.quiz_grading', true), '') <> 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_correct := NULL;
      NEW.points_earned := 0;
    ELSE
      NEW.is_correct := OLD.is_correct;
      NEW.points_earned := OLD.points_earned;
      NEW.attempt_id := OLD.attempt_id;
      NEW.question_id := OLD.question_id;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_quiz_answers_protect_grading ON public.quiz_answers;
CREATE TRIGGER trg_quiz_answers_protect_grading
BEFORE INSERT OR UPDATE ON public.quiz_answers
FOR EACH ROW EXECUTE FUNCTION public.quiz_answers_protect_grading();

-- 6. quiz_options: hide is_correct from clients
REVOKE SELECT ON public.quiz_options FROM authenticated;
GRANT SELECT (id, question_id, order_index, option_text) ON public.quiz_options TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quiz_options TO authenticated;

CREATE OR REPLACE FUNCTION public.quiz_options_with_answers(_quiz uuid)
RETURNS TABLE(id uuid, question_id uuid, order_index int, option_text text, is_correct boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid := auth.uid(); allowed boolean := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF public.is_quiz_owner(_quiz, uid) OR private.has_role(uid, 'admin'::public.app_role) THEN
    allowed := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.quiz_id = _quiz AND a.student_id = uid AND a.status <> 'in_progress'
  ) THEN
    allowed := true;
  END IF;
  IF NOT allowed THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT o.id, o.question_id, o.order_index, o.option_text, o.is_correct
    FROM public.quiz_options o
    JOIN public.quiz_questions q ON q.id = o.question_id
    WHERE q.quiz_id = _quiz
    ORDER BY o.order_index;
END $function$;

REVOKE EXECUTE ON FUNCTION public.quiz_options_with_answers(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.quiz_options_with_answers(uuid) TO authenticated;