
DO $$ BEGIN
  CREATE TYPE public.quiz_question_type AS ENUM ('true_false','single_choice','multiple_choice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.quiz_attempt_status AS ENUM ('in_progress','submitted','auto_submitted','abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  level INT,
  group_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INT NOT NULL DEFAULT 1800,
  total_points INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  show_correct_after BOOLEAN NOT NULL DEFAULT true,
  allow_review BOOLEAN NOT NULL DEFAULT true,
  max_attempts INT NOT NULL DEFAULT 1,
  passing_percentage INT NOT NULL DEFAULT 50,
  reward_points INT NOT NULL DEFAULT 5,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX idx_quizzes_dept_subject ON public.quizzes(department_id, subject_id);
CREATE INDEX idx_quizzes_active ON public.quizzes(is_published, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  question_type public.quiz_question_type NOT NULL,
  question_text TEXT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  explanation TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qq_quiz ON public.quiz_questions(quiz_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_qo_question ON public.quiz_options(question_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_options TO authenticated;
GRANT ALL ON public.quiz_options TO service_role;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_taken_seconds INT,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_points INT NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  status public.quiz_attempt_status NOT NULL DEFAULT 'in_progress'
);
CREATE INDEX idx_qa_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_qa_student ON public.quiz_attempts(student_id);
CREATE UNIQUE INDEX idx_qa_one_active ON public.quiz_attempts(quiz_id, student_id) WHERE status = 'in_progress';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_ids UUID[] NOT NULL DEFAULT '{}',
  is_correct BOOLEAN,
  points_earned NUMERIC(6,2) NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);
CREATE INDEX idx_qans_attempt ON public.quiz_answers(attempt_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_quiz_owner(_quiz uuid, _uid uuid)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.quizzes WHERE id = _quiz AND created_by = _uid);
$$;

CREATE OR REPLACE FUNCTION public.student_can_access_quiz(_quiz uuid, _uid uuid)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q RECORD; p RECORD;
BEGIN
  SELECT * INTO q FROM public.quizzes WHERE id = _quiz;
  IF NOT FOUND OR NOT q.is_published OR NOT q.is_active THEN RETURN false; END IF;
  SELECT department_id, level, role INTO p FROM public.profiles WHERE user_id = _uid;
  IF NOT FOUND OR p.role <> 'student' THEN RETURN false; END IF;
  IF q.department_id IS NOT NULL AND q.department_id <> p.department_id THEN RETURN false; END IF;
  IF q.level IS NOT NULL AND q.level <> p.level THEN RETURN false; END IF;
  RETURN true;
END $$;

CREATE POLICY "owners manage quizzes" ON public.quizzes
  FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "students read available quizzes" ON public.quizzes
  FOR SELECT TO authenticated
  USING (is_published = true AND is_active = true AND public.student_can_access_quiz(id, auth.uid()));
CREATE POLICY "admins full quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "owners manage questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (public.is_quiz_owner(quiz_id, auth.uid()))
  WITH CHECK (public.is_quiz_owner(quiz_id, auth.uid()));
CREATE POLICY "students read questions" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (public.student_can_access_quiz(quiz_id, auth.uid()));

CREATE POLICY "owners manage options" ON public.quiz_options
  FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.quiz_questions q WHERE q.id = question_id AND public.is_quiz_owner(q.quiz_id, auth.uid())))
  WITH CHECK (EXISTS(SELECT 1 FROM public.quiz_questions q WHERE q.id = question_id AND public.is_quiz_owner(q.quiz_id, auth.uid())));
CREATE POLICY "students read options" ON public.quiz_options
  FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.quiz_questions q WHERE q.id = question_id AND public.student_can_access_quiz(q.quiz_id, auth.uid())));

CREATE POLICY "students insert own attempts" ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.student_can_access_quiz(quiz_id, auth.uid()));
CREATE POLICY "students update own attempts" ON public.quiz_attempts
  FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "students read own attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "owners read attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (public.is_quiz_owner(quiz_id, auth.uid()));

CREATE POLICY "students manage own answers" ON public.quiz_answers
  FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid()));
CREATE POLICY "owners read answers" ON public.quiz_answers
  FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id WHERE a.id=attempt_id AND q.created_by=auth.uid()));

