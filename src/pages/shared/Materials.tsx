import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, FileText, Eye, Download, Library, Layers,
  FileSpreadsheet, FileImage, Presentation, File as FileIcon, BarChart3, Pencil, EyeOff,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fileKind, type CourseMaterial, type MaterialFile } from '@/lib/materials';
import { useTx } from '@/lib/i18nModules';

interface Props { role: 'doctor' | 'student' }

const kindIcon: Record<string, any> = {
  pdf: FileText, word: FileText, excel: FileSpreadsheet,
  powerpoint: Presentation, image: FileImage, text: FileText, archive: FileIcon, other: FileIcon,
};

export default function Materials({ role }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { tx, isRTL, locale, pickName } = useTx();
  const base = `/${role}`;
  const isCreator = role === 'doctor' || !!profile?.is_ta;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [files, setFiles] = useState<Record<string, MaterialFile[]>>({});
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      let query = supabase
        .from('course_materials' as any)
        .select('*, subjects(name), departments(name, name_ar)')
        .order('created_at', { ascending: false });
      if (isCreator) query = query.eq('created_by', user.id);
      const { data } = await query;
      const list = (data || []) as unknown as CourseMaterial[];
      setMaterials(list);

      if (list.length) {
        const { data: fs } = await supabase
          .from('course_material_files' as any)
          .select('*')
          .in('material_id', list.map((m) => m.id))
          .order('order_index');
        const byMaterial: Record<string, MaterialFile[]> = {};
        (fs || []).forEach((f: any) => { (byMaterial[f.material_id] ||= []).push(f as MaterialFile); });
        setFiles(byMaterial);
      }
      setLoading(false);
    })();
  }, [user, isCreator]);

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    materials.forEach((m) => {
      if (m.subject_id && m.subjects?.name) map.set(m.subject_id, m.subjects.name);
    });
    return Array.from(map.entries());
  }, [materials]);

  const filtered = materials.filter((m) => {
    if (subjectFilter !== 'all' && m.subject_id !== subjectFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${m.title} ${m.description || ''} ${m.subjects?.name || ''} ${(m.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totals = materials.reduce(
    (acc, m) => ({ views: acc.views + m.views_count, downloads: acc.downloads + m.downloads_count }),
    { views: 0, downloads: 0 },
  );

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/12 via-accent/8 to-transparent p-5 shadow-elevated"
        >
          <div className="pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary">
                <Library className="h-3.5 w-3.5" /> {tx('m.brand')}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{tx('m.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isCreator ? tx('m.subtitle.creator') : tx('m.subtitle.student')}
              </p>
            </div>
            {isCreator && (
              <Button onClick={() => navigate(`${base}/materials/new`)} size="sm" className="h-10 shrink-0 gap-1.5 rounded-xl px-4">
                <Plus className="h-4 w-4" /> {tx('m.upload')}
              </Button>
            )}
          </div>

          {isCreator && materials.length > 0 && (
            <div className="relative mt-4 grid grid-cols-3 gap-2">
              {[
                { label: tx('m.stat.materials'), value: materials.length, icon: Layers },
                { label: tx('m.stat.views'), value: totals.views, icon: Eye },
                { label: tx('m.stat.downloads'), value: totals.downloads, icon: Download },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border/40 bg-card/70 p-3 text-center backdrop-blur">
                  <s.icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                  <p className="text-lg font-bold tabular-nums">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Search + smart subject filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tx('m.search')}
              className="h-12 rounded-2xl ps-10 text-start"
            />
          </div>
          {subjects.length > 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSubjectFilter('all')}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  subjectFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {tx('m.allSubjects')}
              </button>
              {subjects.map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => setSubjectFilter(id)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    subjectFilter === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-3xl p-10 text-center">
            <Library className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">{isCreator ? tx('m.empty.creator') : tx('m.empty.student')}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((m, i) => {
              const mf = files[m.id] || [];
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Card
                    onClick={() => navigate(`${base}/materials/${m.id}`)}
                    className="group relative cursor-pointer overflow-hidden rounded-3xl border-border/50 p-0 transition-all hover:border-primary/40 hover:shadow-elevated active:scale-[0.995]"
                  >
                    {/* accent rail */}
                    <span className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-primary/70 to-primary/10" />

                    <div className="flex items-start gap-3 p-4 ps-5">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {m.subjects?.name && <Badge variant="secondary" className="rounded-lg">{m.subjects.name}</Badge>}
                          {m.level != null && <Badge variant="outline" className="rounded-lg">{tx('m.year', { n: m.level })}</Badge>}
                          {m.departments && (
                            <Badge variant="outline" className="rounded-lg text-muted-foreground">{pickName(m.departments)}</Badge>
                          )}
                          {!m.is_published && (
                            <Badge variant="outline" className="gap-1 rounded-lg text-muted-foreground">
                              <EyeOff className="h-3 w-3" /> {tx('m.draft')}
                            </Badge>
                          )}
                        </div>
                        <h3 className="mt-1.5 truncate text-[15px] font-semibold">{m.title}</h3>
                        {m.description && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><FileIcon className="h-3.5 w-3.5" /> {tx('m.files', { n: mf.length })}</span>
                          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {m.views_count}</span>
                          <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {m.downloads_count}</span>
                          <span>{new Date(m.created_at).toLocaleDateString(locale, { dateStyle: 'medium' })}</span>
                        </div>
                        {mf.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {mf.slice(0, 4).map((f) => {
                              const Icon = kindIcon[fileKind(f.file_name, f.mime_type)] || FileIcon;
                              return (
                                <span key={f.id} className="inline-flex max-w-[160px] items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[11px]">
                                  <Icon className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{f.file_name}</span>
                                </span>
                              );
                            })}
                            {mf.length > 4 && <span className="rounded-lg bg-muted px-2 py-1 text-[11px]">+{mf.length - 4}</span>}
                          </div>
                        )}
                      </div>
                      <Chevron className="mt-4 h-5 w-5 shrink-0 text-muted-foreground/60" />
                    </div>

                    {isCreator && (
                      <div className="flex gap-2 border-t border-border/50 p-3 ps-5">
                        <Button variant="outline" size="sm" className="h-9 flex-1 gap-1.5 rounded-xl"
                          onClick={(e) => { e.stopPropagation(); navigate(`${base}/materials/${m.id}/edit`); }}>
                          <Pencil className="h-3.5 w-3.5" /> {tx('m.edit')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 flex-1 gap-1.5 rounded-xl"
                          onClick={(e) => { e.stopPropagation(); navigate(`${base}/materials/${m.id}/stats`); }}>
                          <BarChart3 className="h-3.5 w-3.5" /> {tx('m.stats')}
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
