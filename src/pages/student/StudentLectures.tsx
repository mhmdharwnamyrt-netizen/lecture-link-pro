import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { BookOpen, Search, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ExcuseDialog from '@/components/student/ExcuseDialog';
import { LectureRatingDialog, LectureRatingSummary } from '@/pages/shared/LectureRating';

function TiltCard({ children, status }: { children: React.ReactNode; status: 'present' | 'excused' | 'active' | 'missed' }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-50, 50], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [-50, 50], [-8, 8]), { stiffness: 200, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top - r.height / 2);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  const sideColor = status === 'present' ? 'bg-success' : status === 'excused' ? 'bg-warning' : status === 'active' ? 'bg-primary' : 'bg-destructive';

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', perspective: 1000 }}
      className="relative overflow-hidden rounded-2xl bg-card p-4 shadow-card transition-shadow hover:shadow-elevated"
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${sideColor} animate-pulse rtl:left-auto rtl:right-0`} />
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      {children}
    </motion.div>
  );
}

export default function StudentLectures() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [lectures, setLectures] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [showExcuse, setShowExcuse] = useState<string | null>(null);
  const [ratingLecture, setRatingLecture] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) navigate('/login');
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) loadLectures();
  }, [profile]);

  const loadLectures = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('lectures')
      .select('*, departments(name), subjects(name), profiles!lectures_doctor_id_fkey(full_name)')
      .eq('department_id', profile.department_id!)
      .eq('level', profile.level!)
      .order('created_at', { ascending: false });

    if (data) {
      const { data: attended } = await supabase
        .from('attendance')
        .select('lecture_id, status')
        .eq('student_id', profile.id)
        .in('lecture_id', data.map(l => l.id));

      const attendMap = new Map(attended?.map(a => [a.lecture_id, a.status]) || []);
      setLectures(data.map(l => ({ ...l, attendanceStatus: attendMap.get(l.id) || null })));
    }
  };

  const filtered = lectures.filter(l => {
    if (tab === 'active' && !l.is_active) return false;
    if (tab === 'past' && l.is_active) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading || !profile) return null;

  return (
    <MobileLayout role="student">
      <div>
        <div className="px-4 pt-6 md:px-8">
          <h1 className="mb-4 text-2xl font-bold">{t('student.myLectures')}</h1>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="h-12 rounded-xl pl-10 rtl:pl-3 rtl:pr-10" />
          </div>

          <div className="mb-4 flex gap-2 rounded-xl bg-muted p-1">
            <button onClick={() => setTab('active')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'active' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>{t('common.active')}</button>
            <button onClick={() => setTab('past')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'past' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>{t('common.past')}</button>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-card p-8 text-center shadow-card">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">{t('common.noLecturesFound')}</p>
              </div>
            ) : (
              filtered.map(l => {
                const st: 'present' | 'excused' | 'active' | 'missed' =
                  l.attendanceStatus === 'present' ? 'present' :
                  l.attendanceStatus === 'excused' ? 'excused' :
                  l.is_active ? 'active' : 'missed';
                return (
                <TiltCard key={l.id} status={st}>
                  <div className="flex items-start justify-between pl-3 rtl:pl-0 rtl:pr-3">
                    <div>
                      <p className="font-semibold">{l.title}</p>
                      <p className="text-sm text-muted-foreground">{l.profiles?.full_name} • {t('common.hall')} {l.hall_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </p>
                      <LectureRatingSummary lectureId={l.id} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-xl px-3 py-1 text-xs font-medium ${
                        st === 'present' ? 'bg-success/10 text-success' :
                        st === 'excused' ? 'bg-warning/10 text-warning' :
                        st === 'active' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {st === 'present' ? t('common.present') :
                         st === 'excused' ? t('common.excused') :
                         st === 'active' ? t('common.active') : t('common.missed')}
                      </span>
                      {l.attendanceStatus && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setRatingLecture(l.id)}>
                          <Star className="h-3 w-3" /> {t('common.save') === 'حفظ' ? 'قيّم' : 'Rate'}
                        </Button>
                      )}
                    </div>
                  </div>
                </TiltCard>
                );
              })
            )}
          </div>
        </div>
      </div>
      {showExcuse && (
        <ExcuseDialog lectureId={showExcuse} studentId={profile.id} onClose={() => setShowExcuse(null)} onSubmitted={loadLectures} />
      )}
      {ratingLecture && (
        <LectureRatingDialog lectureId={ratingLecture} open={!!ratingLecture} onClose={() => setRatingLecture(null)} />
      )}
    </MobileLayout>
  );
}
