import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Award, Shield } from 'lucide-react';

export default function StudentDetail() {
  const { studentId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [student, setStudent] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, excused: 0, points: 0 });
  const [faceTemplate, setFaceTemplate] = useState<any>(null);

  useEffect(() => {
    if (studentId) loadData();
  }, [studentId]);

  const loadData = async () => {
    const [studentRes, faceRes] = await Promise.all([
      supabase.from('profiles').select('*, departments(name)').eq('id', studentId!).single(),
      supabase.from('face_templates').select('*').eq('student_id', studentId!).maybeSingle(),
    ]);

    if (studentRes.data) setStudent(studentRes.data);
    if (faceRes.data) setFaceTemplate(faceRes.data);

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
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </button>

          {/* Student Info */}
          <div className="mb-6 rounded-2xl bg-card p-6 shadow-card">
            <div className="flex items-start gap-4">
              {faceTemplate?.front_photo_url ? (
                <img src={faceTemplate.front_photo_url} alt="Student" className="h-16 w-16 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="text-2xl font-bold text-primary">{student.full_name?.[0]}</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{student.full_name}</h1>
                <p className="text-muted-foreground tabular-nums">ID: {student.student_id}</p>
                <p className="text-sm text-muted-foreground">{student.departments?.name} • Level {student.level}</p>
                {faceTemplate && (
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <Shield className="h-3 w-3" /> {t('profile.faceRegistered')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-success" />
              <p className="text-xl font-bold tabular-nums">{stats.present}</p>
              <p className="text-xs text-muted-foreground">{t('common.present')}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <XCircle className="mx-auto mb-1 h-5 w-5 text-destructive" />
              <p className="text-xl font-bold tabular-nums">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">{t('common.absent')}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <BookOpen className="mx-auto mb-1 h-5 w-5 text-warning" />
              <p className="text-xl font-bold tabular-nums">{stats.excused}</p>
              <p className="text-xs text-muted-foreground">{t('common.excused')}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <Award className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-xl font-bold tabular-nums">{stats.points}</p>
              <p className="text-xs text-muted-foreground">{t('common.points')}</p>
            </div>
          </div>

          {/* Face Photos */}
          {faceTemplate && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold">{t('face.registration')}</h2>
              <div className="grid grid-cols-3 gap-2">
                {faceTemplate.front_photo_url && (
                  <div>
                    <img src={faceTemplate.front_photo_url} alt="Front" className="w-full rounded-xl object-cover aspect-square" />
                    <p className="text-xs text-center text-muted-foreground mt-1">{t('face.captureFront')}</p>
                  </div>
                )}
                {faceTemplate.right_photo_url && (
                  <div>
                    <img src={faceTemplate.right_photo_url} alt="Right" className="w-full rounded-xl object-cover aspect-square" />
                    <p className="text-xs text-center text-muted-foreground mt-1">{t('face.captureRight')}</p>
                  </div>
                )}
                {faceTemplate.left_photo_url && (
                  <div>
                    <img src={faceTemplate.left_photo_url} alt="Left" className="w-full rounded-xl object-cover aspect-square" />
                    <p className="text-xs text-center text-muted-foreground mt-1">{t('face.captureLeft')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
                  {a.biometric_verified && (
                    <p className="text-xs text-success flex items-center gap-1 mt-0.5">
                      <Shield className="h-3 w-3" /> {t('face.verified')} ({a.face_match_score}%)
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-xl px-3 py-1 text-xs font-medium ${
                    a.status === 'present' ? 'bg-success/10 text-success' :
                    a.status === 'excused' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                  }`}>{a.status}</span>
                  {a.verification_photo_url && (
                    <img src={a.verification_photo_url} alt="Verify" className="h-8 w-8 rounded-lg object-cover" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
