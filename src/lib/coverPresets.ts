// 20 curated cover backgrounds: real nature & world-landmark photography.
// Hosted on Unsplash CDN (stable photo IDs).
// Stored on profiles.cover_url as `preset:<id>`. Custom uploads store the storage path directly.

export type CoverPreset = {
  id: string;
  label: string;
  labelAr: string;
  image: string; // full-size CDN URL
  thumb: string; // small thumbnail for the picker
  theme: 'nature' | 'landmark';
};

// Helper — same photo, two sizes
const U = (id: string) => ({
  image: `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`,
  thumb: `https://images.unsplash.com/photo-${id}?w=320&q=70&auto=format&fit=crop`,
});

export const COVER_PRESETS: CoverPreset[] = [
  // ————— Nature —————
  { id: 'forest-mist',   label: 'Misty Forest',     labelAr: 'غابة ضبابية',   theme: 'nature',   ...U('1441974231531-c6227db76b6e') },
  { id: 'mountains',     label: 'Mountain Range',   labelAr: 'سلسلة جبال',    theme: 'nature',   ...U('1519681393784-d120267933ba') },
  { id: 'lake-sunset',   label: 'Lake Sunset',      labelAr: 'غروب البحيرة',   theme: 'nature',   ...U('1470071459604-3b5ec3a7fe05') },
  { id: 'aurora',        label: 'Northern Lights',  labelAr: 'الشفق القطبي',   theme: 'nature',   ...U('1483347756197-71ef80e95f73') },
  { id: 'tropical',      label: 'Tropical Beach',   labelAr: 'شاطئ استوائي',   theme: 'nature',   ...U('1507525428034-b723cf961d3e') },
  { id: 'desert-dunes',  label: 'Desert Dunes',     labelAr: 'كثبان الصحراء', theme: 'nature',   ...U('1509316785289-025f5b846b35') },
  { id: 'cherry',        label: 'Cherry Blossom',   labelAr: 'أزهار الكرز',   theme: 'nature',   ...U('1522383225653-ed111181a951') },
  { id: 'ocean-wave',    label: 'Ocean Wave',       labelAr: 'موجة المحيط',   theme: 'nature',   ...U('1505142468610-359e7d316be0') },
  { id: 'canyon',        label: 'Canyon',           labelAr: 'وادٍ صخري',      theme: 'nature',   ...U('1500530855697-b586d89ba3ee') },
  { id: 'starry-night',  label: 'Starry Night',     labelAr: 'ليلة نجوم',      theme: 'nature',   ...U('1419242902214-272b3f66ee7a') },
  { id: 'autumn',        label: 'Autumn Trail',     labelAr: 'ممر الخريف',    theme: 'nature',   ...U('1476820865390-c52aeebb9891') },
  { id: 'waterfall',     label: 'Waterfall',        labelAr: 'شلال',          theme: 'nature',   ...U('1432405972618-c60b0225b8f9') },

  // ————— World Landmarks —————
  { id: 'pyramids',      label: 'Pyramids of Giza', labelAr: 'أهرامات الجيزة',  theme: 'landmark', ...U('1539650116574-75c0c6d73c6e') },
  { id: 'eiffel',        label: 'Eiffel Tower',     labelAr: 'برج إيفل',       theme: 'landmark', ...U('1502602898657-3e91760cbb34') },
  { id: 'colosseum',     label: 'Colosseum',        labelAr: 'الكولوسيوم',      theme: 'landmark', ...U('1552832230-c0197dd311b5') },
  { id: 'petra',         label: 'Petra',            labelAr: 'البتراء',          theme: 'landmark', ...U('1518998053901-5348d3961a04') },
  { id: 'santorini',     label: 'Santorini',        labelAr: 'سانتوريني',       theme: 'landmark', ...U('1570077188670-e3a8d69ac5ff') },
  { id: 'tokyo',         label: 'Tokyo Nights',     labelAr: 'ليالي طوكيو',    theme: 'landmark', ...U('1540959733332-eab4deabeeaf') },
  { id: 'burj',          label: 'Burj Khalifa',     labelAr: 'برج خليفة',       theme: 'landmark', ...U('1512453979798-5ea266f8880c') },
  { id: 'machu',         label: 'Machu Picchu',     labelAr: 'ماتشو بيتشو',     theme: 'landmark', ...U('1526392060635-9d6019884377') },
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
