import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Plus, Shield, Trash2, Check, Clock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Invite {
  id: string;
  token: string;
  label: string | null;
  created_by: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export default function AdminInvites() {
  const { user, isAdmin, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const t = (a: string, e: string) => (isRTL ? a : e);
  const locale = isRTL ? ar : enUS;

  const [invites, setInvites] = useState<Invite[]>([]);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [loading, isAdmin]);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from('admin_invites')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setInvites((data as Invite[]) || []);
    setBusy(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const create = async () => {
    if (!user) return;
    setCreating(true);
    const { error } = await supabase
      .from('admin_invites')
      .insert({ label: label.trim() || null, created_by: user.id });
    setCreating(false);
    if (error) return toast.error(error.message);
    setLabel('');
    toast.success(t('تم إنشاء رابط الدعوة', 'Invite created'));
    load();
  };

  const inviteUrl = (token: string) =>
    `${window.location.origin}/invite/admin/${token}`;

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(inviteUrl(token));
    toast.success(t('تم نسخ الرابط', 'Link copied'));
  };

  const revoke = async (id: string) => {
    if (!confirm(t('حذف هذه الدعوة؟', 'Delete this invite?'))) return;
    const { error } = await supabase.from('admin_invites').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(t('تم الحذف', 'Deleted')); load(); }
  };

  const statusChip = (inv: Invite) => {
    if (inv.used_at) return { icon: Check, label: t('مستخدم', 'Used'), cls: 'bg-success/10 text-success' };
    if (new Date(inv.expires_at) < new Date()) return { icon: X, label: t('منتهي', 'Expired'), cls: 'bg-destructive/10 text-destructive' };
    return { icon: Clock, label: t('صالح', 'Active'), cls: 'bg-primary/10 text-primary' };
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button onClick={() => navigate('/admin')} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
          {t('لوحة الإدارة', 'Admin dashboard')}
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('دعوات الإداريين', 'Admin invites')}</h1>
            <p className="text-xs text-muted-foreground">
              {t('يمكن للإداري فقط إنشاء الروابط ومنح صلاحيات الإدارة عبرها.', 'Only admins can create links that grant admin access.')}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border bg-card p-4">
          <div className="mb-2 text-sm font-semibold">{t('إنشاء رابط دعوة جديد', 'Create a new invite link')}</div>
          <div className="flex gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('اسم اختياري (مثلاً: أحمد)', 'Optional label (e.g. Ahmed)')}
              className="h-11 rounded-xl"
            />
            <Button onClick={create} disabled={creating} className="h-11 rounded-xl">
              <Plus className="h-4 w-4 me-1.5" />
              {t('إنشاء', 'Create')}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('الرابط صالح لمدة 14 يومًا ولاستخدام مرة واحدة.', 'The link is valid for 14 days and single-use.')}
          </p>
        </div>

        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t('كل الدعوات', 'All invites')}</h2>
        {busy && invites.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('يتم التحميل…', 'Loading…')}</div>
        ) : invites.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            {t('لا توجد دعوات بعد.', 'No invites yet.')}
          </div>
        ) : (
          <ul className="space-y-2">
            {invites.map((inv) => {
              const s = statusChip(inv);
              const S = s.icon;
              return (
                <li key={inv.id} className="rounded-2xl border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{inv.label || t('بدون اسم', 'Untitled')}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
                          <S className="h-3 w-3" /> {s.label}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {inviteUrl(inv.token)}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {t('أُنشئ', 'Created')} {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale })}
                        {' · '}
                        {t('ينتهي', 'Expires')} {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true, locale })}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => copy(inv.token)} disabled={!!inv.used_at}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => revoke(inv.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
