import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChart3, TrendingUp, Users, BookOpen, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function DoctorAnalytics() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const [lectureStats, setLectureStats] = useState<any[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
  const [totalStats, setTotalStats] = useState({ lectures: 0, students: 0, rate: 0 });
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<{ alerts: any[]; summary: string } | null>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'doctor')) navigate('/login');
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) loadAnalytics();
  }, [profile]);

  const loadAnalytics = async () => {
    if (!profile) return;

    const { data: lectures } = await supabase
      .from('lectures')
      .select('*, departments(name)')
      .eq('doctor_id', profile.id);

    if (!lectures) return;

    const lectureIds = lectures.map(l => l.id);
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .in('lecture_id', lectureIds);

    // Attendance by level
    const byLevel: Record<number, number> = {};
    lectures.forEach(l => {
      const count = attendance?.filter(a => a.lecture_id === l.id && (a.status === 'present' || a.status === 'excused')).length || 0;
      byLevel[l.level] = (byLevel[l.level] || 0) + count;
    });

    setLectureStats(
      Object.entries(byLevel).map(([level, count]) => ({ name: `Level ${level}`, attendance: count }))
    );

    // Weekly trend
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
    }
    attendance?.forEach(a => {
      const day = new Date(a.created_at).toLocaleDateString('en-US', { weekday: 'short' });
      if (day in last7Days) last7Days[day]++;
    });
    setWeeklyTrend(Object.entries(last7Days).map(([day, count]) => ({ day, count })));

    const uniqueStudents = new Set(attendance?.map(a => a.student_id) || []);
    setTotalStats({
      lectures: lectures.length,
      students: uniqueStudents.size,
      rate: lectures.length > 0 ? Math.round(((attendance?.length || 0) / lectures.length) * 10) / 10 : 0,
    });
  };

  if (loading || !profile) return null;

  return (
    <MobileLayout role="doctor">
      <div >
        <div className="px-4 pt-6 md:px-8">
          <h1 className="mb-4 text-2xl font-bold">Analytics</h1>

          {/* Overview */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <BookOpen className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-xl font-bold tabular-nums">{totalStats.lectures}</p>
              <p className="text-xs text-muted-foreground">Lectures</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <Users className="mx-auto mb-1 h-5 w-5 text-accent" />
              <p className="text-xl font-bold tabular-nums">{totalStats.students}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <TrendingUp className="mx-auto mb-1 h-5 w-5 text-success" />
              <p className="text-xl font-bold tabular-nums">{totalStats.rate}</p>
              <p className="text-xs text-muted-foreground">Avg/Lecture</p>
            </div>
          </div>

          {/* Attendance by Level */}
          <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
            <h2 className="mb-4 font-semibold">Attendance by Level</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lectureStats}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="attendance" fill="hsl(221, 83%, 53%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
            <h2 className="mb-4 font-semibold">Weekly Trend</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ fill: 'hsl(142, 71%, 45%)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
