import { useEffect, useState } from 'react';
import { createSignedUrl, extractStoragePath } from '@/lib/storage';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  bucket?: string;
  path?: string | null;
  fallback?: React.ReactNode;
  ttl?: number;
}

/**
 * Renders an <img> for a (possibly private) storage object.
 * Accepts either a bare path, a legacy full storage URL, or an external
 * URL (e.g. a generated default avatar) which is used as-is.
 */
export default function StorageImage({ bucket = 'face-photos', path, fallback = null, ttl = 3600, ...imgProps }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setFailed(false);
    if (!path) { setSrc(null); return; }
    // External URL that is not a storage object → use directly.
    if (/^(https?:|data:|blob:)/i.test(path) && !extractStoragePath(bucket, path)) {
      setSrc(path);
      return;
    }
    createSignedUrl(bucket, path, ttl).then((url) => {
      if (mounted) setSrc(url);
    });
    return () => { mounted = false; };
  }, [bucket, path, ttl]);

  if (!src || failed) return <>{fallback}</>;
  return <img {...imgProps} src={src} onError={() => setFailed(true)} />;
}
