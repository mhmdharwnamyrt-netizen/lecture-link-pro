import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Save, Plus, Trash2, GripVertical, Link as LinkIcon,
  ListChecks, Building2, GraduationCap, Sparkles, Wand2, Loader2, Lock
} from 'lucide-react';

type FieldType = 'short_text' | 'long_text' | 'number' | 'email' | 'phone' | 'select' | 'checkbox' | 'file';

interface FieldDraft {
  id: string;
  field_key: string;
  label: string;
  label_ar?: string;
  field_type: FieldType;
  required: boolean;
  options?: string[];
  order_index: number;
}

const fieldTypeLabels = (isRTL: boolean): Record<FieldType, string> => ({
  short_text: isRTL ? 'نص قصير' : 'Short text',
  long_text: isRTL ? 'نص طويل' : 'Long text',
  number: isRTL ? 'رقم' : 'Number',
  email: isRTL ? 'بريد إلكتروني' : 'Email',
  phone: isRTL ? 'هاتف' : 'Phone',
  select: isRTL ? 'اختيار من متعدد' : 'Select',
  checkbox: isRTL ? 'موافقة' : 'Checkbox',
  file: isRTL ? 'ملف مرفق' : 'File upload',
});

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || `field_${Date.now()}`;

export default function TrainingCreate({ role }: { role: 'doctor' | 'student' }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isRTL = language === 'ar';
  const t = (a: string, e: string) => (isRTL ? a : e);
  const labels = fieldTypeLabels(isRTL);

  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'university' | 'company'>('company');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Step 2
  const [mode, setMode] = useState<'external' | 'internal'>('external');
  const [applyUrl, setApplyUrl] = useState('');
  const [maxApplicants, setMaxApplicants] = useState<string>('');
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const canInternalForm = role === 'doctor'; // includes TA (registered as doctor)

  // Enforce external mode for students on mount
  useEffect(() => { if (!canInternalForm) setMode('external'); }, [canInternalForm]);

  const runAiAutofill = async () => {
    const src = (description || title).trim();
    if (src.length < 15) {
      toast.error(t('اكتب وصفًا أو ألصق نص الإعلان أولاً (15 حرفًا على الأقل)', 'Write/paste at least 15 characters first'));
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('training-extract', { body: { text: src } });
      if (error) throw error;
      if (data?.title && !title) setTitle(data.title);
      if (data?.company_name && !companyName) setCompanyName(data.company_name);
      if (data?.location && !location) setLocation(data.location);
      if (data?.deadline && !deadline) setDeadline(data.deadline);
      if (Array.isArray(data?.tags) && data.tags.length && !tagsInput.trim()) {
        setTagsInput(data.tags.join(', '));
      }
      toast.success(t('تم استخراج التفاصيل تلقائيًا', 'Details autofilled'));
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('429')) toast.error(t('تجاوزت حد الاستخدام، حاول لاحقًا', 'Rate limited, try later'));
      else if (msg.includes('402')) toast.error(t('انتهت الأرصدة', 'AI credits exhausted'));
      else toast.error(t('تعذر التحليل التلقائي', 'Auto-extract failed'));
    } finally { setAiLoading(false); }
  };

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data: tr } = await supabase.from('trainings').select('*').eq('id', editId).maybeSingle();
      if (!tr) return;
      const a = tr as any;
      setTitle(a.title || '');
      setDescription(a.description || '');
      setType(a.type);
      setCompanyName(a.company_name || '');
      setLocation(a.location || '');
      setDeadline(a.deadline || '');
      setTagsInput((a.tags || []).join(', '));
      setMode(a.application_mode || 'external');
      setApplyUrl(a.apply_url || '');
      setMaxApplicants(a.max_applicants ? String(a.max_applicants) : '');
      const { data: ff } = await (supabase as any).from('training_form_fields')
        .select('*').eq('training_id', editId).order('order_index');
      if (ff) {
        setFields(ff.map((f: any) => ({
          id: f.id, field_key: f.field_key, label: f.label, label_ar: f.label_ar,
          field_type: f.field_type, required: f.required,
          options: f.options?.choices || [], order_index: f.order_index,
        })));
      }
    })();
  }, [editId]);

  const addField = () => {
    setFields((prev) => [...prev, {
      id: crypto.randomUUID(),
      field_key: `field_${prev.length + 1}`,
      label: '',
      field_type: 'short_text',
      required: false,
      order_index: prev.length,
    }]);
  };

  const updateField = (id: string, patch: Partial<FieldDraft>) => {
    setFields((prev) => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const removeField = (id: string) => setFields(prev => prev.filter(f => f.id !== id));

  const validateStep1 = () => {
    if (!title.trim()) { toast.error(t('العنوان مطلوب', 'Title is required')); return false; }
    if (type === 'company' && !companyName.trim()) {
      toast.error(t('اسم الجهة مطلوب', 'Organization name is required')); return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (mode === 'external') {
      if (!applyUrl.trim() || !/^https?:\/\//i.test(applyUrl)) {
        toast.error(t('أدخل رابط تقديم صحيح', 'Enter a valid apply URL')); return false;
      }
    } else {
      if (fields.length === 0) {
        toast.error(t('أضف حقلاً واحداً على الأقل للنموذج', 'Add at least one form field')); return false;
      }
      for (const f of fields) {
        if (!f.label.trim()) { toast.error(t('كل حقل يحتاج تسمية', 'Every field needs a label')); return false; }
        if (f.field_type === 'select' && (!f.options || f.options.filter(o => o.trim()).length < 2)) {
          toast.error(t('حقل الاختيار يحتاج خيارين على الأقل', 'Select field needs 2+ options')); return false;
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validateStep1() || !validateStep2()) return;
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        company_name: companyName.trim() || null,
        location: location.trim() || null,
        deadline: deadline || null,
        tags: tagsInput.split(',').map(s => s.trim()).filter(Boolean),
        application_mode: mode,
        apply_url: mode === 'external' ? applyUrl.trim() : null,
        max_applicants: maxApplicants ? Math.max(1, parseInt(maxApplicants, 10)) : null,
        is_active: true,
      };

      let trainingId = editId;
      if (editId) {
        const { error } = await supabase.from('trainings').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        payload.created_by = user.id;
        const { data, error } = await supabase.from('trainings').insert(payload).select('id').single();
        if (error) throw error;
        trainingId = (data as any).id;
      }

      if (mode === 'internal' && trainingId) {
        // Replace fields
        await (supabase as any).from('training_form_fields').delete().eq('training_id', trainingId);
        const rows = fields.map((f, i) => ({
          training_id: trainingId,
          field_key: slugify(f.field_key || f.label) + '_' + i,
          label: f.label.trim(),
          label_ar: f.label_ar?.trim() || null,
          field_type: f.field_type,
          required: f.required,
          options: f.field_type === 'select' ? { choices: (f.options || []).filter(o => o.trim()) } : null,
          order_index: i,
        }));
        if (rows.length) {
          const { error: fe } = await (supabase as any).from('training_form_fields').insert(rows);
          if (fe) throw fe;
        }
      }

      toast.success(editId ? t('تم تحديث التدريب', 'Training updated') : t('تم نشر التدريب', 'Training published'));
      navigate(`/${role}/trainings`);
    } catch (e: any) {
      toast.error(t('فشل الحفظ', 'Save failed'), { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-4 md:px-8 pb-8 max-w-3xl mx-auto">
        <div className="mb-5 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <div>
            <h1 className="text-xl font-bold">{editId ? t('تعديل تدريب', 'Edit training') : t('إضافة تدريب جديد', 'Add new training')}</h1>
            <p className="text-xs text-muted-foreground">{t(`الخطوة ${step} من 2`, `Step ${step} of 2`)}</p>
          </div>
        </div>

        <div className="mb-4 flex gap-1.5">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-4 rounded-2xl border bg-card p-4 shadow-card">
              <div className="grid grid-cols-2 gap-2">
                {(['company', 'university'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setType(v)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${
                      type === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {v === 'company' ? <Building2 className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                    {v === 'company' ? t('شركة', 'Company') : t('جامعية', 'University')}
                  </button>
                ))}
              </div>

              <div>
                <Label>{t('عنوان التدريب', 'Training title')} *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('مثلاً: تدريب صيفي Front-End', 'e.g. Summer Front-End Internship')} />
              </div>
              <div>
                <Label>{t('الوصف', 'Description')}</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                          placeholder={t('نبذة عن التدريب والمتطلبات…', 'About the training and requirements…')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{type === 'company' ? t('اسم الشركة', 'Company') : t('الجهة', 'Organization')} {type === 'company' && '*'}</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div>
                  <Label>{t('المكان', 'Location')}</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={t('عن بُعد / بني سويف', 'Remote / Beni Suef')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('آخر موعد للتقديم', 'Application deadline')}</Label>
                  <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
                <div>
                  <Label>{t('وسوم (مفصولة بفاصلة)', 'Tags (comma separated)')}</Label>
                  <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="React, UI/UX" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => { if (validateStep1()) setStep(2); }} className="rounded-full">
                  {t('التالي', 'Next')} {isRTL ? <ArrowLeft className="h-4 w-4 ms-1" /> : <ArrowRight className="h-4 w-4 ms-1" />}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('external')}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-4 text-sm transition ${
                    mode === 'external' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                  }`}
                >
                  <LinkIcon className="h-5 w-5" />
                  <span className="font-medium">{t('رابط خارجي', 'External link')}</span>
                  <span className="text-[10px] text-muted-foreground">{t('Google Form وغيره', 'Google Form etc.')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('internal')}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-4 text-sm transition ${
                    mode === 'internal' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                  }`}
                >
                  <ListChecks className="h-5 w-5" />
                  <span className="font-medium">{t('نموذج داخلي', 'Internal form')}</span>
                  <span className="text-[10px] text-muted-foreground">{t('اصنع الحقول واستقبل الردود', 'Build fields, collect answers')}</span>
                </button>
              </div>

              <div className="rounded-2xl border bg-card p-4 shadow-card space-y-4">
                {mode === 'external' ? (
                  <div>
                    <Label>{t('رابط التقديم', 'Application URL')} *</Label>
                    <Input value={applyUrl} onChange={e => setApplyUrl(e.target.value)} placeholder="https://…" dir="ltr" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{t('حقول النموذج', 'Form fields')}</p>
                        <p className="text-[11px] text-muted-foreground">{t('صمّم ما يملأه المتقدّم', 'Design what applicants fill')}</p>
                      </div>
                      <Button size="sm" onClick={addField} className="rounded-full">
                        <Plus className="h-4 w-4 me-1" /> {t('حقل', 'Field')}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {fields.length === 0 && (
                        <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                          {t('لا يوجد حقول بعد', 'No fields yet')}
                        </div>
                      )}
                      {fields.map((f, i) => (
                        <motion.div
                          key={f.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border bg-muted/30 p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={f.label}
                              onChange={e => updateField(f.id, { label: e.target.value })}
                              placeholder={t('تسمية الحقل', 'Field label')}
                              className="flex-1"
                            />
                            <Button size="icon" variant="ghost" onClick={() => removeField(f.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={f.field_type}
                              onChange={e => updateField(f.id, { field_type: e.target.value as FieldType })}
                              className="h-8 rounded-md border bg-background px-2 text-xs"
                            >
                              {(Object.keys(labels) as FieldType[]).map(k => (
                                <option key={k} value={k}>{labels[k]}</option>
                              ))}
                            </select>
                            <label className="inline-flex items-center gap-1.5 text-xs">
                              <Switch checked={f.required} onCheckedChange={(v) => updateField(f.id, { required: v })} />
                              {t('مطلوب', 'Required')}
                            </label>
                          </div>
                          {f.field_type === 'select' && (
                            <Textarea
                              value={(f.options || []).join('\n')}
                              onChange={e => updateField(f.id, { options: e.target.value.split('\n') })}
                              placeholder={t('خيار في كل سطر', 'One option per line')}
                              rows={3}
                              className="text-xs"
                            />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>{t('الحد الأقصى للمتقدمين (اختياري)', 'Max applicants (optional)')}</Label>
                  <Input type="number" min={1} value={maxApplicants} onChange={e => setMaxApplicants(e.target.value)} placeholder="30" />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    <Sparkles className="h-3 w-3 inline me-1" />
                    {t('يُغلق التدريب تلقائيًا عند بلوغ العدد.', 'Training closes automatically when reached.')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  {isRTL ? <ArrowRight className="h-4 w-4 me-1" /> : <ArrowLeft className="h-4 w-4 me-1" />}
                  {t('السابق', 'Back')}
                </Button>
                <Button onClick={handleSave} disabled={saving} className="rounded-full">
                  <Save className="h-4 w-4 me-1" />
                  {saving ? t('جارٍ الحفظ…', 'Saving…') : (editId ? t('حفظ التغييرات', 'Save changes') : t('نشر التدريب', 'Publish'))}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
}
