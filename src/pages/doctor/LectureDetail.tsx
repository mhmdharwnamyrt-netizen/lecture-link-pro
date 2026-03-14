import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { ArrowLeft, Users, CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import QRCodeDisplay from '@/components/doctor/QRCodeDisplay';
import ExportButtons from '@/components/shared/ExportButtons';

export default function LectureDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lecture, setLecture] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [excuses, setExcuses] = useState<any[]>([]);
  const [tab, setTab] = useState<'attendees' | 'excuses'>('attendees');

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
        // Mark attendance as excused
        await supabase.from('attendance').upsert({
          student_id: studentId,
          lecture_id: id!,
          status: 'excused',
          location_verified: false,
        }, { onConflict: 'student_id,lecture_id' });
      }

      // Create notification for student
      const student = await supabase.from('profiles').select('user_id').eq('id', studentId).single();
      if (student.data) {
        await supabase.from('notifications').insert({
          user_id: student.data.user_id,
          title: action === 'approved' ? 'Excuse Approved' : 'Excuse Rejected',
          message: action === 'approved'
            ? `Your excuse for "${lecture?.title}" has been approved. 3 points added.`
            : `Your excuse for "${lecture?.title}" has been rejected.`,
          type: action === 'approved' ? 'success' : 'warning',
          related_id: excuseId,
        });
      }

      toast({ title: `Excuse ${action}` });
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

  return (
    <MobileLayout role="doctor">
      <div className="md:ml-64">
        <div className="px-4 pt-6 md:px-8">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
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
                <p className="text-muted-foreground">{lecture.departments?.name} • Level {lecture.level} • Hall {lecture.hall_number}</p>
                {lecture.subjects?.name && <p className="text-sm text-muted-foreground">Subject: {lecture.subjects.name}</p>}
              </div>
              <Button
                variant="outline"
                onClick={toggleActive}
                className={`rounded-xl ${lecture.is_active ? 'text-success' : 'text-muted-foreground'}`}
              >
                {lecture.is_active ? 'Active' : 'Ended'}
              </Button>
            </div>
            {lecture.description && <p className="mt-2 text-sm text-muted-foreground">{lecture.description}</p>}
          </motion.div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-success" />
              <p className="text-xl font-bold tabular-nums">{presentCount}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <FileText className="mx-auto mb-1 h-5 w-5 text-warning" />
              <p className="text-xl font-bold tabular-nums">{excusedCount}</p>
              <p className="text-xs text-muted-foreground">Excused</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card text-center">
              <AlertCircle className="mx-auto mb-1 h-5 w-5 text-destructive" />
              <p className="text-xl font-bold tabular-nums">{pendingExcuses}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-2 rounded-xl bg-muted p-1">
            <button onClick={() => setTab('attendees')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'attendees' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>
              Attendees ({attendees.length})
            </button>
            <button onClick={() => setTab('excuses')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'excuses' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>
              Excuses ({excuses.length})
            </button>
          </div>

          {/* Content */}
          {tab === 'attendees' ? (
            <div className="space-y-2">
              {attendees.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No attendees yet</p>
              ) : (
                attendees.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-card"
                    onClick={() => navigate(`/doctor/student/${a.student_id}`)}
                  >
                    <div>
                      <p className="font-medium">{a.profiles?.full_name}</p>
                      <p className="text-sm tabular-nums text-muted-foreground">ID: {a.profiles?.student_id}</p>
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
                <p className="py-8 text-center text-muted-foreground">No excuses submitted</p>
              ) : (
                excuses.map(e => (
                  <div key={e.id} className="rounded-2xl bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{e.profiles?.full_name}</p>
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
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExcuseAction(e.id, e.student_id, 'rejected')}
                          className="h-10 flex-1 rounded-xl text-destructive"
                        >
                          Reject
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
    </MobileLayout>
  );
}
