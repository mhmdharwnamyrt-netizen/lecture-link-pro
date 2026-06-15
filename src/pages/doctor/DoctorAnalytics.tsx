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

  const runSmartInsights = async () => {
    if (!profile) return;
    setInsightsLoading(true);
    setInsights(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-attendance', {
        body: { doctorId: profile.id },
      });
      if (error) throw error;
      setInsights({ alerts: data?.alerts || [], summary: data?.summary || '' });
      toast.success(data?.summary || 'Analysis complete');
    } catch (err: any) {
      toast.error(err.message || 'Failed to run AI insights');
    } finally {
      setInsightsLoading(false);
    }
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

          {/* Smart AI Insights */}
          <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> Smart Insights
              </h2>
              <Button size="sm" onClick={runSmartInsights} disabled={insightsLoading} className="gap-2">
                {insightsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {insightsLoading ? 'Analyzing…' : 'Run AI Analysis'}
              </Button>
            </div>
            {!insights && !insightsLoading && (
              <p className="text-sm text-muted-foreground">
                Run AI to detect at-risk students and absence patterns.
              </p>
            )}
            {insights && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{insights.summary}</p>
                {insights.alerts.length === 0 ? (
                  <p className="rounded-xl bg-success/10 p-3 text-sm text-success">No at-risk students detected.</p>
                ) : (
                  insights.alerts.slice(0, 8).map((a, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/doctor/student/${a.student_id}`)}
                      className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
                    >
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          a.risk_level === 'critical' ? 'text-destructive' :
                          a.risk_level === 'high' ? 'text-orange-500' : 'text-amber-500'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{a.student_name}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                            {a.risk_level}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {a.attendance_rate}% • {a.absence_count}/{a.total_lectures} absences
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
