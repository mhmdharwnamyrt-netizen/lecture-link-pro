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
  const [accountLocked, setAccountLocked] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const carnetRef = useRef<HTMLInputElement>(null);

  // Check if already verified or locked
  useEffect(() => {
    if (profile) {
      const locked = localStorage.getItem(`account_locked_${profile.id}`);
      if (locked === 'true') {
        setAccountLocked(true);
        return;
      }
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
          religion: data.religion || '',
          marital_status: data.marital_status || '',
          job: data.job || '',
          expiry_date: data.expiry_date || '',
        };
        setExtractedData(extracted);

        // Save locally
        localStorage.setItem(`identity_verified_${profile.id}`, 'true');
        localStorage.setItem(`identity_data_${profile.id}`, JSON.stringify(extracted));
        localStorage.setItem(`identity_photos_${profile.id}`, JSON.stringify(uploads));

        toast({ title: t('student.verificationSuccess') });
        onVerified?.();
      } else {
        // LOCK ACCOUNT - data mismatch
        setAccountLocked(true);
        localStorage.setItem(`account_locked_${profile.id}`, 'true');
        localStorage.setItem(`lock_reason_${profile.id}`, data?.reason || 'Identity mismatch');
        toast({ title: language === 'ar' ? 'تم إغلاق الحساب' : 'Account Locked', description: data?.reason, variant: 'destructive' });
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

  // Account locked screen
  if (accountLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="rounded-full bg-destructive/10 p-6 mb-4">
          <Shield className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-destructive mb-2">
          {language === 'ar' ? 'تم إغلاق الحساب' : 'Account Locked'}
        </h2>
        <p className="text-muted-foreground max-w-xs mb-4">
          {language === 'ar'
            ? 'تم إغلاق حسابك لأن بيانات الهوية المرفوعة لا تتطابق مع بيانات التسجيل. يرجى التواصل مع إدارة الجامعة لحل المشكلة.'
            : 'Your account has been locked because the uploaded identity documents do not match your registration data. Please contact the university administration to resolve this issue.'}
        </p>
        <p className="text-xs text-muted-foreground">
          {language === 'ar' ? 'السبب: ' : 'Reason: '}
          {localStorage.getItem(`lock_reason_${profile?.id}`) || 'Identity mismatch'}
        </p>
      </div>
    );
  }

  if (verified && extractedData) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-success/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="font-semibold text-success">{t('student.identityVerified')}</p>
          </div>
          <div className="space-y-2">
            {Object.entries(extractedData).map(([key, value]) => {
              if (!value) return null;
              const labels: Record<string, [string, string]> = {
                full_name: ['الاسم', 'Name'],
                national_id: ['الرقم القومي', 'National ID'],
                address: ['محل الإقامة', 'Address'],
                gender: ['النوع', 'Gender'],
                date_of_birth: ['تاريخ الميلاد', 'Date of Birth'],
                religion: ['الديانة', 'Religion'],
                marital_status: ['الحالة الاجتماعية', 'Marital Status'],
                job: ['الوظيفة', 'Job'],
                expiry_date: ['تاريخ الانتهاء', 'Expiry Date'],
              };
              const label = labels[key];
              if (!label) return null;
              const icons: Record<string, any> = { full_name: User, national_id: CreditCard, address: MapPin };
              const Icon = icons[key] || Shield;
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{language === 'ar' ? label[0] : label[1]}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              );
            })}
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
