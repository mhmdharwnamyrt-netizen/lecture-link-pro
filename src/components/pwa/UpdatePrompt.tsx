/**
 * Update Prompt Component
 * Shows when a new version of the app is available
 */

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/use-pwa';
import { useLanguage } from '@/contexts/LanguageContext';

export default function UpdatePrompt() {
  const { isUpdateAvailable, update } = usePWA();
  const { language } = useLanguage();

  const translations = {
    ar: {
      title: 'تحديث متاح',
      description: 'نسخة جديدة من التطبيق متاحة الآن',
      update: 'تحديث الآن',
      later: 'لاحقاً',
    },
    en: {
      title: 'Update Available',
      description: 'A new version of the app is available',
      update: 'Update Now',
      later: 'Later',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <AnimatePresence>
      {isUpdateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-96"
        >
          <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-elevated">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-foreground/20">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm opacity-90">{t.description}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={update}
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t.update}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
