import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, Shield, CheckCircle2, Loader2, X } from 'lucide-react';

interface Props {
  onVerified?: () => void;
}

export default function IdentityVerification({ onVerified }: Props) {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [carnet, setCarnet] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const carnetRef = useRef<HTMLInputElement>(null);

  const handleCapture = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!idFront || !idBack || !carnet || !profile) return;
    setVerifying(true);

    try {
      // Upload all 3 photos
      const uploads = await Promise.all([
        uploadPhoto(idFront, 'id-front'),
        uploadPhoto(idBack, 'id-back'),
        uploadPhoto(carnet, 'carnet'),
      ]);

      // Call AI verification
      const { data, error } = await supabase.functions.invoke('verify-identity', {
        body: {
          studentId: profile.id,
          studentName: profile.full_name,
          universityId: profile.student_id,
          idFrontUrl: uploads[0],
          idBackUrl: uploads[1],
          carnetUrl: uploads[2],
        },
      });

      if (error) throw error;

      if (data?.verified) {
        setVerified(true);
        toast({ title: t('student.verificationSuccess') });
        onVerified?.();
      } else {
        toast({ title: t('student.verificationFailed'), variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const uploadPhoto = async (dataUrl: string, type: string): Promise<string> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `identity/${profile!.id}/${type}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('face-photos').upload(fileName, blob);
    if (error) throw error;
    const { data } = supabase.storage.from('face-photos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  if (verified) {
    return (
      <div className="rounded-2xl bg-success/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-success" />
        <p className="font-semibold text-success">{t('student.identityVerified')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        {t('student.idVerification')}
      </h3>

      {/* ID Front */}
      <PhotoSlot
        label={t('student.uploadIdFront')}
        photo={idFront}
        inputRef={frontRef}
        onCapture={handleCapture(setIdFront)}
        onClear={() => setIdFront(null)}
      />

      {/* ID Back */}
      <PhotoSlot
        label={t('student.uploadIdBack')}
        photo={idBack}
        inputRef={backRef}
        onCapture={handleCapture(setIdBack)}
        onClear={() => setIdBack(null)}
      />

      {/* Carnet */}
      <PhotoSlot
        label={t('student.uploadCarnet')}
        photo={carnet}
        inputRef={carnetRef}
        onCapture={handleCapture(setCarnet)}
        onClear={() => setCarnet(null)}
      />

      <Button
        onClick={handleVerify}
        disabled={!idFront || !idBack || !carnet || verifying}
        className="h-14 w-full rounded-2xl text-base"
      >
        {verifying ? (
          <><Loader2 className="me-2 h-5 w-5 animate-spin" /> {t('student.verifying')}</>
        ) : (
          <><Shield className="me-2 h-5 w-5" /> {t('student.verifyIdentity')}</>
        )}
      </Button>
    </div>
  );
}

function PhotoSlot({ label, photo, inputRef, onCapture, onClear }: {
  label: string;
  photo: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      {photo ? (
        <div className="relative">
          <img src={photo} alt={label} className="h-32 w-full rounded-xl object-cover" />
          <button onClick={onClear} className="absolute top-2 end-2 rounded-full bg-card/80 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 transition-colors hover:bg-muted"
        >
          <div className="text-center">
            <Camera className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onCapture} />
    </div>
  );
}
