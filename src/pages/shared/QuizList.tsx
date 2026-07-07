import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Clock, Trophy, Users, CheckCircle2, PlayCircle, Calendar, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDuration, type Quiz, type QuizAttempt } from '@/lib/quizzes';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props { role: 'doctor' | 'student' }

export default function QuizList({ role }: Props) {
  const { user, profile } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Record<string, QuizAttempt[]>>({});
  const [stats, setStats] = useState<Record<string, { attempts: number; avg: number }>>({});

  const isCreator = role === 'doctor' || !!profile?.is_ta;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      if (isCreator) {
        const { data: qs } = await supabase.from('quizzes' as any)
          .select('*').eq('created_by', user.id).order('created_at', { ascending: false });
        const quizList = (qs || []) as unknown as Quiz[];
        setQuizzes(quizList);
        // stats
        if (quizList.length) {
          const ids = quizList.map((q) => q.id);
          const { data: atts } = await supabase.from('quiz_attempts' as any)
            .select('quiz_id, percentage, status').in('quiz_id', ids);
          const st: Record<string, { attempts: number; avg: number }> = {};
          for (const id of ids) st[id] = { attempts: 0, avg: 0 };
          (atts || []).forEach((a: any) => {
            if (a.status === 'submitted' || a.status === 'auto_submitted') {
              st[a.quiz_id].attempts++;
              st[a.quiz_id].avg += Number(a.percentage);
            }
          });
          Object.keys(st).forEach((id) => { if (st[id].attempts) st[id].avg = Math.round(st[id].avg / st[id].attempts); });
          setStats(st);
        }
      } else {
        // Student — RLS filters to eligible quizzes
        const { data: qs } = await supabase.from('quizzes' as any)
          .select('*').eq('is_published', true).eq('is_active', true)
          .order('created_at', { ascending: false });
        const quizList = (qs || []) as unknown as Quiz[];
        setQuizzes(quizList);
        // student attempts
        if (quizList.length) {
          const { data: mine } = await supabase.from('quiz_attempts' as any)
            .select('*').eq('student_id', user.id).in('quiz_id', quizList.map((q) => q.id));
          const byQuiz: Record<string, QuizAttempt[]> = {};
          (mine || []).forEach((a: any) => {
            (byQuiz[a.quiz_id] ||= []).push(a as QuizAttempt);
          });
          setAttempts(byQuiz);
        }
      }
      setLoading(false);
    })();
  }, [user, isCreator]);

  const base = `/${role}`;
  const now = Date.now();

  const isAvailable = (q: Quiz) => {
    if (q.starts_at && new Date(q.starts_at).getTime() > now) return false;
    if (q.ends_at && new Date(q.ends_at).getTime() < now) return false;
    return true;
  };

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-5 shadow-elevated"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> نظام الاختبارات
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isCreator ? 'أنشئ اختبارات وتابع أداء الطلاب.' : 'اختبارات مخصّصة لقسمك وفرقتك.'}
              </p>
            </div>
            {isCreator && (
              <Button onClick={() => navigate(`${base}/quizzes/new`)} size="sm" className="gap-1 shrink-0">
                <Plus className="h-4 w-4" /> جديد
              </Button>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="rounded-2xl p-10 text-center text-muted-foreground">
            {isCreator ? 'لم تنشئ أي اختبار بعد.' : 'لا توجد اختبارات متاحة حاليًا.'}
          </Card>
        ) : isCreator ? (
          <div className="space-y-3">
            {quizzes.map((q, idx) => {
              const st = stats[q.id] || { attempts: 0, avg: 0 };
              return (
                <motion.div key={q.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Link to={`${base}/quizzes/${q.id}/results`}>
                    <Card className="group relative overflow-hidden rounded-2xl border-border/50 p-4 transition-all hover:shadow-elevated hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <Badge variant={q.is_published ? 'default' : 'secondary'} className="text-[10px]">
                              {q.is_published ? 'منشور' : 'مسودة'}
                            </Badge>
                            {!isAvailable(q) && q.ends_at && new Date(q.ends_at).getTime() < now && (
                              <Badge variant="outline" className="text-[10px]">منتهي</Badge>
                            )}
                          </div>
                          <h3 className="line-clamp-1 text-base font-bold">{q.title}</h3>
                          {q.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{q.description}</p>
                          )}
                        </div>
                        <div className={`shrink-0 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ${isRTL ? 'ms-2' : 'me-0'}`}>
                          <Trophy className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(q.duration_seconds)}</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {st.attempts} محاولة</span>
                        {st.attempts > 0 && (
                          <span className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-amber-500" /> متوسط {st.avg}%</span>
                        )}
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: ar })}</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.preventDefault(); navigate(`${base}/quizzes/${q.id}/edit`); }}>تعديل</Button>
                        <Button size="sm" className="flex-1" onClick={(e) => { e.preventDefault(); navigate(`${base}/quizzes/${q.id}/results`); }}>النتائج</Button>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Tabs defaultValue="available">
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="available">المتاحة</TabsTrigger>
              <TabsTrigger className="flex-1" value="completed">أُنجزت</TabsTrigger>
            </TabsList>
            <TabsContent value="available" className="mt-4 space-y-3">
              {quizzes.filter((q) => isAvailable(q) && !(attempts[q.id]?.some(a => a.status !== 'in_progress'))).map((q, idx) => (
                <StudentQuizCard key={q.id} q={q} attempts={attempts[q.id] || []} base={base} idx={idx} />
              ))}
              {quizzes.filter((q) => isAvailable(q) && !(attempts[q.id]?.some(a => a.status !== 'in_progress'))).length === 0 && (
                <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">لا اختبارات متاحة الآن.</Card>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-4 space-y-3">
              {quizzes.filter((q) => attempts[q.id]?.some(a => a.status !== 'in_progress')).map((q, idx) => (
                <StudentQuizCard key={q.id} q={q} attempts={attempts[q.id] || []} base={base} idx={idx} />
              ))}
              {quizzes.filter((q) => attempts[q.id]?.some(a => a.status !== 'in_progress')).length === 0 && (
                <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">لم تُنجز أي اختبار بعد.</Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MobileLayout>
  );
}

function StudentQuizCard({ q, attempts, base, idx }: { q: Quiz; attempts: QuizAttempt[]; base: string; idx: number }) {
  const finished = attempts.find((a) => a.status !== 'in_progress');
  const inProgress = attempts.find((a) => a.status === 'in_progress');
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
    >
      <Card className="group overflow-hidden rounded-2xl border-border/50 p-4 transition-all hover:shadow-elevated hover:-translate-y-0.5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
            {finished ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <PlayCircle className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="line-clamp-1 text-base font-bold">{q.title}</h3>
            {q.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{q.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(q.duration_seconds)}</span>
              {q.ends_at && <span>ينتهي {formatDistanceToNow(new Date(q.ends_at), { addSuffix: true, locale: ar })}</span>}
            </div>
          </div>
        </div>
        <div className="mt-3">
          {finished ? (
            <Link to={`${base}/quizzes/${q.id}/result/${finished.id}`}>
              <Button className="w-full" variant="outline">
                <Trophy className="me-1 h-4 w-4" /> النتيجة {Number(finished.percentage).toFixed(0)}%
              </Button>
            </Link>
          ) : (
            <Link to={`${base}/quizzes/${q.id}/take`}>
              <Button className="w-full">{inProgress ? 'إكمال الاختبار' : 'ابدأ الاختبار'}</Button>
            </Link>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
