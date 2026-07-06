import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SmartAvatarImage from '@/components/SmartAvatarImage';
import { signedStoryUrl, markStoryViewed, TEXT_BACKGROUNDS, type StoryRow } from '@/lib/stories';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Group {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  stories: StoryRow[];
}

interface Props {
  groups: Group[];
  initialGroupIndex: number;
  seenIds: Set<string>;
  onClose: () => void;
}

export default function StoryViewer({ groups, initialGroupIndex, seenIds, onClose }: Props) {
  const { user } = useAuth();
  const [gi, setGi] = useState(initialGroupIndex);
  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersList, setViewersList] = useState<any[]>([]);

  const group = groups[gi];
  const story = group?.stories[si];
  const isOwn = user?.id === group?.user_id;
  const raf = useRef<number | null>(null);
  const startTs = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const durationMs = useMemo(() => {
    if (!story) return 5000;
    if (story.media_type === 'video') return (story.duration_seconds || 15) * 1000;
    return 5000;
  }, [story]);

  // Load media (signed URL) & mark viewed
  useEffect(() => {
    if (!story) return;
    setProgress(0); elapsedRef.current = 0; setMediaUrl(null);
    if (story.media_type === 'text') { setMediaLoading(false); }
    else if (story.media_path) {
      setMediaLoading(true);
      signedStoryUrl(story.media_path).then((u) => { setMediaUrl(u); setMediaLoading(false); });
    }
    // Mark viewed (only for others' stories)
    if (!isOwn && !seenIds.has(story.id)) {
      markStoryViewed(story.id);
    }
  }, [story?.id]);

  // Progress ticker
  useEffect(() => {
    if (!story || paused || mediaLoading) { cancelAnimationFrame(raf.current!); return; }
    startTs.current = performance.now();
    const tick = (now: number) => {
      const dt = now - startTs.current;
      const el = elapsedRef.current + dt;
      const p = Math.min(1, el / durationMs);
      setProgress(p);
      if (p >= 1) { nextStory(); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      elapsedRef.current += performance.now() - startTs.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, paused, mediaLoading, durationMs]);

  const nextStory = () => {
    if (!group) return;
    if (si < group.stories.length - 1) { setSi(si + 1); return; }
    if (gi < groups.length - 1) { setGi(gi + 1); setSi(0); return; }
    onClose();
  };
  const prevStory = () => {
    if (si > 0) { setSi(si - 1); return; }
    if (gi > 0) { setGi(gi - 1); setSi(groups[gi - 1].stories.length - 1); return; }
  };

  const openViewers = async () => {
    if (!isOwn || !story) return;
    setPaused(true);
    const { data } = await supabase
      .from('story_views' as any)
      .select('viewer_id, viewed_at')
      .eq('story_id', story.id)
      .order('viewed_at', { ascending: false }) as any;
    const ids = (data || []).map((v: any) => v.viewer_id);
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles')
        .select('user_id, full_name, avatar_url').in('user_id', ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      setViewersList((data || []).map((v: any) => ({
        ...v, profile: map.get(v.viewer_id)
      })));
    } else setViewersList([]);
    setViewersOpen(true);
  };

  const deleteStory = async () => {
    if (!story || !isOwn) return;
    if (!confirm('حذف هذه القصة؟')) return;
    await supabase.from('stories' as any).delete().eq('id', story.id);
    if (story.media_path) await supabase.storage.from('stories').remove([story.media_path]);
    toast.success('تم الحذف');
    onClose();
  };

  if (!story) return null;

  const bg = story.media_type === 'text'
    ? (TEXT_BACKGROUNDS[story.background || 'sunset'] || TEXT_BACKGROUNDS.sunset)
    : '#000';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative h-full w-full max-w-md overflow-hidden bg-black sm:h-[92vh] sm:rounded-3xl"
        style={{ background: bg }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-2">
          {group.stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-[width]"
                style={{ width: i < si ? '100%' : i === si ? `${progress * 100}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute left-0 right-0 top-4 z-20 flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-white/40">
              <SmartAvatarImage src={group.avatar_url} className="object-cover" />
              <AvatarFallback className="text-[10px]">
                {(group.full_name || '?').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="text-white">
              <p className="text-sm font-semibold leading-tight">{group.full_name || 'مستخدم'}</p>
              <p className="text-[10px] opacity-80">
                {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: ar })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isOwn && (
              <button onClick={deleteStory} className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media */}
        <AnimatePresence mode="wait">
          <motion.div
            key={story.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {story.media_type === 'text' && (
              <div className="flex h-full w-full items-center justify-center px-8">
                <p className="text-center text-3xl font-bold leading-tight text-white drop-shadow-lg">
                  {story.text_content}
                </p>
              </div>
            )}
            {story.media_type === 'image' && (mediaLoading || !mediaUrl ? (
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            ) : (
              <img src={mediaUrl} alt="" className="max-h-full max-w-full object-contain" />
            ))}
            {story.media_type === 'video' && (mediaLoading || !mediaUrl ? (
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            ) : (
              <video
                src={mediaUrl}
                autoPlay
                playsInline
                className="max-h-full max-w-full object-contain"
                onLoadedMetadata={(e) => {
                  // limit to 60s: seek to 0 (server should have limited during upload)
                  (e.currentTarget as HTMLVideoElement).currentTime = 0;
                }}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Left / Right tap zones */}
        <button aria-label="السابق" onClick={prevStory}
          className="absolute inset-y-0 left-0 z-10 w-1/3 focus:outline-none">
          <ChevronLeft className="mx-auto h-6 w-6 text-white/0 hover:text-white/60" />
        </button>
        <button aria-label="التالي" onClick={nextStory}
          className="absolute inset-y-0 right-0 z-10 w-1/3 focus:outline-none">
          <ChevronRight className="mx-auto h-6 w-6 text-white/0 hover:text-white/60" />
        </button>

        {/* Footer (viewers count for owner) */}
        {isOwn && (
          <button
            onClick={openViewers}
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white backdrop-blur"
          >
            <Eye className="me-1 inline h-3.5 w-3.5" /> {story.views_count} مشاهدة
          </button>
        )}

        {/* Viewers sheet */}
        <AnimatePresence>
          {viewersOpen && (
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="absolute inset-x-0 bottom-0 z-30 max-h-[70%] overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">من شاهد قصتك · {story.views_count}</h3>
                <button onClick={() => { setViewersOpen(false); setPaused(false); }}
                  className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              {viewersList.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">لا مشاهدات بعد</p>
              )}
              <ul className="space-y-2">
                {viewersList.map((v: any) => (
                  <li key={v.viewer_id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/50">
                    <Avatar className="h-9 w-9">
                      <SmartAvatarImage src={v.profile?.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {(v.profile?.full_name || '?').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{v.profile?.full_name || 'مستخدم'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true, locale: ar })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
