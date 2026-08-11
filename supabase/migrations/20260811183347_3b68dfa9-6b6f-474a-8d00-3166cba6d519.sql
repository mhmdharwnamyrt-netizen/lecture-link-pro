-- 1. Lock down SECURITY DEFINER functions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.is_quiz_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_can_access_quiz(uuid, uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.db_health_snapshot() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.db_integrity_check() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rebuild_statistics() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_leaderboard(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_admin_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_quiz_attempt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.db_health_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.db_integrity_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_leaderboard(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_admin_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid) TO authenticated;

-- 2. face-photos: scope doctor access to their own departments
DROP POLICY IF EXISTS "face-photos owner select" ON storage.objects;
CREATE POLICY "face-photos owner select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'face-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.profiles doc
      JOIN public.profiles stu ON stu.user_id::text = (storage.foldername(name))[1]
      WHERE doc.user_id = auth.uid()
        AND (doc.role = 'doctor' OR doc.is_ta = true)
        AND stu.role = 'student'
        AND stu.department_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.lectures l
            WHERE l.doctor_id = doc.id
              AND l.department_id = stu.department_id
              AND (stu.level IS NULL OR l.level = stu.level)
          )
          OR EXISTS (
            SELECT 1 FROM public.doctor_departments dd
            WHERE dd.doctor_id = doc.id
              AND dd.department_id = stu.department_id
              AND (stu.level IS NULL OR dd.level = stu.level)
          )
        )
    )
  )
);

-- 3. message-attachments: only conversation participants (community media stays shared)
DROP POLICY IF EXISTS "msg attach read authenticated" ON storage.objects;
CREATE POLICY "msg attach read participants" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%/community/%'
    OR EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE m.attachment_url LIKE '%' || name
        AND (m.sender_id = p.id OR m.receiver_id = p.id)
    )
  )
);

-- 4. office_hour_bookings: prevent moving a booking to an unowned slot
DROP POLICY IF EXISTS "Doctors can update bookings" ON public.office_hour_bookings;
CREATE POLICY "Doctors can update bookings" ON public.office_hour_bookings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.office_hours oh
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE oh.id = office_hour_bookings.slot_id AND oh.doctor_id = p.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.office_hours oh
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE oh.id = office_hour_bookings.slot_id AND oh.doctor_id = p.id
  )
);

-- 5. training_applications: mirror ownership check on write
DROP POLICY IF EXISTS "ta_update_owner_admin" ON public.training_applications;
CREATE POLICY "ta_update_owner_admin" ON public.training_applications
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainings t
    WHERE t.id = training_applications.training_id
      AND (t.created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainings t
    WHERE t.id = training_applications.training_id
      AND (t.created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

-- 6. quiz_attempts: students cannot falsify grading fields
CREATE OR REPLACE FUNCTION public.quiz_attempts_protect_scoring()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.quiz_grading', true), '') <> 'on' THEN
    NEW.score := OLD.score;
    NEW.total_points := OLD.total_points;
    NEW.percentage := OLD.percentage;
    NEW.status := OLD.status;
    NEW.submitted_at := OLD.submitted_at;
    NEW.time_taken_seconds := OLD.time_taken_seconds;
    NEW.attempt_number := OLD.attempt_number;
    NEW.quiz_id := OLD.quiz_id;
    NEW.student_id := OLD.student_id;
    NEW.started_at := OLD.started_at;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.quiz_attempts_protect_scoring() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_quiz_attempts_protect_scoring ON public.quiz_attempts;
CREATE TRIGGER trg_quiz_attempts_protect_scoring
BEFORE UPDATE ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.quiz_attempts_protect_scoring();

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_attempt_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  PERFORM set_config('app.quiz_grading', 'on', true);
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
  PERFORM set_config('app.quiz_grading', 'off', true);
  IF pct >= q.passing_percentage AND q.reward_points > 0 THEN
    UPDATE public.profiles SET points = points + q.reward_points WHERE user_id = uid;
  END IF;
  RETURN jsonb_build_object('ok', true, 'score', earned, 'total', total, 'percentage', pct, 'passed', pct >= q.passing_percentage);
END $function$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid) TO authenticated;