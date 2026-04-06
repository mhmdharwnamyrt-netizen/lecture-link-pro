import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { ArrowLeft, Users, CheckCircle2, AlertCircle, Clock, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import QRCodeDisplay from '@/components/doctor/QRCodeDisplay';
import ExportButtons from '@/components/shared/ExportButtons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LectureRatingSummary } from '@/pages/shared/LectureRating';

export default function LectureDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [lecture, setLecture] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [excuses, setExcuses] = useState<any[]>([]);
  const [tab, setTab] = useState<'attendees' | 'excuses'>('attendees');
  const [selectedAttendee, setSelectedAttendee] = useState<any>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    const [lRes, aRes, eRes] = await Promise.all([
      supabase.from('lectures').select('*, departments(name), subjects(name)').eq('id', id!).single(),
      supabase.from('attendance').select('*, profiles(full_name, student_id)').eq('lecture_id', id!).order('created_at', { ascending: false }),
      supabase.from('excuses').select('*, profiles!excuses_student_id_fkey(full_name, student_id)').eq('lecture_id', id!).order('created_at', { ascending: false }),
    ]);
    if (lRes.data) setLecture(lRes.data);
    if (aRes.data) setAttendees(aRes.data);
    if (eRes.data) setExcuses(eRes.data);
  };

  const handleExcuseAction = async (excuseId: string, studentId: string, action: 'approved' | 'rejected') => {
    try {
      await supabase.from('excuses').update({ status: action, reviewed_by: profile?.id }).eq('id', excuseId);

      if (action === 'approved') {
        // Mark student as present (excused) in attendance
        await supabase.from('attendance').upsert({
          student_id: studentId,
          lecture_id: id!,
          status: 'excused',
          location_verified: false,
        }, { onConflict: 'student_id,lecture_id' });

        // Award points to student
        const lecturePoints = lecture?.points || 3;
        const { data: studentProfile } = await supabase.from('profiles').select('points').eq('id', studentId).single();
        if (studentProfile) {
          await supabase.from('profiles').update({ points: (studentProfile.points || 0) + lecturePoints }).eq('id', studentId);
        }
      }

      // Create notification for student
      const student = await supabase.from('profiles').select('user_id').eq('id', studentId).single();
      if (student.data) {
        const approvedMsg = t('notifications.approvedMessage').replace('{lecture}', lecture?.title || '');
        const rejectedMsg = t('notifications.rejectedMessage').replace('{lecture}', lecture?.title || '');
        await supabase.from('notifications').insert({
          user_id: student.data.user_id,
          title: action === 'approved' ? t('notifications.excuseApproved') : t('notifications.excuseRejected'),
          message: action === 'approved' ? approvedMsg : rejectedMsg,
          type: action === 'approved' ? 'success' : 'warning',
          related_id: excuseId,
        });
      }

      toast({ title: t('notifications.excuseAction').replace('{action}', action) });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleActive = async () => {
    await supabase.from('lectures').update({ is_active: !lecture.is_active }).eq('id', id!);
    loadData();
  };

  if (!lecture) return (
    <MobileLayout role="doctor">
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </MobileLayout>
  );

  const presentCount = attendees.filter(a => a.status === 'present').length;
  const excusedCount = attendees.filter(a => a.status === 'excused').length;
  const pendingExcuses = excuses.filter(e => e.status === 'pending').length;
  const faceVerifiedCount = attendees.filter(a => a.biometric_verified).length;

  return (
    <MobileLayout role="doctor">
      <div>
        <div className="px-4 pt-6 md:px-8">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </button>

          {/* Lecture Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${lecture.type === 'section' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                    {lecture.type}
                  </span>
                </div>
                <h1 className="text-2xl font-bold">{lecture.title}</h1>
                <p className="text-muted-foreground">{lecture.departments?.name} • {t('common.level')} {lecture.level} • {t('common.hall')} {lecture.hall_number}</p>
                {lecture.subjects?.name && <p className="text-sm text-muted-foreground">{t('common.subject')}: {lecture.subjects.name}</p>}
                <LectureRatingSummary lectureId={lecture.id} />
              </div>
              <div className="flex items-center gap-2">
                {lecture.is_active && (
                  <QRCodeDisplay lectureId={lecture.id} lectureTitle={lecture.title} />
                )}
                <Button
                  variant="outline"
                  onClick={toggleActive}
                  className={`rounded-xl ${lecture.is_active ? 'text-success' : 'text-muted-foreground'}`}
                >
                  {lecture.is_active ? t('common.active') : t('common.ended')}
                </Button>
              </div>
            </div>
            {lecture.description && <p className="mt-2 text-sm text-muted-foreground">{lecture.description}</p>}
          </motion.div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-4 gap-3">
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-success" />
              <p className="text-xl font-bold tabular-nums">{presentCount}</p>
              <p className="text-xs text-muted-foreground">{t('common.present')}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <FileText className="mx-auto mb-1 h-5 w-5 text-warning" />
              <p className="text-xl font-bold tabular-nums">{excusedCount}</p>
              <p className="text-xs text-muted-foreground">{t('common.excused')}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <AlertCircle className="mx-auto mb-1 h-5 w-5 text-destructive" />
              <p className="text-xl font-bold tabular-nums">{pendingExcuses}</p>
              <p className="text-xs text-muted-foreground">{t('doctor.pending')}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <Shield className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-xl font-bold tabular-nums">{faceVerifiedCount}</p>
              <p className="text-xs text-muted-foreground">{t('face.verified')}</p>
            </div>
          </div>

          {/* Export + Tabs */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2 rounded-xl bg-muted p-1 flex-1 mr-3">
              <button onClick={() => setTab('attendees')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'attendees' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>
                {t('doctor.attendees')} ({attendees.length})
              </button>
              <button onClick={() => setTab('excuses')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'excuses' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>
                {t('doctor.excuses')} ({excuses.length})
              </button>
            </div>
            <ExportButtons
              title={`Lecture: ${lecture.title}`}
              data={attendees.map(a => ({
                studentName: a.profiles?.full_name || '',
                studentId: a.profiles?.student_id || '',
                lectureTitle: lecture.title,
                status: a.status,
                date: new Date(a.created_at).toLocaleDateString('en-US'),
                time: new Date(a.created_at).toLocaleTimeString('en-US', { timeStyle: 'short' }),
              }))}
            />
          </div>

          {/* Content */}
          {tab === 'attendees' ? (
            <div className="space-y-2">
              {attendees.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t('common.noAttendeesYet')}</p>
              ) : (
                attendees.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card cursor-pointer transition-all hover:shadow-elevated"
                    onClick={() => setSelectedAttendee(a)}
                  >
                    <div>
                      <p className="font-medium">{a.profiles?.full_name}</p>
                      <p className="text-sm tabular-nums text-muted-foreground">ID: {a.profiles?.student_id}</p>
                      {a.biometric_verified && (
                        <p className="text-xs text-success flex items-center gap-1 mt-0.5">
                          <Shield className="h-3 w-3" /> {t('face.verified')} ({a.face_match_score}%)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`rounded-xl px-3 py-1 text-xs font-medium ${
                        a.status === 'present' ? 'bg-success/10 text-success' :
                        a.status === 'excused' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'
                      }`}>{a.status}</span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleTimeString('en-US', { timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {excuses.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t('common.noExcusesSubmitted')}</p>
              ) : (
                excuses.map(e => (
                  <div key={e.id} className="rounded-2xl bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p
                          className="font-medium text-primary cursor-pointer hover:underline"
                          onClick={() => navigate(`/doctor/student/${e.student_id}`)}
                        >
                          {e.profiles?.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{e.reason}</p>
                        {e.description && <p className="mt-1 text-sm">{e.description}</p>}
                      </div>
                      <span className={`rounded-xl px-3 py-1 text-xs font-medium ${
                        e.status === 'pending' ? 'bg-warning/10 text-warning' :
                        e.status === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      }`}>{e.status}</span>
                    </div>
                    {e.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={() => handleExcuseAction(e.id, e.student_id, 'approved')}
                          className="h-10 flex-1 rounded-xl bg-success text-success-foreground hover:bg-success/90"
                        >
                          {t('doctor.approve')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExcuseAction(e.id, e.student_id, 'rejected')}
                          className="h-10 flex-1 rounded-xl text-destructive"
                        >
                          {t('doctor.reject')}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attendee Detail Dialog */}
      <Dialog open={!!selectedAttendee} onOpenChange={() => setSelectedAttendee(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('common.attendanceDetails')}</DialogTitle>
          </DialogHeader>
          {selectedAttendee && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-lg">{selectedAttendee.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">{t('common.id')}: {selectedAttendee.profiles?.student_id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t('common.status')}</p>
                    <p className="font-medium capitalize">{selectedAttendee.status}</p>
                  </div>
                <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t('common.time')}</p>
                  <p className="font-medium tabular-nums">{new Date(selectedAttendee.created_at).toLocaleTimeString('en-US', { timeStyle: 'short' })}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t('common.gpsVerified')}</p>
                    <p className="font-medium">{selectedAttendee.location_verified ? `✓ ${t('common.yes')}` : `✗ ${t('common.no')}`}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{t('face.verified')}</p>
                  <p className="font-medium">{selectedAttendee.biometric_verified ? `✓ ${selectedAttendee.face_match_score}%` : `✗ ${t('common.no')}`}</p>
                </div>
              </div>

              {selectedAttendee.verification_photo_url && (
                <div>
                  <p className="text-sm font-medium mb-2">{t('doctor.verificationPhoto')}</p>
                  <img
                    src={selectedAttendee.verification_photo_url}
                    alt="Verification"
                    className="h-48 w-full rounded-xl object-cover"
                  />
                </div>
              )}

              <Button
                onClick={() => {
                  setSelectedAttendee(null);
                  navigate(`/doctor/student/${selectedAttendee.student_id}`);
                }}
                variant="outline"
                className="w-full rounded-xl"
              >
                {t('common.viewStudentProfile')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
