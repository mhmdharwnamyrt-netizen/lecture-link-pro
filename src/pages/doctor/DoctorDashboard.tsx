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
      <div className="px-4 pt-2 md:pt-6 md:px-8">
        <div className="-mt-6 md:mt-0 relative z-10 mb-4">
          <DashboardHero
            name={`${profile.academic_title ? profile.academic_title + ' ' : 'Dr. '}${profile.full_name}`}
            subtitle={language === 'ar' ? 'لوحة الدكتور' : 'Doctor Portal'}
            nextLecture={recentLectures.find((l: any) => l.is_active) ? { title: recentLectures.find((l: any) => l.is_active).title, time: recentLectures.find((l: any) => l.is_active).start_time?.substring(0,5), hall: recentLectures.find((l: any) => l.is_active).hall_number } : null}
          />
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 -mt-6 md:mt-0 relative z-10">
          {[
            { label: t('doctor.totalLectures'), value: stats.totalLectures, icon: BookOpen, color: 'text-primary' },
            { label: t('doctor.students'), value: stats.totalStudents, icon: Users, color: 'text-accent' },
            { label: t('doctor.avgAttendance'), value: stats.avgAttendance, icon: TrendingUp, color: 'text-warning' },
            { label: t('common.active'), value: lectures.filter(l => l.is_active).length, icon: Clock, color: 'text-success' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card p-4 shadow-card"
            >
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Button onClick={() => setShowAddLecture(true)} className="h-14 rounded-2xl text-base">
            <Plus className="mr-2 h-5 w-5" /> {t('doctor.addLecture')}
          </Button>
          <Button onClick={() => navigate('/doctor/schedule-parser')} variant="outline" className="h-14 rounded-2xl text-base gap-2">
            <Bot className="h-5 w-5" /> {t('nav.schedule')}
          </Button>
        </div>

        {/* Early Warning Banner */}
        {warningCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('/doctor/early-warning')}
            className="mb-6 rounded-2xl bg-warning/10 p-4 shadow-card cursor-pointer transition-colors hover:bg-warning/15"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <div>
                <p className="font-medium text-sm">{warningCount} {t('warning.activeAlerts')}</p>
                <p className="text-xs text-muted-foreground">{t('warning.subtitle')}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Lectures */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">{t('doctor.recentLectures')}</h2>
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/doctor/lectures/${lecture.id}`)}
                  className="cursor-pointer rounded-2xl bg-card p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{lecture.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? lecture.departments?.name_ar || lecture.departments?.name : lecture.departments?.name} • {t('common.level')} {lecture.level} • {lecture.type === 'section' ? `${t('common.section')} ${lecture.hall_number}` : `${t('common.hall')} ${lecture.hall_number}`}
                      </p>
                      {lecture.day_of_week && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === 'ar' ? DAY_AR[lecture.day_of_week] || lecture.day_of_week : lecture.day_of_week} {lecture.start_time?.substring(0,5)} - {lecture.end_time?.substring(0,5)}
                        </p>
                      )}
                    </div>
                    <div className={`rounded-xl px-3 py-1 text-xs font-medium ${lecture.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {lecture.is_active ? t('common.active') : t('common.ended')}
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
