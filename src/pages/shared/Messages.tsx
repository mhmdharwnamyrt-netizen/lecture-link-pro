import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import StorageImage from '@/components/StorageImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  ArrowLeft,
  MessageCircle,
  Search,
  Paperclip,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Reply,
  Check,
  CheckCheck,
  Smile,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessagesPage({ role }: { role: 'doctor' | 'student' }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [reactingMsgId, setReactingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (profile) loadConversations();
  }, [profile]);

  // Auto-open a chat when arriving with ?to=<profileId>
  useEffect(() => {
    const to = searchParams.get('to');
    if (!to || !profile || activeChat?.id === to) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, student_id, user_id, avatar_url')
        .eq('id', to)
        .maybeSingle();
      if (data) setActiveChat(data);
      // Clear the param so back-nav doesn't re-trigger
      const next = new URLSearchParams(searchParams);
      next.delete('to');
      setSearchParams(next, { replace: true });
    })();
  }, [profile, searchParams, activeChat, setSearchParams]);

  useEffect(() => {
    if (!activeChat || !profile) return;
    loadMessages();
    // Mark all incoming as read
    supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', profile.id)
      .eq('sender_id', activeChat.id)
      .then();

    const channel = supabase
      .channel(`chat-${activeChat.id}-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const msg: any = payload.new ?? payload.old;
        if (!msg) return;
        const isPair =
          (msg.sender_id === activeChat.id && msg.receiver_id === profile.id) ||
          (msg.sender_id === profile.id && msg.receiver_id === activeChat.id);
        if (!isPair) return;
        if (payload.eventType === 'INSERT') {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender_id === activeChat.id) {
            supabase.from('messages').update({ read: true }).eq('id', msg.id).then();
          }
        } else if (payload.eventType === 'UPDATE') {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
        } else if (payload.eventType === 'DELETE') {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_indicators' }, (payload) => {
        const row: any = payload.new;
        if (!row) return;
        if (row.user_id === activeChat.id && row.peer_id === profile.id) {
          const age = Date.now() - new Date(row.updated_at).getTime();
          setPeerTyping(age < 4000);
          setTimeout(() => setPeerTyping(false), 4000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setPeerTyping(false);
    };
  }, [activeChat, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, user_id, full_name, role, student_id), receiver:profiles!messages_receiver_id_fkey(id, user_id, full_name, role, student_id)')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (data) {
      const convMap = new Map<string, any>();
      data.forEach((msg: any) => {
        const other = msg.sender_id === profile.id ? msg.receiver : msg.sender;
        if (!other) return;
        if (!convMap.has(other.id)) {
          convMap.set(other.id, {
            ...other,
            lastMessage: msg.attachment_url ? '📎' : msg.content,
            lastTime: msg.created_at,
            unread: msg.receiver_id === profile.id && !msg.read ? 1 : 0,
          });
        } else if (msg.receiver_id === profile.id && !msg.read) {
          convMap.get(other.id).unread += 1;
        }
      });
      setConversations(Array.from(convMap.values()));
    }
  };

  const loadMessages = async () => {
    if (!profile || !activeChat) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const emitTyping = () => {
    if (!profile || !activeChat || !user) return;
    supabase
      .from('typing_indicators')
      .upsert(
        { user_id: profile.id, peer_id: activeChat.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,peer_id' }
      )
      .then();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      supabase
        .from('typing_indicators')
        .delete()
        .eq('user_id', profile.id)
        .eq('peer_id', activeChat.id)
        .then();
    }, 3500);
  };

  const uploadAttachment = async (file: File): Promise<{ url: string; type: string } | null> => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('message-attachments').upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      return { url: path, type: file.type.startsWith('image/') ? 'image' : 'file' };
    } catch (e: any) {
      toast({ title: language === 'ar' ? 'فشل الرفع' : 'Upload failed', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !profile || !activeChat || sending) return;
    setSending(true);

    if (editing) {
      const { error } = await supabase
        .from('messages')
        .update({ content: newMessage.trim() })
        .eq('id', editing.id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      setEditing(null);
      setNewMessage('');
      setSending(false);
      return;
    }

    let attachmentData: { url: string; type: string } | null = null;
    if (attachment) {
      attachmentData = await uploadAttachment(attachment);
      if (!attachmentData) {
        setSending(false);
        return;
      }
    }

    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: activeChat.id,
      content: newMessage.trim() || (attachmentData?.type === 'image' ? '📷' : '📎'),
      reply_to_id: replyTo?.id || null,
      attachment_url: attachmentData?.url || null,
      attachment_type: attachmentData?.type || null,
    });
    if (!error) {
      setNewMessage('');
      setAttachment(null);
      setReplyTo(null);
      await supabase.from('notifications').insert({
        user_id: activeChat.user_id,
        title: language === 'ar' ? 'رسالة جديدة' : 'New Message',
        message: language === 'ar'
          ? `رسالة من ${profile.full_name}: ${(newMessage.trim() || (attachmentData ? '📎' : '')).substring(0, 50)}`
          : `Message from ${profile.full_name}: ${(newMessage.trim() || (attachmentData ? '📎' : '')).substring(0, 50)}`,
        type: 'info',
      });
    } else {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').update({ content: language === 'ar' ? '🚫 تم الحذف' : '🚫 Message deleted', deleted_at: new Date().toISOString(), attachment_url: null }).eq('id', id);
  };

  const reactMessage = async (id: string, emoji: string) => {
    const target = messages.find((m) => m.id === id);
    const next = target?.reaction === emoji ? null : emoji;
    await supabase.from('messages').update({ reaction: next }).eq('id', id);
    setReactingMsgId(null);
  };

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, student_id, user_id')
      .neq('id', profile?.id || '')
      .or(`full_name.ilike.%${q}%,student_id.ilike.%${q}%`)
      .limit(15);
    if (data) setSearchResults(data);
  };

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  if (activeChat) {
    return (
      <MobileLayout role={role}>
        <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen">
          {/* Chat Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card">
            <Button variant="ghost" size="icon" onClick={() => { setActiveChat(null); loadConversations(); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {activeChat.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{activeChat.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {peerTyping
                  ? (language === 'ar' ? 'يكتب...' : 'typing…')
                  : (activeChat.role === 'doctor' ? (language === 'ar' ? 'دكتور' : 'Doctor') : activeChat.student_id || '')}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <AnimatePresence>
              {messages.map((msg) => {
                const mine = msg.sender_id === profile?.id;
                const replied = msg.reply_to_id ? messages.find((m) => m.id === msg.reply_to_id) : null;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className="relative max-w-[75%]">
                      <div
                        className={`rounded-2xl px-3 py-2 ${
                          mine
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        {replied && (
                          <div className={`text-[11px] mb-1 px-2 py-1 rounded-lg border-l-2 ${mine ? 'bg-primary-foreground/10 border-primary-foreground/40' : 'bg-background/60 border-primary/40'}`}>
                            <p className="opacity-70 line-clamp-2">{replied.content}</p>
                          </div>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'image' && !msg.deleted_at && (
                          <StorageImage
                            bucket="message-attachments"
                            path={msg.attachment_url}
                            className="rounded-lg mb-1 max-h-64 object-cover"
                          />
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] ${mine ? 'text-primary-foreground/60 justify-end' : 'text-muted-foreground'}`}>
                          {msg.edited_at && !msg.deleted_at && (
                            <span>{language === 'ar' ? 'معدلة' : 'edited'}</span>
                          )}
                          <span>{new Date(msg.created_at).toLocaleTimeString(locale, { timeStyle: 'short' })}</span>
                          {mine && !msg.deleted_at && (
                            msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                          )}
                        </div>
                      </div>

                      {msg.reaction && (
                        <div className={`absolute -bottom-2 ${mine ? 'right-2' : 'left-2'} bg-card rounded-full px-1.5 py-0.5 text-xs shadow border border-border`}>
                          {msg.reaction}
                        </div>
                      )}

                      {!msg.deleted_at && (
                        <div className={`absolute top-0 ${mine ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={mine ? 'end' : 'start'}>
                              <DropdownMenuItem onClick={() => setReplyTo(msg)}>
                                <Reply className="h-4 w-4 mr-2" /> {language === 'ar' ? 'رد' : 'Reply'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setReactingMsgId(msg.id)}>
                                <Smile className="h-4 w-4 mr-2" /> {language === 'ar' ? 'تفاعل' : 'React'}
                              </DropdownMenuItem>
                              {mine && (
                                <>
                                  <DropdownMenuItem onClick={() => { setEditing(msg); setNewMessage(msg.content); }}>
                                    <Pencil className="h-4 w-4 mr-2" /> {language === 'ar' ? 'تعديل' : 'Edit'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => deleteMessage(msg.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> {language === 'ar' ? 'حذف' : 'Delete'}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {reactingMsgId === msg.id && (
                        <div className={`absolute -top-10 ${mine ? 'right-0' : 'left-0'} bg-card rounded-full shadow-lg border border-border px-2 py-1 flex gap-1 z-10`}>
                          {REACTIONS.map((e) => (
                            <button key={e} className="text-lg hover:scale-125 transition-transform" onClick={() => reactMessage(msg.id, e)}>
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Reply / edit banner */}
          {(replyTo || editing) && (
            <div className="border-t border-border bg-muted/50 px-4 py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-primary font-semibold">
                  {editing ? (language === 'ar' ? 'تعديل الرسالة' : 'Editing message') : (language === 'ar' ? 'الرد على' : 'Replying to')}
                </p>
                <p className="text-xs text-muted-foreground truncate">{(editing || replyTo)?.content}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { setReplyTo(null); setEditing(null); setNewMessage(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Attachment preview */}
          {attachment && (
            <div className="border-t border-border bg-muted/50 px-4 py-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              <p className="text-xs flex-1 truncate">{attachment.name}</p>
              <Button size="icon" variant="ghost" onClick={() => setAttachment(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border px-4 py-3 bg-card flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            />
            <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={!!editing}>
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => { setNewMessage(e.target.value); emitTyping(); }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder={editing ? (language === 'ar' ? 'تعديل...' : 'Edit message...') : (language === 'ar' ? 'اكتب رسالة...' : 'Type a message...')}
              className="rounded-full"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={sending || uploading || (!newMessage.trim() && !attachment)}
              className="rounded-full shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-6 md:px-8">
        <h1 className="mb-4 text-2xl font-bold">{language === 'ar' ? 'الرسائل' : 'Messages'}</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => searchUsers(e.target.value)}
            placeholder={language === 'ar' ? 'بحث عن مستخدم...' : 'Search users...'}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 space-y-1">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => { setActiveChat(u); setSearchQuery(''); setSearchResults([]); }}
                className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-muted transition-colors text-start"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {u.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.student_id || u.role}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Conversations */}
        {conversations.length === 0 && !searchQuery ? (
          <div className="rounded-2xl bg-card p-8 text-center shadow-card">
            <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
            <p className="text-xs text-muted-foreground mt-1">{language === 'ar' ? 'ابحث عن مستخدم لبدء محادثة' : 'Search for a user to start chatting'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <motion.button
                key={conv.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveChat(conv)}
                className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-muted transition-colors text-start"
              >
                <div className="relative h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {conv.full_name.charAt(0)}
                  {conv.unread > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] font-bold">
                      {conv.unread}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{conv.full_name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(conv.lastTime).toLocaleTimeString(locale, { timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${conv.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{conv.lastMessage}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
