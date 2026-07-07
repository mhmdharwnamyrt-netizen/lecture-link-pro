import { supabase } from '@/integrations/supabase/client';

export type QuizQuestionType = 'true_false' | 'single_choice' | 'multiple_choice';
export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'abandoned';

export interface Quiz {
  id: string;
  created_by: string;
  subject_id: string | null;
  department_id: string | null;
  level: number | null;
  group_name: string | null;
  title: string;
  description: string | null;
  duration_seconds: number;
  total_points: number;
  starts_at: string | null;
  ends_at: string | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_after: boolean;
  allow_review: boolean;
  max_attempts: number;
  passing_percentage: number;
  reward_points: number;
  is_published: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  order_index: number;
  question_type: QuizQuestionType;
  question_text: string;
  points: number;
  explanation: string | null;
  media_url: string | null;
}

export interface QuizOption {
  id: string;
  question_id: string;
  order_index: number;
  option_text: string;
  is_correct: boolean;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  time_taken_seconds: number | null;
  score: number;
  total_points: number;
  percentage: number;
  status: QuizAttemptStatus;
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids: string[];
  is_correct: boolean | null;
  points_earned: number;
  answered_at: string;
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export async function startQuizAttempt(quizId: string) {
  const { data, error } = await supabase.rpc('start_quiz_attempt' as any, { p_quiz_id: quizId });
  if (error) throw error;
  return data as string;
}

export async function submitQuizAttempt(attemptId: string) {
  const { data, error } = await supabase.rpc('submit_quiz_attempt' as any, { p_attempt_id: attemptId });
  if (error) throw error;
  return data as { ok: boolean; score: number; total: number; percentage: number; passed: boolean };
}

export async function upsertAnswer(attemptId: string, questionId: string, selectedIds: string[]) {
  const { error } = await supabase.from('quiz_answers' as any).upsert(
    { attempt_id: attemptId, question_id: questionId, selected_option_ids: selectedIds },
    { onConflict: 'attempt_id,question_id' }
  );
  if (error) throw error;
}
