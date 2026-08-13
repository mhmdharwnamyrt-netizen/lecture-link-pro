import { useEffect, useState } from 'react';
import { AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatarResolver';
import { defaultAvatarUrl } from '@/lib/defaultAvatar';

interface Props {
  src?: string | null;
  /** Stable id used to pick a deterministic default avatar. */
  userId?: string | null;
  gender?: 'male' | 'female' | string | null;
  role?: string | null;
  isTa?: boolean;
  alt?: string;
  className?: string;
}

/**
 * AvatarImage that transparently resolves storage paths → signed URLs and
 * falls back to a stable, role/gender-appropriate default avatar.
 */
export default function SmartAvatarImage({ src, userId, gender, role, isTa, alt, className }: Props) {
  const fallbackUrl = defaultAvatarUrl({ id: userId || src || alt, role, isTa, gender });
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!src) { setResolved(fallbackUrl); return; }
    resolveAvatarUrl(src)
      .then((u) => { if (mounted) setResolved(u || fallbackUrl); })
      .catch(() => { if (mounted) setResolved(fallbackUrl); });
    return () => { mounted = false; };
  }, [src, fallbackUrl]);

  return (
    <AvatarImage
      src={resolved || fallbackUrl}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setResolved(fallbackUrl)}
    />
  );
}
