import { useRef, useState } from 'react';
import { Camera, Loader2, User, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface AvatarUploaderProps {
  size?: number; // px
  role: 'doctor' | 'student';
  showButton?: boolean;
}

export default function AvatarUploader({ size = 112, role, showButton = true }: AvatarUploaderProps) {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const avatarUrl = (profile as any)?.avatar_url as string | undefined;

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: language === 'ar' ? 'الصورة كبيرة جداً (الحد 5MB)' : 'Image too large (max 5MB)', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `avatars/${profile.user_id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('face-photos')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('face-photos').getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url } as any)
        .eq('id', profile.id);
      if (updErr) throw updErr;
      await refreshProfile();
      toast({ title: language === 'ar' ? 'تم تحديث الصورة' : 'Profile picture updated' });
    } catch (err: any) {
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
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
            <Icon className="h-1/2 w-1/2 text-primary" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
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
