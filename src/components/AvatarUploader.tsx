import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, User, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { createSignedUrl } from '@/lib/storage';

interface AvatarUploaderProps {
  size?: number; // px
  role: 'doctor' | 'student';
  showButton?: boolean;
}

export default function AvatarUploader({ size = 112, role, showButton = true }: AvatarUploaderProps) {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const avatarPath = (profile as any)?.avatar_url as string | undefined;

  // Resolve signed URL for private-bucket avatar
  useEffect(() => {
    let mounted = true;
    setLoadError(false);
    if (!avatarPath) { setDisplaySrc(null); setResolving(false); return; }
    setResolving(true);
    createSignedUrl('face-photos', avatarPath, 60 * 60 * 24)
      .then((url) => {
        if (!mounted) return;
        if (!url) { setDisplaySrc(null); setLoadError(true); }
        else setDisplaySrc(url);
      })
      .catch(() => { if (mounted) setLoadError(true); })
      .finally(() => { if (mounted) setResolving(false); });
    return () => { mounted = false; };
  }, [avatarPath]);

  // Cleanup preview blob URL
  useEffect(() => () => { if (previewSrc) URL.revokeObjectURL(previewSrc); }, [previewSrc]);

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: language === 'ar' ? 'الرجاء اختيار صورة' : 'Please pick an image', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: language === 'ar' ? 'الصورة كبيرة جداً (الحد 5MB)' : 'Image too large (max 5MB)', variant: 'destructive' });
      return;
    }

    // Instant local preview
    const blobUrl = URL.createObjectURL(file);
    if (previewSrc) URL.revokeObjectURL(previewSrc);
    setPreviewSrc(blobUrl);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('face-photos')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: path } as any)
        .eq('id', profile.id);
      if (updErr) throw updErr;
      await refreshProfile();
      toast({ title: language === 'ar' ? 'تم تحديث الصورة ✓' : 'Profile picture updated ✓' });
    } catch (err: any) {
      // Revert preview on failure
      URL.revokeObjectURL(blobUrl);
      setPreviewSrc(null);
      toast({ title: language === 'ar' ? 'فشل الرفع' : 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const Icon = role === 'doctor' ? GraduationCap : User;

  return (
    <>
      <div
        className="relative overflow-hidden rounded-full bg-card shadow-elevated"
        style={{ width: size, height: size }}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt=""
            className="h-full w-full object-cover"
            onError={() => { setDisplaySrc(null); setLoadError(true); }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
            {resolving ? (
              <Loader2 className="h-1/3 w-1/3 animate-spin text-primary/70" />
            ) : loadError ? (
              <>
                <Icon className="h-1/3 w-1/3 text-destructive/70" />
                <span className="mt-1 text-[9px] font-medium text-destructive">
                  {language === 'ar' ? 'تعذّر تحميل الصورة' : 'Failed to load'}
                </span>
              </>
            ) : (
              <Icon className="h-1/2 w-1/2 text-primary" />
            )}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <span className="text-[10px] font-medium text-white">
              {language === 'ar' ? 'جاري الرفع…' : 'Uploading…'}
            </span>
          </div>
        )}
        {showButton && (
          <button
            type="button"
            onClick={handlePick}
            aria-label="Change profile picture"
            className="absolute bottom-1 end-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-card transition hover:scale-105 active:scale-95"
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}

