import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import BrandLoader from '@/components/BrandLoader';
import {
  Bell, CheckCircle2, AlertTriangle, Info, Heart, MessageCircle, Pin,
  Users, Settings2, CheckCheck, Trash2, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { localizeServerText } from '@/lib/localizeText';

type Notification = {
  id: string; title: string; message: string; type: string;
  read: boolean; created_at: string; related_id: string | null;
};

type Prefs = {
  likes: boolean; comments: boolean; replies: boolean;
  pins: boolean; mentions: boolean; community: boolean; system: boolean;
};

const DEFAULT_PREFS: Prefs = {
  likes: true, comments: true, replies: true,
  pins: true, mentions: true, community: true, system: true,
};

const typeGroups = [
  { k: 'all', ar: 'الكل', en: 'All' },
  { k: 'community', ar: 'الملتقى', en: 'Community' },
  { k: 'system', ar: 'النظام', en: 'System' },
  { k: 'warning', ar: 'تنبيهات', en: 'Alerts' },
  { k: 'success', ar: 'نجاح', en: 'Success' },
] as const;

export default function NotificationsPage({ role }: { role: 'doctor' | 'student' }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (a: string, e: string) => (language === 'ar' ? a : e);
  const locale = language === 'ar' ? ar : enUS;
  const isAr = language === 'ar';
  const L = (s: string) => localizeServerText(s, isAr);

  const [items, setItems] = useState<Notification[]>([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user]);

  const load = async () => {
    if (!user) return;
    setBusy(true);
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(200);
    setItems((data as any) || []);
    setBusy(false);
  };

  const loadPrefs = async () => {
    if (!user) return;
    const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setPrefs({ ...DEFAULT_PREFS, ...data });
  };

  useEffect(() => { if (user) { load(); loadPrefs(); } /* eslint-disable-next-line */ }, [user?.id]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('user-notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    setItems((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };
  const markAllRead = async () => {
    if (!user) return;
    setItems((p) => p.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    toast.success(t('تم تعليم الكل كمقروء', 'All marked as read'));
  };
  const removeOne = async (id: string) => {
    setItems((p) => p.filter((n) => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };
  const clearRead = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id).eq('read', true);
    load();
  };

  const savePrefs = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    const { error } = await supabase.from('notification_preferences')
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
    else toast.success(t('تم الحفظ', 'Saved'));
  };

  const getIcon = (n: Notification) => {
    if (n.type === 'community') {
      const ttl = n.title.toLowerCase();
      if (n.title.includes('إعجاب') || ttl.includes('like')) return <Heart className="h-5 w-5 text-rose-500" />;
      if (n.title.includes('تعليق') || ttl.includes('comment')) return <MessageCircle className="h-5 w-5 text-primary" />;
      if (n.title.includes('رد') || ttl.includes('reply')) return <MessageCircle className="h-5 w-5 text-primary" />;
      if (n.title.includes('تثبيت') || ttl.includes('pin')) return <Pin className="h-5 w-5 text-primary" />;
      return <Users className="h-5 w-5 text-primary" />;
    }
    switch (n.type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'warning') return items.filter((n) => n.type === 'warning' || n.type === 'critical');
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const unread = items.filter((i) => !i.read).length;

  const prefLabels: { key: keyof Prefs; ar: string; en: string }[] = [
    { key: 'likes', ar: 'الإعجابات', en: 'Likes' },
    { key: 'comments', ar: 'التعليقات على منشوراتي', en: 'Comments on my posts' },
    { key: 'replies', ar: 'الردود على تعليقاتي', en: 'Replies to my comments' },
    { key: 'pins', ar: 'تثبيت منشوراتي', en: 'Post pinned' },
    { key: 'mentions', ar: 'الإشارات (@)', en: 'Mentions' },
    { key: 'community', ar: 'إشعارات الملتقى العامة', en: 'General community' },
    { key: 'system', ar: 'إشعارات النظام', en: 'System notifications' },
  ];

  return (
    <MobileLayout role={role}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className="mx-auto max-w-2xl px-4 pt-4 pb-24 md:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              {t('مركز الإشعارات', 'Notification Center')}
              {unread > 0 && <span className="rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">{unread}</span>}
            </h1>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" title={t('الإعدادات', 'Preferences')} onClick={() => setPrefsOpen(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title={t('تعليم الكل كمقروء', 'Mark all read')} onClick={markAllRead} disabled={unread === 0}>
              <CheckCheck className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {typeGroups.map((g) => {
            const count = g.k === 'all' ? items.length
              : g.k === 'warning' ? items.filter((n) => n.type === 'warning' || n.type === 'critical').length
              : items.filter((n) => n.type === g.k).length;
            return (
              <button
                key={g.k}
                onClick={() => setFilter(g.k)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${filter === g.k ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
              >
                {t(g.ar, g.en)} {count > 0 && <span className="ms-1 text-[11px] opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {busy ? (
          <BrandLoader inline />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center shadow-card">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{t('لا توجد إشعارات', 'No notifications')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`group rounded-2xl p-4 shadow-card transition-colors ${n.read ? 'bg-card' : 'bg-primary/5 border border-primary/20'}`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(n)}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !n.read && markAsRead(n.id)}>
                      <p className="font-medium">{L(n.title)}</p>
                      <p className="text-sm text-muted-foreground break-words">{L(n.message)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!n.read && <div className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                      <button onClick={() => removeOne(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" onClick={clearRead}>{t('حذف المقروءة', 'Clear read')}</Button>
            </div>
          </>
        )}
      </div>

      {/* Preferences dialog */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('تفضيلات الإشعارات', 'Notification Preferences')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {prefLabels.map((p) => (
              <div key={p.key} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{t(p.ar, p.en)}</span>
                <Switch
                  checked={prefs[p.key]}
                  onCheckedChange={(v) => savePrefs({ ...prefs, [p.key]: v })}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
