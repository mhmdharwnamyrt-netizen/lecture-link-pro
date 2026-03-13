import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Award } from 'lucide-react';

export default function StudentDetail() {
  const { studentId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, excused: 0, points: 0 });

  useEffect(() => {
    if (studentId) loadData();
  }, [studentId]);

  const loadData = async () => {
    const { data: studentData } = await supabase
      .from('profiles')
      .select('*, departments(name)')
      .eq('id', studentId!)
      .single();

    if (studentData) setStudent(studentData);

    // Get attendance for this doctor's lectures only
    if (profile) {
      const { data: doctorLectures } = await supabase
        .from('lectures')
        .select('id')
        .eq('doctor_id', profile.id);

      if (doctorLectures) {
        const lectureIds = doctorLectures.map(l => l.id);
        const { data: att } = await supabase
          .from('attendance')
          .select('*, lectures(title, created_at, type)')
          .eq('student_id', studentId!)
          .in('lecture_id', lectureIds)
          .order('created_at', { ascending: false });

        if (att) {
          setAttendance(att);
          const present = att.filter(a => a.status === 'present').length;
          const excused = att.filter(a => a.status === 'excused').length;
          setStats({
            present,
            excused,
            absent: lectureIds.length - present - excused,
            points: (present + excused) * 3,
          });
        }
      }
    }
  };

  if (!student) return null;

  return (
    <MobileLayout role="doctor">
      <div className="md:ml-64">
        <div className="px-4 pt-6 md:px-8">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {/* Student Info */}
          <div className="mb-6 rounded-2xl bg-card p-6 shadow-card">
            <h1 className="text-xl font-bold">{student.full_name}</h1>
            <p className="text-muted-foreground tabular-nums">ID: {student.student_id}</p>
            <p className="text-sm text-muted-foreground">{student.departments?.name} • Level {student.level}</p>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-success" />
              <p className="text-xl font-bold tabular-nums">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <XCircle className="mx-auto mb-1 h-5 w-5 text-destructive" />
              <p className="text-xl font-bold tabular-nums">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <BookOpen className="mx-auto mb-1 h-5 w-5 text-warning" />
              <p className="text-xl font-bold tabular-nums">{stats.excused}</p>
              <p className="text-xs text-muted-foreground">Excused</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <Award className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-xl font-bold tabular-nums">{stats.points}</p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
          </div>

          {/* Attendance History */}
          <h2 className="mb-3 text-lg font-semibold">Attendance History</h2>
          <div className="space-y-2">
            {attendance.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
                <div>
                  <p className="font-medium">{a.lectures?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })} •{' '}
                    {new Date(a.created_at).toLocaleTimeString('en-US', { timeStyle: 'short' })}
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
      </div>
    </MobileLayout>
  );
}
