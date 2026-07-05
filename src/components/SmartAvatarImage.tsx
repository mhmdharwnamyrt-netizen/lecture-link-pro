import { useEffect, useState } from 'react';
import { AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatarResolver';

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
}

/** AvatarImage that transparently resolves storage paths → signed URLs. */
export default function SmartAvatarImage({ src, alt, className }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!src) { setResolved(null); return; }
    resolveAvatarUrl(src).then((u) => { if (mounted) setResolved(u); });
    return () => { mounted = false; };
  }, [src]);

  if (!resolved) return null;
  return <AvatarImage src={resolved} alt={alt} className={className} />;
}
