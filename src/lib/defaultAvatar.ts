// Deterministic default avatars — differentiated by role (student / doctor / TA)
// and gender (male / female). Each category has 30 curated seeds so users get a
// stable, appropriate illustration even before they upload a photo.

export type AvatarRole = 'student' | 'doctor' | 'ta' | string | null | undefined;
export type AvatarGender = 'male' | 'female' | string | null | undefined;

const mk = (prefix: string) => Array.from({ length: 30 }, (_, i) => `${prefix}-${i + 1}`);

// Distinct DiceBear styles per category so each group looks visually different.
const CATEGORIES: Record<string, { style: string; seeds: string[]; extra?: string }> = {
  'student:male':   { style: 'adventurer',        seeds: mk('bsut-stu-m'), extra: '&backgroundColor=c0e8ff,d1f4d9,ffe4c4' },
  'student:female': { style: 'adventurer',        seeds: mk('bsut-stu-f'), extra: '&backgroundColor=ffd5e5,ffe9c9,e5d4ff' },
  'doctor:male':    { style: 'notionists',        seeds: mk('bsut-doc-m'), extra: '&backgroundColor=dbe8ff,e6ecf5' },
  'doctor:female':  { style: 'notionists',        seeds: mk('bsut-doc-f'), extra: '&backgroundColor=f6e2ff,ffe6ef' },
  'ta:male':        { style: 'personas',          seeds: mk('bsut-ta-m'),  extra: '&backgroundColor=d7f5ec,dbe8ff' },
  'ta:female':      { style: 'personas',          seeds: mk('bsut-ta-f'),  extra: '&backgroundColor=fdeed6,f6e2ff' },
};

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function isDefaultAvatarUrl(v?: string | null) {
  return !!v && (v.includes('dicebear.com') || /^https?:\/\//i.test(v));
}

/** Stable default avatar URL for a user. */
export function defaultAvatarUrl(opts: {
  id?: string | null;
  role?: AvatarRole;
  isTa?: boolean | null;
  gender?: AvatarGender;
}): string {
  const kind = opts.isTa ? 'ta' : opts.role === 'doctor' ? 'doctor' : 'student';
  const gender = opts.gender === 'female' ? 'female' : 'male';
  const cat = CATEGORIES[`${kind}:${gender}`] ?? CATEGORIES['student:male'];
  const seed = cat.seeds[hash(opts.id || 'anon') % cat.seeds.length];
  return `https://api.dicebear.com/7.x/${cat.style}/svg?seed=${encodeURIComponent(seed)}${cat.extra || ''}`;
}

/** Convenience: derive from an auth profile-like object. */
export function avatarForProfile(p?: {
  id?: string | null;
  user_id?: string | null;
  role?: string | null;
  is_ta?: boolean | null;
  gender?: string | null;
} | null): string {
  return defaultAvatarUrl({
    id: p?.user_id || p?.id,
    role: p?.role,
    isTa: p?.is_ta,
    gender: p?.gender,
  });
}
