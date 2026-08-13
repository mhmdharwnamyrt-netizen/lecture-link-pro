import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Users, Send, Paperclip, Image as ImageIcon, Mic, Square,
  Heart, CornerUpLeft, Pencil, Trash2, X, Loader2, FileText, Eye, Download,
  ThumbsUp, Smile, ThumbsDown, Frown, Angry
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useTx } from '@/lib/i18nModules';
import { ReactionPicker, type ReactionType } from '@/components/shared/ReactionPicker';
import {
  fetchGroup, fetchGroupMembers, fetchMessages, groupMediaUrl, mediaKindOf,
  initialsOf, colorOf, GROUP_BUCKET, MAX_GROUP_FILE_MB,
  type GroupMessage, type GroupMember, type StudyGroup,
} from '@/lib/groups';
import { formatBytes } from '@/lib/materials';

interface Props { role: 'doctor' | 'student' }

const LONG_TEXT = 320;

/* ---------------- Avatar ---------------- */
function MemberAvatar({ member, id, size = 36 }: { member?: GroupMember; id: string; size?: number }) {
  const url = member?.avatar_url || null;
  const style = { width: size, height: size };
  if (url && /^(https?:|data:|blob:)/.test(url)) {
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full border border-border/50 object-cover" loading="lazy" />;
  }
  return (
    <div style={{ ...style, background: colorOf(id) }}
      className="grid shrink-0 place-items-center rounded-full text-xs font-bold text-white">
      {initialsOf(member?.full_name)}
    </div>
  );
}

