import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessagesPage({ role }: { role: 'doctor' | 'student' }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user]);

  useEffect(() => {
    if (profile) loadConversations();
  }, [profile]);

  useEffect(() => {
    if (activeChat && profile) {
      loadMessages();
      // Mark as read
      supabase.from('messages').update({ read: true })
        .eq('receiver_id', profile.id)
        .eq('sender_id', activeChat.id)
        .then();

      // Subscribe to realtime
      const channel = supabase
        .channel(`chat-${activeChat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new as any;
          if ((msg.sender_id === activeChat.id && msg.receiver_id === profile.id) ||
              (msg.sender_id === profile.id && msg.receiver_id === activeChat.id)) {
            setMessages(prev => [...prev, msg]);
            if (msg.sender_id === activeChat.id) {
              supabase.from('messages').update({ read: true }).eq('id', msg.id).then();
            }
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeChat, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, role, student_id), receiver:profiles!messages_receiver_id_fkey(id, full_name, role, student_id)')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (data) {
      const convMap = new Map<string, any>();
      data.forEach((msg: any) => {
        const other = msg.sender_id === profile.id ? msg.receiver : msg.sender;
        if (!convMap.has(other.id)) {
          convMap.set(other.id, {
            ...other,
            lastMessage: msg.content,
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile || !activeChat || sending) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: activeChat.id,
      content: newMessage.trim(),
    });
    if (!error) {
      setNewMessage('');
      // Send notification
      await supabase.from('notifications').insert({
        user_id: activeChat.user_id || activeChat.id,
        title: language === 'ar' ? 'رسالة جديدة' : 'New Message',
        message: language === 'ar'
          ? `رسالة من ${profile.full_name}: ${newMessage.trim().substring(0, 50)}`
          : `Message from ${profile.full_name}: ${newMessage.trim().substring(0, 50)}`,
        type: 'info',
      });
    }
    setSending(false);
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
            <div className="flex-1">
              <p className="font-semibold">{activeChat.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {activeChat.role === 'doctor' ? (language === 'ar' ? 'دكتور' : 'Doctor') : activeChat.student_id || ''}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    msg.sender_id === profile?.id
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_id === profile?.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString(locale, { timeStyle: 'short' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 py-3 bg-card flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
              className="rounded-full"
            />
            <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()} className="rounded-full shrink-0">
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
            onChange={e => searchUsers(e.target.value)}
            placeholder={language === 'ar' ? 'بحث عن مستخدم...' : 'Search users...'}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-4 space-y-1">
            {searchResults.map(u => (
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
            {conversations.map(conv => (
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
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
