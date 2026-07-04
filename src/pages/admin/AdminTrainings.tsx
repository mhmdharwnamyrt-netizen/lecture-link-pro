import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft, Plus, Pencil, Trash2, Briefcase, Building2, GraduationCap,
  ExternalLink, Search, Eye, EyeOff, Loader2, X
} from 'lucide-react';

type Row = {
  id: string; title: string; description: string | null; type: 'university' | 'company' | string;
  company_name: string | null; location: string | null; apply_url: string;
  deadline: string | null; tags: string[] | null; image_url: string | null;
  is_active: boolean; created_at: string;
};

const emptyForm: Omit<Row, 'id' | 'created_at'> = {
  title: '', description: '', type: 'university', company_name: '', location: '',
  apply_url: '', deadline: null, tags: [], image_url: null, is_active: true,
};

export default function AdminTrainings() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  const t = (a: string, e: string) => (isRTL ? a : e);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user, navigate]);
  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin')
      .maybeSingle().then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = async () => {
    setBusy(true);
    const { data } = await supabase.from('trainings').select('*').order('created_at', { ascending: false });
    setRows((data as any) || []);
    setBusy(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setTagInput(''); setOpen(true);
  };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      title: r.title, description: r.description || '', type: r.type,
      company_name: r.company_name || '', location: r.location || '',
      apply_url: r.apply_url, deadline: r.deadline, tags: r.tags || [],
      image_url: r.image_url, is_active: r.is_active,
    });
    setTagInput('');
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.apply_url.trim()) {
      toast({ title: t('البيانات ناقصة', 'Missing fields'), description: t('العنوان ورابط التقديم مطلوبان.', 'Title and apply URL are required.'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      type: form.type,
      company_name: form.company_name?.trim() || null,
      location: form.location?.trim() || null,
      apply_url: form.apply_url.trim(),
      deadline: form.deadline || null,
      tags: form.tags || [],
      is_active: !!form.is_active,
      created_by: user?.id,
    };
    const { error } = editing
      ? await supabase.from('trainings').update(payload).eq('id', editing.id)
      : await supabase.from('trainings').insert(payload);
    setBusy(false);
    if (error) {
      toast({ title: t('فشل الحفظ', 'Save failed'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? t('تم التحديث', 'Updated') : t('تمت الإضافة', 'Created') });
    setOpen(false); load();
  };

  const remove = async (r: Row) => {
    if (!confirm(t('حذف هذا التدريب؟', 'Delete this training?'))) return;
    const { error } = await supabase.from('trainings').delete().eq('id', r.id);
    if (error) toast({ title: error.message, variant: 'destructive' });
    else load();
  };

  const toggleActive = async (r: Row) => {
    const { error } = await supabase.from('trainings').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) toast({ title: error.message, variant: 'destructive' });
    else load();
  };

  const addTag = () => {
    const v = tagInput.trim(); if (!v) return;
    if ((form.tags || []).includes(v)) return;
    setForm({ ...form, tags: [...(form.tags || []), v] });
    setTagInput('');
  };

  const visible = rows.filter(r => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.title.toLowerCase().includes(s) || (r.company_name || '').toLowerCase().includes(s);
  });

  if (isAdmin === null) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <p>{t('صلاحيات المسؤول مطلوبة', 'Admin access required')}</p>
      <Button variant="outline" onClick={() => navigate('/')}>{t('الرئيسية', 'Home')}</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {t('إدارة التدريبات', 'Manage Trainings')}
            </h1>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 me-1.5" /> {t('إضافة تدريب', 'Add training')}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        <div className="relative mb-4">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="ps-9"
            placeholder={t('ابحث بالعنوان أو الشركة…', 'Search by title or company…')} />
        </div>

        {busy && rows.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
            {t('لا توجد تدريبات بعد. أضف أول تدريب.', 'No trainings yet. Add the first one.')}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(r => (
              <article key={r.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={r.type === 'university' ? 'secondary' : 'outline'} className="rounded-full text-[10px]">
                        {r.type === 'university'
                          ? <><GraduationCap className="h-3 w-3 me-1 inline" />{t('جامعية', 'University')}</>
                          : <><Building2 className="h-3 w-3 me-1 inline" />{t('شركة', 'Company')}</>}
                      </Badge>
                      {!r.is_active && (
                        <Badge variant="destructive" className="rounded-full text-[10px]">
                          {t('غير مفعّل', 'Inactive')}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{r.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.company_name && <span>{r.company_name} • </span>}
                      {r.location && <span>{r.location} • </span>}
                      {r.deadline && <span>{t('آخر موعد', 'Deadline')}: {new Date(r.deadline).toLocaleDateString()}</span>}
                    </p>
                    <a href={r.apply_url} target="_blank" rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline break-all">
                      <ExternalLink className="h-3 w-3" /> {r.apply_url}
                    </a>
                    {r.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{r.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleActive(r)} title={t('تبديل التفعيل', 'Toggle active')}>
                      {r.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('تعديل التدريب', 'Edit training') : t('إضافة تدريب', 'Add training')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">{t('العنوان *', 'Title *')}</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">{t('النوع *', 'Type *')}</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="university">{t('تدريب جامعي', 'University')}</SelectItem>
                    <SelectItem value="company">{t('شركة', 'Company')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{t('الجهة / الشركة', 'Company / Provider')}</label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block">{t('الموقع', 'Location')}</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t('عن بُعد / بني سويف…', 'Remote / Cairo…')} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">{t('آخر موعد للتقديم', 'Deadline')}</label>
                <Input type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value || null })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t('رابط التقديم *', 'Apply URL *')}</label>
              <Input value={form.apply_url} onChange={(e) => setForm({ ...form, apply_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t('الوصف', 'Description')}</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[90px]" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t('وسوم', 'Tags')}</label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder={t('مثال: تطوير ويب, صيفي', 'e.g. web dev, summer')} />
                <Button type="button" variant="outline" onClick={addTag}>+</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(form.tags || []).map((tg: string, i: number) => (
                  <Badge key={i} variant="secondary" className="rounded-full gap-1">
                    {tg}
                    <button onClick={() => setForm({ ...form, tags: form.tags.filter((_: any, j: number) => j !== i) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <span className="text-sm">{t('مفعّل ومعروض للطلاب', 'Active & visible to students')}</span>
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {editing ? t('حفظ', 'Save') : t('إضافة', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
