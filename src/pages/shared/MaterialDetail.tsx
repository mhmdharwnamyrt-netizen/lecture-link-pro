import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Download, Eye, FileText, Loader2, Maximize2, ExternalLink,
  BarChart3, Pencil, Trash2, FileSpreadsheet, Presentation, FileImage, File as FileIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  downloadMaterialFile, fileKind, formatBytes, officeViewerUrl, recordMaterialView,
  signedUrlFor, type CourseMaterial, type MaterialFile,
} from '@/lib/materials';

interface Props { role: 'doctor' | 'student' }

const kindIcon: Record<string, any> = {
  pdf: FileText, word: FileText, excel: FileSpreadsheet,
  powerpoint: Presentation, image: FileImage, text: FileText, archive: FileIcon, other: FileIcon,
};

export default function MaterialDetail({ role }: Props) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const base = `/${role}`;

  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<CourseMaterial | null>(null);
  const [files, setFiles] = useState<MaterialFile[]>([]);
  const [active, setActive] = useState<MaterialFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const isOwner = !!material && material.created_by === user?.id;

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('course_materials' as any)
        .select('*, subjects(name), departments(name, name_ar)').eq('id', id).maybeSingle();
      setMaterial((data || null) as unknown as CourseMaterial | null);
      const { data: fs } = await supabase.from('course_material_files' as any)
        .select('*').eq('material_id', id).order('order_index');
      const list = (fs || []) as unknown as MaterialFile[];
      setFiles(list);
      setActive(list[0] || null);
      setLoading(false);
      if (data && (data as any).created_by !== user.id) {
        recordMaterialView(id, user.id).catch(() => {});
      }
    })();
  }, [id, user]);

  useEffect(() => {
    if (!active) { setPreviewUrl(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    signedUrlFor(active.storage_path, 3600)
      .then((url) => { if (!cancelled) setPreviewUrl(url); })
      .catch(() => { if (!cancelled) setPreviewUrl(null); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [active]);

  const handleDownload = async (f: MaterialFile) => {
    if (!user) return;
    setBusy(f.id);
    try {
      await downloadMaterialFile(f, user.id);
      setMaterial((m) => (m ? { ...m, downloads_count: m.downloads_count + 1 } : m));
    } catch (e: any) {
      toast({ title: 'تعذّر التحميل', description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleDelete = async () => {
    if (!material || !confirm('حذف هذه المحاضرة وكل ملفاتها؟')) return;
    await supabase.storage.from('course-materials').remove(files.map((f) => f.storage_path));
    await supabase.from('course_materials' as any).delete().eq('id', material.id);
    toast({ title: 'تم حذف المحاضرة' });
    navigate(`${base}/materials`);
  };

  const kind = active ? fileKind(active.file_name, active.mime_type) : 'other';

  const renderPreview = () => {
    if (!active) return null;
    if (previewLoading || !previewUrl) {
      return <div className="flex h-[60vh] items-center justify-center rounded-2xl bg-muted/40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    }
    if (kind === 'pdf') {
      return <iframe title={active.file_name} src={`${previewUrl}#view=FitH`} className="h-[70vh] w-full rounded-2xl border border-border/50 bg-card" />;
    }
    if (kind === 'image') {
      return <img src={previewUrl} alt={active.file_name} className="max-h-[70vh] w-full rounded-2xl border border-border/50 object-contain" />;
    }
    if (kind === 'word' || kind === 'excel' || kind === 'powerpoint') {
      return <iframe title={active.file_name} src={officeViewerUrl(previewUrl)} className="h-[70vh] w-full rounded-2xl border border-border/50 bg-card" />;
    }
    if (kind === 'text') {
      return <iframe title={active.file_name} src={previewUrl} className="h-[60vh] w-full rounded-2xl border border-border/50 bg-card" />;
    }
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl bg-muted/40 text-center">
        <FileIcon className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">لا يمكن معاينة هذا النوع داخل المتصفح — حمّل الملف لفتحه.</p>
      </div>
    );
  };

  if (loading) {
    return (
      <MobileLayout role={role}>
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-[50vh] w-full rounded-3xl" />
        </div>
      </MobileLayout>
    );
  }

  if (!material) {
    return (
      <MobileLayout role={role}>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
          {tx('m.d.notFound')}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/materials`)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-xl font-bold">{material.title}</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-3xl border-border/50 p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              {material.subjects?.name && <Badge variant="secondary" className="rounded-lg">{material.subjects.name}</Badge>}
              {material.level != null && <Badge variant="outline" className="rounded-lg">الفرقة {material.level}</Badge>}
              {(material.tags || []).map((tg) => <Badge key={tg} variant="outline" className="rounded-lg">#{tg}</Badge>)}
            </div>
            {material.description && <p className="mt-3 text-sm text-muted-foreground">{material.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {material.views_count} مشاهدة</span>
              <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {material.downloads_count} تحميل</span>
              <span>{new Date(material.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}</span>
            </div>

            {isOwner && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`${base}/materials/${material.id}/stats`)}>
                  <BarChart3 className="h-3.5 w-3.5" /> الإحصائيات
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`${base}/materials/${material.id}/edit`)}>
                  <Pencil className="h-3.5 w-3.5" /> تعديل
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* File tabs */}
        {files.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {files.map((f) => {
              const Icon = kindIcon[fileKind(f.file_name, f.mime_type)] || FileIcon;
              const isActive = active?.id === f.id;
              return (
                <button key={f.id} onClick={() => setActive(f)}
                  className={`inline-flex max-w-[220px] shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-colors ${
                    isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 bg-card text-muted-foreground'
                  }`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{f.file_name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Viewer */}
        {active && (
          <Card className="space-y-3 rounded-3xl border-border/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{active.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(active.file_size)}</p>
              </div>
              <div className="flex gap-2">
                {previewUrl && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(previewUrl, '_blank', 'noopener')}>
                    <Maximize2 className="h-3.5 w-3.5" /> ملء الشاشة
                  </Button>
                )}
                <Button size="sm" className="gap-1" disabled={busy === active.id} onClick={() => handleDownload(active)}>
                  {busy === active.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} تحميل
                </Button>
              </div>
            </div>
            {renderPreview()}
          </Card>
        )}

        {/* Downloads list */}
        {files.length > 1 && (
          <Card className="space-y-2 rounded-3xl border-border/50 p-4">
            <p className="mb-1 text-sm font-semibold">كل الملفات</p>
            {files.map((f) => {
              const Icon = kindIcon[fileKind(f.file_name, f.mime_type)] || FileIcon;
              return (
                <div key={f.id} className="flex items-center gap-2 rounded-2xl border border-border/40 p-3">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm">{f.file_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.file_size)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setActive(f)}><ExternalLink className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={busy === f.id} onClick={() => handleDownload(f)}>
                    {busy === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
