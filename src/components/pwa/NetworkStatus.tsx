/**
 * Network Status Indicator Component
 * Shows online/offline status with animations
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { usePWA } from '@/hooks/use-pwa';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NetworkStatus() {
  const { isOnline } = usePWA();
  const { language } = useLanguage();
  const [showStatus, setShowStatus] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowStatus(true);
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // Coming back online
      setShowStatus(true);
      setSyncing(true);
      
      // Simulate sync
      setTimeout(() => {
        setSyncing(false);
        setTimeout(() => {
          setShowStatus(false);
          setWasOffline(false);
        }, 2000);
      }, 2000);
    }
  }, [isOnline, wasOffline]);

  const translations = {
    ar: {
      offline: 'غير متصل بالإنترنت',
      offlineDesc: 'التطبيق يعمل في الوضع غير المتصل',
      online: 'متصل بالإنترنت',
      syncing: 'جاري المزامنة...',
      syncComplete: 'تم المزامنة',
    },
    en: {
      offline: 'You are offline',
      offlineDesc: 'App is working in offline mode',
      online: 'Back online',
      syncing: 'Syncing...',
      syncComplete: 'Sync complete',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-top"
        >
          <div
            className={`mx-auto max-w-lg px-4 py-2 ${
              isOnline
                ? syncing
                  ? 'bg-warning text-warning-foreground'
                  : 'bg-success text-success-foreground'
                : 'bg-destructive text-destructive-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {!isOnline ? (
                <>
                  <CloudOff className="h-4 w-4" />
                  <span className="text-sm font-medium">{t.offline}</span>
                </>
              ) : syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">{t.syncing}</span>
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4" />
                  <span className="text-sm font-medium">{t.syncComplete}</span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact network indicator for navigation bar
export function NetworkIndicator() {
  const { isOnline } = usePWA();
  
  return (
    <div className="flex items-center gap-1.5">
      {isOnline ? (
        <Wifi className="h-4 w-4 text-success" />
      ) : (
        <WifiOff className="h-4 w-4 text-destructive animate-pulse" />
      )}
    </div>
  );
}
