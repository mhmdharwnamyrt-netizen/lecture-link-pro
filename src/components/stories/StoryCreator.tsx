import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Type, Video, Upload, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { STORY_BUCKET, STORY_MAX_VIDEO_SECONDS, TEXT_BACKGROUNDS } from '@/lib/stories';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Mode = 'choose' | 'media' | 'text';

interface Props { onClose: () => void; }

export default function StoryCreator({ onClose }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [bgKey, setBgKey] = useState('sunset');
  const [saving, setSaving] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);

  const pickFile = (accept: string) => {
    if (!inputRef.current) return;
    inputRef.current.accept = accept;
    inputRef.current.click();
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) { toast.error('الحد الأقصى 30 ميجابايت'); return; }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setMode('media');
  };

  const onMetadata = () => {
    if (vidRef.current) setVideoDuration(vidRef.current.duration);
  };

  const publish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (mode === 'text') {
        if (!text.trim()) { toast.error('اكتب نصًا'); setSaving(false); return; }
        const { error } = await supabase.from('stories' as any).insert({
          author_id: user.id,
          media_type: 'text',
          text_content: text.trim().slice(0, 300),
          background: bgKey,
          duration_seconds: 6,
        });
        if (error) throw error;
      } else if (mode === 'media' && file) {
        const isVideo = file.type.startsWith('video/');
        if (isVideo && videoDuration > STORY_MAX_VIDEO_SECONDS + 0.5) {
          toast.warning(`سيُعرض أول ${STORY_MAX_VIDEO_SECONDS} ثانية فقط`);
        }
        const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(STORY_BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const dur = isVideo ? Math.min(Math.round(videoDuration || 15), STORY_MAX_VIDEO_SECONDS) : 5;
        const { error: insErr } = await supabase.from('stories' as any).insert({
          author_id: user.id,
          media_type: isVideo ? 'video' : 'image',
          media_path: path,
          media_mime: file.type,
          duration_seconds: dur,
        });
        if (insErr) throw insErr;
      } else {
        setSaving(false); return;
      }
      toast.success('تم نشر قصتك');
      onClose();
    } catch (e: any) {
      toast.error('فشل النشر', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">إضافة قصة</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'choose' && (
            <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-3">
              <button onClick={() => pickFile('image/*')}
                className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-orange-400/20 p-3 transition hover:scale-[1.03]">
                <div className="rounded-full bg-white/10 p-3 group-hover:bg-white/20"><ImageIcon className="h-6 w-6 text-fuchsia-500" /></div>
                <span className="text-xs font-semibold">صورة</span>
              </button>
              <button onClick={() => pickFile('video/*')}
                className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-3 transition hover:scale-[1.03]">
                <div className="rounded-full bg-white/10 p-3 group-hover:bg-white/20"><Video className="h-6 w-6 text-cyan-500" /></div>
                <span className="text-xs font-semibold">فيديو</span>
                <span className="text-[9px] text-muted-foreground">حتى 60 ثانية</span>
              </button>
              <button onClick={() => setMode('text')}
                className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-400/20 p-3 transition hover:scale-[1.03]">
                <div className="rounded-full bg-white/10 p-3 group-hover:bg-white/20"><Type className="h-6 w-6 text-emerald-500" /></div>
                <span className="text-xs font-semibold">نص</span>
              </button>
            </motion.div>
          )}

          {mode === 'media' && preview && (
            <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl bg-black" style={{ maxHeight: '55vh' }}>
                {file?.type.startsWith('video/') ? (
                  <video ref={vidRef} src={preview} controls className="mx-auto max-h-[55vh]" onLoadedMetadata={onMetadata} />
                ) : (
                  <img src={preview} alt="" className="mx-auto max-h-[55vh] object-contain" />
                )}
              </div>
              {file?.type.startsWith('video/') && videoDuration > STORY_MAX_VIDEO_SECONDS && (
                <p className="text-center text-[11px] text-amber-500">
                  الفيديو {Math.round(videoDuration)}ث — سيُقصّ إلى {STORY_MAX_VIDEO_SECONDS}ث تلقائيًا عند العرض.
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => { setFile(null); setPreview(null); setMode('choose'); }}>
                  تغيير
                </Button>
                <Button className="flex-1 rounded-full" onClick={publish} disabled={saving}>
                  {saving ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Send className="me-1 h-4 w-4" />} نشر
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'text' && (
            <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl p-4"
                style={{ background: TEXT_BACKGROUNDS[bgKey] }}>
                <p className="text-center text-2xl font-bold text-white drop-shadow-lg">
                  {text || 'اكتب هنا…'}
                </p>
              </div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={300}
                placeholder="ما الذي تفكر فيه؟" />
              <div className="flex flex-wrap gap-2">
                {Object.entries(TEXT_BACKGROUNDS).map(([k, g]) => (
                  <button key={k} onClick={() => setBgKey(k)}
                    className={`h-8 w-8 rounded-full ring-2 transition ${bgKey === k ? 'ring-primary scale-110' : 'ring-transparent'}`}
                    style={{ background: g }} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setMode('choose')}>رجوع</Button>
                <Button className="flex-1 rounded-full" onClick={publish} disabled={saving || !text.trim()}>
                  {saving ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : <Send className="me-1 h-4 w-4" />} نشر
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input ref={inputRef} type="file" hidden onChange={(e) => handleFile(e.target.files?.[0] || null)} />
      </motion.div>
    </motion.div>
  );
}
