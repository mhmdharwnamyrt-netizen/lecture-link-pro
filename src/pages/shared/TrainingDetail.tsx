import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, ExternalLink, MapPin, CalendarDays, Building2,
  GraduationCap, Users, CheckCircle2, XCircle, Settings, Lock, Send
} from 'lucide-react';

type Training = any;
type Field = {
  id: string; field_key: string; label: string; label_ar: string | null;
  field_type: 'short_text' | 'long_text' | 'number' | 'email' | 'phone' | 'select' | 'checkbox' | 'file';
  required: boolean; options: any; order_index: number;
};

export default function TrainingDetail({ role }: { role: 'doctor' | 'student' }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const t = (a: string, e: string) => (isRTL ? a : e);

  const [training, setTraining] = useState<Training | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: tr } = await supabase.from('trainings').select('*').eq('id', id).maybeSingle();
      setTraining(tr);
      if (tr && (tr as any).application_mode === 'internal') {
        const { data: ff } = await (supabase as any).from('training_form_fields')
          .select('*').eq('training_id', id).order('order_index');
        setFields(ff || []);
      }
      if (user) {
        const { data: mine } = await (supabase as any).from('training_applications')
          .select('id').eq('training_id', id).eq('applicant_id', user.id).maybeSingle();
        setAlreadyApplied(!!mine);
        setIsOwner((tr as any)?.created_by === user.id);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const handleAnswer = (key: string, val: any) => setAnswers(a => ({ ...a, [key]: val }));

  const validate = () => {
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.field_key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || v === false) {
          toast.error(t(`الحقل "${f.label_ar || f.label}" مطلوب`, `"${f.label}" is required`));
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !training) return;
    if (training.application_mode === 'external') {
      window.open(training.apply_url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('training_applications').insert({
        training_id: training.id,
        applicant_id: user.id,
        answers,
      });
      if (error) throw error;
      toast.success(t('تم إرسال تقديمك بنجاح 🎉', 'Application submitted 🎉'));
      setAlreadyApplied(true);
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error(t('لقد قدّمت على هذا التدريب من قبل', 'You already applied'));
        setAlreadyApplied(true);
      } else if (msg.includes('row-level security') || msg.includes('policy')) {
        toast.error(t('اكتمل عدد المتقدمين أو تم إغلاق التدريب', 'Full capacity or training closed'));
      } else {
        toast.error(t('فشل الإرسال', 'Submit failed'), { description: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <MobileLayout role={role}><div className="p-8 text-center text-sm text-muted-foreground">{t('يتم التحميل…', 'Loading…')}</div></MobileLayout>;
  }
  if (!training) {
    return <MobileLayout role={role}><div className="p-8 text-center">{t('التدريب غير موجود', 'Training not found')}</div></MobileLayout>;
  }

  const cap = training.max_applicants;
  const count = training.applications_count || 0;
  const isFull = cap && count >= cap;
  const closed = !training.is_active || isFull;

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-4 md:px-8 pb-8 max-w-3xl mx-auto">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          {isOwner && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(`/${role}/trainings/${training.id}/manage`)} className="rounded-full">
                <Settings className="h-4 w-4 me-1" />
                {t('إدارة', 'Manage')}
              </Button>
            </div>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border bg-card p-5 shadow-elevated space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={training.type === 'university' ? 'secondary' : 'outline'} className="rounded-full">
              {training.type === 'university'
                ? <><GraduationCap className="h-3 w-3 me-1 inline" />{t('جامعية', 'University')}</>
                : <><Building2 className="h-3 w-3 me-1 inline" />{t('شركة', 'Company')}</>}
            </Badge>
            {closed && <Badge variant="destructive" className="rounded-full"><Lock className="h-3 w-3 me-1" />{t('مغلق', 'Closed')}</Badge>}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{training.title}</h1>
          {(training.company_name || training.location) && (
            <p className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
              {training.company_name && <span>{training.company_name}</span>}
              {training.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {training.location}</span>}
              {training.deadline && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t('آخر موعد:', 'Deadline:')} {new Date(training.deadline).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
                </span>
              )}
            </p>
          )}
          {training.description && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85">{training.description}</p>
          )}

          {(training.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {training.tags.map((tg: string, i: number) => (
                <Badge key={i} variant="outline" className="rounded-full text-[10px]">{tg}</Badge>
              ))}
            </div>
          )}

          {cap && (
            <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Users className="h-3.5 w-3.5" />
                  {t('المتقدمون', 'Applicants')}
                </span>
                <span className="font-semibold">{count} / {cap}</span>
              </div>
              <Progress value={Math.min(100, (count / cap) * 100)} className="h-1.5" />
            </div>
          )}
        </motion.div>

        {/* Application form / apply button */}
        <div className="mt-5">
          {alreadyApplied ? (
            <div className="rounded-2xl border bg-emerald-500/10 border-emerald-500/30 p-5 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold">{t('تم تقديمك بنجاح', 'You already applied')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('سيتم إعلامك بالتحديثات', 'You will be notified with updates')}</p>
            </div>
          ) : closed ? (
            <div className="rounded-2xl border bg-destructive/10 border-destructive/30 p-5 text-center">
              <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-sm font-semibold">{isFull ? t('اكتمل عدد المتقدمين', 'Capacity reached') : t('تم إغلاق التقديم', 'Applications closed')}</p>
            </div>
          ) : training.application_mode === 'external' ? (
            <Button onClick={handleSubmit} className="w-full rounded-full h-12 text-base">
              <ExternalLink className="h-4 w-4 me-2" />
              {t('انتقل إلى نموذج التقديم', 'Go to application form')}
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="rounded-2xl border bg-card p-4 shadow-card space-y-4">
              <div>
                <p className="text-sm font-semibold">{t('نموذج التقديم', 'Application form')}</p>
                <p className="text-[11px] text-muted-foreground">{t('املأ الحقول التالية بدقة', 'Fill fields carefully')}</p>
              </div>
              {fields.map(f => {
                const key = f.field_key;
                const label = isRTL ? (f.label_ar || f.label) : f.label;
                return (
                  <div key={f.id} className="space-y-1.5">
                    <Label>{label} {f.required && <span className="text-destructive">*</span>}</Label>
                    {f.field_type === 'long_text' && (
                      <Textarea value={answers[key] || ''} onChange={e => handleAnswer(key, e.target.value)} rows={3} />
                    )}
                    {['short_text'].includes(f.field_type) && (
                      <Input value={answers[key] || ''} onChange={e => handleAnswer(key, e.target.value)} />
                    )}
                    {f.field_type === 'number' && (
                      <Input type="number" value={answers[key] ?? ''} onChange={e => handleAnswer(key, e.target.value)} />
                    )}
                    {f.field_type === 'email' && (
                      <Input type="email" value={answers[key] || ''} onChange={e => handleAnswer(key, e.target.value)} dir="ltr" />
                    )}
                    {f.field_type === 'phone' && (
                      <Input type="tel" value={answers[key] || ''} onChange={e => handleAnswer(key, e.target.value)} dir="ltr" />
                    )}
                    {f.field_type === 'select' && (
                      <select
                        value={answers[key] || ''}
                        onChange={e => handleAnswer(key, e.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="">{t('اختر…', 'Choose…')}</option>
                        {((f.options?.choices as string[]) || []).map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {f.field_type === 'checkbox' && (
                      <label className="inline-flex items-center gap-2 text-sm">
                        <Checkbox checked={!!answers[key]} onCheckedChange={v => handleAnswer(key, !!v)} />
                        {label}
                      </label>
                    )}
                    {f.field_type === 'file' && (
                      <Input type="file" onChange={e => handleAnswer(key, e.target.files?.[0]?.name || '')} />
                    )}
                  </div>
                );
              })}
              <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-full h-11">
                <Send className="h-4 w-4 me-2" />
                {submitting ? t('جارٍ الإرسال…', 'Submitting…') : t('إرسال التقديم', 'Submit application')}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
