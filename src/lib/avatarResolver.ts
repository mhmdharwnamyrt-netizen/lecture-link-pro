import { supabase } from '@/integrations/supabase/client';

// Resolves an avatar_url field which may be:
//   - null/empty  → returns null
//   - a full URL (http/https/data/blob) → returned as-is
//   - a storage object path (e.g. "userId/avatar-xxx.jpg") → returns a
//     time-limited signed URL from the `face-photos` bucket.
// Signed URLs are cached in-memory for the lifetime of the tab (per raw value).

const cache = new Map<string, { url: string; exp: number }>();
const pending = new Map<string, Promise<string | null>>();
const TTL_MS = 55 * 60 * 1000; // just under signed-url TTL

const isFullUrl = (v: string) =>
  v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:') || v.startsWith('blob:');

export async function resolveAvatarUrl(raw?: string | null): Promise<string | null> {
  if (!raw) return null;
  if (isFullUrl(raw)) return raw;

  const now = Date.now();
  const hit = cache.get(raw);
  if (hit && hit.exp > now) return hit.url;

  const inflight = pending.get(raw);
  if (inflight) return inflight;

  const p = (async () => {
    const { data } = await supabase.storage
      .from('face-photos')
      .createSignedUrl(raw, 60 * 60);
    if (data?.signedUrl) {
      cache.set(raw, { url: data.signedUrl, exp: now + TTL_MS });
      return data.signedUrl;
    }
    return null;
  })().finally(() => pending.delete(raw));

  pending.set(raw, p);
  return p;
}

// Batch pre-resolve — returns a map from input value → resolved URL (or null).
export async function resolveAvatarUrls(values: (string | null | undefined)[]) {
  const unique = Array.from(new Set(values.filter(Boolean) as string[]));
  const results = await Promise.all(unique.map((v) => resolveAvatarUrl(v).then((u) => [v, u] as const)));
  return new Map(results);
}
