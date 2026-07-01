import { supabase } from '@/integrations/supabase/client';

/**
 * Given either a full storage URL (public or signed) or a bare object path,
 * return the object path relative to the bucket.
 */
export function extractStoragePath(bucket: string, pathOrUrl?: string | null): string | null {
  if (!pathOrUrl) return null;
  // If it already looks like a plain path (no scheme), return as-is
  if (!/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl.replace(/^\/+/, '');
  const marker = `/${bucket}/`;
  const idx = pathOrUrl.indexOf(marker);
  if (idx === -1) return null;
  return pathOrUrl.substring(idx + marker.length).split('?')[0];
}

/** Create a signed URL for a private bucket object. Accepts a path or full URL. */
export async function createSignedUrl(
  bucket: string,
  pathOrUrl: string | null | undefined,
  ttlSeconds = 3600,
): Promise<string | null> {
  const path = extractStoragePath(bucket, pathOrUrl);
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
  return data?.signedUrl || null;
}
