
-- Add gender to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));

-- Function to handle default avatar logic
CREATE OR REPLACE FUNCTION public.get_default_avatar_url(p_role text, p_gender text, p_is_ta boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_sprite_set text;
  v_seed text;
BEGIN
  -- Assign sprite set based on role
  IF p_role = 'doctor' THEN
    IF p_is_ta THEN
      v_sprite_set := 'initials'; -- TAs get initials or a distinct style
    ELSE
      v_sprite_set := 'avataaars-neutral'; -- Doctors get a more formal style
    END IF;
  ELSE
    v_sprite_set := 'adventurer-neutral'; -- Students get a casual style
  END IF;

  -- Generate seed based on gender + random
  v_seed := CASE 
    WHEN p_gender = 'female' THEN 'girl' || floor(random() * 100)::text
    ELSE 'boy' || floor(random() * 100)::text
  END;

  RETURN 'https://api.dicebear.com/7.x/' || v_sprite_set || '/svg?seed=' || v_seed;
END;
$$;

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
