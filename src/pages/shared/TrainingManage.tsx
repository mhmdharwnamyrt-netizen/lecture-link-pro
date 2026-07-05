import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Download, Trash2, Pencil, Users, Lock, Unlock, Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

type Field = { id: string; field_key: string; label: string; label_ar: string | null; field_type: string; };
type App = { id: string; applicant_id: string; answers: Record<string, any>; status: string; created_at: string; };
type Applicant = { user_id: string; full_name: string | null; avatar_url: string | null; role?: string | null };

export default function TrainingManage({ role }: { role: 'doctor' | 'student' }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const t = (a: string, e: string) => (isRTL ? a : e);
  const locale = isRTL ? ar : enUS;

  const [training, setTraining] = useState<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [applicants, setApplicants] = useState<Record<string, Applicant>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: tr } = await supabase.from('trainings').select('*').eq('id', id).maybeSingle();
    setTraining(tr);
    const { data: ff } = await (supabase as any).from('training_form_fields')
      .select('*').eq('training_id', id).order('order_index');
    setFields(ff || []);
    const { data: aa } = await (supabase as any).from('training_applications')
      .select('*').eq('training_id', id).order('created_at', { ascending: false });
    setApps(aa || []);
    if (aa?.length) {
      const ids = [...new Set(aa.map((a: App) => a.applicant_id))];
      const { data: profs } = await supabase.from('profiles')
        .select('user_id, full_name, avatar_url, role').in('user_id', ids as any);
      const map: Record<string, Applicant> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setApplicants(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!training || !user) return;
    if (training.created_by !== user.id) {
      toast.error(t('غير مصرح', 'Not authorized'));
      navigate(`/${role}/trainings/${id}`);
    }
  }, [training, user]);

  const toggleActive = async () => {
    if (!training) return;
    const { error } = await supabase.from('trainings').update({ is_active: !training.is_active }).eq('id', training.id);
    if (error) return toast.error(error.message);
    toast.success(training.is_active ? t('تم إغلاق التقديم', 'Closed') : t('تم فتح التقديم', 'Reopened'));
    load();
  };

  const deleteTraining = async () => {
    if (!confirm(t('حذف التدريب نهائيًا؟', 'Delete training permanently?'))) return;
    const { error } = await supabase.from('trainings').delete().eq('id', id!);
    if (error) return toast.error(error.message);
    toast.success(t('تم الحذف', 'Deleted'));
    navigate(`/${role}/trainings`);
  };

  const exportCSV = () => {
    const headers = ['#', 'Applicant', 'Submitted at', ...fields.map(f => f.label)];
    const rows = apps.map((a, i) => {
      const who = applicants[a.applicant_id]?.full_name || a.applicant_id;
      return [i + 1, who, new Date(a.created_at).toISOString(),
        ...fields.map(f => JSON.stringify(a.answers?.[f.field_key] ?? ''))];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${training?.title || 'training'}-applications.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !training) {
    return <MobileLayout role={role}><div className="p-8 text-center text-sm text-muted-foreground">{t('يتم التحميل…', 'Loading…')}</div></MobileLayout>;
  }

  const cap = training.max_applicants;
  const count = training.applications_count || 0;

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-4 md:px-8 pb-8 max-w-4xl mx-auto">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{training.title}</h1>
              <p className="text-xs text-muted-foreground">{t('لوحة إدارة التدريب', 'Training management')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/${role}/trainings/${training.id}/edit`)} className="rounded-full">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={toggleActive} className="rounded-full">
              {training.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={deleteTraining} className="rounded-full text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/15 to-primary/5 p-4">
            <Users className="h-5 w-5 text-primary mb-1" />
            <p className="text-2xl font-bold">{count}{cap && <span className="text-sm text-muted-foreground">/{cap}</span>}</p>
            <p className="text-[10px] text-muted-foreground">{t('متقدم', 'Applicants')}</p>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-4">
            <Sparkles className="h-5 w-5 text-emerald-500 mb-1" />
            <p className="text-2xl font-bold">{training.is_active ? t('مفتوح', 'Open') : t('مغلق', 'Closed')}</p>
            <p className="text-[10px] text-muted-foreground">{t('الحالة', 'Status')}</p>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-fuchsia-500/15 to-fuchsia-500/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">{t('نوع التقديم', 'Mode')}</p>
            <p className="text-sm font-semibold">{training.application_mode === 'internal' ? t('نموذج داخلي', 'Internal form') : t('رابط خارجي', 'External link')}</p>
          </div>
        </motion.div>

        {cap && (
          <div className="rounded-xl bg-muted/40 p-3 mb-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span>{t('الاستيعاب', 'Capacity')}</span>
              <span className="font-semibold">{count} / {cap}</span>
            </div>
            <Progress value={Math.min(100, (count / cap) * 100)} className="h-1.5" />
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">{t('الردود', 'Responses')} ({apps.length})</h2>
          {apps.length > 0 && training.application_mode === 'internal' && (
            <Button size="sm" variant="outline" onClick={exportCSV} className="rounded-full">
              <Download className="h-4 w-4 me-1" /> CSV
            </Button>
          )}
        </div>

        {apps.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
            {t('لا توجد ردود بعد', 'No responses yet')}
          </div>
        ) : (
          <div className="space-y-2">
            {apps.map((a, i) => {
              const who = applicants[a.applicant_id];
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-2xl border bg-card p-4 shadow-card"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{who?.full_name || t('متقدم', 'Applicant')}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale })}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full text-[10px]">{a.status}</Badge>
                  </div>
                  {training.application_mode === 'internal' && (
                    <div className="mt-2 grid gap-1.5">
                      {fields.map(f => {
                        const v = a.answers?.[f.field_key];
                        if (v === undefined || v === null || v === '') return null;
                        return (
                          <div key={f.id} className="text-xs">
                            <span className="text-muted-foreground">{(isRTL ? f.label_ar : f.label) || f.label}: </span>
                            <span className="font-medium">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
