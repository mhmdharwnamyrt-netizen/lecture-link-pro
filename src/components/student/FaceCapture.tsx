import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface FaceCaptureProps {
  instruction: string;
  onCapture: (base64: string) => void;
  capturedImage?: string;
  onRetake?: () => void;
}

export default function FaceCapture({ instruction, onCapture, capturedImage, onRetake }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      setError('Could not access camera. Please allow camera permission.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraReady(false);
    }
  }, [stream]);

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [capturedImage]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    // Mirror the image (selfie camera)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    stopCamera();
    onCapture(base64);
  };

  const handleRetake = () => {
    onRetake?.();
    startCamera();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Camera className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-destructive text-center">{error}</p>
        <Button onClick={startCamera} variant="outline" className="rounded-xl">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-center text-muted-foreground">{instruction}</p>

      {capturedImage ? (
        <div className="relative">
          <img
            src={`data:image/jpeg;base64,${capturedImage}`}
            alt="Captured"
            className="h-64 w-64 rounded-2xl object-cover ring-4 ring-success/30"
          />
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="h-5 w-5" />
          </div>
        </div>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-64 w-64 rounded-2xl object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Face guide overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-48 w-40 rounded-[50%] border-2 border-dashed border-primary/50" />
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {capturedImage ? (
        <Button onClick={handleRetake} variant="outline" className="h-12 w-full max-w-xs rounded-xl gap-2">
          <RotateCcw className="h-4 w-4" /> {t('face.retake')}
        </Button>
      ) : (
        <Button
          onClick={capturePhoto}
          disabled={!cameraReady}
          className="h-14 w-full max-w-xs rounded-2xl text-base gap-2"
        >
          <Camera className="h-5 w-5" /> {t('face.capturePhoto')}
        </Button>
      )}
    </div>
  );
}
