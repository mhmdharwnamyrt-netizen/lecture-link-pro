import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

const EXCUSE_REASON_KEYS = [
  'excuse.medicalIllness',
  'excuse.medicalHospital',
  'excuse.familyEmergency',
  'excuse.travel',
  'excuse.universityEvent',
  'excuse.militaryService',
  'excuse.other',
] as const;

interface Props {
  lectureId: string;
  studentId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ExcuseDialog({ lectureId, studentId, onClose, onSubmitted }: Props) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: t('excuse.selectReason'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('excuses').insert({
        student_id: studentId,
        lecture_id: lectureId,
        reason,
        description: description || null,
      });
      if (error) throw error;

      toast({ title: t('excuse.submitted'), description: t('excuse.submittedDesc') });
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl bg-card p-6 pb-24 shadow-elevated md:rounded-3xl md:pb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('excuse.submit')}</h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>{t('excuse.reason')} *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXCUSE_REASON_KEYS.map(key => {
                const label = t(key as any);
                return (
                  <button
                    key={key}
                    onClick={() => setReason(label)}
                    className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                      reason === label ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>{t('excuse.description')} ({t('common.optional')})</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              placeholder={t('excuse.addDetails')}
            />
          </div>

          <div className="sticky bottom-0 bg-card pt-2">
            <Button onClick={handleSubmit} className="h-14 w-full rounded-2xl text-base" disabled={loading || !reason}>
              {loading ? t('common.submitting') : t('excuse.submit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
