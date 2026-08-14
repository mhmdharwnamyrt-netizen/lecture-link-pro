import React, { useId } from 'react';

interface ChatBackgroundProps {
  departmentId?: string;
  departmentName?: string;
  departmentNameAr?: string;
}

type Theme = {
  key: string;
  /** soft gradient wash behind the doodles */
  wash: string;
  /** tailwind text color token driving `currentColor` of the doodles */
  ink: string;
  opacity: string;
  tile: number;
  doodles: React.ReactNode;
};

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/* ---------------- department themes ---------------- */

const IT: Theme = {
  key: 'it',
  wash: 'from-sky-100/70 via-background to-indigo-100/50 dark:from-[#0a1428] dark:via-[#070c18] dark:to-[#0b1a30]',
  ink: 'text-sky-700 dark:text-sky-300',
  opacity: 'opacity-[0.13] dark:opacity-[0.16]',
  tile: 170,
  doodles: (
    <g {...S}>
      <rect x="14" y="16" width="34" height="26" rx="3" />
      <path d="M24 42v6h14v-6M20 48h22" />
      <path d="M74 22h22v22H74z" />
      <path d="M79 22v-6M87 22v-6M79 44v6M87 44v6M74 28h-6M74 37h-6M96 28h6M96 37h6" />
      <path d="M124 20l-9 9 9 9M144 20l9 9-9 9" />
      <path d="M138 16l-8 26" />
      <circle cx="30" cy="96" r="10" />
      <path d="M20 96h20M30 86c5 6 5 14 0 20M30 86c-5 6-5 14 0 20" />
      <path d="M78 92h28M78 100h20M78 108h24" />
      <rect x="122" y="86" width="30" height="30" rx="6" />
      <path d="M130 101l6 6 10-12" />
      <path d="M16 132c8-10 16 10 24 0s16 10 24 0" />
      <circle cx="100" cy="140" r="8" />
      <path d="M100 132v-6M100 148v6M92 140h-6M108 140h6" />
      <path d="M132 134h24v18h-24z" />
      <path d="M138 152v6h12v-6" />
    </g>
  ),
};

const ELECTRONICS: Theme = {
  key: 'electronics',
  wash: 'from-amber-50/70 via-background to-sky-100/40 dark:from-[#141005] dark:via-[#080a12] dark:to-[#0b1524]',
  ink: 'text-amber-700 dark:text-amber-300',
  opacity: 'opacity-[0.14] dark:opacity-[0.15]',
  tile: 160,
  doodles: (
    <g {...S}>
      <path d="M12 30h14l6-12 10 24 6-12h16" />
      <path d="M86 20v10M86 46v10M78 30h16v16H78z" />
      <path d="M120 24h20M124 24v10M136 24v10M130 34v10" />
      <circle cx="130" cy="48" r="4" />
      <path d="M18 78h12M30 70v16M38 70v16M38 78h14" />
      <circle cx="86" cy="82" r="12" />
      <path d="M86 70v6M86 88v6M74 82h6M92 82h6" />
      <path d="M120 74h28v18h-28z" />
      <path d="M126 92v8M142 92v8M126 74v-8M142 74v-8" />
      <path d="M14 122h18l4-8 8 16 4-8h16" />
      <path d="M84 118l10 8-10 8" />
      <path d="M100 118v16" />
      <path d="M124 116a10 10 0 100 20 10 10 0 100-20" />
      <path d="M124 116v20" />
    </g>
  ),
};

const MECHATRONICS: Theme = {
  key: 'mechatronics',
  wash: 'from-slate-200/60 via-background to-cyan-100/40 dark:from-[#0d1420] dark:via-[#070b12] dark:to-[#0a1a1f]',
  ink: 'text-slate-700 dark:text-cyan-200',
  opacity: 'opacity-[0.12] dark:opacity-[0.16]',
  tile: 180,
  doodles: (
    <g {...S}>
      <g transform="translate(34,36)">
        <circle r="16" />
        <circle r="6" />
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} d="M0 -16v-6" transform={`rotate(${i * 45})`} />
        ))}
      </g>
      <g transform="translate(120,50)">
        <circle r="11" />
        <circle r="4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <path key={i} d="M0 -11v-5" transform={`rotate(${i * 60})`} />
        ))}
      </g>
      <path d="M24 110h34l14 22" />
      <circle cx="24" cy="110" r="4" />
      <circle cx="58" cy="110" r="4" />
      <circle cx="72" cy="132" r="4" />
      <path d="M108 108h44v22h-44z" />
      <path d="M116 130v10h28v-10" />
      <path d="M130 108v-12M122 96h16" />
      <path d="M20 158h140" strokeDasharray="6 8" />
    </g>
  ),
};

