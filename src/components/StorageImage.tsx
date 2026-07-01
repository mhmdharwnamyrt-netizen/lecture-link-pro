import { useEffect, useState } from 'react';
import { createSignedUrl } from '@/lib/storage';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  bucket?: string;
  path?: string | null;
  fallback?: React.ReactNode;
  ttl?: number;
}

/**
 * Renders an <img> for a (possibly private) storage object.
 * Accepts either a bare path or a legacy full URL stored on the record.
 */
export default function StorageImage({ bucket = 'face-photos', path, fallback = null, ttl = 3600, ...imgProps }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!path) { setSrc(null); return; }
    createSignedUrl(bucket, path, ttl).then((url) => {
      if (mounted) setSrc(url);
    });
    return () => { mounted = false; };
  }, [bucket, path, ttl]);

  if (!src) return <>{fallback}</>;
  return <img {...imgProps} src={src} />;
}
