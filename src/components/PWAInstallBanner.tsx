import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Wifi, WifiOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/use-pwa';
import { useLanguage } from '@/contexts/LanguageContext';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, showBanner, installApp, dismissBanner } = usePWA();
  const { language } = useLanguage();
  const [installing, setInstalling] = useState(false);

  // Don't show if already installed or not installable
  if (isInstalled || !showBanner || !isInstallable) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await installApp();
    setInstalling(false);
  };

  const isAr = language === 'ar';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-20 left-3 right-3 z-[60] md:bottom-4 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {isAr ? 'ثبّت التطبيق' : 'Install App'}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {isAr
                  ? 'ثبّت BSUT Attendance على جهازك للوصول السريع والعمل بدون إنترنت'
                  : 'Install BSUT Attendance on your device for quick access and offline support'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 rounded-xl text-xs"
                  onClick={handleInstall}
                  disabled={installing}
                >
                  {installing ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      {isAr ? 'جاري التثبيت...' : 'Installing...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      {isAr ? 'تثبيت الآن' : 'Install Now'}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-xl text-xs text-muted-foreground"
                  onClick={dismissBanner}
                >
                  {isAr ? 'لاحقاً' : 'Later'}
                </Button>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[70] flex items-center justify-center gap-2 bg-warning/90 px-4 py-2 text-xs font-medium text-warning-foreground backdrop-blur-sm safe-top"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>You are offline. Some features may be limited.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function OnlineRestoredToast() {
  const { isOnline } = usePWA();
  const [wasOffline, setWasOffline] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Track transitions from offline to online
  if (!isOnline && !wasOffline) {
    setWasOffline(true);
  }

  if (isOnline && wasOffline) {
    setWasOffline(false);
    if (!showToast) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[70] flex items-center justify-center gap-2 bg-success/90 px-4 py-2 text-xs font-medium text-success-foreground backdrop-blur-sm safe-top"
        >
          <Wifi className="h-3.5 w-3.5" />
          <span>You are back online!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
