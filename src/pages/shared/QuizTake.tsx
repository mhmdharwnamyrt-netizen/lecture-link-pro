import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Send, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { formatDuration, startQuizAttempt, submitQuizAttempt, upsertAnswer, type Quiz, type QuizQuestion, type QuizOption } from '@/lib/quizzes';
import { toast } from 'sonner';

interface Props { role: 'doctor' | 'student' }

export default function QuizTake({ role }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, QuizOption[]>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const startedAtRef = useRef<number>(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      try {
        // Start (or resume) attempt via RPC
        const aid = await startQuizAttempt(id);
        setAttemptId(aid);
        const { data: q } = await supabase.from('quizzes' as any).select('*').eq('id', id).maybeSingle();
        if (!q) throw new Error('Quiz not found');
        const { data: qs } = await supabase.from('quiz_questions' as any).select('*').eq('quiz_id', id).order('order_index');
        const qq = ((qs || []) as any) as QuizQuestion[];
        const { data: opts } = await supabase.from('quiz_options' as any).select('*').in('question_id', qq.map((x) => x.id));
        const map: Record<string, QuizOption[]> = {};
        (opts || []).forEach((o: any) => { (map[o.question_id] ||= []).push(o); });
        Object.keys(map).forEach((k) => map[k].sort((a, b) => a.order_index - b.order_index));

        // Existing answers
        const { data: ex } = await supabase.from('quiz_answers' as any).select('*').eq('attempt_id', aid);
        const ans: Record<string, string[]> = {};
        (ex || []).forEach((a: any) => { ans[a.question_id] = a.selected_option_ids || []; });

        const qz = q as any;
        setQuiz(qz);
        let questionsOrdered = qq;
        if (qz.shuffle_questions) questionsOrdered = [...qq].sort(() => Math.random() - 0.5);
        if (qz.shuffle_options) Object.keys(map).forEach((k) => { map[k] = [...map[k]].sort(() => Math.random() - 0.5); });
        setQuestions(questionsOrdered);
        setOptionsMap(map);
        setAnswers(ans);

        // Attempt started_at may be earlier if resumed
        const { data: attRow } = await supabase.from('quiz_attempts' as any).select('started_at').eq('id', aid).maybeSingle();
        const startedTs = attRow ? new Date((attRow as any).started_at).getTime() : Date.now();
        startedAtRef.current = startedTs;
        const remain = Math.max(0, qz.duration_seconds - Math.floor((Date.now() - startedTs) / 1000));
        setTimeLeft(remain);
        setLoading(false);
      } catch (e: any) {
        toast.error(e.message || 'خطأ في بدء الاختبار');
        navigate(`/${role}/quizzes`);
      }
    })();
  }, [id, user, navigate, role]);

  // Timer
  useEffect(() => {
    if (!quiz || submittedRef.current) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          doSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [quiz]);

  // Prevent leaving
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const q = questions[current];
  const opts = q ? optionsMap[q.id] || [] : [];
  const currentAns = q ? (answers[q.id] || []) : [];

  const setAnswer = async (selected: string[]) => {
    if (!q || !attemptId) return;
    setAnswers({ ...answers, [q.id]: selected });
    try { await upsertAnswer(attemptId, q.id, selected); } catch {}
  };

  const onSingleChoose = (optId: string) => setAnswer([optId]);
  const onMultiToggle = (optId: string, checked: boolean) => {
    const next = checked ? [...currentAns, optId] : currentAns.filter((x) => x !== optId);
    setAnswer(next);
  };

  const doSubmit = async (auto = false) => {
    if (!attemptId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      // For auto-submit, mark status differently
      if (auto) {
        await supabase.from('quiz_attempts' as any).update({ status: 'auto_submitted' }).eq('id', attemptId);
      }
      await submitQuizAttempt(attemptId);
      toast.success(auto ? 'انتهى الوقت — تم التسليم' : 'تم التسليم');
      navigate(`/${role}/quizzes/${id}/result/${attemptId}`);
    } catch (e: any) {
      toast.error(e.message || 'خطأ في التسليم');
      setSubmitting(false);
      submittedRef.current = false;
    }
  };

  const progress = useMemo(() => questions.length ? ((current + 1) / questions.length) * 100 : 0, [current, questions.length]);
  const answered = useMemo(() => Object.values(answers).filter((v) => v.length).length, [answers]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!q) return null;

  const timeUrgent = timeLeft < 60;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Sticky header with timer */}
      <div className="sticky top-0 z-30 border-b border-border/40 bg-card/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{quiz?.title}</p>
              <p className="text-[10px] text-muted-foreground">سؤال {current + 1} / {questions.length} · تم الإجابة عن {answered}</p>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-mono font-bold tabular-nums ${timeUrgent ? 'bg-destructive/15 text-destructive animate-pulse' : 'bg-primary/10 text-primary'}`}>
              <Clock className="h-3.5 w-3.5" /> {formatDuration(timeLeft)}
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} transition={{ type: 'spring', damping: 20 }} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="rounded-3xl border-border/40 p-5 shadow-elevated">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {q.question_type === 'true_false' ? 'صح أم خطأ' : q.question_type === 'single_choice' ? 'اختيار واحد' : 'اختيار متعدد'}
                  </div>
                  <h2 className="text-lg font-bold leading-relaxed">{q.question_text}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{q.points} نقطة</p>
                </div>
              </div>

              {q.question_type === 'multiple_choice' ? (
                <div className="space-y-2">
                  {opts.map((o) => {
                    const checked = currentAns.includes(o.id);
                    return (
                      <label
                        key={o.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                          checked ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={(v) => onMultiToggle(o.id, !!v)} />
                        <span className="text-sm font-medium">{o.option_text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <RadioGroup value={currentAns[0] || ''} onValueChange={onSingleChoose}>
                  <div className="space-y-2">
                    {opts.map((o) => {
                      const checked = currentAns[0] === o.id;
                      return (
                        <label
                          key={o.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${
                            checked ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <RadioGroupItem value={o.id} />
                          <span className="text-sm font-medium">{o.option_text}</span>
                        </label>
                      );
                    })}
                  </div>
                </RadioGroup>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Question navigator */}
        <Card className="rounded-2xl p-3">
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
            {questions.map((qq, i) => {
              const ans = (answers[qq.id] || []).length > 0;
              const cur = i === current;
              return (
                <button
                  key={qq.id}
                  onClick={() => setCurrent(i)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                    cur ? 'bg-primary text-primary-foreground scale-110' :
                    ans ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Sticky nav */}
      <div className="sticky bottom-0 z-30 border-t border-border/40 bg-card/95 p-3 backdrop-blur-xl safe-bottom">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(current - 1)} className="flex-1">
            <ChevronRight className="h-4 w-4" /> السابق
          </Button>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent(current + 1)} className="flex-1">
              التالي <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="me-1 h-4 w-4" /> تسليم</>}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> تسليم الاختبار
            </AlertDialogTitle>
            <AlertDialogDescription>
              أجبت عن {answered} من {questions.length} سؤال. هل تريد التسليم؟ لن تستطيع التعديل بعد ذلك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => doSubmit(false)}>تسليم</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
