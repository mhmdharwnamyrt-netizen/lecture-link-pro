import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Download, Eye, Users, FileText, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { CourseMaterial } from '@/lib/materials';

interface Props { role: 'doctor' | 'student' }

interface Row {
  user_id: string;
  name: string;
  student_id: string | null;
  level: number | null;
  at: string;
  count?: number;
  file_name?: string;
}

export default function MaterialStats({ role }: Props) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = `/${role}`;

  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<CourseMaterial | null>(null);
  const [viewers, setViewers] = useState<Row[]>([]);
  const [downloaders, setDownloaders] = useState<Row[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoading(true);
      const [{ data: m }, { data: vs }, { data: ds }, { data: fs }] = await Promise.all([
        supabase.from('course_materials' as any).select('*, subjects(name)').eq('id', id).maybeSingle(),
        supabase.from('material_views' as any).select('*').eq('material_id', id).order('last_viewed_at', { ascending: false }),
        supabase.from('material_downloads' as any).select('*').eq('material_id', id).order('downloaded_at', { ascending: false }),
        supabase.from('course_material_files' as any).select('id, file_name').eq('material_id', id),
      ]);
      setMaterial((m || null) as unknown as CourseMaterial | null);

      const ids = [...new Set([...(vs || []).map((v: any) => v.user_id), ...(ds || []).map((d: any) => d.user_id)])];
      const profMap: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles')
          .select('user_id, full_name, student_id, level').in('user_id', ids);
        (profs || []).forEach((p: any) => { profMap[p.user_id] = p; });
      }
      const fileMap: Record<string, string> = {};
      (fs || []).forEach((f: any) => { fileMap[f.id] = f.file_name; });

      setViewers((vs || []).map((v: any) => ({
        user_id: v.user_id,
        name: profMap[v.user_id]?.full_name || 'مستخدم',
        student_id: profMap[v.user_id]?.student_id ?? null,
        level: profMap[v.user_id]?.level ?? null,
        at: v.last_viewed_at,
        count: v.view_count,
      })));
      setDownloaders((ds || []).map((d: any) => ({
        user_id: d.user_id,
        name: profMap[d.user_id]?.full_name || 'مستخدم',
        student_id: profMap[d.user_id]?.student_id ?? null,
        level: profMap[d.user_id]?.level ?? null,
        at: d.downloaded_at,
        file_name: d.file_id ? fileMap[d.file_id] : undefined,
      })));
      setLoading(false);
    })();
  }, [id, user]);

  const match = (r: Row) =>
    !search || `${r.name} ${r.student_id || ''}`.toLowerCase().includes(search.toLowerCase());

  const uniqueDownloaders = new Set(downloaders.map((d) => d.user_id)).size;

  const List = ({ rows, empty }: { rows: Row[]; empty: string }) => (
    <div className="space-y-2">
      {rows.filter(match).length === 0 ? (
        <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">{empty}</Card>
      ) : rows.filter(match).map((r, i) => (
        <motion.div key={`${r.user_id}-${r.at}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.02, 0.25) }}>
          <Card className="flex items-center gap-3 rounded-2xl border-border/50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {r.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.student_id ? `${r.student_id} • ` : ''}{r.level != null ? `الفرقة ${r.level} • ` : ''}
                {new Date(r.at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
              {r.file_name && <p className="truncate text-[11px] text-muted-foreground">{r.file_name}</p>}
            </div>
            {r.count != null && <Badge variant="secondary" className="rounded-lg">{r.count}×</Badge>}
          </Card>
        </motion.div>
      ))}
    </div>
  );

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${base}/materials/${id}`)}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-xl font-bold">إحصائيات المحاضرة</h1>
        </div>

        {loading ? (
          <Skeleton className="h-32 w-full rounded-3xl" />
        ) : (
          <>
            <Card className="rounded-3xl border-border/50 bg-gradient-to-br from-primary/10 to-transparent p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" /> {material?.title}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'مشاهدة', value: material?.views_count ?? 0, icon: Eye },
                  { label: 'شاهدوها', value: viewers.length, icon: Users },
                  { label: 'حمّلوها', value: uniqueDownloaders, icon: Download },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border/40 bg-card/70 p-3 text-center">
                    <s.icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                    <p className="text-lg font-bold tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الطالب أو الرقم الجامعي..." className="h-12 rounded-2xl ps-10" />
            </div>

            <Tabs defaultValue="views">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="views" className="rounded-xl">من شاهدها ({viewers.length})</TabsTrigger>
                <TabsTrigger value="downloads" className="rounded-xl">من حمّلها ({downloaders.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="views" className="mt-3">
                <List rows={viewers} empty="لم يشاهدها أحد بعد." />
              </TabsContent>
              <TabsContent value="downloads" className="mt-3">
                <List rows={downloaders} empty="لم يحمّلها أحد بعد." />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MobileLayout>
  );
}
