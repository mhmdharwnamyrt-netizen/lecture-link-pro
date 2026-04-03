import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { BookOpen, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function DoctorLectures() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lecture' | 'section'>('all');
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, { present: number; excused: number }>>({});

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'doctor')) navigate('/login');
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) loadLectures();
  }, [profile]);

  const loadLectures = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('lectures')
      .select('*, departments(name), subjects(name)')
      .eq('doctor_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      setLectures(data);
      // Load attendance counts
      const ids = data.map(l => l.id);
      if (ids.length > 0) {
        const { data: att } = await supabase.from('attendance').select('lecture_id, status').in('lecture_id', ids);
        const counts: Record<string, { present: number; excused: number }> = {};
        att?.forEach(a => {
          if (!counts[a.lecture_id]) counts[a.lecture_id] = { present: 0, excused: 0 };
          if (a.status === 'present') counts[a.lecture_id].present++;
          if (a.status === 'excused') counts[a.lecture_id].excused++;
        });
        setAttendanceCounts(counts);
      }
    }
  };

  const filtered = lectures.filter(l => {
    if (filterType !== 'all' && l.type !== filterType) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading || !profile) return null;

  return (
    <MobileLayout role="doctor">
      <div >
        <div className="px-4 pt-6 md:px-8">
          <h1 className="mb-4 text-2xl font-bold">Lectures</h1>

          {/* Search & Filter */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search lectures..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-12 rounded-xl pl-10"
              />
            </div>
          </div>

          {/* Filter Chips */}
          <div className="mb-4 flex gap-2">
            {(['all', 'lecture', 'section'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                {t === 'all' ? 'All' : t === 'lecture' ? 'Lectures' : 'Sections'}
              </button>
            ))}
          </div>

          {/* Lecture List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-card p-8 text-center shadow-card">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No lectures found</p>
              </div>
            ) : (
              filtered.map((lecture, i) => {
                const count = attendanceCounts[lecture.id] || { present: 0, excused: 0 };
                return (
                  <motion.div
                    key={lecture.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/doctor/lectures/${lecture.id}`)}
                    className="cursor-pointer rounded-2xl bg-card p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${lecture.type === 'section' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                            {lecture.type}
                          </span>
                          <span className="text-xs text-muted-foreground">Hall {lecture.hall_number}</span>
                        </div>
                        <p className="mt-1 font-semibold">{lecture.title}</p>
                        <p className="text-sm text-muted-foreground">{lecture.departments?.name} • Level {lecture.level}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums text-success">{count.present}</p>
                        <p className="text-xs text-muted-foreground">present</p>
                        {count.excused > 0 && (
                          <p className="text-xs text-warning">{count.excused} excused</p>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(lecture.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </p>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
