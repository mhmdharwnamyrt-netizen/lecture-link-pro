// 12 curated cover backgrounds (pure CSS gradients — no external assets).
// Stored on profiles.cover_url as `preset:<id>`. Custom uploads store the storage path directly.

export type CoverPreset = {
  id: string;
  label: string;
  labelAr: string;
  gradient: string; // CSS background value
  theme: 'nature' | 'tech' | 'aurora' | 'sunset';
};

export const COVER_PRESETS: CoverPreset[] = [
  { id: 'aurora',      label: 'Aurora',       labelAr: 'شفق',        theme: 'aurora',
    gradient: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 40%,#0ea5e9 75%,#22d3ee 100%)' },
  { id: 'ocean',       label: 'Deep Ocean',   labelAr: 'محيط عميق',   theme: 'nature',
    gradient: 'linear-gradient(135deg,#0c2340 0%,#134e6f 45%,#1cb0a8 100%)' },
  { id: 'sunset',      label: 'Sunset',       labelAr: 'غروب',        theme: 'sunset',
    gradient: 'linear-gradient(135deg,#f97316 0%,#ef4444 45%,#a855f7 100%)' },
  { id: 'forest',      label: 'Forest',       labelAr: 'غابة',        theme: 'nature',
    gradient: 'linear-gradient(135deg,#052e16 0%,#166534 45%,#65a30d 100%)' },
  { id: 'tech-grid',   label: 'Tech Grid',    labelAr: 'شبكة تقنية',  theme: 'tech',
    gradient: 'linear-gradient(135deg,#020617 0%,#1e293b 50%,#3b82f6 100%)' },
  { id: 'neon-mint',   label: 'Neon Mint',    labelAr: 'نعناع نيون',  theme: 'tech',
    gradient: 'linear-gradient(135deg,#0d1b2a 0%,#134e4a 40%,#2dd4bf 100%)' },
  { id: 'blossom',     label: 'Blossom',      labelAr: 'أزهار',       theme: 'nature',
    gradient: 'linear-gradient(135deg,#fef0f5 0%,#f8c8d8 40%,#e88aab 100%)' },
  { id: 'desert',      label: 'Desert Dune',  labelAr: 'كثبان',       theme: 'nature',
    gradient: 'linear-gradient(135deg,#78350f 0%,#d97706 50%,#fde68a 100%)' },
  { id: 'midnight',    label: 'Midnight',     labelAr: 'منتصف الليل', theme: 'tech',
    gradient: 'linear-gradient(135deg,#0a0a1a 0%,#1e1e5a 50%,#4f46e5 100%)' },
  { id: 'coral',       label: 'Coral Reef',   labelAr: 'شعاب',        theme: 'sunset',
    gradient: 'linear-gradient(135deg,#0891b2 0%,#f472b6 60%,#fb923c 100%)' },
  { id: 'ice',         label: 'Arctic Ice',   labelAr: 'ثلج قطبي',    theme: 'aurora',
    gradient: 'linear-gradient(135deg,#e0f2fe 0%,#7dd3fc 50%,#2563eb 100%)' },
  { id: 'galaxy',      label: 'Galaxy',       labelAr: 'مجرة',        theme: 'tech',
    gradient: 'radial-gradient(circle at 20% 20%,#a78bfa 0%,transparent 40%),radial-gradient(circle at 80% 60%,#ec4899 0%,transparent 40%),linear-gradient(135deg,#020617,#1e1b4b)' },
];

export function getCoverPreset(id?: string | null): CoverPreset | undefined {
  if (!id) return undefined;
  return COVER_PRESETS.find(p => p.id === id);
}

/** Returns { kind: 'preset', preset } | { kind: 'path', path } | undefined */
export function parseCoverValue(v?: string | null):
  | { kind: 'preset'; preset: CoverPreset }
  | { kind: 'path'; path: string }
  | undefined {
  if (!v) return undefined;
  if (v.startsWith('preset:')) {
    const p = getCoverPreset(v.slice('preset:'.length));
    return p ? { kind: 'preset', preset: p } : undefined;
  }
  return { kind: 'path', path: v };
}
