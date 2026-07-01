import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import FaceCapture from '@/components/student/FaceCapture';
import { ArrowLeft, ArrowRight, Shield, Loader2, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { key: 'front', translationKey: 'face.captureFront' as const, instruction: 'face.frontInstruction' as const },
  { key: 'right', translationKey: 'face.captureRight' as const, instruction: 'face.rightInstruction' as const },
  { key: 'left', translationKey: 'face.captureLeft' as const, instruction: 'face.leftInstruction' as const },
];

export default function FaceRegistration() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<{ front?: string; right?: string; left?: string }>({});
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) navigate('/login');
  }, [loading, user, profile]);

  const handleCapture = (key: string, base64: string) => {
    setPhotos(prev => ({ ...prev, [key]: base64 }));
  };

  const handleRetake = (key: string) => {
    setPhotos(prev => {
      const copy = { ...prev };
      delete (copy as any)[key];
      return copy;
    });
  };

  const uploadPhoto = async (base64: string, fileName: string): Promise<string> => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // Path must start with auth user id per storage RLS
    const path = `${user!.id}/face/${fileName}`;
    const { error } = await supabase.storage.from('face-photos').upload(path, blob, {
      upsert: true,
      contentType: 'image/jpeg',
    });
    if (error) throw error;

    // Store the bare object path — bucket is private, signed URLs generated on read.
    return path;
  };

  const handleComplete = async () => {
    if (!photos.front) {
      toast({ title: 'Front photo is required', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const [frontUrl, rightUrl, leftUrl] = await Promise.all([
        uploadPhoto(photos.front, 'front.jpg'),
        photos.right ? uploadPhoto(photos.right, 'right.jpg') : Promise.resolve(null),
        photos.left ? uploadPhoto(photos.left, 'left.jpg') : Promise.resolve(null),
      ]);

      // Upsert face template
      const { error } = await supabase.from('face_templates').upsert({
        student_id: profile!.id,
        front_photo_url: frontUrl,
        right_photo_url: rightUrl,
        left_photo_url: leftUrl,
      }, { onConflict: 'student_id' });

      if (error) throw error;

      setDone(true);
      toast({ title: t('face.registrationSuccess') });
      setTimeout(() => navigate('/student'), 1500);
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (loading || !profile) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  if (done) return (
    <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-10 w-10 text-success" />
      </motion.div>
      <h2 className="text-xl font-bold">{t('face.registrationSuccess')}</h2>
      <p className="text-muted-foreground">Redirecting to dashboard...</p>
    </div>
  );

  const currentStep = STEPS[step];
  const currentKey = currentStep.key as 'front' | 'right' | 'left';

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center justify-between p-4">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">{t('face.registration')}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/student')} className="text-xs text-muted-foreground">
          {t('face.skipForNow')}
        </Button>
      </div>

      {/* Progress */}
      <div className="px-4 mb-6">
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          {t('face.step')} {step + 1} {t('face.of')} {STEPS.length}
        </p>
      </div>

      <div className="flex-1 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col items-center"
          >
            <h2 className="mb-2 text-lg font-semibold">{t(currentStep.translationKey)}</h2>

            <FaceCapture
              instruction={t(currentStep.instruction)}
              onCapture={(base64) => handleCapture(currentKey, base64)}
              capturedImage={photos[currentKey]}
              onRetake={() => handleRetake(currentKey)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-4">
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!photos[currentKey]}
            className="h-14 w-full rounded-2xl text-base"
          >
            {t('face.next')} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={!photos.front || uploading}
            className="h-14 w-full rounded-2xl text-base"
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t('common.loading')}</>
            ) : (
              t('face.complete')
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
