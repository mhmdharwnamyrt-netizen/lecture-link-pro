
-- Add reaction type to reactions table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'study_group_reactions' AND column_name = 'reaction_type') THEN
    ALTER TABLE public.study_group_reactions ADD COLUMN reaction_type TEXT DEFAULT 'like';
  END IF;
END $$;

-- Update messages fetch logic or views if needed to aggregate reactions
-- For now, the client will aggregate, but let's ensure the table is ready.
GRANT ALL ON public.study_group_reactions TO authenticated;
GRANT ALL ON public.study_group_reactions TO service_role;
