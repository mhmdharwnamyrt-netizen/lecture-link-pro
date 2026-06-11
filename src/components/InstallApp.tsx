import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const { language } = useLanguage();
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iOS, setIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore
      window.navigator.standalone === true;
    setInstalled(standalone);
    setIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) {
      if (iOS) {
        toast({
          title: language === 'ar' ? 'التثبيت على iPhone' : 'Install on iPhone',
          description: language === 'ar'
            ? 'افتح القائمة Share ثم اختر "Add to Home Screen"'
            : 'Tap the Share button, then "Add to Home Screen"',
        });
      } else {
        toast({
          title: language === 'ar' ? 'التثبيت غير متاح حاليًا' : 'Install not available',
          description: language === 'ar'
            ? 'افتح الموقع في متصفح Chrome وأعد المحاولة'
            : 'Open the site in Chrome and try again',
        });
      }
      return;
    }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  };

  const downloadApk = () => {
    const apkUrl = '/app/bsut-attendance.apk';
    // Will be available once doctor uploads the APK
    fetch(apkUrl, { method: 'HEAD' }).then(r => {
      if (r.ok) {
        window.location.href = apkUrl;
      } else {
        toast({
          title: language === 'ar' ? 'تطبيق Android قيد التحضير' : 'Android app coming soon',
          description: language === 'ar'
            ? 'سيتم رفع ملف APK قريبًا. يمكنك حاليًا تثبيت تطبيق الويب.'
            : 'The APK is being prepared. You can install the web app for now.',
        });
      }
    }).catch(() => {
      toast({
        title: language === 'ar' ? 'تطبيق Android قيد التحضير' : 'Android app coming soon',
        description: language === 'ar' ? 'سيتم رفع ملف APK قريبًا.' : 'The APK will be available soon.',
      });
    });
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
      <div className="flex items-center gap-3">
        <Smartphone className="h-5 w-5 text-primary" />
        <p className="text-sm font-medium">
          {language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
        </p>
      </div>

      {installed ? (
        <div className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm font-medium">
            {language === 'ar' ? 'التطبيق مثبت' : 'App installed'}
          </p>
        </div>
      ) : (
        <Button onClick={handleInstall} className="w-full h-12 rounded-xl">
          <Download className="me-2 h-4 w-4" />
          {language === 'ar' ? 'تثبيت كتطبيق (PWA)' : 'Install as App (PWA)'}
        </Button>
      )}

      <Button onClick={downloadApk} variant="outline" className="w-full h-12 rounded-xl">
        <Download className="me-2 h-4 w-4" />
        {language === 'ar' ? 'تحميل تطبيق Android (APK)' : 'Download Android (APK)'}
      </Button>

      <p className="text-[11px] text-muted-foreground">
        {language === 'ar'
          ? 'PWA يعمل على جميع الأجهزة. APK لأجهزة Android فقط.'
          : 'PWA works on all devices. APK is for Android only.'}
      </p>
    </div>
  );
}
