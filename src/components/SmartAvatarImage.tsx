import { useEffect, useState } from 'react';
import { AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatarResolver';

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
}

/**
 * AvatarImage that transparently resolves storage paths → signed URLs.
 * Returns null while loading or on error so the parent <Avatar>'s
 * <AvatarFallback> is shown (skeleton/initials).
 */
export default function SmartAvatarImage({ src, alt, className }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setFailed(false);
    if (!src) { setResolved(null); setFailed(false); return; }
    resolveAvatarUrl(src)
      .then((u) => { if (mounted) setResolved(u); })
      .catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, [src]);

  if (failed) return null;
  if (!resolved && src && (src.startsWith('http') || src.includes('dicebear.com'))) {
    return (
      <AvatarImage
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  if (!resolved) return null;
  return (
    <AvatarImage
      src={resolved}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
