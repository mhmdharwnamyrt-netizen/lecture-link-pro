import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardHeroProps {
  name: string;
  subtitle?: string;
  nextLecture?: { title: string; time?: string; hall?: string } | null;
}

export default function DashboardHero({ name, subtitle, nextLecture }: DashboardHeroProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const avatarUrl = (profile as any)?.avatar_url as string | undefined;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mb-6 overflow-hidden rounded-3xl p-5 shadow-elevated"
    >
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary to-accent" />
      <motion.div
        className="absolute -top-16 -left-16 -z-10 h-56 w-56 rounded-full bg-white/20 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-20 -right-12 -z-10 h-64 w-64 rounded-full bg-accent/40 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Glass card */}
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white/40 bg-white/15 backdrop-blur-md">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserIcon className="h-7 w-7 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t('auth.welcomeBack')}</p>
            <h1 className="mt-0.5 truncate text-lg font-bold text-white drop-shadow-sm md:text-xl">{name}</h1>
            {subtitle && <p className="mt-0.5 truncate text-xs text-white/85">{subtitle}</p>}
          </div>
        </div>


        <div className="mt-4 flex gap-2">
          <div className="flex-1 rounded-2xl bg-white/15 p-3 backdrop-blur-md border border-white/25">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/80">
              <Clock className="h-3 w-3" /> {language === 'ar' ? 'الوقت' : 'Time'}
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">{timeStr}</p>
          </div>
          <div className="flex-1 rounded-2xl bg-white/15 p-3 backdrop-blur-md border border-white/25">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/80">
              <CalendarIcon className="h-3 w-3" /> {language === 'ar' ? 'اليوم' : 'Today'}
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-white">{dateStr}</p>
          </div>
        </div>

        {nextLecture && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 rounded-2xl bg-white/15 p-3 backdrop-blur-md border border-white/25"
          >
            <div className="flex items-center gap-2">
              <div className="relative h-2 w-2 rounded-full bg-white">
                <motion.div
                  className="absolute inset-0 rounded-full bg-white"
                  animate={{ scale: [1, 2.4], opacity: [0.8, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              </div>
              <p className="text-[10px] uppercase tracking-wide text-white/85">
                {language === 'ar' ? 'محاضرتك القادمة' : 'Next Lecture'}
              </p>
            </div>
            <p className="mt-1 font-semibold text-white truncate">{nextLecture.title}</p>
            <p className="text-xs text-white/85">
              {nextLecture.time} {nextLecture.hall && `• ${t('common.hall')} ${nextLecture.hall}`}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
