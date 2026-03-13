import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { EXCUSE_REASONS } from '@/lib/constants';
import { X } from 'lucide-react';

interface Props {
  lectureId: string;
  studentId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ExcuseDialog({ lectureId, studentId, onClose, onSubmitted }: Props) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: 'Please select a reason', variant: 'destructive' });
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

      toast({ title: 'Excuse submitted', description: 'Your excuse has been sent to the doctor for review.' });
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl bg-card p-6 shadow-elevated md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Submit Excuse</h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Reason *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXCUSE_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                    reason === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Add more details..."
            />
          </div>

          <Button onClick={handleSubmit} className="h-14 w-full rounded-2xl text-base" disabled={loading || !reason}>
            {loading ? 'Submitting...' : 'Submit Excuse'}
          </Button>
        </div>
      </div>
    </div>
  );
}