CREATE TRIGGER trg_quizzes_updated
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recompute_quiz_total_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE qid uuid;
BEGIN
  qid := COALESCE(NEW.quiz_id, OLD.quiz_id);
  UPDATE public.quizzes
     SET total_points = COALESCE((SELECT SUM(points) FROM public.quiz_questions WHERE quiz_id = qid), 0)
   WHERE id = qid;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_qq_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.recompute_quiz_total_points();

CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); q RECORD; used_count int; attempt_id uuid; existing uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO q FROM public.quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'quiz not found'; END IF;
  IF NOT q.is_published OR NOT q.is_active THEN RAISE EXCEPTION 'quiz not available'; END IF;
  IF q.starts_at IS NOT NULL AND q.starts_at > now() THEN RAISE EXCEPTION 'quiz not started'; END IF;
  IF q.ends_at IS NOT NULL AND q.ends_at < now() THEN RAISE EXCEPTION 'quiz ended'; END IF;
  IF NOT public.student_can_access_quiz(p_quiz_id, uid) THEN RAISE EXCEPTION 'not eligible'; END IF;
  SELECT id INTO existing FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id AND student_id = uid AND status = 'in_progress' LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  SELECT count(*) INTO used_count FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND student_id = uid;
  IF used_count >= q.max_attempts THEN RAISE EXCEPTION 'max attempts reached'; END IF;
  INSERT INTO public.quiz_attempts(quiz_id, student_id, attempt_number, total_points)
    VALUES (p_quiz_id, uid, used_count + 1, q.total_points)
    RETURNING id INTO attempt_id;
  RETURN attempt_id;
END $$;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); a RECORD; q RECORD;
  earned NUMERIC := 0; total INT := 0; pct NUMERIC := 0;
  q_row RECORD; correct_ids uuid[]; selected uuid[]; is_ok BOOLEAN; pts NUMERIC;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO a FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF a.student_id <> uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF a.status <> 'in_progress' THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'score', a.score, 'percentage', a.percentage);
  END IF;
  SELECT * INTO q FROM public.quizzes WHERE id = a.quiz_id;
  FOR q_row IN SELECT * FROM public.quiz_questions WHERE quiz_id = a.quiz_id LOOP
    total := total + q_row.points;
    SELECT COALESCE(array_agg(id), '{}') INTO correct_ids FROM public.quiz_options WHERE question_id = q_row.id AND is_correct = true;
    SELECT selected_option_ids INTO selected FROM public.quiz_answers WHERE attempt_id = p_attempt_id AND question_id = q_row.id;
    IF selected IS NULL THEN selected := '{}'; END IF;
    is_ok := (
      COALESCE(array_length(correct_ids,1),0) = COALESCE(array_length(selected,1),0)
      AND NOT EXISTS(SELECT unnest(correct_ids) EXCEPT SELECT unnest(selected))
      AND NOT EXISTS(SELECT unnest(selected) EXCEPT SELECT unnest(correct_ids))
    );
    pts := CASE WHEN is_ok THEN q_row.points ELSE 0 END;
    earned := earned + pts;
    INSERT INTO public.quiz_answers(attempt_id, question_id, selected_option_ids, is_correct, points_earned)
      VALUES (p_attempt_id, q_row.id, selected, is_ok, pts)
    ON CONFLICT (attempt_id, question_id) DO UPDATE
      SET is_correct = EXCLUDED.is_correct, points_earned = EXCLUDED.points_earned;
  END LOOP;
  pct := CASE WHEN total > 0 THEN ROUND((earned / total) * 100, 2) ELSE 0 END;
  UPDATE public.quiz_attempts
    SET submitted_at = now(),
        time_taken_seconds = EXTRACT(EPOCH FROM (now() - started_at))::int,
        score = earned, total_points = total, percentage = pct, status = 'submitted'
    WHERE id = p_attempt_id;
  IF pct >= q.passing_percentage AND q.reward_points > 0 THEN
    UPDATE public.profiles SET points = points + q.reward_points WHERE user_id = uid;
  END IF;
  RETURN jsonb_build_object('ok', true, 'score', earned, 'total', total, 'percentage', pct, 'passed', pct >= q.passing_percentage);
END $$;

GRANT EXECUTE ON FUNCTION public.start_quiz_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid) TO authenticated;
