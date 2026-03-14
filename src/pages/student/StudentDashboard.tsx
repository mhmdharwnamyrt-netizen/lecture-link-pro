import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCurrentPosition, checkWithinUniversity, UNIVERSITY_COORDS } from '@/lib/constants';
import { MapPin, CheckCircle2, Award, BookOpen, Clock, AlertTriangle, Loader2, QrCode } from 'lucide-react';
import ExcuseDialog from '@/components/student/ExcuseDialog';
import QRScanner from '@/components/student/QRScanner';
import ExportButtons from '@/components/shared/ExportButtons';

export default function StudentDashboard() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeLectures, setActiveLectures] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, excused: 0, absent: 0, points: 0, totalLectures: 0 });
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'checking' | 'success' | 'error' | 'outside'>('idle');
  const [distance, setDistance] = useState(0);
  const [showExcuse, setShowExcuse] = useState<string | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [showBloom, setShowBloom] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) navigate('/login');
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    // Get active lectures for student's department and level
    const { data: lectures } = await supabase
      .from('lectures')
      .select('*, departments(name), subjects(name), profiles!lectures_doctor_id_fkey(full_name)')
      .eq('department_id', profile.department_id!)
      .eq('level', profile.level!)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (lectures) {
      // Check which ones student already attended
      const { data: attended } = await supabase
        .from('attendance')
        .select('lecture_id')
        .eq('student_id', profile.id)
        .in('lecture_id', lectures.map(l => l.id));

      const attendedIds = new Set(attended?.map(a => a.lecture_id) || []);
      setActiveLectures(lectures.map(l => ({ ...l, attended: attendedIds.has(l.id) })));
    }

    // Stats
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
          title: 'Outside Campus',
          description: `You are ${result.distance}m away from the university. Max allowed: 400m.`,
          variant: 'destructive',
        });
        return;
      }

      // Register attendance
      const { error } = await supabase.from('attendance').insert({
        student_id: profile!.id,
        lecture_id: lectureId,
        status: 'present',
        location_verified: true,
        latitude,
        longitude,
      });

      if (error) throw error;

      setGpsStatus('success');
      setShowBloom(true);
      setTimeout(() => setShowBloom(false), 1000);

      toast({ title: '✓ Attendance Registered', description: '+3 points earned!' });
      loadData();
    } catch (err: any) {
      setGpsStatus('error');
      if (err.code === 1) {
        toast({ title: 'Location Permission Required', description: 'Please enable GPS and try again.', variant: 'destructive' });
      } else if (err.code === 2 || err.code === 3) {
        // GPS failed - offer manual verification
        toast({ title: 'GPS Unavailable', description: 'Location service is not available. You can request manual verification.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      }
    } finally {
      setTimeout(() => {
        setCheckingIn(null);
        setGpsStatus('idle');
      }, 2000);
    }
  };

  // Offline support: save to localStorage if offline
  const handleOfflineCheckIn = async (lectureId: string) => {
    if (navigator.onLine) {
      handleCheckIn(lectureId);
    } else {
      // Save offline
      const offlineAttendance = JSON.parse(localStorage.getItem('offline_attendance') || '[]');
      offlineAttendance.push({
        student_id: profile!.id,
        lecture_id: lectureId,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('offline_attendance', JSON.stringify(offlineAttendance));
      toast({ title: 'Saved Offline', description: 'Will sync when internet is available.' });
    }
  };

  // Sync offline attendance when back online
  useEffect(() => {
    const syncOffline = async () => {
      const offlineData = JSON.parse(localStorage.getItem('offline_attendance') || '[]');
      if (offlineData.length === 0 || !profile) return;

      for (const item of offlineData) {
        try {
          await supabase.from('attendance').insert({
            student_id: item.student_id,
            lecture_id: item.lecture_id,
            status: 'present',
            location_verified: false,
            synced: true,
          });
        } catch { /* ignore duplicates */ }
      }
      localStorage.removeItem('offline_attendance');
      loadData();
    };

    window.addEventListener('online', syncOffline);
    if (navigator.onLine) syncOffline();
    return () => window.removeEventListener('online', syncOffline);
  }, [profile]);

  if (loading || !profile) return (
    <MobileLayout role="student">
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </MobileLayout>
  );

  return (
    <MobileLayout role="student">
      <div className="md:ml-64">
        <div className="px-4 pt-6 md:px-8">
          {/* Welcome */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            <p className="text-sm text-muted-foreground tabular-nums">ID: {profile.student_id}</p>
          </motion.div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <Award className={`h-5 w-5 text-primary mb-2 ${showBloom ? 'animate-bloom' : ''}`} />
              <p className="text-2xl font-bold tabular-nums">{stats.points}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <CheckCircle2 className="h-5 w-5 text-success mb-2" />
              <p className="text-2xl font-bold tabular-nums">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <BookOpen className="h-5 w-5 text-warning mb-2" />
              <p className="text-2xl font-bold tabular-nums">{stats.excused}</p>
              <p className="text-xs text-muted-foreground">Excused</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <Clock className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold tabular-nums">{stats.totalLectures}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Active Lectures */}
          <h2 className="mb-3 text-lg font-semibold">Active Lectures</h2>
          {activeLectures.length === 0 ? (
            <div className="mb-6 rounded-2xl bg-card p-8 text-center shadow-card">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No active lectures right now</p>
            </div>
          ) : (
            <div className="mb-6 space-y-3">
              {activeLectures.map((lecture, i) => (
                <motion.div
                  key={lecture.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{lecture.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {lecture.profiles?.full_name} • Hall {lecture.hall_number}
                      </p>
                      {lecture.subjects?.name && (
                        <p className="text-xs text-muted-foreground">{lecture.subjects.name}</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-success/10 px-3 py-1">
                      <p className="text-sm font-semibold text-success">{lecture.points} pts</p>
                    </div>
                  </div>

                  {lecture.attended ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-success/5 p-3">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <p className="text-sm font-medium text-success">Attendance Registered</p>
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
                            {gpsStatus === 'checking' ? 'Checking GPS...' : gpsStatus === 'outside' ? 'Outside Campus' : 'Processing...'}
                          </>
                        ) : (
                          <>
                            <MapPin className="mr-2 h-5 w-5" /> Register Attendance
                          </>
                        )}
                      </Button>
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
                      <p className="ml-3 text-sm text-muted-foreground">Verifying location...</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Recent Attendance */}
          {recentAttendance.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold">Recent Attendance</h2>
              <div className="space-y-2">
                {recentAttendance.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
                    <div>
                      <p className="font-medium">{a.lectures?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <span className={`rounded-xl px-3 py-1 text-xs font-medium ${
                      a.status === 'present' ? 'bg-success/10 text-success' :
                      a.status === 'excused' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                    }`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showExcuse && (
        <ExcuseDialog
          lectureId={showExcuse}
          studentId={profile.id}
          onClose={() => setShowExcuse(null)}
          onSubmitted={loadData}
        />
      )}
    </MobileLayout>
  );
}
