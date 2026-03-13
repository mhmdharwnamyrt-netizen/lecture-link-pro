import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ExcuseDialog from '@/components/student/ExcuseDialog';

export default function StudentLectures() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [showExcuse, setShowExcuse] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) navigate('/login');
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) loadLectures();
  }, [profile]);

  const loadLectures = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('lectures')
      .select('*, departments(name), subjects(name), profiles!lectures_doctor_id_fkey(full_name)')
      .eq('department_id', profile.department_id!)
      .eq('level', profile.level!)
      .order('created_at', { ascending: false });

    if (data) {
      const { data: attended } = await supabase
        .from('attendance')
        .select('lecture_id, status')
        .eq('student_id', profile.id)
        .in('lecture_id', data.map(l => l.id));

      const attendMap = new Map(attended?.map(a => [a.lecture_id, a.status]) || []);
      setLectures(data.map(l => ({ ...l, attendanceStatus: attendMap.get(l.id) || null })));
    }
  };

  const filtered = lectures.filter(l => {
    if (tab === 'active' && !l.is_active) return false;
    if (tab === 'past' && l.is_active) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading || !profile) return null;

  return (
    <MobileLayout role="student">
      <div className="md:ml-64">
        <div className="px-4 pt-6 md:px-8">
          <h1 className="mb-4 text-2xl font-bold">My Lectures</h1>

          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="h-12 rounded-xl pl-10" />
          </div>

          <div className="mb-4 flex gap-2 rounded-xl bg-muted p-1">
            <button onClick={() => setTab('active')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'active' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>Active</button>
            <button onClick={() => setTab('past')} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'past' ? 'bg-card shadow-card' : 'text-muted-foreground'}`}>Past</button>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-card p-8 text-center shadow-card">
                <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No lectures found</p>
              </div>
            ) : (
              filtered.map(l => (
                <div key={l.id} className="rounded-2xl bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{l.title}</p>
                      <p className="text-sm text-muted-foreground">{l.profiles?.full_name} • Hall {l.hall_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <span className={`rounded-xl px-3 py-1 text-xs font-medium ${
                      l.attendanceStatus === 'present' ? 'bg-success/10 text-success' :
                      l.attendanceStatus === 'excused' ? 'bg-warning/10 text-warning' :
                      l.is_active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {l.attendanceStatus || (l.is_active ? 'Active' : 'Missed')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {showExcuse && (
        <ExcuseDialog lectureId={showExcuse} studentId={profile.id} onClose={() => setShowExcuse(null)} onSubmitted={loadLectures} />
      )}
    </MobileLayout>
  );
}
