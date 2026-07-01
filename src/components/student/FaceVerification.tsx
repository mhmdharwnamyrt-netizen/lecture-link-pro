import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface FaceVerificationProps {
  lectureId: string;
  latitude?: number;
  longitude?: number;
  locationVerified: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  open: boolean;
}

export default function FaceVerification({
  lectureId, latitude, longitude, locationVerified, onSuccess, onCancel, open
}: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'camera' | 'analyzing' | 'success' | 'failed'>('camera');
  const [cameraReady, setCameraReady] = useState(false);
  const [matchScore, setMatchScore] = useState(0);
  const [reason, setReason] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      toast({ title: 'Camera Error', description: 'Could not access camera.', variant: 'destructive' });
      onCancel();
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    }
  }, []);

  useEffect(() => {
    if (open && phase === 'camera') {
      setTimeout(startCamera, 300);
    }
    return () => stopCamera();
  }, [open, phase]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !profile) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

    stopCamera();
    setPhase('analyzing');

    try {
      // Get registered face template
      const { data: faceTemplate } = await supabase
        .from('face_templates')
        .select('front_photo_url')
        .eq('student_id', profile.id)
        .single();

      if (!faceTemplate) {
        toast({ title: 'No face registered', description: 'Please register your face first.', variant: 'destructive' });
        onCancel();
        return;
      }

      // Convert stored path/legacy URL to a short-lived signed URL for the AI service
      const { createSignedUrl } = await import('@/lib/storage');
      const registeredSignedUrl = await createSignedUrl('face-photos', faceTemplate.front_photo_url, 300);
      if (!registeredSignedUrl) throw new Error('Registered face photo unavailable');

      // Call edge function for face comparison
      const { data: result, error } = await supabase.functions.invoke('face-verify', {
        body: {
          registeredPhotoUrl: registeredSignedUrl,
          verificationPhotoBase64: base64,
        },
      });

      if (error) throw error;

      const score = result?.score ?? 0;
      const isMatch = result?.match ?? false;
      setMatchScore(score);
      setReason(result?.reason || '');

      if (isMatch) {
        // Upload verification photo
        const byteChars = atob(base64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
        const blob = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' });

        // Path must start with auth.uid() per storage RLS
        const verifyPath = `${user!.id}/verify/${Date.now()}.jpg`;
        await supabase.storage.from('face-photos').upload(verifyPath, blob, { contentType: 'image/jpeg' });

        // Register attendance with face verification (store bare path)
        const { error: attError } = await supabase.from('attendance').insert({
          student_id: profile.id,
          lecture_id: lectureId,
          status: 'present',
          location_verified: locationVerified,
          biometric_verified: true,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          verification_photo_url: verifyPath,
          face_match_score: score,
        });

        if (attError) {
          if (attError.code === '23505') {
            toast({ title: 'Already registered' });
          } else {
            throw attError;
          }
        } else {
          toast({ title: '✓ ' + t('face.verificationSuccess'), description: '+3 points earned!' });
        }

        setPhase('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setPhase('failed');
        toast({
          title: t('face.verificationFailed'),
          description: `${t('face.matchScore')}: ${score}%. ${result?.reason || ''}`,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
      setPhase('failed');
    }
  };

  const handleRetry = () => {
    setPhase('camera');
    setMatchScore(0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { stopCamera(); onCancel(); } }}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Shield className="h-5 w-5 text-primary" />
            {t('face.identityConfirmation')}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {phase === 'camera' && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-64 w-64 rounded-2xl object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-48 w-40 rounded-[50%] border-2 border-dashed border-primary/50" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-xs text-muted-foreground text-center">
                {t('face.frontInstruction')}
              </p>
              <Button
                onClick={handleCapture}
                disabled={!cameraReady}
                className="h-14 w-full rounded-2xl text-base gap-2"
              >
                <Camera className="h-5 w-5" /> {t('face.capturePhoto')}
              </Button>
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-medium">{t('face.analyzing')}</p>
              <p className="text-xs text-muted-foreground text-center">
                {t('student.verifyingFace')}
              </p>
            </div>
          )}

          {phase === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-success">{t('face.verificationSuccess')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('face.matchScore')}: {matchScore}%
              </p>
            </div>
          )}

          {phase === 'failed' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-destructive">{t('face.verificationFailed')}</h3>
              <p className="text-sm text-muted-foreground text-center">
                {t('face.matchScore')}: {matchScore}%
                {reason && <><br />{reason}</>}
              </p>
              <div className="flex gap-2 w-full">
                <Button onClick={handleRetry} className="flex-1 h-12 rounded-xl">
                  {t('face.retake')}
                </Button>
                <Button onClick={onCancel} variant="outline" className="flex-1 h-12 rounded-xl">
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
