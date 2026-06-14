import { motion } from 'framer-motion';
import logoAsset from '@/assets/bsut-logo.png.asset.json';

interface CinematicLoaderProps {
  fullscreen?: boolean;
  message?: string;
}

export default function CinematicLoader({ fullscreen = true, message }: CinematicLoaderProps) {
  const wrapperClass = fullscreen
    ? 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background'
    : 'flex flex-col items-center justify-center min-h-screen';

  return (
    <div className={wrapperClass}>
      <div className="relative flex h-28 w-28 items-center justify-center">
        {/* Single soft ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        {/* Logo */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-card shadow-card">
          <img src={logoAsset.url} alt="BSUT" className="h-16 w-16 rounded-full object-cover" />
        </div>
      </div>

      {message && (
        <p className="mt-6 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
