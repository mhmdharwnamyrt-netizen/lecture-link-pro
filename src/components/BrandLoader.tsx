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
 * Dark, quiet and classic: a deep midnight field, the bare university logo,
 * one slim arc tracing around it, and a thin line beneath that fills then resets.
 */
export default function BrandLoader({ fullscreen = true, message, inline = false }: BrandLoaderProps) {
  if (inline) {
    return (
      <div className="flex w-full items-center justify-center py-10">
        <Mark size={64} />
      </div>
    );
  }

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[100] grid place-items-center overflow-hidden'
          : 'relative grid min-h-screen place-items-center overflow-hidden'
      }
      style={{
        background:
          'radial-gradient(120% 100% at 50% 35%, hsl(215 40% 30%) 0%, hsl(217 45% 20%) 48%, hsl(220 48% 14%) 100%)',
      }}
    >
      {/* Ambient depth */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(205 100% 70% / 0.16), transparent 65%)' }}
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.06, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(110% 85% at 50% 40%, transparent 40%, hsl(220 50% 12% / 0.6) 100%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center"
      >
        <Mark size={132} />

        {/* Thin line beneath: fills, then resets */}
        <div className="mt-9 h-px w-40 overflow-hidden bg-white/10">
          <motion.div
            className="h-full origin-left"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(210 100% 72%), hsl(210 100% 88%), transparent)',
            }}
            animate={{ scaleX: [0, 1, 1, 0], opacity: [0.4, 1, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: [0.4, 0, 0.2, 1], times: [0, 0.55, 0.8, 1] }}
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-6 text-[12px] font-medium tracking-[0.18em] text-white/55"
        >
          {message || 'BENI-SUEF TECHNOLOGICAL UNIVERSITY'}
        </motion.p>
      </motion.div>
    </div>
  );
}

function Mark({ size }: { size: number }) {
  const box = size + 34;
  return (
    <div className="relative grid place-items-center" style={{ height: box, width: box }}>
      {/* Single slim arc tracing around the logo */}
      <motion.svg
        className="absolute inset-0"
        viewBox="0 0 100 100"
        animate={{ rotate: 360 }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'linear' }}
      >
        <defs>
          <linearGradient id="bl-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(210 100% 78%)" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(210 100% 82%)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke="url(#bl-arc)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="70 225"
        />
      </motion.svg>

      {/* Circular logo framed */}
      <motion.div
        className="relative overflow-hidden rounded-full border border-white/15"
        style={{
          height: size,
          width: size,
          background: 'hsl(0 0% 100% / 0.06)',
          boxShadow: '0 0 40px -10px hsl(205 100% 70% / 0.45), inset 0 0 0 1px hsl(0 0% 100% / 0.06)',
        }}
        animate={{ opacity: [0.9, 1, 0.9], scale: [1, 1.03, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img src={logoAsset.url} alt="" className="h-full w-full rounded-full object-cover" />
      </motion.div>
    </div>
  );
}
