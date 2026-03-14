import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface QRScannerProps {
  onSuccess: () => void;
}

export default function QRScanner({ onSuccess }: QRScannerProps) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  const startScanner = async () => {
    if (!profile) return;
    setScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.type !== 'bsut_attendance' || !data.lecture_id) {
              toast({ title: 'Invalid QR Code', variant: 'destructive' });
              return;
            }

            // Check if QR is fresh (within 2 minutes)
            const currentMinute = Math.floor(Date.now() / 60000);
            if (Math.abs(currentMinute - data.ts) > 2) {
              toast({ title: 'QR Code Expired', description: 'Ask the doctor for a new QR code.', variant: 'destructive' });
              return;
            }

            setProcessing(true);
            await scanner.stop();

            // Register attendance via QR
            const { error } = await supabase.from('attendance').insert({
              student_id: profile.id,
              lecture_id: data.lecture_id,
              status: 'present',
              location_verified: false,
              biometric_verified: false,
            });

            if (error) {
              if (error.code === '23505') {
                toast({ title: 'Already registered', description: 'You already registered for this lecture.' });
              } else {
                throw error;
              }
            } else {
              toast({ title: '✓ Attendance Registered via QR', description: '+3 points earned!' });
              onSuccess();
            }

            setOpen(false);
          } catch (err: any) {
            if (err.message?.includes('JSON')) {
              toast({ title: 'Invalid QR Code', variant: 'destructive' });
            } else {
              toast({ title: 'Error', description: err.message, variant: 'destructive' });
            }
          } finally {
            setProcessing(false);
          }
        },
        () => {} // ignore errors during scan
      );
    } catch (err: any) {
      toast({ title: 'Camera Error', description: 'Could not access camera. Please allow camera permission.', variant: 'destructive' });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (open) {
      // Small delay so DOM element is ready
      setTimeout(startScanner, 300);
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [open]);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-14 rounded-2xl gap-2 flex-1"
      >
        <QrCode className="h-5 w-5" /> Scan QR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-center">Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {processing ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Registering attendance...</p>
              </div>
            ) : (
              <>
                <div id="qr-reader" className="rounded-xl overflow-hidden" />
                <p className="mt-3 text-xs text-muted-foreground text-center">
                  Point your camera at the QR code shown by your doctor
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
