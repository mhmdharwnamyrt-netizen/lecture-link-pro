import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Shield, Flag, CheckCircle2, XCircle, Trash2, Loader2, MessageCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

type Report = {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  resolution_note: string | null;
  created_at: string;
  target_content?: string;
  target_author?: string;
  reporter_name?: string;
};

export default function AdminModeration() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (a: string, e: string) => (language === 'ar' ? a : e);
  const locale = language === 'ar' ? ar : enUS;

  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [busy, setBusy] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate('/login');
    if (!loading && user && !isAdmin) navigate('/');
  }, [loading, user, isAdmin, navigate]);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from('community_reports')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) { toast.error(error.message); setBusy(false); return; }

    const postIds = [...new Set((data || []).map((r: any) => r.post_id).filter(Boolean))];
    const commentIds = [...new Set((data || []).map((r: any) => r.comment_id).filter(Boolean))];
    const reporterIds = [...new Set((data || []).map((r: any) => r.reporter_id))];

    const [{ data: posts }, { data: cmts }, { data: profs }] = await Promise.all([
      postIds.length ? supabase.from('community_posts').select('id,content,author_id').in('id', postIds) : Promise.resolve({ data: [] as any[] }),
      commentIds.length ? supabase.from('community_comments').select('id,content,author_id,post_id').in('id', commentIds) : Promise.resolve({ data: [] as any[] }),
      supabase.from('profiles').select('user_id,full_name').in('user_id', reporterIds),
    ] as any);
    const authorIds = [
      ...(posts || []).map((p: any) => p.author_id),
      ...(cmts || []).map((c: any) => c.author_id),
    ];
    const { data: authors } = authorIds.length
      ? await supabase.from('profiles').select('user_id,full_name').in('user_id', authorIds)
      : { data: [] as any[] };

    const pMap = new Map((posts || []).map((p: any) => [p.id, p]));
    const cMap = new Map((cmts || []).map((c: any) => [c.id, c]));
    const profMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
    const authMap = new Map((authors || []).map((a: any) => [a.user_id, a.full_name]));

    setReports((data || []).map((r: any) => {
      const post = r.post_id ? pMap.get(r.post_id) as any : null;
      const cmt = r.comment_id ? cMap.get(r.comment_id) as any : null;
      const targetAuthorId = post?.author_id || cmt?.author_id;
      return {
        ...r,
        target_content: post?.content || cmt?.content || t('(محتوى محذوف)', '(content removed)'),
        target_author: targetAuthorId ? authMap.get(targetAuthorId) : '—',
        reporter_name: profMap.get(r.reporter_id) || '—',
      };
    }));
    setBusy(false);
  };

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [status, isAdmin]);

  // realtime
  useEffect(() => {
    const ch = supabase.channel('mod-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_reports' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [status]);

  const decide = async (r: Report, next: 'resolved' | 'dismissed') => {
    const { error } = await supabase.from('community_reports')
      .update({
        status: next,
        resolution_note: notes[r.id] || null,
        resolved_by: user!.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success(t('تم التحديث', 'Updated'));
    load();
  };

  const removeContent = async (r: Report) => {
    if (!confirm(t('حذف المحتوى المُبلَّغ عنه؟', 'Delete reported content?'))) return;
    if (r.post_id) await supabase.from('community_posts').delete().eq('id', r.post_id);
    else if (r.comment_id) await supabase.from('community_comments').delete().eq('id', r.comment_id);
    await decide(r, 'resolved');
  };

  const counts = { pending: 0, resolved: 0, dismissed: 0 };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">{t('مركز الإشراف — بلاغات الملتقى', 'Moderation — Community Reports')}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-4 flex gap-2">
          {(['pending', 'resolved', 'dismissed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${status === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
            >
              {t(
                s === 'pending' ? 'قيد المراجعة' : s === 'resolved' ? 'تم الحل' : 'مرفوضة',
                s.charAt(0).toUpperCase() + s.slice(1)
              )}
            </button>
          ))}
        </div>

        {busy ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center text-muted-foreground shadow-sm">
            <Flag className="mx-auto mb-2 h-10 w-10 opacity-40" />
            {t('لا توجد بلاغات', 'No reports')}
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <article key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {r.post_id ? <FileText className="h-4 w-4 text-primary" /> : <MessageCircle className="h-4 w-4 text-primary" />}
                    <Badge variant="destructive">{r.reason}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale })}
                    </span>
                  </div>
                  <Badge variant="outline">{r.status}</Badge>
                </header>

                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <div className="mb-1 text-xs text-muted-foreground">
                    {t('صاحب المحتوى:', 'Content by:')} <span className="font-medium">{r.target_author}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{r.target_content}</p>
                </div>

                {r.details && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">{t('تفاصيل المُبلِّغ:', 'Reporter note:')}</span> {r.details}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  {t('بلاغ من:', 'Reported by:')} {r.reporter_name}
                </div>

                {r.status === 'pending' && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder={t('ملاحظة القرار (اختياري)', 'Resolution note (optional)')}
                      value={notes[r.id] || ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      className="min-h-[60px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => decide(r, 'resolved')}>
                        <CheckCircle2 className="h-4 w-4 me-1" /> {t('قبول ومعالجة', 'Resolve')}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => decide(r, 'dismissed')}>
                        <XCircle className="h-4 w-4 me-1" /> {t('رفض البلاغ', 'Dismiss')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeContent(r)}>
                        <Trash2 className="h-4 w-4 me-1" /> {t('حذف المحتوى', 'Delete content')}
                      </Button>
                    </div>
                  </div>
                )}
                {r.resolution_note && (
                  <div className="mt-2 rounded bg-muted/40 p-2 text-xs">
                    <span className="font-medium">{t('ملاحظة الإشراف:', 'Mod note:')}</span> {r.resolution_note}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
