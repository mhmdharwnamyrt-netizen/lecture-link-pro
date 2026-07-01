import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, FileSpreadsheet, Users, BookOpen, Activity, Shield } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';

export default function AdminReports() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dept, setDept] = useState('all');
  const [departments, setDepartments] = useState<any[]>([]);

  // Datasets
  const [users, setUsers] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user]);
  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle().then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from('departments').select('*').then(({ data }) => setDepartments(data || []));
      loadAll();
    }
  }, [isAdmin]);

  const dateBetween = (q: any) => {
    if (from) q = q.gte('created_at', new Date(from).toISOString());
    if (to) q = q.lte('created_at', new Date(to + 'T23:59:59').toISOString());
    return q;
  };

  const loadAll = async () => {
    setBusy(true);
    let uq = supabase.from('profiles').select('*, departments(name, name_ar)').order('created_at', { ascending: false });
    if (dept !== 'all') uq = uq.eq('department_id', dept);
    uq = dateBetween(uq);
    const { data: u } = await uq.limit(2000);
    setUsers(u || []);

    let lq = supabase.from('lectures').select('*, profiles(full_name), departments(name)').order('created_at', { ascending: false });
    if (dept !== 'all') lq = lq.eq('department_id', dept);
    lq = dateBetween(lq);
    const { data: l } = await lq.limit(2000);
    setLectures(l || []);

    let aq = supabase
      .from('attendance')
      .select('*, profiles(full_name, student_id, department_id), lectures(title, department_id)')
      .order('created_at', { ascending: false });
    aq = dateBetween(aq);
    const { data: a } = await aq.limit(3000);
    let arr = a || [];
    if (dept !== 'all') arr = arr.filter((r: any) => r.profiles?.department_id === dept || r.lectures?.department_id === dept);
    setActivity(arr);

    setBusy(false);
  };

  const stats = {
    students: users.filter(u => u.role === 'student').length,
    doctors: users.filter(u => u.role === 'doctor').length,
    disabled: users.filter(u => u.is_disabled).length,
    present: activity.filter(a => a.status === 'present').length,
    absent: activity.filter(a => a.status === 'absent').length,
    excused: activity.filter(a => a.status === 'excused').length,
  };

  const usersRows = users.map(u => ({
    studentName: u.full_name,
    studentId: u.student_id || u.user_id?.slice(0, 8),
    lectureTitle: u.departments?.name || '—',
    status: `${u.role}${u.is_disabled ? ' (disabled)' : ''}`,
    date: new Date(u.created_at).toLocaleDateString(),
    time: `pts: ${u.points || 0}`,
  }));

  const lecturesRows = lectures.map(l => ({
    studentName: l.title,
    studentId: l.hall_number || '—',
    lectureTitle: l.profiles?.full_name || '—',
    status: l.is_active ? 'active' : 'inactive',
    date: l.day_of_week || '—',
    time: `${l.start_time?.slice(0,5)}-${l.end_time?.slice(0,5)}`,
  }));

  const activityRows = activity.map(a => ({
    studentName: a.profiles?.full_name || '—',
    studentId: a.profiles?.student_id || '—',
    lectureTitle: a.lectures?.title || '—',
    status: a.status,
    date: new Date(a.created_at).toLocaleDateString(),
    time: new Date(a.created_at).toLocaleTimeString(),
  }));

  if (loading || isAdmin === null) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center"><Shield className="h-10 w-10 text-destructive" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">Reports Center</h1>
            <p className="text-xs text-muted-foreground">Users · Lectures · Activity — filter and export</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="grid gap-3 md:grid-cols-5 rounded-2xl bg-card p-4 shadow-card">
          <div>
            <p className="text-xs text-muted-foreground mb-1">From</p>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">To</p>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Department</p>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={loadAll} disabled={busy} className="w-full">Apply filters</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          {[
            { label: 'Students', value: stats.students, icon: Users },
            { label: 'Doctors', value: stats.doctors, icon: Users },
            { label: 'Disabled', value: stats.disabled, icon: Shield },
            { label: 'Present', value: stats.present, icon: Activity },
            { label: 'Absent', value: stats.absent, icon: Activity },
            { label: 'Excused', value: stats.excused, icon: Activity },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-card p-4 shadow-card">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="users"><Users className="me-1.5 h-4 w-4" /> Users Report</TabsTrigger>
            <TabsTrigger value="lectures"><BookOpen className="me-1.5 h-4 w-4" /> Lectures Report</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="me-1.5 h-4 w-4" /> Activity Report</TabsTrigger>
          </TabsList>

          {[
            { id: 'users', rows: usersRows, title: 'Users Report', cols: ['Name', 'ID', 'Department', 'Role', 'Joined', 'Points'] },
            { id: 'lectures', rows: lecturesRows, title: 'Lectures Report', cols: ['Title', 'Hall', 'Doctor', 'Status', 'Day', 'Time'] },
            { id: 'activity', rows: activityRows, title: 'General Activity', cols: ['Student', 'ID', 'Lecture', 'Status', 'Date', 'Time'] },
          ].map(t => (
            <TabsContent key={t.id} value={t.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{t.rows.length} records</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportToPDF(t.rows, t.title)}><FileText className="me-1.5 h-4 w-4" /> PDF</Button>
                  <Button variant="outline" size="sm" onClick={() => exportToExcel(t.rows, t.title)}><FileSpreadsheet className="me-1.5 h-4 w-4" /> Excel</Button>
                </div>
              </div>
              <div className="rounded-2xl bg-card shadow-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr className="text-left">{t.cols.map(c => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead>
                  <tbody>
                    {t.rows.slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{r.studentName}</td>
                        <td className="px-4 py-3 tabular-nums">{r.studentId}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.lectureTitle}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{r.time}</td>
                      </tr>
                    ))}
                    {t.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No data</td></tr>}
                  </tbody>
                </table>
                {t.rows.length > 200 && <p className="px-4 py-2 text-xs text-muted-foreground text-center">Showing 200 of {t.rows.length} — export for full data</p>}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
