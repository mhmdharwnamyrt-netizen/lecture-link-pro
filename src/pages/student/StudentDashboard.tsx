import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCurrentPosition, checkWithinUniversity } from '@/lib/constants';
import { isLectureCurrentlyActive, isLectureToday } from '@/lib/lectureUtils';
import { MapPin, CheckCircle2, Award, BookOpen, Clock, AlertTriangle, Loader2, QrCode, Shield, Bell } from 'lucide-react';
import ExcuseDialog from '@/components/student/ExcuseDialog';
import QRScanner from '@/components/student/QRScanner';
import ExportButtons from '@/components/shared/ExportButtons';
import FaceVerification from '@/components/student/FaceVerification';
import { requestNotificationPermission, startLectureReminders, stopLectureReminders, registerServiceWorker, showLocalNotification } from '@/lib/pushNotifications';
import DashboardHero from '@/components/DashboardHero';
import AttendanceSuccess from '@/components/AttendanceSuccess';
import { celebrate } from '@/lib/confetti';

export default function StudentDashboard() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [activeLectures, setActiveLectures] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, excused: 0, absent: 0, points: 0, totalLectures: 0 });
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'checking' | 'success' | 'error' | 'outside'>('idle');
  const [distance, setDistance] = useState(0);
  const [showExcuse, setShowExcuse] = useState<string | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [showBloom, setShowBloom] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasFaceTemplate, setHasFaceTemplate] = useState(false);
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);

  // Face verification state
  const [showFaceVerify, setShowFaceVerify] = useState(false);
  const [pendingLectureId, setPendingLectureId] = useState<string | null>(null);
  const [pendingGPS, setPendingGPS] = useState<{ lat?: number; lon?: number; verified: boolean }>({ verified: false });

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) navigate('/login');
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) {
      loadData();
      checkFaceTemplate();
      checkIdentityVerification();
      registerServiceWorker();
      setTimeout(() => requestNotificationPermission(), 2000);
    }
    return () => stopLectureReminders();
  }, [profile]);

  // Identity verification nagging - every 5 minutes
  useEffect(() => {
    if (!profile || isIdentityVerified) return;
    const nagMessages = [
      language === 'ar' ? '⚠️ وثّق هويتك الآن! قد لا يظهر حضورك للدكتور بدون توثيق.' : '⚠️ Verify your identity now! Your attendance may not show to the doctor without verification.',
      language === 'ar' ? '🔴 تحذير: بدون توثيق الهوية، لن تظهر في تقارير الإحصائيات!' : '🔴 Warning: Without identity verification, you won\'t appear in analytics reports!',
      language === 'ar' ? '⏰ آخر تذكير: وثّق هويتك لضمان احتساب حضورك بشكل صحيح.' : '⏰ Final reminder: Verify your identity to ensure your attendance counts correctly.',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      const msg = nagMessages[idx % nagMessages.length];
      toast({
        title: language === 'ar' ? 'توثيق الهوية مطلوب' : 'Identity Verification Required',
        description: msg,
        variant: 'destructive',
      });
      showLocalNotification(
        language === 'ar' ? 'وثّق هويتك!' : 'Verify Your Identity!',
        msg,
        'identity-nag'
      );
      idx++;
    }, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, [profile, isIdentityVerified, language]);

  // Pre-cache tomorrow's lectures for offline
  useEffect(() => {
    if (!profile) return;
    const cacheTomorrowLectures = async () => {
      const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const tomorrow = DAY_ORDER[(new Date().getDay() + 1) % 7];
      const { data } = await supabase
        .from('lectures')
        .select('*, departments(name, name_ar), subjects(name), profiles!lectures_doctor_id_fkey(full_name)')
        .eq('department_id', profile.department_id!)
        .eq('level', profile.level!)
        .eq('day_of_week', tomorrow);
      if (data) {
        localStorage.setItem(`cached_lectures_${profile.id}`, JSON.stringify({ day: tomorrow, lectures: data, cached_at: new Date().toISOString() }));
      }
    };
    cacheTomorrowLectures();
  }, [profile]);

  // Start reminders when lectures change
  useEffect(() => {
    if (activeLectures.length > 0) {
      startLectureReminders(activeLectures);
    }
    return () => stopLectureReminders();
  }, [activeLectures]);

  const checkFaceTemplate = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('face_templates')
      .select('id')
      .eq('student_id', profile.id)
      .maybeSingle();
    setHasFaceTemplate(!!data);
  };

  const checkIdentityVerification = async () => {
    if (!profile) return;
    const saved = localStorage.getItem(`identity_verified_${profile.id}`);
    setIsIdentityVerified(saved === 'true');
  };

  const loadData = async () => {
    if (!profile) return;

    // Try cached data first if offline
    if (!navigator.onLine) {
      const cached = localStorage.getItem(`cached_lectures_${profile.id}`);
      if (cached) {
        const { lectures } = JSON.parse(cached);
        setActiveLectures(lectures.map((l: any) => ({ ...l, attended: false, isNow: false })));
      }
      return;
    }

    const { data: lectures } = await supabase
      .from('lectures')
      .select('*, departments(name, name_ar), subjects(name), profiles!lectures_doctor_id_fkey(full_name)')
      .eq('department_id', profile.department_id!)
      .eq('level', profile.level!)
      .order('created_at', { ascending: false });

    if (lectures) {
      const relevantLectures = lectures.filter(l => {
        if (isLectureCurrentlyActive(l)) return true;
        if (isLectureToday(l) && l.is_active) return true;
        if (!l.day_of_week && l.is_active) return true;
        return false;
      });
      const { data: attended } = await supabase
        .from('attendance')
        .select('lecture_id')
        .eq('student_id', profile.id)
        .in('lecture_id', relevantLectures.map(l => l.id));

      const attendedIds = new Set(attended?.map(a => a.lecture_id) || []);
      setActiveLectures(relevantLectures.map(l => ({
        ...l,
        attended: attendedIds.has(l.id),
        isNow: isLectureCurrentlyActive(l),
      })));
    }

    const { data: allAttendance } = await supabase
      .from('attendance')
      .select('*, lectures(title, created_at)')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false });

    if (allAttendance) {
      const present = allAttendance.filter(a => a.status === 'present').length;
      const excused = allAttendance.filter(a => a.status === 'excused').length;
      setRecentAttendance(allAttendance.slice(0, 5));
      setStats({
        present,
        excused,
        absent: 0,
        points: (present + excused) * 3,
        totalLectures: allAttendance.length,
      });
    }
  };

  const handleCheckIn = async (lectureId: string) => {
    setCheckingIn(lectureId);
    setGpsStatus('checking');

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const result = checkWithinUniversity(latitude, longitude);
      setDistance(result.distance);

      if (!result.within) {
        setGpsStatus('outside');
        toast({
          title: t('student.outsideCampus'),
          description: `You are ${result.distance}m away from the university. Max allowed: 400m.`,
          variant: 'destructive',
        });
        setCheckingIn(null);
        setGpsStatus('idle');
        return;
      }

      if (hasFaceTemplate) {
        setPendingLectureId(lectureId);
        setPendingGPS({ lat: latitude, lon: longitude, verified: true });
        setShowFaceVerify(true);
        setCheckingIn(null);
        setGpsStatus('idle');
        return;
      }

      const { error } = await supabase.from('attendance').insert({
        student_id: profile!.id,
        lecture_id: lectureId,
        status: 'present',
        location_verified: true,
        latitude,
        longitude,
      });

      if (error) {
        if (error.code === '23505') {
          toast({ title: t('common.alreadyRegistered') });
        } else {
          throw error;
        }
      } else {
        setGpsStatus('success');
        setShowBloom(true);
        setShowSuccess(true);
        celebrate();
        setTimeout(() => setShowBloom(false), 1000);
        toast({ title: '✓ ' + t('student.attendanceRegistered'), description: t('student.pointsEarned') });
        loadData();
      }
    } catch (err: any) {
      setGpsStatus('error');
      if (err.code === 1) {
        toast({ title: t('student.locationRequired'), description: t('student.enableGPS'), variant: 'destructive' });
      } else {
        toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
      }
    } finally {
      setTimeout(() => {
        setCheckingIn(null);
        setGpsStatus('idle');
      }, 2000);
    }
  };

  const handleOfflineCheckIn = async (lectureId: string) => {
    if (navigator.onLine) {
      handleCheckIn(lectureId);
    } else {
      const { enqueueAttendance } = await import('@/lib/offlineQueue');
      const lecture = activeLectures.find((l: any) => l.id === lectureId);
      enqueueAttendance({
        student_id: profile!.id,
        lecture_id: lectureId,
        lecture_title: lecture?.title,
        location_verified: false,
      });
      toast({ title: t('common.savedOffline'), description: t('common.willSync') });
    }
  };

  useEffect(() => {
    if (!profile) return;
    const reload = () => loadData();
    window.addEventListener('online', reload);
    return () => window.removeEventListener('online', reload);
  }, [profile]);


  if (loading || !profile) return (
    <MobileLayout role="student">
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </MobileLayout>
  );

  const DAY_AR: Record<string, string> = {
    Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
  };

  return (
    <MobileLayout role="student">
      <div className="px-4 pt-2 md:pt-6 md:px-8">
        {/* Cinematic glass hero */}
        <div className="-mt-6 md:mt-0 relative z-10 mb-4">
          <DashboardHero
            name={profile.full_name}
            subtitle={profile.student_id ? `${t('common.id')}: ${profile.student_id}` : undefined}
            nextLecture={activeLectures[0] ? { title: activeLectures[0].title, time: activeLectures[0].start_time?.substring(0,5), hall: activeLectures[0].hall_number } : null}
          />
        </div>

        {/* Identity Verification Warning */}
        {!isIdentityVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 rounded-2xl bg-destructive/10 p-4 shadow-card cursor-pointer border border-destructive/20 -mt-4 md:mt-0 relative z-10"
            onClick={() => navigate('/student/profile')}
          >
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-destructive animate-pulse" />
              <div>
                <p className="font-semibold text-sm text-destructive">
                  {language === 'ar' ? '⚠️ وثّق هويتك الآن!' : '⚠️ Verify Your Identity!'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'حضورك قد لا يُحتسب بدون التوثيق' : 'Your attendance may not count without verification'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Face Registration Prompt */}
        {!hasFaceTemplate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl bg-warning/10 p-4 shadow-card cursor-pointer -mt-2 md:mt-0 relative z-10"
            onClick={() => navigate('/student/face-registration')}
          >
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-warning" />
              <div>
                <p className="font-medium text-sm">{t('profile.registerFace')}</p>
                <p className="text-xs text-muted-foreground">{t('student.registerFacePrompt')}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className={`mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 ${!isIdentityVerified || !hasFaceTemplate ? '' : '-mt-6 md:mt-0'} relative z-10`}>
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <Award className={`h-5 w-5 text-primary mb-2 ${showBloom ? 'animate-bloom' : ''}`} />
            <p className="text-2xl font-bold tabular-nums">{stats.points}</p>
            <p className="text-xs text-muted-foreground">{t('student.totalPoints')}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <CheckCircle2 className="h-5 w-5 text-success mb-2" />
            <p className="text-2xl font-bold tabular-nums">{stats.present}</p>
            <p className="text-xs text-muted-foreground">{t('common.present')}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <BookOpen className="h-5 w-5 text-warning mb-2" />
            <p className="text-2xl font-bold tabular-nums">{stats.excused}</p>
            <p className="text-xs text-muted-foreground">{t('common.excused')}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <Clock className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold tabular-nums">{stats.totalLectures}</p>
            <p className="text-xs text-muted-foreground">{t('common.total')}</p>
          </div>
        </div>

        {/* Active Lectures */}
        <h2 className="mb-3 text-lg font-semibold">{t('student.activeLectures')}</h2>
        {activeLectures.length === 0 ? (
          <div className="mb-6 rounded-2xl bg-card p-8 text-center shadow-card">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{t('student.noActiveLectures')}</p>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            {activeLectures.map((lecture, i) => (
              <motion.div
                key={lecture.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl bg-card p-4 shadow-card ${lecture.isNow ? 'ring-2 ring-success' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {lecture.isNow && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success animate-pulse">● {t('common.now')}</span>
                      )}
                      {lecture.day_of_week && !lecture.isNow && (
                        <span className="text-xs text-muted-foreground">
                          {language === 'ar' ? DAY_AR[lecture.day_of_week] || lecture.day_of_week : lecture.day_of_week}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold">{lecture.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {lecture.profiles?.full_name} • {t('common.hall')} {lecture.hall_number}
                    </p>
                    {lecture.start_time && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {lecture.start_time?.substring(0,5)} - {lecture.end_time?.substring(0,5)}
                      </p>
                    )}
                    {lecture.subjects?.name && (
                      <p className="text-xs text-muted-foreground">{lecture.subjects.name}</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-success/10 px-3 py-1">
                    <p className="text-sm font-semibold text-success">{lecture.points} {t('common.pts')}</p>
                  </div>
                </div>

                {lecture.attended ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-success/5 p-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <p className="text-sm font-medium text-success">{t('student.attendanceRegistered')}</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleOfflineCheckIn(lecture.id)}
                      disabled={checkingIn === lecture.id}
                      className="h-14 flex-1 rounded-2xl text-base bg-success hover:bg-success/90 text-success-foreground"
                    >
                      {checkingIn === lecture.id ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {gpsStatus === 'checking' ? t('student.checkingGPS') : gpsStatus === 'outside' ? t('student.outsideCampus') : t('common.processing')}
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-5 w-5" /> GPS {hasFaceTemplate && '+ Face'}
                        </>
                      )}
                    </Button>
                    <QRScanner onSuccess={loadData} />
                    <Button
                      variant="outline"
                      onClick={() => setShowExcuse(lecture.id)}
                      className="h-14 rounded-2xl"
                    >
                      <AlertTriangle className="h-5 w-5" />
                    </Button>
                  </div>
                )}

                {checkingIn === lecture.id && gpsStatus === 'checking' && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="relative">
                      <div className="h-4 w-4 rounded-full bg-primary" />
                      <div className="absolute inset-0 rounded-full bg-primary animate-pulse-ring" />
                    </div>
                    <p className="ml-3 text-sm text-muted-foreground">{t('common.verifyingLocation')}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Recent Attendance */}
        {recentAttendance.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('student.recentAttendance')}</h2>
              <ExportButtons
                title={`${profile.full_name} - Attendance Report`}
                data={recentAttendance.map(a => ({
                  studentName: profile.full_name,
                  studentId: profile.student_id || '',
                  lectureTitle: a.lectures?.title || '',
                  status: a.status,
                  date: new Date(a.created_at).toLocaleDateString('en-US'),
                  time: new Date(a.created_at).toLocaleTimeString('en-US', { timeStyle: 'short' }),
                }))}
              />
            </div>
            <div className="space-y-2">
              {recentAttendance.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
                  <div>
                    <p className="font-medium">{a.lectures?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}
                    </p>
                    {a.biometric_verified && (
                      <p className="text-xs text-success flex items-center gap-1 mt-0.5">
                        <Shield className="h-3 w-3" /> {t('face.verified')} ({a.face_match_score}%)
                      </p>
                    )}
                  </div>
                  <span className={`rounded-xl px-3 py-1 text-xs font-medium ${
                    a.status === 'present' ? 'bg-success/10 text-success' :
                    a.status === 'excused' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {a.status === 'present' ? t('common.present') : a.status === 'excused' ? t('common.excused') : t('common.absent')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showExcuse && (
        <ExcuseDialog
          lectureId={showExcuse}
          studentId={profile.id}
          onClose={() => setShowExcuse(null)}
          onSubmitted={loadData}
        />
      )}

      {showFaceVerify && pendingLectureId && (
        <FaceVerification
          open={showFaceVerify}
          lectureId={pendingLectureId}
          latitude={pendingGPS.lat}
          longitude={pendingGPS.lon}
          locationVerified={pendingGPS.verified}
          onSuccess={() => {
            setShowFaceVerify(false);
            setPendingLectureId(null);
            loadData();
          }}
          onCancel={() => {
            setShowFaceVerify(false);
            setPendingLectureId(null);
          }}
        />
      )}

      <AttendanceSuccess open={showSuccess} points={3} onClose={() => setShowSuccess(false)} />
    </MobileLayout>
  );
}
