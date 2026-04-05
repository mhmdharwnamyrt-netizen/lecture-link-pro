import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera, Shield, CheckCircle2, Loader2, X, User, MapPin, CreditCard } from 'lucide-react';

interface Props {
  onVerified?: () => void;
}

interface ExtractedData {
  full_name?: string;
  national_id?: string;
  address?: string;
  gender?: string;
  date_of_birth?: string;
  [key: string]: string | undefined;
}

export default function IdentityVerification({ onVerified }: Props) {
  const { profile, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [carnet, setCarnet] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const carnetRef = useRef<HTMLInputElement>(null);

  // Check if already verified
  useEffect(() => {
    if (profile) {
      const saved = localStorage.getItem(`identity_verified_${profile.id}`);
      const savedData = localStorage.getItem(`identity_data_${profile.id}`);
      if (saved === 'true') {
        setVerified(true);
        if (savedData) setExtractedData(JSON.parse(savedData));
      }
    }
  }, [profile]);

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
      const uploads = await Promise.all([
        uploadPhoto(idFront, 'id-front'),
        uploadPhoto(idBack, 'id-back'),
        uploadPhoto(carnet, 'carnet'),
      ]);

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
        const extracted: ExtractedData = {
          full_name: data.extracted_name || profile.full_name,
          national_id: data.national_id || '',
          address: data.address || '',
          gender: data.gender || '',
          date_of_birth: data.date_of_birth || '',
        };
        setExtractedData(extracted);

        // Save locally
        localStorage.setItem(`identity_verified_${profile.id}`, 'true');
        localStorage.setItem(`identity_data_${profile.id}`, JSON.stringify(extracted));
        localStorage.setItem(`identity_photos_${profile.id}`, JSON.stringify(uploads));

        toast({ title: t('student.verificationSuccess') });
        onVerified?.();
      } else {
        toast({ title: t('student.verificationFailed'), description: data?.reason, variant: 'destructive' });
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

  if (verified && extractedData) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-success/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="font-semibold text-success">{t('student.identityVerified')}</p>
          </div>
          <div className="space-y-2">
            {extractedData.full_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{language === 'ar' ? 'الاسم:' : 'Name:'}</span>
                <span className="font-medium">{extractedData.full_name}</span>
              </div>
            )}
            {extractedData.national_id && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{language === 'ar' ? 'الرقم القومي:' : 'National ID:'}</span>
                <span className="font-medium tabular-nums">{extractedData.national_id}</span>
              </div>
            )}
            {extractedData.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{language === 'ar' ? 'محل الإقامة:' : 'Address:'}</span>
                <span className="font-medium">{extractedData.address}</span>
              </div>
            )}
            {extractedData.gender && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{language === 'ar' ? 'النوع:' : 'Gender:'}</span>
                <span className="font-medium">{extractedData.gender}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        {t('student.idVerification')}
      </h3>

      <PhotoSlot label={t('student.uploadIdFront')} photo={idFront} inputRef={frontRef} onCapture={handleCapture(setIdFront)} onClear={() => setIdFront(null)} />
      <PhotoSlot label={t('student.uploadIdBack')} photo={idBack} inputRef={backRef} onCapture={handleCapture(setIdBack)} onClear={() => setIdBack(null)} />
      <PhotoSlot label={t('student.uploadCarnet')} photo={carnet} inputRef={carnetRef} onCapture={handleCapture(setCarnet)} onClear={() => setCarnet(null)} />

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
