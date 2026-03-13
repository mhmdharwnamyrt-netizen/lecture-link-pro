import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Plus, Users, BookOpen, Clock, TrendingUp } from 'lucide-react';
import AddLectureDialog from '@/components/doctor/AddLectureDialog';

export default function DoctorDashboard() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalLectures: 0, totalStudents: 0, avgAttendance: 0 });
  const [showAddLecture, setShowAddLecture] = useState(false);
  const [recentLectures, setRecentLectures] = useState<any[]>([]);

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
      .select('*, departments(name), subjects(name)')
      .eq('doctor_id', profile.id)
      .order('created_at', { ascending: false });

    if (lecturesData) {
      setLectures(lecturesData);
      setRecentLectures(lecturesData.slice(0, 5));

      // Get attendance stats
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
      <div className="md:ml-64">
        <div className="px-4 pt-6 md:px-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-2xl font-bold">{profile.academic_title ? `${profile.academic_title} ` : 'Dr. '}{profile.full_name}</h1>
          </motion.div>

          {/* Stats Grid */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Total Lectures', value: stats.totalLectures, icon: BookOpen, color: 'text-primary' },
              { label: 'Students', value: stats.totalStudents, icon: Users, color: 'text-accent' },
              { label: 'Avg Attendance', value: stats.avgAttendance, icon: TrendingUp, color: 'text-warning' },
              { label: 'Active', value: lectures.filter(l => l.is_active).length, icon: Clock, color: 'text-success' },
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

          {/* Add Lecture Button */}
          <Button onClick={() => setShowAddLecture(true)} className="mb-6 h-14 w-full rounded-2xl text-base md:w-auto">
            <Plus className="mr-2 h-5 w-5" /> Add Lecture / Section
          </Button>

          {/* Recent Lectures */}
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Recent Lectures</h2>
            {recentLectures.length === 0 ? (
              <div className="rounded-2xl bg-card p-8 text-center shadow-card">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No lectures yet. Add your first lecture!</p>
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
                          {lecture.departments?.name} • Level {lecture.level} • {lecture.type === 'section' ? `Section ${lecture.hall_number}` : `Hall ${lecture.hall_number}`}
                        </p>
                      </div>
                      <div className={`rounded-xl px-3 py-1 text-xs font-medium ${lecture.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {lecture.is_active ? 'Active' : 'Ended'}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(lecture.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })} • {new Date(lecture.created_at).toLocaleTimeString('en-US', { timeStyle: 'short' })}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
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
