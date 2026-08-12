import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessagesSquare, Users, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTx } from '@/lib/i18nModules';
import { fetchMyGroups, type StudyGroup } from '@/lib/groups';

interface Props { role: 'doctor' | 'student' }

export default function StudyGroups({ role }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { tx, isRTL, pickName } = useTx();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<StudyGroup[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchMyGroups().then((g) => { setGroups(g); setLoading(false); });
  }, [user]);

  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const grouped = useMemo(() => {
    const map = new Map<string, StudyGroup[]>();
    groups.forEach((g) => {
      const key = pickName(g.departments) || '—';
      const arr = map.get(key) || [];
      arr.push(g);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [groups, pickName]);

  const isStaff = role === 'doctor' || !!profile?.is_ta;

  return (
    <MobileLayout role={role}>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/12 via-accent/8 to-transparent p-5"
        >
          <div className="pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary">
              <MessagesSquare className="h-3.5 w-3.5" /> {tx('g.nav')}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{tx('g.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isStaff ? tx('g.subtitle.staff') : tx('g.subtitle.student')}
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
        ) : groups.length === 0 ? (
          <Card className="rounded-3xl p-10 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{tx('g.empty')}</p>
          </Card>
        ) : (
          grouped.map(([dept, list]) => (
            <div key={dept} className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dept}</p>
              {list.map((g, i) => (
                <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                  <Card
                    onClick={() => navigate(`/${role}/groups/${g.id}`)}
                    className="group flex cursor-pointer items-center gap-3 rounded-2xl border-border/50 p-4 transition-all hover:shadow-elevated active:scale-[0.995]"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{pickName(g) || g.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="rounded-lg">{tx('g.yearLabel', { n: g.level })}</Badge>
                        <span className="text-xs text-muted-foreground">{tx('g.online')}</span>
                      </div>
                    </div>
                    <Chevron className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Card>
                </motion.div>
              ))}
            </div>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
