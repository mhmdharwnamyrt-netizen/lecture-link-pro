import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Users, Clock, Download, Search, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SmartAvatarImage from '@/components/SmartAvatarImage';
import { formatDuration, type Quiz, type QuizAttempt } from '@/lib/quizzes';
import { format } from 'date-fns';

interface Props { role: 'doctor' | 'student' }

interface Row extends QuizAttempt {
  profile?: { full_name: string; avatar_url: string | null; student_id: string | null };
}

export default function QuizResults({ role }: Props) {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: q } = await supabase.from('quizzes' as any).select('*').eq('id', id).maybeSingle();
      setQuiz(q as any);
      const { data: att } = await supabase.from('quiz_attempts' as any).select('*').eq('quiz_id', id).order('submitted_at', { ascending: false });
      const list = ((att || []) as any) as Row[];
      const ids = Array.from(new Set(list.map((r) => r.student_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name, avatar_url, student_id').in('user_id', ids);
        const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
        list.forEach((r) => { r.profile = map.get(r.student_id) as any; });
      }
      setRows(list);
      setLoading(false);
    })();
  }, [id]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter((r) => !s || (r.profile?.full_name || '').toLowerCase().includes(s) || (r.profile?.student_id || '').toLowerCase().includes(s));
  }, [rows, search]);

  const submitted = rows.filter((r) => r.status === 'submitted' || r.status === 'auto_submitted');
  const avg = submitted.length ? Math.round(submitted.reduce((s, r) => s + Number(r.percentage), 0) / submitted.length) : 0;
  const passed = quiz ? submitted.filter((r) => Number(r.percentage) >= quiz.passing_percentage).length : 0;

  const exportCsv = () => {
    const header = ['name', 'student_id', 'score', 'total', 'percentage', 'time_seconds', 'submitted_at', 'status'];
    const lines = [header.join(',')].concat(
      filtered.map((r) => [
        r.profile?.full_name || '', r.profile?.student_id || '', r.score, r.total_points,
        r.percentage, r.time_taken_seconds || 0, r.submitted_at || '', r.status,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${quiz?.title || 'quiz'}-results.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <MobileLayout role={role}><div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div></MobileLayout>;
  if (!quiz) return null;

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        <Link to={`/${role}/quizzes`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> العودة
        </Link>

        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <p className="text-sm text-muted-foreground">نتائج الاختبار</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Users} label="محاولات" value={submitted.length} tint="from-sky-500/20 to-blue-500/5" />
          <StatCard icon={Trophy} label="ناجحون" value={passed} tint="from-emerald-500/20 to-teal-500/5" />
          <StatCard icon={TrendingUp} label="متوسط" value={`${avg}%`} tint="from-amber-500/20 to-orange-500/5" />
          <StatCard icon={Clock} label="مدة" value={formatDuration(quiz.duration_seconds)} tint="from-violet-500/20 to-purple-500/5" />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم" className="ps-9" />
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="me-1 h-4 w-4" /> CSV</Button>
        </div>

        <Card className="overflow-hidden rounded-2xl">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">لا نتائج بعد.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((r, i) => {
                const pct = Number(r.percentage);
                const pass = pct >= quiz.passing_percentage;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 p-3 hover:bg-muted/30"
                  >
                    <Avatar className="h-10 w-10">
                      <SmartAvatarImage src={r.profile?.avatar_url} />
                      <AvatarFallback className="text-xs">{(r.profile?.full_name || '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">{r.profile?.full_name || 'طالب'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.profile?.student_id} · {r.submitted_at ? format(new Date(r.submitted_at), 'yyyy-MM-dd HH:mm') : '—'} · {formatDuration(r.time_taken_seconds || 0)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className={`text-lg font-bold tabular-nums ${pass ? 'text-emerald-500' : 'text-destructive'}`}>{pct.toFixed(0)}%</p>
                      <Badge variant={pass ? 'default' : 'secondary'} className="text-[10px]">
                        {Number(r.score).toFixed(0)}/{r.total_points}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </MobileLayout>
  );
}

function StatCard({ icon: Icon, label, value, tint }: any) {
  return (
    <Card className={`relative overflow-hidden rounded-2xl border-border/40 p-4`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${tint} opacity-70`} />
      <div className="relative">
        <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </div>
    </Card>
  );
}