const RENEWABLE: Theme = {
  key: 'renewable',
  wash: 'from-emerald-100/60 via-background to-lime-100/40 dark:from-[#08160f] dark:via-[#070c0a] dark:to-[#0a1a14]',
  ink: 'text-emerald-700 dark:text-emerald-300',
  opacity: 'opacity-[0.14] dark:opacity-[0.17]',
  tile: 170,
  doodles: (
    <g {...S}>
      <circle cx="34" cy="34" r="10" />
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d="M34 18v-7" transform={`rotate(${i * 45} 34 34)`} />
      ))}
      <path d="M96 26h44l-8 26H88z" />
      <path d="M104 26l-6 26M118 26l-4 26M132 26l-2 26M92 39h44" />
      <path d="M116 52v14M108 66h16" />
      <path d="M36 96v42" />
      <path d="M36 96l18-12M36 96l-18-12M36 96l14 14" />
      <path d="M100 108c14-16 34-12 40 2-14 16-34 12-40-2z" />
      <path d="M100 110c16 2 28 10 40 0" />
      <path d="M18 150c10-8 20 8 30 0s20 8 30 0s20 8 30 0s20 8 30 0" />
    </g>
  ),
};

const INDUSTRIAL: Theme = {
  key: 'industrial',
  wash: 'from-orange-50/70 via-background to-slate-200/50 dark:from-[#17110a] dark:via-[#080a0f] dark:to-[#101620]',
  ink: 'text-orange-700 dark:text-orange-300',
  opacity: 'opacity-[0.12] dark:opacity-[0.15]',
  tile: 175,
  doodles: (
    <g {...S}>
      <path d="M14 60V34h16v26M30 46l18-12v26M48 46l18-12v26M14 60h56" />
      <path d="M22 34v-8M22 22a4 4 0 108 0" />
      <path d="M100 30h40v18h-40z" />
      <circle cx="120" cy="39" r="6" />
      <path d="M100 39H88v18M140 39h12v18" />
      <path d="M22 100h44v20H22z" />
      <path d="M30 120v8M58 120v8" />
      <path d="M44 100V88M36 88h16" />
      <circle cx="120" cy="108" r="16" />
      <path d="M120 108V96M120 108l9 6" />
      <path d="M104 108h-6M136 108h6" />
      <path d="M18 152h140" strokeDasharray="4 10" />
    </g>
  ),
};

const HVAC: Theme = {
  key: 'hvac',
  wash: 'from-cyan-100/60 via-background to-blue-100/40 dark:from-[#07131c] dark:via-[#070b12] dark:to-[#0a1626]',
  ink: 'text-cyan-700 dark:text-cyan-200',
  opacity: 'opacity-[0.13] dark:opacity-[0.17]',
  tile: 170,
  doodles: (
    <g {...S}>
      <g transform="translate(34,36)">
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i} transform={`rotate(${i * 60})`}>
            <path d="M0 0v-18" />
            <path d="M0 -12l-5 -5M0 -12l5 -5" />
          </g>
        ))}
      </g>
      <rect x="92" y="24" width="56" height="24" rx="6" />
      <path d="M98 34h44M98 40h32" />
      <path d="M104 54c0 6 6 6 6 12M124 54c0 6 6 6 6 12" />
      <circle cx="36" cy="112" r="16" />
      <path d="M36 100v12l8 6" />
      <path d="M92 104h56v28H92z" />
      <circle cx="108" cy="118" r="8" />
      <path d="M126 112h16M126 120h12M126 128h16" />
      <path d="M18 152c10-6 14 6 24 0M70 152c10-6 14 6 24 0M122 152c10-6 14 6 24 0" />
    </g>
  ),
};

const RAILWAY: Theme = {
  key: 'railway',
  wash: 'from-stone-200/60 via-background to-indigo-100/40 dark:from-[#141210] dark:via-[#080a10] dark:to-[#0d1226]',
  ink: 'text-stone-700 dark:text-indigo-200',
  opacity: 'opacity-[0.12] dark:opacity-[0.16]',
  tile: 180,
  doodles: (
    <g {...S}>
      <path d="M14 44h150M14 58h150" />
      {Array.from({ length: 7 }).map((_, i) => (
        <path key={i} d={`M${20 + i * 22} 40v22`} />
      ))}
      <rect x="30" y="90" width="58" height="34" rx="8" />
      <path d="M38 98h18v12H38zM64 98h16v12H64z" />
      <circle cx="46" cy="130" r="6" />
      <circle cx="74" cy="130" r="6" />
      <path d="M88 104h22l10 12v8H88z" />
      <path d="M124 96v34M118 96h12M124 112h16" />
      <path d="M14 152h150" strokeDasharray="10 8" />
      <path d="M150 84v18M144 84h12" />
    </g>
  ),
};

