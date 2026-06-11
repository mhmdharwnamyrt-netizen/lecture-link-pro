import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OfflineBanner() {
  const { language } = useLanguage();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground px-3 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="h-3.5 w-3.5" />
      {language === 'ar'
        ? 'وضع عدم الاتصال — سيتم المزامنة عند توفر الإنترنت'
        : 'Offline mode — data will sync when back online'}
    </div>
  );
}
