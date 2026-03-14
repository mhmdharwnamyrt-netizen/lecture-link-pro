import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  lectureId: string;
  lectureTitle: string;
}

export default function QRCodeDisplay({ lectureId, lectureTitle }: QRCodeDisplayProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Generate a time-based QR value that expires every 60 seconds
  const qrValue = JSON.stringify({
    type: 'bsut_attendance',
    lecture_id: lectureId,
    ts: Math.floor(Date.now() / 60000), // changes every minute
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(lectureId);
    setCopied(true);
    toast({ title: 'Lecture ID copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-10 rounded-xl gap-2">
        <QrCode className="h-4 w-4" /> QR Code
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Attendance QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground text-center">{lectureTitle}</p>
            <div className="rounded-2xl bg-white p-6 shadow-card">
              <QRCodeSVG
                value={qrValue}
                size={220}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Show this QR code to students. It refreshes every minute.
            </p>
            <Button variant="outline" onClick={handleCopy} className="rounded-xl gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy Lecture ID'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
