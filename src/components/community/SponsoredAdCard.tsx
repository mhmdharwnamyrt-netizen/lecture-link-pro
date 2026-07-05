import { motion } from 'framer-motion';
import { ExternalLink, Megaphone, Sparkles, CalendarDays, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface SponsoredAdData {
  id: string;
  title: string;
  sponsor_name: string;
  type: 'university' | 'company' | string;
  apply_url: string;
  deadline?: string | null;
  tags?: string[] | null;
  description?: string | null;
}

/**
 * A distinctly *non-post* card. This is on purpose:
 *  – dark gradient with animated aurora glow
 *  – vertical "SPONSORED / ممول" ribbon in the corner
 *  – sponsor name is a headline, followed by a small "ممول" chip (like the user asked)
 *  – prominent gradient CTA (never a normal post action row)
 */
export default function SponsoredAdCard({ ad, index = 0 }: { ad: SponsoredAdData; index?: number }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (a: string, e: string) => (isAr ? a : e);

  const dl = ad.deadline ? new Date(ad.deadline) : null;
  const daysLeft = dl ? Math.ceil((dl.getTime() - Date.now()) / 86400000) : null;
  const urgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  return (
    <motion.a
      href={ad.apply_url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: index * 0.05 }}
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      className="group relative block overflow-hidden rounded-3xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.55)]"
    >
      {/* Layered background — deep midnight + shifting aurora */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0b0f26_0%,#12193f_45%,#1e2a63_100%)]" />
      <motion.div
        aria-hidden
        animate={{ x: ['-15%', '15%', '-15%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-16 -start-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.55)_0%,transparent_70%)] blur-2xl"
      />
      <motion.div
        aria-hidden
        animate={{ x: ['10%', '-10%', '10%'], y: ['8%', '-8%', '8%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-20 -end-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.45)_0%,transparent_70%)] blur-2xl"
      />
      {/* Hairline gradient border */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />
      {/* Corner ribbon */}
      <div className={`absolute top-3 ${isAr ? 'left-0 rounded-r-full' : 'right-0 rounded-l-full'} bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-950 shadow-lg`}>
        <span className="inline-flex items-center gap-1">
          <Megaphone className="h-3 w-3" /> {t('ممول', 'Sponsored')}
        </span>
      </div>

      <div className="relative p-5 pt-6 text-white">
        {/* Sponsor identity */}
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            {ad.type === 'university'
              ? <ShieldCheck className="h-5 w-5 text-cyan-300" />
              : <Sparkles className="h-5 w-5 text-amber-300" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{ad.sponsor_name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/85 ring-1 ring-white/10">
                {t('ممول', 'Sponsored')}
              </span>
              <span className="text-[10px] text-white/50">·</span>
              <span className="text-[10px] text-white/60">
                {ad.type === 'university' ? t('من الجامعة', 'From University') : t('شريك', 'Partner')}
              </span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h3 className="mt-4 text-lg font-extrabold leading-snug tracking-tight">
          {ad.title}
        </h3>
        {ad.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-white/70 line-clamp-2">
            {ad.description}
          </p>
        )}

        {/* Tags */}
        {(ad.tags?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ad.tags!.slice(0, 4).map((tg, i) => (
              <span key={i} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/80 ring-1 ring-white/10">
                #{tg}
              </span>
            ))}
          </div>
        )}

        {/* Footer: deadline + CTA */}
        <div className="mt-5 flex items-center justify-between gap-3">
          {dl ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur ${
              urgent
                ? 'bg-red-500/20 text-red-200 ring-1 ring-red-400/40'
                : 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30'
            }`}>
              <CalendarDays className="h-3 w-3" />
              {daysLeft! < 0
                ? t('انتهى', 'Ended')
                : daysLeft === 0
                  ? t('ينتهي اليوم', 'Ends today')
                  : isAr ? `متبقّي ${daysLeft} يوم` : `${daysLeft}d left`}
            </span>
          ) : <span />}

          <span className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg transition group-hover:shadow-[0_10px_30px_-8px_rgba(251,146,60,0.6)]">
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {t('التقديم الآن', 'Apply now')}
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
            <motion.span
              aria-hidden
              className="absolute inset-0 bg-white/25"
              initial={{ x: '-120%' }}
              whileHover={{ x: '120%' }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          </span>
        </div>
      </div>
    </motion.a>
  );
}
