import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Clock, CheckCircle2, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDuration, type Quiz, type QuizAttempt, type QuizQuestion, type QuizOption, type QuizAnswer } from '@/lib/quizzes';

interface Props { role: 'doctor' | 'student' }

export default function QuizResult({ role }: Props) {
  const { id, attemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, QuizOption[]>>({});
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});

  useEffect(() => {
    if (!id || !attemptId) return;
    (async () => {
      const [{ data: q }, { data: a }] = await Promise.all([
        supabase.from('quizzes' as any).select('*').eq('id', id).maybeSingle(),
        supabase.from('quiz_attempts' as any).select('*').eq('id', attemptId).maybeSingle(),
      ]);
      setQuiz(q as any); setAttempt(a as any);
      if ((q as any)?.show_correct_after && (q as any)?.allow_review) {
        const { data: qs } = await supabase.from('quiz_questions' as any).select('*').eq('quiz_id', id).order('order_index');
        const qq = ((qs || []) as any) as QuizQuestion[];
        setQuestions(qq);
        const { data: opts } = await supabase.from('quiz_options' as any).select('*').in('question_id', qq.map((x) => x.id));
        const map: Record<string, QuizOption[]> = {};
        (opts || []).forEach((o: any) => { (map[o.question_id] ||= []).push(o as any); });
        Object.keys(map).forEach((k) => map[k].sort((a, b) => a.order_index - b.order_index));
        setOptionsMap(map);
        const { data: ans } = await supabase.from('quiz_answers' as any).select('*').eq('attempt_id', attemptId);
        const aMap: Record<string, QuizAnswer> = {};
        (ans || []).forEach((x: any) => { aMap[x.question_id] = x as QuizAnswer; });
        setAnswers(aMap);
      }
      setLoading(false);
    })();
  }, [id, attemptId]);

  if (loading) return <MobileLayout role={role}><div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div></MobileLayout>;
  if (!quiz || !attempt) return null;

  const passed = Number(attempt.percentage) >= quiz.passing_percentage;

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <Link to={`/${role}/quizzes`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> العودة للاختبارات
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-6 text-center shadow-elevated"
        >
          <div className={`mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full ${passed ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'}`}>
            <Trophy className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold tabular-nums">{Number(attempt.percentage).toFixed(0)}%</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {Number(attempt.score).toFixed(0)} من {attempt.total_points} نقطة
          </p>
          <Badge variant={passed ? 'default' : 'secondary'} className="mt-3">
            {passed ? `نجحت — +${quiz.reward_points} نقطة` : 'لم تحقق حد النجاح'}
          </Badge>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> الوقت المستغرق</div>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatDuration(attempt.time_taken_seconds || 0)}</p>
          </Card>
          <Card className="rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Trophy className="h-3.5 w-3.5" /> حد النجاح</div>
            <p className="mt-1 text-lg font-bold tabular-nums">{quiz.passing_percentage}%</p>
          </Card>
        </div>

        {quiz.show_correct_after && quiz.allow_review && questions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold">مراجعة الإجابات</h2>
            {questions.map((qq, i) => {
              const ans = answers[qq.id];
              const opts = optionsMap[qq.id] || [];
              const selected = new Set(ans?.selected_option_ids || []);
              return (
                <Card key={qq.id} className={`rounded-2xl p-4 ${ans?.is_correct ? 'border-emerald-500/40' : 'border-destructive/40'}`}>
                  <div className="mb-2 flex items-center gap-2 text-xs">
                    <span className="font-semibold">س{i + 1}</span>
                    {ans?.is_correct ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="text-muted-foreground">{Number(ans?.points_earned || 0).toFixed(0)} / {qq.points}</span>
                  </div>
                  <p className="mb-3 text-sm font-semibold">{qq.question_text}</p>
                  <div className="space-y-1.5">
                    {opts.map((o) => {
                      const isSel = selected.has(o.id);
                      const isCor = o.is_correct;
                      return (
                        <div key={o.id} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${
                          isCor ? 'border-emerald-500/50 bg-emerald-500/5' :
                          isSel ? 'border-destructive/50 bg-destructive/5' :
                          'border-border/40'
                        }`}>
                          {isCor && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                          {isSel && !isCor && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                          {!isSel && !isCor && <div className="h-4 w-4 shrink-0" />}
                          <span>{o.option_text}</span>
                        </div>
                      );
                    })}
                  </div>
                  {qq.explanation && (
                    <p className="mt-3 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                      💡 {qq.explanation}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <Link to={`/${role}/quizzes`}>
          <Button className="w-full" variant="outline">العودة</Button>
        </Link>
      </div>
    </MobileLayout>
  );
}