const MARKETING: Theme = {
  key: 'marketing',
  wash: 'from-fuchsia-100/50 via-background to-amber-100/40 dark:from-[#180d1c] dark:via-[#0a0810] dark:to-[#1a1208]',
  ink: 'text-fuchsia-700 dark:text-fuchsia-300',
  opacity: 'opacity-[0.12] dark:opacity-[0.16]',
  tile: 170,
  doodles: (
    <g {...S}>
      <path d="M18 40l30-14v30z" />
      <path d="M48 30h10a8 8 0 010 14h-10" />
      <path d="M30 44v12h8V47" />
      <path d="M92 52V30M106 52V20M120 52V36M134 52V24" />
      <path d="M86 58h54" />
      <path d="M22 116l16-16 12 12 22-26" />
      <path d="M60 86h12v12" />
      <path d="M100 92h40v26h-40z" />
      <path d="M100 92l20 15 20-15" />
      <circle cx="40" cy="150" r="8" />
      <path d="M60 142h40M60 152h28" />
      <path d="M136 138l6 12-12-2z" />
    </g>
  ),
};

const DEFAULT: Theme = {
  key: 'default',
  wash: 'from-slate-100/70 via-background to-blue-100/40 dark:from-[#0b1120] dark:via-[#070a12] dark:to-[#0c1526]',
  ink: 'text-primary',
  opacity: 'opacity-[0.11] dark:opacity-[0.15]',
  tile: 160,
  doodles: (
    <g {...S}>
      <path d="M20 34h40v26H20z" />
      <path d="M20 34l20 14 20-14" />
      <path d="M96 28h34v22H96z" />
      <path d="M104 50v8l10-8" />
      <circle cx="40" cy="106" r="12" />
      <path d="M40 96v10l7 5" />
      <path d="M92 100h44M92 110h30M92 120h38" />
      <path d="M18 142c10-8 20 8 30 0s20 8 30 0s20 8 30 0s20 8 30 0" />
    </g>
  ),
};

const THEMES: { match: RegExp; theme: Theme }[] = [
  { match: /(information|it\b|تكنولوجيا المعلومات|معلومات|برمج|حاسب)/i, theme: IT },
  { match: /(mechatron|ميكاترون)/i, theme: MECHATRONICS },
  { match: /(renewable|solar|طاقة|متجدد)/i, theme: RENEWABLE },
  { match: /(industrial|process control|تحكم|عمليات صناع)/i, theme: INDUSTRIAL },
  { match: /(refrig|air condition|hvac|تبريد|تكييف)/i, theme: HVAC },
  { match: /(rail|سكة|حديد|قطار)/i, theme: RAILWAY },
  { match: /(market|تسويق)/i, theme: MARKETING },
  { match: /(electron|إلكترون|الكترون|كهرب)/i, theme: ELECTRONICS },
];

export function themeForDepartment(name?: string | null): Theme {
  const n = (name || '').trim();
  if (!n) return DEFAULT;
  return THEMES.find((t) => t.match.test(n))?.theme ?? DEFAULT;
}

/**
 * Decorative, department-aware chat wallpaper.
 * Sits behind the message list (absolute, pointer-events-none) and never
 * affects layout or message readability.
 */
const ChatBackground: React.FC<ChatBackgroundProps> = ({ departmentName, departmentNameAr }) => {
  const uid = useId().replace(/[:]/g, '');
  const theme = themeForDepartment(departmentName || departmentNameAr);
  const patternId = `chat-doodles-${theme.key}-${uid}`;

  return (
    // `-z-10` is essential: the wallpaper must paint BELOW the message list.
    // Without it, this absolutely-positioned layer paints on top of the
    // non-positioned chat content and washes the text out.
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
      {/* soft gradient wash */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.wash} opacity-70`} />

      {/* doodle pattern */}
      <svg className={`absolute inset-0 h-full w-full ${theme.ink} ${theme.opacity}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width={theme.tile}
            height={theme.tile}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-8) scale(0.9)"
          >
            {theme.doodles}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* light readability veil (content sits above this layer) */}
      <div className="absolute inset-0 bg-background/25 dark:bg-background/40" />
    </div>
  );
};

export default ChatBackground;
