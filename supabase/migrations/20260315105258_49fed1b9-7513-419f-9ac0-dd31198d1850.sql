
-- Fix: Allow doctors to send notifications to students
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Authenticated can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Face templates table
CREATE TABLE IF NOT EXISTS face_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  front_photo_url text NOT NULL,
  right_photo_url text,
  left_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE face_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own face template" ON face_templates FOR INSERT TO authenticated WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Students can update own face template" ON face_templates FOR UPDATE TO authenticated USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Face templates viewable by authenticated" ON face_templates FOR SELECT TO authenticated USING (true);

-- Add face verification columns to attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verification_photo_url text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_match_score real;

-- Unique constraint for attendance (needed for upsert)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_lecture_unique') THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_student_lecture_unique UNIQUE (student_id, lecture_id);
  END IF;
END $$;

-- Storage bucket for face photos
INSERT INTO storage.buckets (id, name, public) VALUES ('face-photos', 'face-photos', true) ON CONFLICT DO NOTHING;

-- Storage RLS
CREATE POLICY "Auth users can upload face photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'face-photos');
CREATE POLICY "Anyone can view face photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'face-photos');
CREATE POLICY "Users can update own face photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'face-photos');
