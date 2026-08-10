import { motion } from 'framer-motion';
import logoAsset from '@/assets/bsut-logo.png.asset.json';

interface BrandLoaderProps {
  fullscreen?: boolean;
  message?: string;
  /** Compact inline variant for in-page sections */
  inline?: boolean;
}

/**
 * The single, app-wide loading experience.
 * Quiet, professional, brand-led: a soft ambient field, a glass medallion with
 * the university logo, one slow orbiting arc and a slim breathing progress line.
 * No secondary spinners anywhere else — this is the only loader.
 */
export default function BrandLoader({ fullscreen = true, message, inline = false }: BrandLoaderProps) {
  if (inline) {
    return (
      <div className="flex w-full items-center justify-center py-10">
        <Medallion size={56} />
      </div>
    );
  }

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-background'
          : 'relative grid min-h-screen place-items-center overflow-hidden bg-background'
      }
    >
      {/* Ambient field */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.10), transparent 62%)' }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            background:
              'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--secondary) / 0.55) 55%, hsl(var(--background)) 100%)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center"
      >
        <Medallion size={96} />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-7 text-[13px] font-medium tracking-tight text-foreground/80"
        >
          {message || 'جامعة بني سويف التكنولوجية'}
        </motion.p>

        {/* Slim breathing line */}
        <div className="mt-4 h-[3px] w-32 overflow-hidden rounded-full bg-border/70">
          <motion.div
            className="h-full w-1/3 rounded-full bg-primary"
            animate={{ x: ['-110%', '330%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function Medallion({ size }: { size: number }) {
  const ring = size + 26;
  return (
    <div className="relative grid place-items-center" style={{ height: ring, width: ring }}>
      {/* Soft halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: '0 0 60px -18px hsl(var(--primary) / 0.55)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Static hairline track */}
      <div className="absolute inset-0 rounded-full border border-border/70" />
      {/* Orbiting arc */}
      <motion.svg
        className="absolute inset-0"
        viewBox="0 0 100 100"
        animate={{ rotate: 360 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
      >
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="46 256"
        />
      </motion.svg>
      {/* Glass medallion */}
      <div
        className="relative grid place-items-center rounded-full border border-border/60 bg-card shadow-card"
        style={{ height: size, width: size }}
      >
        <motion.img
          src={logoAsset.url}
          alt=""
          className="rounded-full object-contain"
          style={{ height: size * 0.66, width: size * 0.66 }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
