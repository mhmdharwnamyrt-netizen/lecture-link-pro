import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, GraduationCap, BookOpen, ClipboardCheck, Search, LogOut, Shield } from 'lucide-react';

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ students: 0, doctors: 0, lectures: 0, attendance: 0, departments: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setIsAdmin(!!data);
    })();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    const [s, d, l, a, dep, p] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'doctor'),
      supabase.from('lectures').select('*', { count: 'exact', head: true }),
      supabase.from('attendance').select('*', { count: 'exact', head: true }),
      supabase.from('departments').select('*'),
      supabase.from('profiles').select('*, departments(name, name_ar)').order('created_at', { ascending: false }).limit(500),
    ]);
    setStats({
      students: s.count || 0,
      doctors: d.count || 0,
      lectures: l.count || 0,
      attendance: a.count || 0,
      departments: dep.data?.length || 0,
    });
    setDepartments(dep.data || []);
    setUsers(p.data || []);

    const { data: lec } = await supabase
      .from('lectures')
      .select('*, profiles(full_name), departments(name, name_ar), subjects(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    setLectures(lec || []);

    const { data: att } = await supabase
      .from('attendance')
      .select('*, profiles(full_name, student_id), lectures(title)')
      .order('created_at', { ascending: false })
      .limit(100);
    setAttendance(att || []);
  };

  const filteredUsers = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterDept !== 'all' && u.department_id !== filterDept) return false;
    if (search && !(u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                     u.student_id?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  if (loading || isAdmin === null) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center rounded-2xl bg-card p-8 shadow-card">
          <Shield className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-4">
            You don't have administrator privileges. Contact a system admin to grant you the <code className="rounded bg-muted px-1">admin</code> role.
          </p>
          <Button onClick={() => navigate(profile?.role === 'doctor' ? '/doctor' : '/student')} variant="outline" className="w-full">
            Back to App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">BSUT Attendance Control Center</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut().then(() => navigate('/login'))}>
            <LogOut className="me-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <StatCard icon={Users} label="Students" value={stats.students} />
          <StatCard icon={GraduationCap} label="Doctors" value={stats.doctors} />
          <StatCard icon={BookOpen} label="Lectures" value={stats.lectures} />
          <StatCard icon={ClipboardCheck} label="Attendance" value={stats.attendance} />
          <StatCard icon={Shield} label="Departments" value={stats.departments} />
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or ID..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground ms-auto">{filteredUsers.length} of {users.length}</p>
            </div>

            <div className="rounded-2xl bg-card shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{u.full_name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${u.role === 'doctor' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{u.student_id || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.departments?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.level || '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{u.points || 0}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.phone || '—'}</td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users match the filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Lectures */}
          <TabsContent value="lectures">
            <div className="rounded-2xl bg-card shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Hall</th>
                    <th className="px-4 py-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {lectures.map(l => (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{l.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.departments?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.day_of_week || '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{l.start_time?.slice(0,5)} - {l.end_time?.slice(0,5)}</td>
                      <td className="px-4 py-3">{l.hall_number || '—'}</td>
                      <td className="px-4 py-3">{l.is_active ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance">
            <div className="rounded-2xl bg-card shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Lecture</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">GPS</th>
                    <th className="px-4 py-3">Bio</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(a => (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{a.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.lectures?.title || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          a.status === 'present' ? 'bg-success/10 text-success' :
                          a.status === 'excused' ? 'bg-primary/10 text-primary' :
                          'bg-destructive/10 text-destructive'
                        }`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3">{a.location_verified ? '✓' : '—'}</td>
                      <td className="px-4 py-3">{a.biometric_verified ? '✓' : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Departments */}
          <TabsContent value="departments">
            <div className="grid gap-3 md:grid-cols-3">
              {departments.map(d => (
                <div key={d.id} className="rounded-2xl bg-card p-5 shadow-card">
                  <p className="font-bold">{d.name}</p>
                  <p className="text-sm text-muted-foreground">{d.name_ar}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {users.filter(u => u.department_id === d.id).length} users
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
