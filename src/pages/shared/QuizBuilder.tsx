import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, Loader2, GripVertical, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { QuizQuestionType } from '@/lib/quizzes';

interface Props { role: 'doctor' | 'student' }

interface QDraft {
  id?: string;
  question_type: QuizQuestionType;
  question_text: string;
  points: number;
  explanation?: string;
  options: { id?: string; option_text: string; is_correct: boolean }[];
}

export default function QuizBuilder({ role }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const editing = !!id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [group, setGroup] = useState('');
  const [duration, setDuration] = useState(30); // minutes
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const [shuffleQ, setShuffleQ] = useState(false);
  const [shuffleO, setShuffleO] = useState(false);
  const [showCorrect, setShowCorrect] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passing, setPassing] = useState(50);
  const [reward, setReward] = useState(5);

  const [questions, setQuestions] = useState<QDraft[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('subjects').select('*').then(({ data }) => setSubjects(data || []));
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    (async () => {
      const { data: q } = await supabase.from('quizzes' as any).select('*').eq('id', id).maybeSingle();
      if (q) {
        const qq: any = q;
        setTitle(qq.title); setDescription(qq.description || '');
        setSubjectId(qq.subject_id || ''); setLevel(qq.level ? String(qq.level) : '');
        setGroup(qq.group_name || ''); setDuration(Math.round(qq.duration_seconds / 60));
        setStartsAt(qq.starts_at ? qq.starts_at.slice(0, 16) : '');
        setEndsAt(qq.ends_at ? qq.ends_at.slice(0, 16) : '');
        setShuffleQ(qq.shuffle_questions); setShuffleO(qq.shuffle_options);
        setShowCorrect(qq.show_correct_after); setMaxAttempts(qq.max_attempts);
        setPassing(qq.passing_percentage); setReward(qq.reward_points);
      }
      const { data: qs } = await supabase.from('quiz_questions' as any).select('*').eq('quiz_id', id).order('order_index');
      const { data: opts } = await supabase.rpc('quiz_options_with_answers' as any, { _quiz: id });
      setQuestions((qs || []).map((qq: any) => ({
        id: qq.id, question_type: qq.question_type, question_text: qq.question_text,
        points: qq.points, explanation: qq.explanation || '',
        options: (opts || []).filter((o: any) => o.question_id === qq.id).sort((a: any, b: any) => a.order_index - b.order_index)
          .map((o: any) => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })),
      })));
      setLoading(false);
    })();
  }, [id, editing]);

  const addQuestion = (type: QuizQuestionType) => {
    const q: QDraft = {
      question_type: type,
      question_text: '',
      points: 1,
      options: type === 'true_false'
        ? [{ option_text: 'صح', is_correct: false }, { option_text: 'خطأ', is_correct: false }]
        : [{ option_text: '', is_correct: false }, { option_text: '', is_correct: false }],
    };
    setQuestions([...questions, q]);
  };

  const updateQ = (idx: number, patch: Partial<QDraft>) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };
  const removeQ = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx));

  const updateOpt = (qi: number, oi: number, patch: any) => {
    const nq = [...questions];
    nq[qi] = { ...nq[qi], options: nq[qi].options.map((o, i) => i === oi ? { ...o, ...patch } : o) };
    setQuestions(nq);
  };
  const setSingleCorrect = (qi: number, oi: number) => {
    const nq = [...questions];
    nq[qi] = { ...nq[qi], options: nq[qi].options.map((o, i) => ({ ...o, is_correct: i === oi })) };
    setQuestions(nq);
  };
  const addOpt = (qi: number) => {
    const nq = [...questions];
    nq[qi] = { ...nq[qi], options: [...nq[qi].options, { option_text: '', is_correct: false }] };
    setQuestions(nq);
  };
  const removeOpt = (qi: number, oi: number) => {
    const nq = [...questions];
    nq[qi] = { ...nq[qi], options: nq[qi].options.filter((_, i) => i !== oi) };
    setQuestions(nq);
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'العنوان مطلوب';
    if (duration < 1) return 'المدة يجب أن تكون أكبر من 0';
    if (questions.length === 0) return 'أضف سؤالًا واحدًا على الأقل';
    for (const q of questions) {
      if (!q.question_text.trim()) return 'كل سؤال يجب أن يحتوي على نص';
      const correct = q.options.filter((o) => o.is_correct).length;
      if (correct === 0) return 'كل سؤال يجب أن يحتوي على إجابة صحيحة';
      if (q.question_type !== 'multiple_choice' && correct > 1) return 'أسئلة الاختيار الواحد لا تقبل أكثر من إجابة صحيحة';
      for (const o of q.options) if (!o.option_text.trim()) return 'كل الخيارات يجب أن تحتوي على نص';
    }
    return null;
  };

  const save = async (publish: boolean) => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!user) return;
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        subject_id: subjectId || null,
        department_id: profile?.department_id || null,
        level: level ? Number(level) : null,
        group_name: group.trim() || null,
        duration_seconds: duration * 60,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        shuffle_questions: shuffleQ,
        shuffle_options: shuffleO,
        show_correct_after: showCorrect,
        max_attempts: maxAttempts,
        passing_percentage: passing,
        reward_points: reward,
        is_published: publish,
        created_by: user.id,
      };
      let quizId = id;
      if (editing) {
        await supabase.from('quizzes' as any).update(payload).eq('id', id!);
      } else {
        const { data, error } = await supabase.from('quizzes' as any).insert(payload).select('id').single();
        if (error) throw error;
        quizId = (data as any).id;
      }
      // Replace questions
      if (editing) await supabase.from('quiz_questions' as any).delete().eq('quiz_id', quizId!);
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: qData, error: qErr } = await supabase.from('quiz_questions' as any).insert({
          quiz_id: quizId, order_index: i, question_type: q.question_type,
          question_text: q.question_text.trim(), points: q.points, explanation: q.explanation?.trim() || null,
        }).select('id').single();
        if (qErr) throw qErr;
        const qid = (qData as any).id;
        const rows = q.options.map((o, oi) => ({
          question_id: qid, order_index: oi, option_text: o.option_text.trim(), is_correct: o.is_correct,
        }));
        const { error: oErr } = await supabase.from('quiz_options' as any).insert(rows);
        if (oErr) throw oErr;
      }
      toast.success(publish ? 'تم النشر بنجاح' : 'تم الحفظ');
      navigate(`/${role}/quizzes`);
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <MobileLayout role={role}>
        <div className="mx-auto max-w-3xl px-4 py-10 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{editing ? 'تعديل اختبار' : 'اختبار جديد'}</h1>
          <p className="text-sm text-muted-foreground">الخطوة {step} من 3</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl p-5 space-y-4">
              <div>
                <Label>عنوان الاختبار</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلًا: امتحان الفصل الأول" />
              </div>
              <div>
                <Label>الوصف (اختياري)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المادة</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الفرقة</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((l) => <SelectItem key={l} value={String(l)}>الفرقة {l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المدة (دقيقة)</Label>
                  <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <Label>المجموعة/الفرع (اختياري)</Label>
                  <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="مثلًا: A" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>يبدأ في</Label>
                  <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </div>
                <div>
                  <Label>ينتهي في</Label>
                  <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {questions.map((q, qi) => (
              <Card key={qi} className="rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">السؤال {qi + 1}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {q.question_type === 'true_false' ? 'صح/خطأ' : q.question_type === 'single_choice' ? 'اختيار واحد' : 'اختيار متعدد'}
                    </span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeQ(qi)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Textarea value={q.question_text} onChange={(e) => updateQ(qi, { question_text: e.target.value })} placeholder="نص السؤال" rows={2} />
                <div className="flex items-center gap-2">
                  <Label className="text-xs">النقاط</Label>
                  <Input type="number" min={1} value={q.points} onChange={(e) => updateQ(qi, { points: Math.max(1, Number(e.target.value)) })} className="w-20 h-8" />
                </div>

                {q.question_type === 'multiple_choice' ? (
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Checkbox checked={o.is_correct} onCheckedChange={(v) => updateOpt(qi, oi, { is_correct: !!v })} />
                        <Input value={o.option_text} onChange={(e) => updateOpt(qi, oi, { option_text: e.target.value })} placeholder={`الخيار ${oi + 1}`} />
                        {q.options.length > 2 && (
                          <Button size="icon" variant="ghost" onClick={() => removeOpt(qi, oi)}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addOpt(qi)}><Plus className="me-1 h-3 w-3" /> إضافة خيار</Button>
                  </div>
                ) : (
                  <RadioGroup value={String(q.options.findIndex((o) => o.is_correct))} onValueChange={(v) => setSingleCorrect(qi, Number(v))}>
                    <div className="space-y-2">
                      {q.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <RadioGroupItem value={String(oi)} id={`q${qi}o${oi}`} />
                          {q.question_type === 'true_false' ? (
                            <div className="flex-1 rounded-lg border px-3 py-2 text-sm">{o.option_text}</div>
                          ) : (
                            <Input value={o.option_text} onChange={(e) => updateOpt(qi, oi, { option_text: e.target.value })} placeholder={`الخيار ${oi + 1}`} />
                          )}
                          {q.question_type === 'single_choice' && q.options.length > 2 && (
                            <Button size="icon" variant="ghost" onClick={() => removeOpt(qi, oi)}><Trash2 className="h-4 w-4" /></Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.question_type === 'single_choice' && (
                      <Button size="sm" variant="outline" onClick={() => addOpt(qi)} className="mt-2">
                        <Plus className="me-1 h-3 w-3" /> إضافة خيار
                      </Button>
                    )}
                  </RadioGroup>
                )}

                <Input value={q.explanation || ''} onChange={(e) => updateQ(qi, { explanation: e.target.value })} placeholder="شرح الإجابة (اختياري)" className="text-xs" />
              </Card>
            ))}

            <Card className="rounded-2xl border-dashed p-4 space-y-2">
              <p className="text-sm font-semibold">أضف سؤالًا</p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => addQuestion('true_false')}>صح/خطأ</Button>
                <Button variant="outline" onClick={() => addQuestion('single_choice')}>اختيار واحد</Button>
                <Button variant="outline" onClick={() => addQuestion('multiple_choice')}>اختيار متعدد</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl p-5 space-y-4">
              <SettingRow label="خلط الأسئلة" value={shuffleQ} onChange={setShuffleQ} />
              <SettingRow label="خلط الخيارات" value={shuffleO} onChange={setShuffleO} />
              <SettingRow label="عرض الإجابات الصحيحة بعد التسليم" value={showCorrect} onChange={setShowCorrect} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>عدد المحاولات المسموحة</Label>
                  <Input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <Label>حد النجاح (%)</Label>
                  <Input type="number" min={0} max={100} value={passing} onChange={(e) => setPassing(Math.max(0, Math.min(100, Number(e.target.value))))} />
                </div>
              </div>
              <div>
                <Label>نقاط المكافأة عند النجاح</Label>
                <Input type="number" min={0} value={reward} onChange={(e) => setReward(Math.max(0, Number(e.target.value)))} />
              </div>
            </Card>
            <Card className="rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold">جاهز للنشر</p>
                  <p className="text-xs text-muted-foreground">{questions.length} سؤال · {questions.reduce((s, q) => s + q.points, 0)} نقطة</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Nav buttons */}
        <div className="sticky bottom-24 md:bottom-4 z-10 flex gap-2 rounded-2xl border border-border/40 bg-card/95 p-2 shadow-elevated backdrop-blur">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ChevronRight className="h-4 w-4" /> السابق
            </Button>
          )}
          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} className="flex-1">
              التالي <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => save(false)} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="me-1 h-4 w-4" /> حفظ كمسودة</>}
              </Button>
              <Button onClick={() => save(true)} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'نشر'}
              </Button>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

function SettingRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
