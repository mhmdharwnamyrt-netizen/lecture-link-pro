import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LECTURE_HALLS, SECTION_HALLS } from '@/lib/constants';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  profileId: string;
  onCreated: () => void;
}

export default function AddLectureDialog({ open, onClose, profileId, onCreated }: Props) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'lecture' | 'section'>('lecture');
  const [subjectId, setSubjectId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [level, setLevel] = useState<number>(0);
  const [hallNumber, setHallNumber] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [doctorDepts, setDoctorDepts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [availableLevels, setAvailableLevels] = useState<number[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  useEffect(() => {
    if (departmentId) {
      const levels = doctorDepts
        .filter(d => d.department_id === departmentId)
        .map(d => d.level);
      setAvailableLevels(levels);
      if (levels.length === 1) setLevel(levels[0]);
    }
  }, [departmentId, doctorDepts]);

  const loadData = async () => {
    const [dRes, sRes] = await Promise.all([
      supabase.from('doctor_departments').select('*, departments(name)').eq('doctor_id', profileId),
      supabase.from('doctor_subjects').select('*, subjects(name)').eq('doctor_id', profileId),
    ]);
    if (dRes.data) setDoctorDepts(dRes.data);
    if (sRes.data) setSubjects(sRes.data);

    const uniqueDepts = [...new Set(dRes.data?.map(d => d.department_id) || [])];
    if (uniqueDepts.length === 1) setDepartmentId(uniqueDepts[0]);
  };

  const handleCreate = async () => {
    if (!title || !departmentId || !level) {
      toast({ title: t('common.fillRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('lectures').insert({
        doctor_id: profileId,
        title,
        type,
        subject_id: subjectId || null,
        department_id: departmentId,
        level,
        hall_number: hallNumber || null,
        description: description || null,
        notes: notes || null,
      });
      if (error) throw error;

      toast({ title: t('common.createdSuccess') });
      resetForm();
      onCreated();
      onClose();
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setType('lecture'); setSubjectId(''); setDepartmentId('');
    setLevel(0); setHallNumber(0); setDescription(''); setNotes('');
  };

  if (!open) return null;

  const halls = type === 'lecture' ? LECTURE_HALLS : SECTION_HALLS;
  const uniqueDeptIds = [...new Set(doctorDepts.map(d => d.department_id))];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 pb-24 shadow-elevated md:rounded-3xl md:pb-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('doctor.addTitle')} {type === 'lecture' ? t('common.lecture') : t('common.section')}</h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            {(['lecture', 'section'] as const).map(tp => (
              <button
                key={tp}
                onClick={() => setType(tp)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${type === tp ? 'bg-card shadow-card' : 'text-muted-foreground'}`}
              >
                {tp === 'lecture' ? t('common.lecture') : t('common.section')}
              </button>
            ))}
          </div>

          <div>
            <Label>{t('common.title')} *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="e.g. IoT Fundamentals" />
          </div>

          {uniqueDeptIds.length > 1 && (
            <div>
              <Label>{t('common.department')} *</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {uniqueDeptIds.map(dId => {
                  const dept = doctorDepts.find(d => d.department_id === dId);
                  return (
                    <button key={dId} onClick={() => { setDepartmentId(dId); setLevel(0); }}
                      className={`rounded-xl px-3 py-2 text-sm transition-colors ${departmentId === dId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {dept?.departments?.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {departmentId && availableLevels.length > 1 && (
            <div>
              <Label>{t('common.level')} *</Label>
              <div className="mt-2 flex gap-2">
                {availableLevels.map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${level === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {t('common.level')} {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {subjects.length > 0 && (
            <div>
              <Label>{t('common.subject')}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {subjects.map(s => (
                  <button key={s.subject_id} onClick={() => setSubjectId(s.subject_id)}
                    className={`rounded-xl px-3 py-2 text-sm transition-colors ${subjectId === s.subject_id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {s.subjects?.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>{t('common.hall')}</Label>
            <select value={hallNumber} onChange={e => setHallNumber(Number(e.target.value))}
              className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value={0}>{t('common.selectHall')}</option>
              {halls.map(h => (<option key={h} value={h}>{t('common.hall')} {h}</option>))}
            </select>
          </div>

          <div>
            <Label>{t('common.description')} ({t('common.optional')})</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1 h-12 rounded-xl" />
          </div>

          <div>
            <Label>{t('common.notes')} ({t('common.optional')})</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 h-12 rounded-xl" />
          </div>

          <div className="sticky bottom-0 bg-card pt-2">
            <Button onClick={handleCreate} className="h-14 w-full rounded-2xl text-base" disabled={loading || !title || !departmentId || !level}>
              {loading ? t('common.creating') : t('common.create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
