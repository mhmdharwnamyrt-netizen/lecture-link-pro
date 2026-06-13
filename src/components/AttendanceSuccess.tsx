import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AttendanceSuccess({ open, points = 3, onClose }: { open: boolean; points?: number; onClose: () => void }) {
  const { language } = useLanguage();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 220 }}
            className="relative w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-elevated"
          >
            <motion.div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-success/15"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, repeat: 1 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="h-14 w-14 text-success" strokeWidth={2.5} />
              </motion.div>
            </motion.div>
            <h2 className="mt-6 text-2xl font-bold">
              {language === 'ar' ? 'تم تسجيل الحضور!' : 'Attendance Recorded!'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {language === 'ar' ? 'أحسنت، استمر بهذا الالتزام' : 'Great work, keep it up!'}
            </p>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary/10 px-5 py-3"
            >
              <span className="text-xs font-medium uppercase text-primary/80">
                {language === 'ar' ? 'النقاط' : 'Points'}
              </span>
              <motion.span
                key={points}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
                className="text-2xl font-bold tabular-nums text-primary"
              >
                +{points}
              </motion.span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
