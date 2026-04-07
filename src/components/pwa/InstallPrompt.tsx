/**
 * PWA Install Prompt Component
 * Shows a banner prompting users to install the app
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/use-pwa';
import { useLanguage } from '@/contexts/LanguageContext';

export default function InstallPrompt() {
  const { isInstallable, isInstalled, showIOSPrompt, isIOS, install } = usePWA();
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Check if user has dismissed before
  useEffect(() => {
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      const success = await install();
      if (success) {
        setDismissed(true);
      }
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed || (!isInstallable && !showIOSPrompt)) {
    return null;
  }

  const translations = {
    ar: {
      title: 'ثبّت التطبيق',
      description: 'احصل على تجربة أفضل مع الإشعارات والعمل بدون إنترنت',
      install: 'تثبيت',
      iosTitle: 'تثبيت على iOS',
      iosStep1: 'اضغط على زر المشاركة',
      iosStep2: 'اختر "إضافة إلى الشاشة الرئيسية"',
      iosStep3: 'اضغط "إضافة" للتأكيد',
      close: 'إغلاق',
    },
    en: {
      title: 'Install App',
      description: 'Get a better experience with notifications and offline access',
      install: 'Install',
      iosTitle: 'Install on iOS',
      iosStep1: 'Tap the Share button',
      iosStep2: 'Select "Add to Home Screen"',
      iosStep3: 'Tap "Add" to confirm',
      close: 'Close',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <>
      <AnimatePresence>
        {!showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-96"
          >
            <div className="rounded-2xl bg-card p-4 shadow-elevated border border-border">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={handleInstall}
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {t.install}
                    </Button>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm p-4 md:items-center"
            onClick={() => setShowIOSInstructions(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-elevated"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t.iosTitle}</h2>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    1
                  </div>
                  <div className="flex items-center gap-2">
                    <Share className="h-5 w-5 text-primary" />
                    <span className="text-sm">{t.iosStep1}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    2
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    <span className="text-sm">{t.iosStep2}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    3
                  </div>
                  <span className="text-sm">{t.iosStep3}</span>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSInstructions(false)}
                className="mt-6 w-full"
              >
                {t.close}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
