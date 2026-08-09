import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Plus, Users, BookOpen, Clock, TrendingUp, Bot, AlertTriangle } from 'lucide-react';
import AddLectureDialog from '@/components/doctor/AddLectureDialog';
import DashboardHero from '@/components/DashboardHero';

export default function DoctorDashboard() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [lectures, setLectures] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalLectures: 0, totalStudents: 0, avgAttendance: 0 });
  const [showAddLecture, setShowAddLecture] = useState(false);
  const [recentLectures, setRecentLectures] = useState<any[]>([]);
  const [warningCount, setWarningCount] = useState(0);

  const DAY_AR: Record<string, string> = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
  };

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'doctor')) {
      navigate('/login');
    }
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    
    const { data: lecturesData } = await supabase
      .from('lectures')
      .select('*, departments(name, name_ar), subjects(name)')
      .eq('doctor_id', profile.id)
      .order('created_at', { ascending: false });

    if (lecturesData) {
      setLectures(lecturesData);
      setRecentLectures(lecturesData.slice(0, 5));

      const lectureIds = lecturesData.map(l => l.id);
      if (lectureIds.length > 0) {
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('*')
          .in('lecture_id', lectureIds);

        const uniqueStudents = new Set(attendanceData?.map(a => a.student_id) || []);
        const presentCount = attendanceData?.filter(a => a.status === 'present' || a.status === 'excused').length || 0;

        setStats({
          totalLectures: lecturesData.length,
          totalStudents: uniqueStudents.size,
          avgAttendance: lectureIds.length > 0 ? Math.round((presentCount / Math.max(lectureIds.length, 1)) * 100) / 100 : 0,
        });
      }
    }

    const { count } = await supabase
      .from('warning_alerts' as any)
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', profile.id)
      .eq('is_resolved', false) as any;
    setWarningCount(count || 0);
  };

  if (loading || !profile) {
    return (
      <MobileLayout role="doctor">
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout role="doctor">
      <div className="px-4 pt-4 md:pt-6 md:px-8">
        <div className="mb-4">
          <DashboardHero
            name={`${profile.academic_title ? profile.academic_title + ' ' : 'Dr. '}${profile.full_name}`}
            subtitle={language === 'ar' ? 'لوحة الدكتور' : 'Doctor Portal'}
            nextLecture={recentLectures.find((l: any) => l.is_active) ? { title: recentLectures.find((l: any) => l.is_active).title, time: recentLectures.find((l: any) => l.is_active).start_time?.substring(0,5), hall: recentLectures.find((l: any) => l.is_active).hall_number } : null}
          />
        </div>

        {/* Stats Grid — calm, single-accent cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: t('doctor.totalLectures'), value: stats.totalLectures, icon: BookOpen },
            { label: t('doctor.students'),      value: stats.totalStudents, icon: Users },
            { label: t('doctor.avgAttendance'), value: stats.avgAttendance, icon: TrendingUp },
            { label: t('common.active'),        value: lectures.filter(l => l.is_active).length, icon: Clock },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 280, damping: 24 }}
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-border/60 bg-card p-4 shadow-card transition-shadow hover:shadow-elevated"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">{stat.value}</p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Button onClick={() => setShowAddLecture(true)} className="h-12 w-full rounded-2xl px-3 text-sm">
              <Plus className="me-1.5 h-4 w-4 shrink-0" />
              <span className="truncate">{t('doctor.addLecture')}</span>
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Button onClick={() => navigate('/doctor/schedule-parser')} variant="outline" className="h-12 w-full rounded-2xl px-3 text-sm">
              <Bot className="me-1.5 h-4 w-4 shrink-0" />
              <span className="truncate">{t('nav.schedule')}</span>
            </Button>
          </motion.div>
        </div>

        {/* Highlights: featured post / training */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => navigate('/doctor/community')}
            className="rounded-2xl border border-border/60 bg-card p-4 text-start shadow-card transition hover:shadow-elevated"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {language === 'ar' ? 'الملتقى الطلابي' : 'Community'}
            </p>
            <p className="mt-1 font-semibold">{language === 'ar' ? 'أحدث المنشورات والنقاشات' : 'Latest posts & discussions'}</p>
          </button>
          <button
            onClick={() => navigate('/doctor/trainings')}
            className="rounded-2xl border border-border/60 bg-card p-4 text-start shadow-card transition hover:shadow-elevated"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {language === 'ar' ? 'التدريبات' : 'Trainings'}
            </p>
            <p className="mt-1 font-semibold">{language === 'ar' ? 'أضف فرصة تدريب لطلابك' : 'Publish an opportunity'}</p>
          </button>
        </div>


        {/* Early Warning Banner */}
        {warningCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/doctor/early-warning')}
            className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-warning/20 via-warning/10 to-transparent p-4 shadow-card cursor-pointer ring-1 ring-warning/20"
          >
            <div className="relative flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-warning/20 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{warningCount} {t('warning.activeAlerts')}</p>
                <p className="text-xs text-muted-foreground">{t('warning.subtitle')}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Lectures */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">{t('doctor.recentLectures')}</h2>
          {recentLectures.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center shadow-card">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">{t('doctor.noLectures')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLectures.map((lecture, i) => (
                <motion.div
                  key={lecture.id}
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/doctor/lectures/${lecture.id}`)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl bg-card p-4 shadow-card ring-1 ring-border/40 transition-all hover:shadow-elevated hover:ring-primary/30"
                >
                  {/* Accent bar */}
                  <div className={`absolute inset-y-0 start-0 w-1 ${lecture.is_active ? 'bg-gradient-to-b from-success to-emerald-400' : 'bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10'}`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 ps-2">
                      <p className="truncate font-semibold">{lecture.title}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {language === 'ar' ? lecture.departments?.name_ar || lecture.departments?.name : lecture.departments?.name} • {t('common.level')} {lecture.level} • {lecture.type === 'section' ? `${t('common.section')} ${lecture.hall_number}` : `${t('common.hall')} ${lecture.hall_number}`}
                      </p>
                      {lecture.day_of_week && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {language === 'ar' ? DAY_AR[lecture.day_of_week] || lecture.day_of_week : lecture.day_of_week} • {lecture.start_time?.substring(0,5)} – {lecture.end_time?.substring(0,5)}
                        </p>
                      )}
                    </div>
                    <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${lecture.is_active ? 'bg-success/10 text-success ring-success/20' : 'bg-muted text-muted-foreground ring-border'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        {lecture.is_active && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                          </span>
                        )}
                        {lecture.is_active ? t('common.active') : t('common.ended')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>


      <AddLectureDialog
        open={showAddLecture}
        onClose={() => setShowAddLecture(false)}
        profileId={profile.id}
        onCreated={loadData}
      />
    </MobileLayout>
  );
}
