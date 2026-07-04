import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Send, MoreHorizontal, Image as ImageIcon, X, Pin, Trash2, CornerDownRight, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  academic_title: string | null;
}
interface Post {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  tags: string[] | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  created_at: string;
  author?: Profile;
  liked?: boolean;
}
interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  author?: Profile;
  liked?: boolean;
}

type Role = 'doctor' | 'student';

export default function Community({ role }: { role: Role }) {
  const { user, profile, isAdmin } = useAuth();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const locale = language === 'ar' ? ar : enUS;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'mine' | 'trending'>('all');
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPosts = async () => {
    setLoading(true);
    let q = supabase.from('community_posts').select('*').eq('is_hidden', false);
    if (tab === 'mine' && user) q = q.eq('author_id', user.id);
    if (tab === 'trending') q = q.order('likes_count', { ascending: false });
    else q = q.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });

    const { data: rows, error } = await q.limit(80);
    if (error) { toast.error(error.message); setLoading(false); return; }

    const authorIds = [...new Set((rows || []).map((r: any) => r.author_id))];
    const [{ data: authors }, { data: myLikes }] = await Promise.all([
      supabase.from('profiles').select('id,user_id,full_name,avatar_url,role,academic_title').in('user_id', authorIds),
      user
        ? supabase.from('community_reactions').select('post_id').eq('user_id', user.id).not('post_id', 'is', null)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const map = new Map((authors || []).map((a: any) => [a.user_id, a]));
    const liked = new Set((myLikes || []).map((r: any) => r.post_id));
    setPosts((rows || []).map((p: any) => ({ ...p, author: map.get(p.author_id), liked: liked.has(p.id) })));
    setLoading(false);
  };

  useEffect(() => { loadPosts(); /* eslint-disable-next-line */ }, [tab, user?.id]);

  // realtime: refresh feed on any change
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

  const onPickImage = (f: File | null) => {
    if (!f) { setImage(null); setImagePreview(null); return; }
    if (f.size > 4 * 1024 * 1024) { toast.error(t('الصورة كبيرة (أقل من 4MB)', 'Image too large (<4MB)')); return; }
    setImage(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!image || !user) return null;
    const path = `community/${user.id}/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { error } = await supabase.storage.from('message-attachments').upload(path, image, { upsert: false });
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from('message-attachments').createSignedUrl
      ? await supabase.storage.from('message-attachments').createSignedUrl(path, 60 * 60 * 24 * 365)
      : { data: null } as any;
    return data?.signedUrl ?? null;
  };

  const createPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setPosting(true);
    const image_url = image ? await uploadImage() : null;
    const tags = Array.from(text.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((m) => m[1]).slice(0, 5);
    const { error } = await supabase.from('community_posts').insert({
      author_id: user.id,
      content: text.trim(),
      image_url,
      department_id: profile?.department_id ?? null,
      tags,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setText(''); setImage(null); setImagePreview(null);
    toast.success(t('تم النشر', 'Posted'));
    loadPosts();
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    // optimistic
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, liked: !p.liked, likes_count: p.likes_count + (p.liked ? -1 : 1) }
      : p));
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
    } catch { /* user cancelled */ }
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
    const [{ data: authors }, myLikes] = await Promise.all([
      supabase.from('profiles').select('id,user_id,full_name,avatar_url,role,academic_title').in('user_id', authorIds),
      user
        ? supabase.from('community_reactions').select('comment_id').eq('user_id', user.id).not('comment_id', 'is', null)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const map = new Map((authors || []).map((a: any) => [a.user_id, a]));
    const liked = new Set(((myLikes as any).data || []).map((r: any) => r.comment_id));
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
    const { error } = await supabase.from('community_comments').insert({
      post_id: postId,
      parent_id: replyTo[postId] || null,
      author_id: user.id,
      content,
    });
    if (error) return toast.error(error.message);
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
    const { error } = await supabase.from('community_comments').delete().eq('id', id);
    if (error) return toast.error(error.message);
    loadComments(postId);
  };

  // build nested comment tree
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

  const renderComment = (postId: string, c: any, depth = 0): JSX.Element => (
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
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale })}</span>
            <button onClick={() => toggleCommentLike(postId, c)} className={`inline-flex items-center gap-1 hover:text-primary ${c.liked ? 'text-primary font-medium' : ''}`}>
              <Heart className={`h-3.5 w-3.5 ${c.liked ? 'fill-primary' : ''}`} /> {c.likes_count}
            </button>
            <button onClick={() => setReplyTo((r) => ({ ...r, [postId]: c.id }))} className="inline-flex items-center gap-1 hover:text-primary">
              <CornerDownRight className="h-3.5 w-3.5" /> {t('رد', 'Reply')}
            </button>
            {(c.author_id === user?.id || isAdmin) && (
              <button onClick={() => deleteComment(postId, c.id)} className="hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            )}
          </div>
          {c.children.map((child: any) => renderComment(postId, child, depth + 1))}
        </div>
      </div>
    </div>
  );

  const tabs = useMemo(() => ([
    { k: 'all', label: t('الكل', 'All') },
    { k: 'trending', label: t('الأكثر تفاعلاً', 'Trending') },
    { k: 'mine', label: t('منشوراتي', 'Mine') },
  ] as const), [language]);

  return (
    <MobileLayout role={role}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="mx-auto max-w-2xl px-4 py-4 pb-24">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t('الملتقى الطلابي', 'Student Community')}</h1>
        </div>

        {/* Composer */}
        <form onSubmit={createPost} className="mb-4 rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex gap-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{(profile?.full_name || '?').slice(0, 1)}</AvatarFallback>
            </Avatar>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('شارك فكرة، سؤالاً، أو إعلاناً...', 'Share a thought, question, or announcement...')}
              className="min-h-[60px] resize-none border-0 focus-visible:ring-0"
              maxLength={5000}
            />
          </div>
          {imagePreview && (
            <div className="relative mt-2">
              <img src={imagePreview} alt="" className="max-h-64 w-full rounded-lg object-cover" />
              <button type="button" onClick={() => onPickImage(null)} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="h-4 w-4 me-1" /> {t('صورة', 'Photo')}
              </Button>
              <span className="text-xs text-muted-foreground">{text.length}/5000</span>
            </div>
            <Button type="submit" size="sm" disabled={posting || !text.trim()}>
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
            {t('لا توجد منشورات بعد. كن أول من يشارك!', 'No posts yet. Be the first to share!')}
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
                        <AvatarFallback>{(p.author?.full_name || '?').slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.author?.full_name || '—'}</span>
                          {p.author?.role === 'doctor' && <Badge variant="secondary" className="h-5 px-1.5 text-xs">Dr.</Badge>}
                          {p.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale })}
                        </div>
                      </div>
                    </div>
                    {(p.author_id === user?.id || isAdmin) && (
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
                          <DropdownMenuItem className="text-destructive" onClick={() => deletePost(p)}>
                            <Trash2 className="h-4 w-4 me-2" /> {t('حذف', 'Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </header>

                  <div className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {p.content}
                  </div>
                  {p.image_url && (
                    <img src={p.image_url} alt="" className="mt-3 max-h-96 w-full rounded-xl object-cover" loading="lazy" />
                  )}
                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.tags.map((tg) => <Badge key={tg} variant="outline" className="text-xs">#{tg}</Badge>)}
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
    </MobileLayout>
  );
}
