CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, user_id, full_name, avatar_url, cover_url, role, academic_title,
       student_id, department_id, level, points, bio, skills, interests,
       hobbies, favorites, followers_count, following_count, is_ta, gender,
       created_at
FROM public.profiles
WHERE is_disabled = false;

GRANT SELECT ON public.profiles_public TO authenticated;