import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Trophy, Medal, Building2 } from 'lucide-react';

type Period = 'week' | 'month' | 'all';

export default function Leaderboard() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [tab, setTab] = useState<'students' | 'departments'>('students');

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user]);

  useEffect(() => { if (profile) load(); }, [profile, period]);

  useEffect(() => {
    const ch = supabase
      .channel('lb-attendance')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [period, profile]);

  const since = () => {
    const now = new Date();
    if (period === 'week') now.setDate(now.getDate() - 7);
    else if (period === 'month') now.setMonth(now.getMonth() - 1);
    else return null;
    return now.toISOString();
  };

  const load = async () => {
    const cutoff = since();
    let q = supabase
      .from('attendance')
      .select('student_id, status, profiles!attendance_student_id_fkey(id, full_name, points, department_id, departments(name, name_ar))');
    if (cutoff) q = q.gte('created_at', cutoff);
    const { data } = await q;
    if (!data) return;

    const studentMap = new Map<string, any>();
    const deptMap = new Map<string, any>();
    data.forEach((row: any) => {
      const p = row.profiles;
      if (!p) return;
      if (row.status !== 'present' && row.status !== 'excused') return;
      const sCur = studentMap.get(p.id) || { id: p.id, name: p.full_name, points: 0 };
      sCur.points += 3;
      studentMap.set(p.id, sCur);
      if (p.department_id) {
        const dCur = deptMap.get(p.department_id) || { id: p.department_id, name: language === 'ar' ? (p.departments?.name_ar || p.departments?.name) : p.departments?.name, points: 0, students: new Set() };
        dCur.points += 3;
        dCur.students.add(p.id);
        deptMap.set(p.department_id, dCur);
      }
    });
    setStudents(Array.from(studentMap.values()).sort((a, b) => b.points - a.points).slice(0, 50));
    setDepartments(
      Array.from(deptMap.values())
        .map(d => ({ ...d, studentCount: d.students.size }))
        .sort((a, b) => b.points - a.points)
    );
  };

  if (loading || !profile) return null;

  const medal = (i: number) => {
    if (i === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (i === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (i === 2) return <Medal className="h-5 w-5 text-orange-500" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{i + 1}</span>;
  };

  return (
    <MobileLayout role={profile.role}>
      <div className="px-4 pt-2 md:pt-6 md:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Trophy className="h-7 w-7 text-warning" />
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'لوحة الصدارة' : 'Leaderboard'}</h1>
        </div>

        {/* Period filter */}
        <div className="mb-4 flex gap-2 rounded-2xl bg-muted p-1">
          {(['week', 'month', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${period === p ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground'}`}
            >
              {language === 'ar'
                ? (p === 'week' ? 'أسبوع' : p === 'month' ? 'شهر' : 'الكل')
                : (p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All')}
            </button>
          ))}
        </div>

        {/* Tab */}
        <div className="mb-4 flex gap-2 rounded-2xl bg-muted p-1">
          <button onClick={() => setTab('students')} className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${tab === 'students' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>
            {language === 'ar' ? 'الطلاب' : 'Students'}
          </button>
          <button onClick={() => setTab('departments')} className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${tab === 'departments' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>
            {language === 'ar' ? 'الأقسام' : 'Departments'}
          </button>
        </div>

        {tab === 'students' ? (
          <div className="space-y-2">
            {students.length === 0 && (
              <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">
                {language === 'ar' ? 'لا توجد بيانات بعد' : 'No data yet'}
              </div>
            )}
            {students.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 rounded-2xl p-3 shadow-card ${
                  s.id === profile.id ? 'bg-primary/10 ring-1 ring-primary' : 'bg-card'
                } ${i < 3 ? 'ring-1 ring-warning/30' : ''}`}
              >
                <div className="flex h-9 w-9 items-center justify-center">{medal(i)}</div>
                <div className="flex-1">
                  <p className="font-semibold">{s.name}</p>
                  {s.id === profile.id && <p className="text-xs text-primary">{language === 'ar' ? 'أنت' : 'You'}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-primary">{s.points}</p>
                  <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'نقطة' : 'pts'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {departments.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card"
              >
                <div className="flex h-9 w-9 items-center justify-center">{medal(i)}</div>
                <Building2 className="h-5 w-5 text-accent" />
                <div className="flex-1">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.studentCount} {language === 'ar' ? 'طالب' : 'students'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-primary">{d.points}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
