
-- Step 1: Add scheduled time columns to lectures if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lectures' AND column_name = 'day_of_week') THEN
    ALTER TABLE public.lectures ADD COLUMN day_of_week TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lectures' AND column_name = 'start_time') THEN
    ALTER TABLE public.lectures ADD COLUMN start_time TIME;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lectures' AND column_name = 'end_time') THEN
    ALTER TABLE public.lectures ADD COLUMN end_time TIME;
  END IF;
END $$;

-- Step 2: Function to automatically deactivate expired lectures
CREATE OR REPLACE FUNCTION public.deactivate_expired_lectures()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_day TEXT;
    current_time_val TIME;
BEGIN
    current_day := trim(to_char(now(), 'Day'));
    current_time_val := now()::time;

    UPDATE public.lectures
    SET is_active = false,
        updated_at = now()
    WHERE is_active = true
      AND day_of_week IS NOT NULL
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
      AND (
          day_of_week != current_day 
          OR current_time_val > end_time
      );
      
    UPDATE public.lectures
    SET is_active = false,
        updated_at = now()
    WHERE is_active = true
      AND (day_of_week IS NULL OR start_time IS NULL OR end_time IS NULL)
      AND updated_at < (now() - interval '24 hours');
END;
$$;

-- Step 3: Trigger to check expiration on access or updates
CREATE OR REPLACE FUNCTION public.check_lecture_expiry_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true AND NEW.day_of_week IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        IF NEW.day_of_week != trim(to_char(now(), 'Day')) OR now()::time > NEW.end_time THEN
            NEW.is_active := false;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_lecture_expiry ON public.lectures;
CREATE TRIGGER tr_check_lecture_expiry
BEFORE UPDATE OR INSERT ON public.lectures
FOR EACH ROW EXECUTE FUNCTION public.check_lecture_expiry_trigger();

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.deactivate_expired_lectures() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_expired_lectures() TO service_role;
