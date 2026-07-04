import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, Send, MoreHorizontal, Image as ImageIcon, X,
  Pin, Trash2, CornerDownRight, Loader2, Users, Search, Flag, Hash, Pencil,
  ChevronDown, ChevronRight, Settings, Video, Mic, Paperclip, StopCircle,
  Bookmark, BookmarkCheck, Trophy, CheckCircle2, MessageSquare, HelpCircle,
  BookOpen, Megaphone, AtSign, Sparkles, Crown, Medal,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Profile {
  id: string; user_id: string; full_name: string;
  avatar_url: string | null; role: string; academic_title: string | null;
}
interface Post {
  id: string; author_id: string; content: string; image_url: string | null;
  media_type?: MediaType | null; media_mime?: string | null; media_name?: string | null;
  tags: string[] | null; likes_count: number; comments_count: number; shares_count: number;
  saves_count?: number; score?: number; category?: PostCategory; is_answered?: boolean;
  is_pinned: boolean; created_at: string; author?: Profile; liked?: boolean; saved?: boolean; media?: PostMedia[];
}
interface Comment {
  id: string; post_id: string; parent_id: string | null; author_id: string;
  content: string; likes_count: number; created_at: string;
  edited_at?: string | null; author?: Profile; liked?: boolean;
}

type Role = 'doctor' | 'student';
type MediaType = 'image' | 'video' | 'audio';
type PostCategory = 'discussion' | 'question' | 'resource' | 'announcement';
interface LeaderRow {
  user_id: string; full_name: string | null; avatar_url: string | null; role: string | null;
  posts_count: number; comments_count: number; likes_received: number; score: number;
}

interface PostMedia {
  id: string; post_id: string; uploader_id?: string; storage_path: string;
  media_type: MediaType; mime_type?: string | null; file_name?: string | null;
  file_size?: number | null; duration_seconds?: number | null; display_url?: string;
}

interface SelectedMedia {
  id: string; file: File; type: MediaType; previewUrl: string; duration?: number;
}

const REPORT_REASONS_AR = ['محتوى مسيء', 'محتوى مضلل', 'مضايقة', 'محتوى غير لائق', 'رسائل مزعجة', 'أخرى'];
const REPORT_REASONS_EN = ['Offensive content', 'Misinformation', 'Harassment', 'Inappropriate', 'Spam', 'Other'];
const MAX_MEDIA_FILES = 4;
const MEDIA_BUCKET = 'message-attachments';

