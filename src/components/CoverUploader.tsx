import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { COVER_PRESETS, parseCoverValue } from '@/lib/coverPresets';
import { createSignedUrl } from '@/lib/storage';
import { Camera, Image as ImageIcon, Loader2, Check, Trash2, Upload } from 'lucide-react';

interface Props {
  /** Optional external control of open state (used to open from a small pencil button). */
  className?: string;
}

/**
 * Renders the profile cover (image or gradient preset) with an edit button.
 * User can:
 *   • pick one of 12 curated gradient presets
 *   • upload a custom image (stored in face-photos bucket under {uid}/cover-*)
 *   • remove the current cover
 */
export default function CoverUploader({ className = '' }: Props) {
  const { profile, user, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const t = (a: string, e: string) => (language === 'ar' ? a : e);

  const coverValue = (profile as any)?.cover_url as string | undefined;
  const parsed = parseCoverValue(coverValue);
  const [signed, setSigned] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    parsed?.kind === 'preset' ? parsed.preset.id : null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    setLoadError(false);
    if (parsed?.kind === 'path') {
      setResolving(true);
      createSignedUrl('face-photos', parsed.path, 3600)
        .then(u => {
          if (!alive) return;
          if (!u) { setSigned(null); setLoadError(true); }
          else setSigned(u);
        })
        .catch(() => { if (alive) setLoadError(true); })
        .finally(() => { if (alive) setResolving(false); });
    } else {
      setSigned(null);
      setResolving(false);
    }
    return () => { alive = false; };
  }, [coverValue]);

  useEffect(() => {
    setSelectedPreset(parsed?.kind === 'preset' ? parsed.preset.id : null);
  }, [coverValue, open]);

  const saveCover = async (value: string | null) => {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ cover_url: value } as any).eq('id', profile.id);
    setBusy(false);
    if (error) {
      toast({ title: t('فشل الحفظ', 'Save failed'), description: error.message, variant: 'destructive' });
      return;
    }
    await refreshProfile();
    setOpen(false);
    toast({ title: t('تم تحديث الغلاف', 'Cover updated') });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: t('الصورة كبيرة جداً (الحد 8MB)', 'Image too large (max 8MB)'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('face-photos')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      await saveCover(path);
    } catch (err: any) {
      toast({ title: t('فشل الرفع', 'Upload failed'), description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Background style for the visible hero
  const heroStyle: React.CSSProperties =
    parsed?.kind === 'preset'
      ? { background: parsed.preset.gradient }
      : signed
        ? { backgroundImage: `url(${signed})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(135deg,#0a1f44 0%, hsl(var(--primary)) 55%, hsl(var(--accent)) 100%)' };

  return (
    <>
      <div className={`relative w-full h-full ${className}`} style={heroStyle}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/60"
        >
          <Camera className="h-3.5 w-3.5" /> {t('تغيير الغلاف', 'Change cover')}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              {t('اختر صورة الغلاف', 'Choose cover image')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {t('اختر من الخلفيات الجاهزة أو ارفع صورة مخصّصة.', 'Pick from curated backgrounds or upload your own.')}
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {COVER_PRESETS.map((p) => {
                const active = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset(p.id)}
                    className={`relative aspect-[16/9] overflow-hidden rounded-xl ring-2 transition ${active ? 'ring-primary' : 'ring-transparent hover:ring-border'}`}
                    style={{ background: p.gradient }}
                    aria-label={language === 'ar' ? p.labelAr : p.label}
                  >
                    <span className="absolute bottom-1 start-1.5 rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur">
                      {language === 'ar' ? p.labelAr : p.label}
                    </span>
                    {active && (
                      <span className="absolute top-1 end-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4 me-2" />
                {t('رفع صورة', 'Upload image')}
              </Button>
              {coverValue && (
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => saveCover(null)} disabled={busy}>
                  <Trash2 className="h-4 w-4 me-2" />
                  {t('إزالة', 'Remove')}
                </Button>
              )}
              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button
              disabled={busy || !selectedPreset}
              onClick={() => selectedPreset && saveCover(`preset:${selectedPreset}`)}
            >
              {t('حفظ الاختيار', 'Save selection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
