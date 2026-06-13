import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import logoAsset from '@/assets/bsut-logo.png.asset.json';

interface CinematicLoaderProps {
  fullscreen?: boolean;
  message?: string;
}

const DEFAULT_MESSAGES = [
  'جاري التحميل...',
  'جاري المزامنة...',
  'جاهز',
];

export default function CinematicLoader({ fullscreen = true, message }: CinematicLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const id = setInterval(() => setMsgIndex(i => (i + 1) % DEFAULT_MESSAGES.length), 1100);
    return () => clearInterval(id);
  }, [message]);

  const wrapperClass = fullscreen
    ? 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background'
    : 'flex flex-col items-center justify-center min-h-screen';

  return (
    <div className={wrapperClass}>
      {/* Animated gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative flex h-56 w-56 items-center justify-center">
        {/* Orbit rings */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2"
            style={{
              width: `${100 + i * 30}%`,
              height: `${100 + i * 30}%`,
              borderColor: `hsl(var(--primary) / ${0.4 - i * 0.1})`,
              borderTopColor: `hsl(var(--primary))`,
              borderRightColor: i % 2 === 0 ? `hsl(var(--accent))` : 'transparent',
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 3 + i * 1.5, repeat: Infinity, ease: 'linear' }}
          />
        ))}

        {/* Glow pulse behind logo */}
        <motion.div
          className="absolute h-32 w-32 rounded-full bg-primary/30 blur-2xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-card shadow-bloom"
        >
          <img src={logoAsset.url} alt="BSUT" className="h-24 w-24 rounded-full object-cover" />
        </motion.div>
      </div>

      <motion.p
        key={message ?? msgIndex}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mt-8 text-sm font-medium text-muted-foreground"
      >
        {message ?? DEFAULT_MESSAGES[msgIndex]}
      </motion.p>
    </div>
  );
}
