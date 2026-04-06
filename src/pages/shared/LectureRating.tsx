import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface LectureRatingProps {
  lectureId: string;
  open: boolean;
  onClose: () => void;
}

export function LectureRatingDialog({ lectureId, open, onClose }: LectureRatingProps) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    if (open && profile) checkExisting();
  }, [open, profile]);

  const checkExisting = async () => {
    const { data } = await supabase
      .from('lecture_ratings')
      .select('*')
      .eq('lecture_id', lectureId)
      .eq('student_id', profile!.id)
      .maybeSingle();
    if (data) {
      setHasRated(true);
      setRating(data.rating);
      setComment(data.comment || '');
    }
  };

  const submit = async () => {
    if (!rating || !profile) return;
    setSubmitting(true);
    const { error } = await supabase.from('lecture_ratings').insert({
      lecture_id: lectureId,
      student_id: profile.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: language === 'ar' ? 'شكراً لتقييمك!' : 'Thank you for your rating!' });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{language === 'ar' ? 'تقييم المحاضرة' : 'Rate Lecture'}</DialogTitle>
        </DialogHeader>

        {hasRated ? (
          <div className="text-center py-4">
            <div className="flex justify-center gap-1 mb-2">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`h-8 w-8 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لقد قمت بتقييم هذه المحاضرة مسبقاً' : 'You have already rated this lecture'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(i => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(i)}
                >
                  <Star className={`h-10 w-10 transition-colors ${
                    i <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                  }`} />
                </motion.button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {language === 'ar' ? 'تقييمك مجهول بالكامل' : 'Your rating is completely anonymous'}
            </p>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={language === 'ar' ? 'أضف تعليقاً (اختياري)...' : 'Add a comment (optional)...'}
              rows={3}
            />
            <Button onClick={submit} disabled={!rating || submitting} className="w-full rounded-xl">
              {submitting ? (language === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (language === 'ar' ? 'إرسال التقييم' : 'Submit Rating')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LectureRatingSummary({ lectureId }: { lectureId: string }) {
  const { language } = useLanguage();
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.from('lecture_ratings').select('rating').eq('lecture_id', lectureId).then(({ data }) => {
      if (data && data.length > 0) {
        setCount(data.length);
        setAvg(data.reduce((s, r) => s + r.rating, 0) / data.length);
      }
    });
  }, [lectureId]);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span className="font-medium">{avg.toFixed(1)}</span>
      <span className="text-muted-foreground">({count} {language === 'ar' ? 'تقييم' : 'ratings'})</span>
    </div>
  );
}