const CATEGORY_META: Record<PostCategory, { icon: any; ar: string; en: string; color: string }> = {
  discussion: { icon: MessageSquare, ar: 'نقاش', en: 'Discussion', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  question: { icon: HelpCircle, ar: 'سؤال', en: 'Question', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  resource: { icon: BookOpen, ar: 'مورد', en: 'Resource', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  announcement: { icon: Megaphone, ar: 'إعلان', en: 'Announcement', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};
const CATEGORIES: PostCategory[] = ['discussion', 'question', 'resource', 'announcement'];

export default function Community({ role }: { role: Role }) {
  const { user, profile, isAdmin } = useAuth();
  const { language, isRTL } = useLanguage();
  const t = (a: string, e: string) => (language === 'ar' ? a : e);
  const locale = language === 'ar' ? ar : enUS;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'mine' | 'trending' | 'saved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<PostCategory | null>(null);
  const [composerCategory, setComposerCategory] = useState<PostCategory>('discussion');
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([]);
  const [text, setText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [posting, setPosting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [reportTarget, setReportTarget] = useState<
    { kind: 'post' | 'comment'; id: string } | null
  >(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const displayName = (p?: { full_name?: string | null } | null, fallbackUser?: typeof user) =>
    p?.full_name || fallbackUser?.user_metadata?.full_name || fallbackUser?.email?.split('@')[0] || t('مستخدم', 'User');
  const avatarLetter = (name?: string | null) => (name?.trim()?.slice(0, 1) || 'U').toUpperCase();
  const detectMediaType = (file: File): MediaType | null => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return null;
  };
  const mediaLimit = (type: MediaType) => (type === 'image' ? 8 : type === 'video' ? 80 : 30) * 1024 * 1024;
  const mediaLabel = (type: MediaType) => type === 'image' ? t('صورة', 'Photo') : type === 'video' ? t('فيديو', 'Video') : t('صوت', 'Audio');

  // -------- Load posts (with search/tag/category filters + saved tab) --------
  const loadPosts = async () => {
    setLoading(true);
    let savedIds: string[] = [];
    if (tab === 'saved') {
      if (!user) { setPosts([]); setLoading(false); return; }
      const { data: saves } = await supabase.from('community_saved_posts').select('post_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
      savedIds = (saves || []).map((s: any) => s.post_id);
      if (!savedIds.length) { setPosts([]); setLoading(false); return; }
    }
    let q = supabase.from('community_posts').select('*').eq('is_hidden', false);
    if (tab === 'mine' && user) q = q.eq('author_id', user.id);
    if (tab === 'saved') q = q.in('id', savedIds);
    if (categoryFilter) q = q.eq('category', categoryFilter);
    if (activeTag) q = q.contains('tags', [activeTag]);
    if (query.trim()) q = q.ilike('content', `%${query.trim()}%`);
    if (tab === 'trending') q = q.order('score', { ascending: false });
    else q = q.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });

    const { data: rows, error } = await q.limit(80);
    if (error) { toast.error(error.message); setLoading(false); return; }

    const authorIds = [...new Set((rows || []).map((r: any) => r.author_id))];
    const postIds = (rows || []).map((r: any) => r.id);
    const [{ data: authors }, { data: myLikes }, { data: mySaves }, { data: mediaRows }] = await Promise.all([
      authorIds.length
        ? supabase.from('profiles').select('id,user_id,full_name,avatar_url,role,academic_title').in('user_id', authorIds)
        : Promise.resolve({ data: [] as any[] }),
      user
        ? supabase.from('community_reactions').select('post_id').eq('user_id', user.id).not('post_id', 'is', null)
        : Promise.resolve({ data: [] as any[] }),
      user && postIds.length
        ? supabase.from('community_saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? (supabase as any).from('community_post_media').select('*').in('post_id', postIds).order('created_at', { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const mediaWithUrls = await Promise.all(((mediaRows as PostMedia[]) || []).map(async (m) => {
      const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(m.storage_path, 60 * 60);
      return { ...m, display_url: data?.signedUrl || '' };
    }));
    const mediaByPost = mediaWithUrls.reduce<Record<string, PostMedia[]>>((acc, m) => {
      (acc[m.post_id] ||= []).push(m);
      return acc;
    }, {});
    const map = new Map(((authors as any[]) || []).map((a: any) => [a.user_id, a]));
    const liked = new Set(((myLikes as any[]) || []).map((r: any) => r.post_id));
    const saved = new Set(((mySaves as any[]) || []).map((r: any) => r.post_id));
    setPosts((rows || []).map((p: any) => ({
      ...p,
      author: map.get(p.author_id) || (p.author_id === user?.id ? profile : undefined),
      liked: liked.has(p.id),
      saved: saved.has(p.id),
      media: mediaByPost[p.id] || [],
    })));
    setLoading(false);

    // trending tags (client aggregation of latest posts)
    const tagCounts: Record<string, number> = {};
    (rows || []).forEach((p: any) => (p.tags || []).forEach((tg: string) => { tagCounts[tg] = (tagCounts[tg] || 0) + 1; }));
    setTrendingTags(Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag, count]) => ({ tag, count })));
  };

  const loadLeaderboard = async () => {
    const { data } = await (supabase as any).rpc('community_leaderboard', { days: 30, lim: 10 });
    setLeaderboard((data as LeaderRow[]) || []);
  };

  useEffect(() => { loadPosts(); /* eslint-disable-next-line */ }, [tab, activeTag, categoryFilter, user?.id]);
  useEffect(() => { loadLeaderboard(); }, []);

  // debounced search
  useEffect(() => {
    const h = setTimeout(() => loadPosts(), 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line
  }, [query]);

  useEffect(() => {
    const channel = supabase
      .channel('community-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_reactions' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, (payload: any) => {
        const postId = (payload.new || payload.old)?.post_id;
        if (postId && comments[postId]) loadComments(postId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [comments]);

  useEffect(() => () => {
    selectedMedia.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const onPickMedia = (files: FileList | File[] | null) => {
    if (!files) return;
    const next: SelectedMedia[] = [];
    Array.from(files).slice(0, MAX_MEDIA_FILES - selectedMedia.length).forEach((file) => {
      const type = detectMediaType(file);
      if (!type) return toast.error(t('نوع الملف غير مدعوم', 'Unsupported file type'));
      if (file.size > mediaLimit(type)) return toast.error(t(`${mediaLabel(type)} كبير جدًا`, `${mediaLabel(type)} is too large`));
      next.push({ id: crypto.randomUUID(), file, type, previewUrl: URL.createObjectURL(file) });
    });
    if (next.length) setSelectedMedia((prev) => [...prev, ...next].slice(0, MAX_MEDIA_FILES));
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeMedia = (id: string) => {
    setSelectedMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((m) => m.id !== id);
    });
  };

  const clearMedia = () => {
    selectedMedia.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    setSelectedMedia([]);
  };

  const uploadMediaFiles = async (postId: string): Promise<PostMedia[]> => {
    if (!user || selectedMedia.length === 0) return [];
    const uploaded: PostMedia[] = [];
    for (const item of selectedMedia) {
      const ext = item.file.name.split('.').pop() || item.file.type.split('/')[1] || 'bin';
      const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/community/${postId}/${crypto.randomUUID()}-${safeName || `media.${ext}`}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, item.file, {
        upsert: false,
        contentType: item.file.type || undefined,
        cacheControl: '3600',
      });
      if (error) throw error;
      uploaded.push({
        id: crypto.randomUUID(), post_id: postId, uploader_id: user.id, storage_path: path,
        media_type: item.type, mime_type: item.file.type, file_name: item.file.name,
        file_size: item.file.size, duration_seconds: item.duration ?? null,
      });
    }
    return uploaded;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) recordChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        const audioItem: SelectedMedia = {
          id: crypto.randomUUID(), file, type: 'audio', previewUrl: URL.createObjectURL(file), duration: recordElapsed,
        };
        setSelectedMedia((prev) => [...prev, audioItem].slice(0, MAX_MEDIA_FILES));
        setRecordElapsed(0);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordElapsed(0);
      recordTimerRef.current = window.setInterval(() => setRecordElapsed((s) => s + 1), 1000);
    } catch (e: any) {
      toast.error(e?.message || t('تعذر بدء التسجيل', 'Could not start recording'));
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  // Resolve @mentions: match @name tokens against profiles.full_name (case-insensitive prefix)
  const resolveMentions = async (body: string): Promise<string[]> => {
    const raw = Array.from(body.matchAll(/@([\p{L}\p{N}_ ]{2,40})/gu)).map((m) => m[1].trim());
    if (!raw.length) return [];
    const uniqueNames = [...new Set(raw)];
    const found: string[] = [];
    for (const name of uniqueNames.slice(0, 10)) {
      const { data } = await supabase.from('profiles')
        .select('user_id').ilike('full_name', `%${name}%`).limit(1);
      if (data?.[0]?.user_id && !found.includes(data[0].user_id)) found.push(data[0].user_id);
    }
    return found;
  };

  const insertMentions = async (userIds: string[], postId?: string, commentId?: string) => {
    if (!user || userIds.length === 0) return;
    const rows = userIds.filter((uid) => uid !== user.id).map((uid) => ({
      mentioned_user_id: uid, actor_id: user.id, post_id: postId ?? null, comment_id: commentId ?? null,
    }));
    if (rows.length) await (supabase as any).from('community_mentions').insert(rows);
  };

  const createPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || (!text.trim() && selectedMedia.length === 0)) return;
    setPosting(true);
    try {
      const tags = Array.from(text.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m) => m[1]).slice(0, 5);
      const firstMedia = selectedMedia[0];
      const postId = crypto.randomUUID();
      const uploaded = await uploadMediaFiles(postId);
      const firstUploaded = uploaded.find((m) => m.media_type === 'image') || uploaded[0];
      const { error } = await supabase.from('community_posts').insert({
        id: postId, author_id: user.id, content: text.trim(), image_url: firstUploaded?.storage_path ?? null,
        department_id: (profile as any)?.department_id ?? null, tags,
        category: composerCategory,
        media_type: firstMedia?.type ?? null, media_mime: firstMedia?.file.type ?? null, media_name: firstMedia?.file.name ?? null,
      } as any).select('id').single();
      if (error) throw error;
      if (uploaded.length) {
        const rows = uploaded.map(({ id, display_url, ...m }) => m);
        const { error: mediaError } = await (supabase as any).from('community_post_media').insert(rows);
        if (mediaError) throw mediaError;
      }
      const mentionedIds = await resolveMentions(text);
      await insertMentions(mentionedIds, postId);
      setText(''); clearMedia(); setComposerCategory('discussion');
      toast.success(t('تم النشر', 'Posted'));
      loadPosts();
    } catch (e: any) {
      toast.error(e?.message || t('فشل النشر', 'Post failed'));
    } finally {
      setPosting(false);
    }
  };

  const toggleSave = async (post: Post) => {
    if (!user) return;
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, saved: !p.saved, saves_count: (p.saves_count || 0) + (p.saved ? -1 : 1) } : p));
    if (post.saved) {
      await supabase.from('community_saved_posts').delete().eq('user_id', user.id).eq('post_id', post.id);
    } else {
      await supabase.from('community_saved_posts').insert({ user_id: user.id, post_id: post.id });
      toast.success(t('تم الحفظ', 'Saved'));
    }
  };

  const markAnswered = async (post: Post) => {
    const { error } = await supabase.from('community_posts')
      .update({ is_answered: !post.is_answered } as any).eq('id', post.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, is_answered: !post.is_answered } : p));
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, liked: !p.liked, likes_count: p.likes_count + (p.liked ? -1 : 1) } : p));
    if (post.liked) {
      await supabase.from('community_reactions').delete().eq('user_id', user.id).eq('post_id', post.id);
    } else {
      await supabase.from('community_reactions').insert({ user_id: user.id, post_id: post.id, reaction: 'like' });
    }
  };

  const sharePost = async (post: Post) => {
    if (!user) return;
    const url = `${window.location.origin}/${role}/community#post-${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: t('منشور', 'Post'), text: post.content.slice(0, 120), url });
      else { await navigator.clipboard.writeText(url); toast.success(t('تم نسخ الرابط', 'Link copied')); }
      await supabase.from('community_shares').insert({ post_id: post.id, user_id: user.id, channel: 'link' });
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, shares_count: p.shares_count + 1 } : p));
    } catch { /* cancelled */ }
  };

  const deletePost = async (post: Post) => {
    if (!confirm(t('حذف المنشور؟', 'Delete post?'))) return;
    const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast.success(t('تم الحذف', 'Deleted'));
  };

  const pinPost = async (post: Post) => {
    const { error } = await supabase.from('community_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
    if (error) return toast.error(error.message);
    loadPosts();
  };

  const loadComments = async (postId: string) => {
    const { data, error } = await supabase.from('community_comments')
      .select('*').eq('post_id', postId).eq('is_hidden', false)
      .order('created_at', { ascending: true }).limit(200);
    if (error) return;
    const authorIds = [...new Set((data || []).map((c: any) => c.author_id))];
    const [{ data: authors }, { data: myLikes }] = await Promise.all([
      authorIds.length
        ? supabase.from('profiles').select('id,user_id,full_name,avatar_url,role,academic_title').in('user_id', authorIds)
        : Promise.resolve({ data: [] as any[] }),
      user
        ? supabase.from('community_reactions').select('comment_id').eq('user_id', user.id).not('comment_id', 'is', null)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const map = new Map(((authors as any[]) || []).map((a: any) => [a.user_id, a]));
    const liked = new Set(((myLikes as any[]) || []).map((r: any) => r.comment_id));
    setComments((prev) => ({
      ...prev,
      [postId]: (data || []).map((c: any) => ({ ...c, author: map.get(c.author_id), liked: liked.has(c.id) })),
    }));
  };

  const openThread = async (postId: string) => {
    const isOpen = openPost === postId;
    setOpenPost(isOpen ? null : postId);
    if (!isOpen && !comments[postId]) loadComments(postId);
  };

  const submitComment = async (postId: string) => {
    if (!user) return;
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;
    const { data: inserted, error } = await supabase.from('community_comments').insert({
      post_id: postId, parent_id: replyTo[postId] || null,
      author_id: user.id, content,
    }).select('id').single();
    if (error) return toast.error(error.message);
    const mentioned = await resolveMentions(content);
    await insertMentions(mentioned, postId, inserted?.id);
    setCommentDrafts((d) => ({ ...d, [postId]: '' }));
    setReplyTo((r) => ({ ...r, [postId]: null }));
    loadComments(postId);
  };

  const toggleCommentLike = async (postId: string, c: Comment) => {
    if (!user) return;
    setComments((prev) => ({
      ...prev,
      [postId]: prev[postId].map((x) => x.id === c.id
        ? { ...x, liked: !x.liked, likes_count: x.likes_count + (x.liked ? -1 : 1) } : x),
    }));
    if (c.liked) await supabase.from('community_reactions').delete().eq('user_id', user.id).eq('comment_id', c.id);
    else await supabase.from('community_reactions').insert({ user_id: user.id, comment_id: c.id, reaction: 'like' });
  };

  const deleteComment = async (postId: string, id: string) => {
    if (!confirm(t('حذف التعليق؟', 'Delete comment?'))) return;
    const { error } = await supabase.from('community_comments').delete().eq('id', id);
    if (error) return toast.error(error.message);
    loadComments(postId);
  };

  const saveCommentEdit = async (postId: string) => {
    if (!editingComment) return;
    const content = editingComment.content.trim();
    if (!content) return;
    const { error } = await supabase.from('community_comments')
      .update({ content }).eq('id', editingComment.id);
    if (error) return toast.error(error.message);
    setEditingComment(null);
    loadComments(postId);
  };

  const submitReport = async () => {
    if (!user || !reportTarget || !reportReason) return;
    const payload: any = { reporter_id: user.id, reason: reportReason, details: reportDetails.trim() || null };
    if (reportTarget.kind === 'post') payload.post_id = reportTarget.id;
    else payload.comment_id = reportTarget.id;
    const { error } = await supabase.from('community_reports').insert(payload);
    if (error) return toast.error(error.message);
    toast.success(t('تم إرسال الإبلاغ، شكرًا لك', 'Report submitted, thank you'));
    setReportTarget(null); setReportReason(''); setReportDetails('');
  };

  // build nested tree with children count
  const buildTree = (list: Comment[]) => {
    const map = new Map<string, Comment & { children: any[] }>();
    list.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: any[] = [];
    list.forEach((c) => {
      if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(map.get(c.id));
      else roots.push(map.get(c.id));
    });
    return roots;
  };

  const countDescendants = (c: any): number =>
    (c.children || []).reduce((acc: number, ch: any) => acc + 1 + countDescendants(ch), 0);

  const renderComment = (postId: string, c: any, depth = 0): JSX.Element => {
    const isCollapsed = collapsed[c.id];
    const replyCount = countDescendants(c);
    const isMine = c.author_id === user?.id;
    const isEditing = editingComment?.id === c.id;
    return (
      <div key={c.id} className={`${depth > 0 ? 'ms-6 border-s-2 border-border ps-3' : ''} mt-3`}>
        <div className="flex gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={c.author?.avatar_url || undefined} />
            <AvatarFallback>{(c.author?.full_name || '?').slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="rounded-2xl bg-muted/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{c.author?.full_name || '—'}</span>
                {c.author?.role === 'doctor' && <Badge variant="secondary" className="h-4 px-1 text-[10px]">Dr.</Badge>}
                {c.edited_at && <span className="text-[10px] text-muted-foreground">({t('معدّل', 'edited')})</span>}
              </div>
              {isEditing ? (
                <div className="mt-1">
                  <Textarea
                    value={editingComment!.content}
                    onChange={(e) => setEditingComment({ ...editingComment!, content: e.target.value })}
                    className="min-h-[60px]"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => saveCommentEdit(postId)}>{t('حفظ', 'Save')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingComment(null)}>{t('إلغاء', 'Cancel')}</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale })}</span>
              <button onClick={() => toggleCommentLike(postId, c)} className={`inline-flex items-center gap-1 hover:text-primary ${c.liked ? 'text-primary font-medium' : ''}`}>
                <Heart className={`h-3.5 w-3.5 ${c.liked ? 'fill-primary' : ''}`} /> {c.likes_count}
              </button>
              <button onClick={() => setReplyTo((r) => ({ ...r, [postId]: c.id }))} className="inline-flex items-center gap-1 hover:text-primary">
                <CornerDownRight className="h-3.5 w-3.5" /> {t('رد', 'Reply')}
              </button>
              {replyCount > 0 && (
                <button
                  onClick={() => setCollapsed((s) => ({ ...s, [c.id]: !s[c.id] }))}
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isCollapsed
                    ? t(`عرض ${replyCount} ردود`, `Show ${replyCount} replies`)
                    : t(`إخفاء الردود`, 'Hide replies')}
                </button>
              )}
              {isMine && !isEditing && (
                <button onClick={() => setEditingComment({ id: c.id, content: c.content })} className="hover:text-primary">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {(isMine || isAdmin) && (
                <button onClick={() => deleteComment(postId, c.id)} className="hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
              {!isMine && (
                <button onClick={() => { setReportTarget({ kind: 'comment', id: c.id }); setReportReason(''); setReportDetails(''); }} className="hover:text-destructive">
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {!isCollapsed && c.children.map((child: any) => renderComment(postId, child, depth + 1))}
          </div>
        </div>
      </div>
    );
  };

  const renderPostMedia = (media?: PostMedia[]) => {
    if (!media?.length) return null;
    return (
      <div className="mt-3 grid gap-2">
        {media.map((m) => {
          const src = m.display_url || m.storage_path;
          if (m.media_type === 'video') {
            return <video key={m.id} src={src} controls preload="metadata" className="max-h-96 w-full rounded-xl bg-muted object-contain" />;
          }
          if (m.media_type === 'audio') {
            return (
              <div key={m.id} className="rounded-xl border bg-muted/40 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Mic className="h-4 w-4" /> {m.file_name || t('تسجيل صوتي', 'Voice note')}</div>
                <audio src={src} controls preload="metadata" className="w-full" />
              </div>
            );
          }
          return <img key={m.id} src={src} alt={m.file_name || t('صورة منشور', 'Post image')} className="max-h-96 w-full rounded-xl object-cover" loading="lazy" />;
        })}
      </div>
    );
  };

  const tabs = useMemo(() => ([
    { k: 'all', label: t('الكل', 'All') },
    { k: 'trending', label: t('الأكثر تفاعلاً', 'Trending') },
    { k: 'saved', label: t('المحفوظة', 'Saved') },
    { k: 'mine', label: t('منشوراتي', 'Mine') },
  ] as const), [language]);

  const reasons = language === 'ar' ? REPORT_REASONS_AR : REPORT_REASONS_EN;

  return (
    <MobileLayout role={role}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="mx-auto max-w-2xl px-4 py-4 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{t('الملتقى الطلابي', 'Student Community')}</h1>
          </div>
          <Link to={`/${role}/notifications`}>
            <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ابحث في المنشورات...', 'Search posts...')}
            className={isRTL ? 'pr-9' : 'pl-9'}
          />
        </div>

        {/* Category filter chips */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full border px-3 py-1 text-xs transition ${!categoryFilter ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
          >{t('كل التصنيفات', 'All categories')}</button>
          {CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c]; const Icon = meta.icon;
            const active = categoryFilter === c;
            return (
              <button key={c} onClick={() => setCategoryFilter(active ? null : c)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${active ? 'bg-primary text-primary-foreground border-primary' : meta.color + ' hover:opacity-80'}`}>
                <Icon className="h-3 w-3" /> {t(meta.ar, meta.en)}
              </button>
            );
          })}
        </div>

        {/* Trending tags */}
        {trendingTags.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            {activeTag && (
              <Badge variant="default" className="cursor-pointer" onClick={() => setActiveTag(null)}>
                #{activeTag} <X className="ms-1 h-3 w-3" />
              </Badge>
            )}
            {trendingTags.filter((tt) => tt.tag !== activeTag).map((tt) => (
              <Badge key={tt.tag} variant="outline" className="cursor-pointer hover:bg-muted"
                onClick={() => setActiveTag(tt.tag)}>
                #{tt.tag} <span className="ms-1 text-[10px] text-muted-foreground">{tt.count}</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Leaderboard */}
        <div className="mb-4 overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/10 via-card to-primary/5 shadow-sm">
          <button onClick={() => setLeaderOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">{t('الأكثر تفاعلاً هذا الشهر', 'Top contributors this month')}</span>
            </div>
            {leaderOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {leaderOpen && (
            <div className="border-t px-2 py-2">
              {leaderboard.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">{t('لا توجد بيانات بعد', 'No data yet')}</div>
              ) : (
                <ol className="space-y-1">
                  {leaderboard.map((row, idx) => (
                    <li key={row.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {idx === 0 ? <Crown className="h-4 w-4 text-amber-500" /> : idx === 1 ? <Medal className="h-4 w-4 text-slate-400" /> : idx === 2 ? <Medal className="h-4 w-4 text-orange-500" /> : idx + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={row.avatar_url || undefined} />
                        <AvatarFallback>{avatarLetter(row.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 truncate text-sm font-medium">
                          {row.full_name || t('مستخدم', 'User')}
                          {row.role === 'doctor' && <Badge variant="secondary" className="h-4 px-1 text-[10px]">Dr.</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.posts_count} {t('منشور', 'posts')} · {row.comments_count} {t('تعليق', 'comments')} · {row.likes_received} {t('إعجاب', 'likes')}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600">
                        <Sparkles className="h-3 w-3" /> {row.score}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={createPost} className="mb-4 rounded-2xl border bg-card p-3 shadow-sm">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const meta = CATEGORY_META[c]; const Icon = meta.icon;
              const active = composerCategory === c;
              return (
                <button key={c} type="button" onClick={() => setComposerCategory(c)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${active ? 'bg-primary text-primary-foreground border-primary' : meta.color}`}>
                  <Icon className="h-3 w-3" /> {t(meta.ar, meta.en)}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{avatarLetter(displayName(profile, user))}</AvatarFallback>
            </Avatar>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('شارك فكرة، سؤالاً، أو إعلاناً... استخدم @اسم للإشارة و #وسم', 'Share... use @name to mention and #tag')}
              className="min-h-[60px] resize-none border-0 focus-visible:ring-0"
              maxLength={5000}
            />
          </div>
          {selectedMedia.length > 0 && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {selectedMedia.map((m) => (
                <div key={m.id} className="relative overflow-hidden rounded-xl border bg-muted/30">
                  {m.type === 'image' && <img src={m.previewUrl} alt={m.file.name} className="h-44 w-full object-cover" />}
                  {m.type === 'video' && <video src={m.previewUrl} controls className="h-44 w-full bg-muted object-contain" />}
                  {m.type === 'audio' && (
                    <div className="p-3">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Mic className="h-4 w-4" /> {m.file.name}</div>
                      <audio src={m.previewUrl} controls className="w-full" />
                    </div>
                  )}
                  <button type="button" onClick={() => removeMedia(m.id)} className="absolute right-2 top-2 rounded-full bg-background/90 p-1 text-foreground shadow-sm">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" multiple hidden onChange={(e) => onPickMedia(e.target.files)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="h-4 w-4 me-1" /> {t('صورة', 'Photo')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <Video className="h-4 w-4 me-1" /> {t('فيديو', 'Video')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-4 w-4 me-1" /> {t('صوت', 'Audio')}
              </Button>
              <Button type="button" variant={recording ? 'destructive' : 'ghost'} size="sm" onClick={recording ? stopRecording : startRecording} disabled={!recording && selectedMedia.length >= MAX_MEDIA_FILES}>
                {recording ? <StopCircle className="h-4 w-4 me-1" /> : <Mic className="h-4 w-4 me-1" />}
                {recording ? t(`إيقاف ${recordElapsed}ث`, `Stop ${recordElapsed}s`) : t('تسجيل', 'Record')}
              </Button>
              <span className="text-xs text-muted-foreground">{text.length}/5000</span>
            </div>
            <Button type="submit" size="sm" disabled={posting || (!text.trim() && selectedMedia.length === 0)}>
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 me-1" /> {t('نشر', 'Post')}</>}
            </Button>
          </div>
        </form>

        {/* Tabs */}
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {tabs.map((tb) => (
            <button
              key={tb.k}
              onClick={() => setTab(tb.k)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition ${tab === tb.k ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            {query || activeTag
              ? t('لا توجد نتائج مطابقة', 'No matching results')
              : t('لا توجد منشورات بعد. كن أول من يشارك!', 'No posts yet. Be the first to share!')}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {posts.map((p) => (
                <motion.article
                  key={p.id}
                  id={`post-${p.id}`}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <header className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.author?.avatar_url || undefined} />
                        <AvatarFallback>{avatarLetter(displayName(p.author, p.author_id === user?.id ? user : undefined))}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{displayName(p.author, p.author_id === user?.id ? user : undefined)}</span>
                          {p.author?.role === 'doctor' && <Badge variant="secondary" className="h-5 px-1.5 text-xs">Dr.</Badge>}
                          {p.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                          {p.category && (() => {
                            const meta = CATEGORY_META[p.category]; const Icon = meta.icon;
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                                <Icon className="h-3 w-3" /> {t(meta.ar, meta.en)}
                              </span>
                            );
                          })()}
                          {p.category === 'question' && p.is_answered && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" /> {t('تمت الإجابة', 'Answered')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale })}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => pinPost(p)}>
                            <Pin className="h-4 w-4 me-2" /> {p.is_pinned ? t('إلغاء التثبيت', 'Unpin') : t('تثبيت', 'Pin')}
                          </DropdownMenuItem>
                        )}
                        {p.author_id !== user?.id && (
                          <DropdownMenuItem onClick={() => { setReportTarget({ kind: 'post', id: p.id }); setReportReason(''); setReportDetails(''); }}>
                            <Flag className="h-4 w-4 me-2" /> {t('إبلاغ', 'Report')}
                          </DropdownMenuItem>
                        )}
                        {(p.author_id === user?.id || isAdmin) && (
                          <DropdownMenuItem className="text-destructive" onClick={() => deletePost(p)}>
                            <Trash2 className="h-4 w-4 me-2" /> {t('حذف', 'Delete')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </header>

                  {p.content && (
                    <div className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                      {p.content}
                    </div>
                  )}
                  {p.media?.length ? renderPostMedia(p.media) : (p.image_url?.startsWith('http') && (
                    <img src={p.image_url} alt={t('صورة منشور', 'Post image')} className="mt-3 max-h-96 w-full rounded-xl object-cover" loading="lazy" />
                  ))}
                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.tags.map((tg) => (
                        <Badge key={tg} variant="outline" className="cursor-pointer text-xs hover:bg-muted"
                          onClick={() => setActiveTag(tg)}>#{tg}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1 border-t pt-2 text-sm">
                    <Button variant="ghost" size="sm" onClick={() => toggleLike(p)} className={p.liked ? 'text-primary' : ''}>
                      <Heart className={`h-4 w-4 me-1 ${p.liked ? 'fill-primary' : ''}`} /> {p.likes_count}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openThread(p.id)}>
                      <MessageCircle className="h-4 w-4 me-1" /> {p.comments_count}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => sharePost(p)}>
                      <Share2 className="h-4 w-4 me-1" /> {p.shares_count}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {openPost === p.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 border-t pt-3">
                          {replyTo[p.id] && (
                            <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
                              <span>{t('الرد على تعليق', 'Replying to a comment')}</span>
                              <button onClick={() => setReplyTo((r) => ({ ...r, [p.id]: null }))}><X className="h-3 w-3" /></button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Textarea
                              value={commentDrafts[p.id] || ''}
                              onChange={(e) => setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                              placeholder={t('اكتب تعليقاً...', 'Write a comment...')}
                              className="min-h-[40px] resize-none"
                              maxLength={2000}
                            />
                            <Button size="icon" onClick={() => submitComment(p.id)} disabled={!(commentDrafts[p.id] || '').trim()}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                          <div>
                            {(comments[p.id] ? buildTree(comments[p.id]) : []).map((c) => renderComment(p.id, c))}
                            {!comments[p.id] && <div className="py-4 text-center text-sm text-muted-foreground">{t('جارٍ التحميل...', 'Loading...')}</div>}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Report dialog */}
      <Dialog open={!!reportTarget} onOpenChange={(o) => !o && setReportTarget(null)}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('إبلاغ عن محتوى', 'Report content')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('السبب', 'Reason')}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReportReason(r)}
                    className={`rounded-full border px-3 py-1 text-sm ${reportReason === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >{r}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t('تفاصيل إضافية (اختياري)', 'Additional details (optional)')}</Label>
              <Textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportTarget(null)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={submitReport} disabled={!reportReason}>
              <Flag className="h-4 w-4 me-1" /> {t('إرسال الإبلاغ', 'Submit report')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
