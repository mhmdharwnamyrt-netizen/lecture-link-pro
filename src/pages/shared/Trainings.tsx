import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Briefcase, Building2, GraduationCap, ExternalLink, MapPin, CalendarDays, Search, Filter, Sparkles, Plus, Users, Lock, Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { sortTrainings, filterTrainings, type TrainingFilter } from '@/lib/trainings';

type Training = {
  id: string; title: string; description: string | null;
  type: 'university' | 'company' | string;
  company_name: string | null; location: string | null;
  apply_url: string | null; deadline: string | null;
  tags: string[] | null; image_url: string | null;
  is_active: boolean; created_at: string;
  created_by?: string | null;
  application_mode?: 'external' | 'internal';
  max_applicants?: number | null;
  applications_count?: number | null;
};

export default function TrainingsPage({ role }: { role: 'doctor' | 'student' }) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const t = (a: string, e: string) => (isRTL ? a : e);
  const locale = isRTL ? ar : enUS;

  const [items, setItems] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TrainingFilter>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('trainings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setItems((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const searched = items.filter(i => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      i.title.toLowerCase().includes(s) ||
      (i.company_name || '').toLowerCase().includes(s) ||
      (i.description || '').toLowerCase().includes(s) ||
      (i.tags || []).some(tg => tg.toLowerCase().includes(s))
    );
  });
  // Unified sort/filter — identical order to dashboard break-mode cards
  const visible = sortTrainings(filterTrainings(searched, filter));

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-4 md:px-8 pb-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              {t('التدريبات والفرص', 'Trainings & Opportunities')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('فرص تدريب من الجامعة والشركات الشريكة.', 'Internships from the university and partner companies.')}
            </p>
          </div>
          <Button onClick={() => navigate(`/${role}/trainings/new`)} className="rounded-full shrink-0">
            <Plus className="h-4 w-4 me-1" />
            {t('إضافة', 'Add')}
          </Button>
        </div>

        {/* Search + Filters */}
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('ابحث عن تدريب، شركة، مهارة…', 'Search training, company, skill…')}
              className="ps-9"
            />
          </div>
          <div className="flex gap-2">
            {([
              { k: 'all',        label: t('الكل', 'All'),                icon: Filter },
              { k: 'university', label: t('جامعية', 'University'),       icon: GraduationCap },
              { k: 'company',    label: t('شركات', 'Companies'),         icon: Building2 },
            ] as const).map(f => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === f.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
            {t('يتم التحميل…', 'Loading…')}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('لا توجد تدريبات متاحة حالياً.', 'No trainings available right now.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((it, i) => (
              <motion.article
                key={it.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={it.type === 'university' ? 'secondary' : 'outline'} className="rounded-full text-[10px]">
                        {it.type === 'university'
                          ? (<><GraduationCap className="h-3 w-3 me-1 inline" />{t('جامعية', 'University')}</>)
                          : (<><Building2 className="h-3 w-3 me-1 inline" />{t('شركة', 'Company')}</>)}
                      </Badge>
                      {it.deadline && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {t('آخر موعد:', 'Deadline:')} {new Date(it.deadline).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold leading-snug">{it.title}</h3>
                    {(it.company_name || it.location) && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        {it.company_name && <span>{it.company_name}</span>}
                        {it.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {it.location}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {it.description && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {it.description}
                  </p>
                )}

                {(it.tags?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {it.tags!.map((tg, k) => (
                      <Badge key={k} variant="outline" className="rounded-full text-[10px]">{tg}</Badge>
                    ))}
                  </div>
                )}

                {it.max_applicants ? (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {t('المتقدمون', 'Applicants')}</span>
                      <span className="font-semibold text-foreground">{it.applications_count || 0} / {it.max_applicants}</span>
                    </div>
                    <Progress value={Math.min(100, ((it.applications_count || 0) / it.max_applicants) * 100)} className="h-1" />
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(it.created_at), { addSuffix: true, locale })}
                  </span>
                  <div className="flex gap-2">
                    {profile?.user_id && it.created_by === profile.user_id && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/${role}/trainings/${it.id}/manage`)} className="rounded-full">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" className="rounded-full" onClick={() => navigate(`/${role}/trainings/${it.id}`)}>
                      {it.application_mode === 'internal'
                        ? <>{t('التفاصيل والتقديم', 'View & apply')}</>
                        : <><ExternalLink className="h-3.5 w-3.5 me-1.5" />{t('التقديم الآن', 'Apply now')}</>}
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
