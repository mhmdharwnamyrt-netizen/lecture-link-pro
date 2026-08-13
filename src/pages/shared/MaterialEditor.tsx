import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Upload, X, Loader2, FileText, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  ACCEPTED_TYPES, MATERIALS_BUCKET, MAX_FILE_MB, formatBytes, type MaterialFile,
} from '@/lib/materials';
import { useTx } from '@/lib/i18nModules';

interface Props { role: 'doctor' | 'student' }

export default function MaterialEditor({ role }: Props) {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tx, isRTL, locale, pickName } = useTx();
  const base = `/${role}`;
  const editing = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [level, setLevel] = useState<number | ''>('');
  const [tags, setTags] = useState('');
  const [published, setPublished] = useState(true);

  const [depts, setDepts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [levels, setLevels] = useState<number[]>([]);

  const [pending, setPending] = useState<File[]>([]);
  const [existing, setExisting] = useState<MaterialFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [dRes, sRes] = await Promise.all([
        supabase.from('doctor_departments').select('*, departments(name, name_ar)').eq('doctor_id', profile.id),
        supabase.from('doctor_subjects').select('*, subjects(name)').eq('doctor_id', profile.id),
      ]);
      const dd = dRes.data || [];
      setDepts(dd);
      setSubjects(sRes.data || []);
      const uniq = [...new Set(dd.map((d: any) => d.department_id))];
      if (uniq.length === 1 && !editing) setDepartmentId(uniq[0] as string);
    })();
  }, [profile, editing]);

  useEffect(() => {
    if (!departmentId) { setLevels([]); return; }
    const ls = [...new Set(depts.filter((d: any) => d.department_id === departmentId).map((d: any) => d.level))] as number[];
    setLevels(ls.sort());
  }, [departmentId, depts]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('course_materials' as any).select('*').eq('id', id).maybeSingle();
      if (data) {
        const m = data as any;
        setTitle(m.title); setDescription(m.description || '');
        setSubjectId(m.subject_id || ''); setDepartmentId(m.department_id || '');
        setLevel(m.level ?? ''); setTags((m.tags || []).join('، '));
        setPublished(m.is_published);
      }
      const { data: fs } = await supabase.from('course_material_files' as any)
        .select('*').eq('material_id', id).order('order_index');
      setExisting((fs || []) as unknown as MaterialFile[]);
    })();
  }, [id]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok: File[] = [];
    Array.from(list).forEach((f) => {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast({ title: tx('m.ed.tooBig', { name: f.name, n: MAX_FILE_MB }), variant: 'destructive' });
      } else ok.push(f);
    });
    setPending((p) => [...p, ...ok]);
  };

  const removeExisting = async (f: MaterialFile) => {
    await supabase.storage.from(MATERIALS_BUCKET).remove([f.storage_path]);
    await supabase.from('course_material_files' as any).delete().eq('id', f.id);
    setExisting((prev) => prev.filter((x) => x.id !== f.id));
  };

  const save = async () => {
    if (!user) return;
    if (!title.trim()) { toast({ title: tx('m.ed.needTitle'), variant: 'destructive' }); return; }
    if (!editing && pending.length === 0) { toast({ title: tx('m.ed.needFile'), variant: 'destructive' }); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        subject_id: subjectId || null,
        department_id: departmentId || null,
        level: level === '' ? null : Number(level),
        tags: tags.split(/[،,]/).map((t) => t.trim()).filter(Boolean),
        is_published: published,
      };

      let materialId = id;
      if (editing) {
        const { error } = await supabase.from('course_materials' as any).update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const newId = crypto.randomUUID();
        const { error } = await supabase.from('course_materials' as any)
          .insert({ ...payload, id: newId, created_by: user.id });
        if (error) throw error;
        materialId = newId;
      }

      for (let i = 0; i < pending.length; i++) {
        const file = pending[i];
        setProgress(tx('m.ed.uploading', { i: i + 1, n: pending.length }));
        const safe = file.name.replace(/[^\w.\-\u0600-\u06FF]+/g, '_');
        const path = `${user.id}/${materialId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from(MATERIALS_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw upErr;
        const { error: rowErr } = await supabase.from('course_material_files' as any).insert({
          material_id: materialId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
          order_index: existing.length + i,
        });
        if (rowErr) throw rowErr;
      }

      toast({ title: editing ? tx('m.ed.updated') : tx('m.ed.created') });
      navigate(`${base}/materials/${materialId}`);
    } catch (err: any) {
      toast({ title: 'حدث خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const uniqueDeptIds = [...new Set(depts.map((d: any) => d.department_id))] as string[];

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/materials`)} className={isRTL ? 'rotate-180' : ''}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{editing ? tx('m.ed.edit') : tx('m.ed.new')}</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="space-y-4 rounded-3xl p-5">
            <div>
              <Label>{tx('m.ed.title')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-12 rounded-xl text-start"
                placeholder={tx('m.ed.titlePh')} />
            </div>
            <div>
              <Label>{tx('m.ed.desc')}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                className="mt-1 min-h-24 rounded-xl text-start" placeholder={tx('m.ed.descPh')} />
            </div>

            {uniqueDeptIds.length > 0 && (
              <div>
                <Label>{tx('m.ed.dept')}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {uniqueDeptIds.map((dId) => {
                    const d = depts.find((x: any) => x.department_id === dId);
                    return (
                      <button key={dId} type="button"
                        onClick={() => { setDepartmentId(dId); setLevel(''); }}
                        className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                          departmentId === dId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                        {pickName(d?.departments)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {levels.length > 0 && (
              <div>
                <Label>{tx('m.ed.level')}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {levels.map((l) => (
                    <button key={l} type="button" onClick={() => setLevel(l)}
                      className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                        level === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                      {tx('m.year', { n: l })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {subjects.length > 0 && (
              <div>
                <Label>{tx('m.ed.subject')}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {subjects.map((s: any) => (
                    <button key={s.subject_id} type="button"
                      onClick={() => setSubjectId(subjectId === s.subject_id ? '' : s.subject_id)}
                      className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                        subjectId === s.subject_id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                      {s.subjects?.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>{tx('m.ed.tags')}</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 h-12 rounded-xl text-start"
                placeholder={tx('m.ed.tagsPh')} />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
              <div>
                <p className="text-sm font-medium">{tx('m.ed.publish')}</p>
                <p className="text-xs text-muted-foreground">{tx('m.ed.publishHint')}</p>
              </div>
              <Switch checked={published} onCheckedChange={setPublished} />
            </div>
          </Card>
        </motion.div>

        {/* Files */}
        <Card className="space-y-3 rounded-3xl p-5">
          <Label>{tx('m.ed.files')}</Label>

          {existing.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-2xl border border-border/50 p-3">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm">{f.file_name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(f.file_size)}</span>
              <Button variant="ghost" size="icon" onClick={() => removeExisting(f)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          {pending.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-2xl bg-muted/50 p-3">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
              <Button variant="ghost" size="icon" onClick={() => setPending((p) => p.filter((_, x) => x !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 p-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/5">
            <Upload className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">{tx('m.ed.pick')}</span>
            <span className="text-xs text-muted-foreground">{tx('m.ed.pickHint', { n: MAX_FILE_MB })}</span>
            <input type="file" multiple accept={ACCEPTED_TYPES} className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ''; }} />
          </label>
        </Card>

        <Button onClick={save} disabled={saving} className="h-14 w-full rounded-2xl text-base">
          {saving ? (<><Loader2 className="me-2 h-4 w-4 animate-spin" /> {progress || tx('m.ed.saving')}</>)
            : (<><Save className="me-2 h-4 w-4" /> {editing ? tx('m.ed.save') : tx('m.ed.create')}</>)}
        </Button>
      </div>
    </MobileLayout>
  );
}