/* ---------------- Media renderer ---------------- */
function MessageMedia({ msg }: { msg: GroupMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (msg.media_path) groupMediaUrl(msg.media_path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [msg.media_path]);

  if (!msg.media_path) return null;
  if (!url) return <div className="h-32 w-56 animate-pulse rounded-xl bg-muted/60" />;

  if (msg.media_type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={msg.media_name || ''} className="max-h-72 w-full rounded-xl border border-border/40 object-cover" />
      </a>
    );
  }
  if (msg.media_type === 'video') {
    return <video src={url} controls className="max-h-72 w-full rounded-xl border border-border/40" />;
  }
  if (msg.media_type === 'audio') {
    return <audio src={url} controls className="w-56 max-w-full" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 p-2.5">
      <FileText className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{msg.media_name}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">{formatBytes(msg.media_size)}</span>
      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

/* ---------------- Page ---------------- */
export default function StudyGroupChat({ role }: Props) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tx, isRTL, locale, pickName } = useTx();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [myLikes, setMyLikes] = useState<Record<string, string>>(new Set() as any); // Modified to store reaction type
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [reads, setReads] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [editing, setEditing] = useState<GroupMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [membersOpen, setMembersOpen] = useState(false);
  const [seenFor, setSeenFor] = useState<GroupMessage | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const memberMap = useMemo(() => {
    const m: Record<string, GroupMember> = {};
    members.forEach((x) => { m[x.user_id] = x; });
    return m;
  }, [members]);

  const Back = isRTL ? ArrowRight : ArrowLeft;

  const loadReads = useCallback(async (msgs: GroupMessage[]) => {
    const ids = msgs.filter((m) => m.sender_id === user?.id).map((m) => m.id);
    if (!ids.length) return;
    const { data } = await supabase
      .from('study_group_reads' as any).select('message_id, user_id').in('message_id', ids);
    const map: Record<string, string[]> = {};
    (data || []).forEach((r: any) => { (map[r.message_id] ||= []).push(r.user_id); });
    setReads(map);
  }, [user?.id]);

  const markRead = useCallback(async (msgs: GroupMessage[]) => {
    if (!user) return;
    const rows = msgs.filter((m) => m.sender_id !== user.id)
      .map((m) => ({ message_id: m.id, user_id: user.id }));
    if (!rows.length) return;
    await supabase.from('study_group_reads' as any).upsert(rows, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!id || !user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const g = await fetchGroup(id);
      if (!alive) return;
      setGroup(g);
      if (!g) { setLoading(false); return; }
      const [ms, msgs, likes] = await Promise.all([
        fetchGroupMembers(id).catch(() => []),
        fetchMessages(id),
        supabase.from('study_group_reactions' as any).select('message_id, reaction_type').eq('user_id', user.id),
      ]);
      if (!alive) return;
      setMembers(ms);
      setMessages(msgs);
      const reactionsMap: Record<string, string> = {};
      (likes.data || []).forEach((r: any) => { reactionsMap[r.message_id] = r.reaction_type || 'like'; });
      setMyLikes(reactionsMap as any);
      setLoading(false);
      loadReads(msgs);
      markRead(msgs);
    })();
    return () => { alive = false; };
  }, [id, user, loadReads, markRead]);

  // Realtime
  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase
      .channel(`study-group-${id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'study_group_messages', filter: `group_id=eq.${id}` },
        (payload) => {
          const row = (payload.new || payload.old) as GroupMessage;
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
            if (row.sender_id !== user.id) markRead([row]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
          } else {
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_reads' }, () => {
        setMessages((prev) => { loadReads(prev); return prev; });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user, markRead, loadReads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  /* ---------- actions ---------- */
  const uploadMedia = async (file: File, duration?: number) => {
    if (!user || !id) return null;
    if (file.size > MAX_GROUP_FILE_MB * 1024 * 1024) {
      toast({ title: tx('g.tooBig', { n: MAX_GROUP_FILE_MB }), variant: 'destructive' });
      return null;
    }
    const safe = (file.name || 'file').replace(/[^\w.\-\u0600-\u06FF]+/g, '_');
    const path = `${id}/${user.id}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from(GROUP_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) { toast({ title: error.message, variant: 'destructive' }); return null; }
    return {
      media_path: path,
      media_type: mediaKindOf(file),
      media_mime: file.type || null,
      media_name: file.name || safe,
      media_size: file.size,
      duration_seconds: duration ?? null,
    };
  };

  const send = async (file?: File, duration?: number) => {
    if (!user || !id) return;
    const body = text.trim();
    if (!body && !file) return;
    setSending(true);
    
    // Optimistic insert to solve the "message doesn't appear immediately" issue
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: any = {
      id: tempId,
      group_id: id,
      sender_id: user.id,
      content: body,
      created_at: new Date().toISOString(),
      is_deleted: false,
      likes_count: 0,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      if (editing) {
        // Clear temp optimistic message since we are editing an existing one
        setMessages(prev => prev.filter(m => m.id !== tempId));
        
        const { error } = await supabase.from('study_group_messages' as any)
          .update({ content: body, edited_at: new Date().toISOString() }).eq('id', editing.id);
        if (error) throw error;
        
        // Update optimistically
        setMessages(prev => prev.map(m => m.id === editing.id ? { ...m, content: body, edited_at: new Date().toISOString() } : m));
        setEditing(null); setText('');
        return;
      }
      let media: any = {};
      if (file) {
        const up = await uploadMedia(file, duration);
        if (!up) {
          setMessages(prev => prev.filter(m => m.id !== tempId));
          return;
        }
        media = up;
      }
      const { data, error } = await supabase.from('study_group_messages' as any).insert({
        group_id: id, sender_id: user.id, content: body,
        reply_to_id: replyTo?.id ?? null, ...media,
      }).select().single();
      
      if (error) throw error;
      
      // Replace optimistic message with real one
      if (data) {
        setMessages(prev => prev.map(m => m.id === tempId ? (data as unknown as GroupMessage) : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
      setText(''); setReplyTo(null);
    } catch (e: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast({ title: tx('g.sendFailed'), description: e.message, variant: 'destructive' });
    } finally { setSending(false); }
  };

  const handleReaction = async (m: GroupMessage, type: ReactionType) => {
    if (!user) return;
    const currentReaction = (myLikes as any)[m.id];
    const isRemoving = currentReaction === type;

    setMyLikes((prev: any) => {
      const next = { ...prev };
      if (isRemoving) delete next[m.id];
      else next[m.id] = type;
      return next;
    });

    setMessages((prev) => prev.map((x) => x.id === m.id
      ? { ...x, likes_count: Math.max(0, x.likes_count + (isRemoving ? -1 : currentReaction ? 0 : 1)) } : x));

    if (isRemoving) {
      await supabase.from('study_group_reactions' as any).delete().eq('message_id', m.id).eq('user_id', user.id);
    } else {
      await supabase.from('study_group_reactions' as any).upsert({ 
        message_id: m.id, 
        user_id: user.id,
        reaction_type: type
      }, { onConflict: 'message_id,user_id' });
    }
  };

  const toggleLike = async (m: GroupMessage) => {
    handleReaction(m, 'like');
  };

  const removeMessage = async (m: GroupMessage) => {
    if (!confirm(tx('g.confirmDelete'))) return;
    await supabase.from('study_group_messages' as any)
      .update({ is_deleted: true, content: '', media_path: null }).eq('id', m.id);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const secs = recSecs;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await send(file, secs);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true); setRecSecs(0);
      timerRef.current = window.setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch {
      toast({ title: tx('g.micDenied'), variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <MobileLayout role={role}>
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      </MobileLayout>
    );
  }

  if (!group) {
    return (
      <MobileLayout role={role}>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">{tx('g.notMember')}</div>
      </MobileLayout>
    );
  }

  const staff = members.filter((m) => m.role !== 'student' || m.is_ta);
  const studentsList = members.filter((m) => m.role === 'student' && !m.is_ta);

  return (
    <MobileLayout role={role}>
      <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-3xl flex-col px-3 py-3 md:h-[calc(100vh-8rem)] md:px-4">
        {/* Header */}
        <Card className="mb-3 flex shrink-0 items-center gap-3 rounded-2xl border-border/50 p-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(`/${role}/groups`)}>
            <Back className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{pickName(group) || group.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {pickName(group.departments)} • {tx('g.yearLabel', { n: group.level })}
            </p>
          </div>
          <button onClick={() => setMembersOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/70">
            <Users className="h-3.5 w-3.5" /> {members.length}
          </button>
        </Card>

        {/* Messages */}
        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto rounded-2xl px-1 pb-2">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">{tx('g.noMessages')}</div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const author = memberMap[m.sender_id];
            const parent = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
            const long = m.content.length > LONG_TEXT;
            const open = expanded.has(m.id);
            const seenCount = (reads[m.id] || []).length;
            const myReaction = (myLikes as any)[m.id];
            
            const getReactionIcon = (type?: string) => {
              switch(type) {
                case 'like': return <ThumbsUp className="h-3.5 w-3.5 fill-current" />;
                case 'love': return <Heart className="h-3.5 w-3.5 fill-current" />;
                case 'haha': return <Smile className="h-3.5 w-3.5 fill-current" />;
                case 'dislike': return <ThumbsDown className="h-3.5 w-3.5 fill-current" />;
                case 'sad': return <Frown className="h-3.5 w-3.5 fill-current" />;
                case 'angry': return <Angry className="h-3.5 w-3.5 fill-current" />;
                default: return <Heart className="h-3.5 w-3.5" />;
              }
            };

            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                <MemberAvatar member={author} id={m.sender_id} />
                <div className={`min-w-0 max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`flex items-center gap-2 px-1 text-[11px] text-muted-foreground ${mine ? 'flex-row-reverse' : ''}`}>
                    <span className="font-medium text-foreground/80">{mine ? tx('g.you') : author?.full_name || tx('m.s.user')}</span>
                    <span>{new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                    {m.edited_at && !m.is_deleted && <span>· {tx('g.edited')}</span>}
                  </div>

                  <div className={`rounded-2xl border px-3 py-2 text-sm shadow-sm ${
                    mine ? 'border-primary/30 bg-primary/10' : 'border-border/50 bg-card'
                  }`}>
                    {m.is_deleted ? (
                      <p className="italic text-muted-foreground">{tx('g.deletedMsg')}</p>
                    ) : (
                      <div className="space-y-2">
                        {parent && (
                          <div className="rounded-xl border-s-2 border-primary/50 bg-muted/50 px-2 py-1">
                            <p className="text-[11px] font-semibold text-primary">
                              {memberMap[parent.sender_id]?.full_name || tx('m.s.user')}
                            </p>
                            <p className="line-clamp-2 text-[11px] text-muted-foreground">
                              {parent.content || parent.media_name || tx('g.voice')}
                            </p>
                          </div>
                        )}
                        {m.media_path && <MessageMedia msg={m} />}
                        {m.content && (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {long && !open ? `${m.content.slice(0, LONG_TEXT)}…` : m.content}
                          </p>
                        )}
                        {long && (
                          <button onClick={() => setExpanded((p) => {
                            const s = new Set(p); s.has(m.id) ? s.delete(m.id) : s.add(m.id); return s;
                          })} className="text-[11px] font-semibold text-primary">
                            {open ? tx('g.showLess') : tx('g.showMore')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {!m.is_deleted && (
                    <div className={`flex items-center gap-1 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
                      <div className="relative">
                        <button 
                          onClick={() => toggleLike(m)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setActiveReactionPicker(m.id);
                          }}
                          onMouseDown={(e) => {
                            // For mobile long press simulation
                            const timer = setTimeout(() => setActiveReactionPicker(m.id), 500);
                            const cancel = () => { clearTimeout(timer); document.removeEventListener('mouseup', cancel); };
                            document.addEventListener('mouseup', cancel);
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] transition-colors ${
                            myReaction ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
                          }`}>
                          {getReactionIcon(myReaction)}
                          {m.likes_count > 0 && m.likes_count}
                        </button>
                        
                        <ReactionPicker 
                          isOpen={activeReactionPicker === m.id}
                          onClose={() => setActiveReactionPicker(null)}
                          onSelect={(type) => handleReaction(m, type)}
                        />
                      </div>
                      <button onClick={() => { setReplyTo(m); setEditing(null); }}
                        className="rounded-lg px-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground">
                        <CornerUpLeft className="h-3.5 w-3.5" />
                      </button>
                      {mine && (
                        <>
                          {!m.media_path && (
                            <button onClick={() => { setEditing(m); setReplyTo(null); setText(m.content); }}
                              className="rounded-lg px-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => removeMessage(m)}
                            className="rounded-lg px-1.5 py-0.5 text-muted-foreground transition-colors hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setSeenFor(m)}
                            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">
                            <Eye className="h-3.5 w-3.5" /> {seenCount}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <Card className="mt-2 shrink-0 space-y-2 rounded-2xl border-border/50 p-2.5">
          <AnimatePresence>
            {(replyTo || editing) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-xl border-s-2 border-primary bg-muted/50 px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-primary">
                    {editing ? tx('g.editMsg')
                      : tx('g.replyingTo', { name: memberMap[replyTo!.sender_id]?.full_name || tx('m.s.user') })}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {(editing || replyTo)?.content || (editing || replyTo)?.media_name}
                  </p>
                </div>
                <button onClick={() => { setReplyTo(null); setEditing(null); setText(''); }}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {recording ? (
            <div className="flex items-center gap-3 px-1 py-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
              <span className="flex-1 text-sm font-medium">
                {tx('g.recording')} {String(Math.floor(recSecs / 60)).padStart(2, '0')}:{String(recSecs % 60).padStart(2, '0')}
              </span>
              <Button size="sm" variant="destructive" className="gap-1 rounded-xl" onClick={stopRecording}>
                <Square className="h-3.5 w-3.5" /> {tx('g.stop')}
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-1.5">
              <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={tx('g.photo')}>
                <ImageIcon className="h-[18px] w-[18px]" />
                <input type="file" accept="image/*,video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) send(f); }} />
              </label>
              <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={tx('g.attach')}>
                <Paperclip className="h-[18px] w-[18px]" />
                <input type="file" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) send(f); }} />
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={tx('g.placeholder')}
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none rounded-xl py-2.5"
              />
              {text.trim() ? (
                <Button size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={sending} onClick={() => send()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className={`h-4 w-4 ${isRTL ? 'scale-x-[-1]' : ''}`} />}
                </Button>
              ) : (
                <Button size="icon" variant="secondary" className="h-10 w-10 shrink-0 rounded-xl"
                  title={tx('g.record')} onClick={startRecording}>
                  <Mic className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Members sheet */}
      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent side={isRTL ? 'right' : 'left'} className="w-[320px] overflow-y-auto">
          <SheetHeader className="text-start">
            <SheetTitle>{tx('g.membersN', { n: members.length })}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {[
              { label: tx('g.staff'), list: staff },
              { label: tx('g.students'), list: studentsList },
            ].filter((s) => s.list.length > 0).map((sec) => (
              <div key={sec.label} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{sec.label}</p>
                {sec.list.map((mem) => (
                  <div key={mem.user_id} className="flex items-center gap-2.5 rounded-xl border border-border/40 p-2">
                    <MemberAvatar member={mem} id={mem.user_id} size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm">{mem.full_name}</span>
                    <Badge variant="secondary" className="shrink-0 rounded-lg text-[10px]">
                      {mem.is_ta ? tx('g.ta') : mem.role === 'doctor' ? tx('g.doctor') : tx('g.student')}
                    </Badge>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Seen-by sheet */}
      <Sheet open={!!seenFor} onOpenChange={(o) => !o && setSeenFor(null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="text-start">
            <SheetTitle>{tx('g.seenList')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {(reads[seenFor?.id || ''] || []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{tx('g.noSeen')}</p>
            ) : (reads[seenFor!.id] || []).map((uid) => (
              <div key={uid} className="flex items-center gap-2.5 rounded-xl border border-border/40 p-2">
                <MemberAvatar member={memberMap[uid]} id={uid} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm">{memberMap[uid]?.full_name || tx('m.s.user')}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}
