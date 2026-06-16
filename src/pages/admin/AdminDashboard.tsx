import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Users, GraduationCap, BookOpen, ClipboardCheck, Search, ArrowLeft, Shield, Ban, CheckCircle2,
  AlertTriangle, MessageSquare, Calendar, FileText, FileSpreadsheet, ScrollText, BarChart3,
  Activity, UserCog, Trash2, Building2, ShieldCheck, Megaphone, Layers, HeartPulse, Sparkles, Send
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { logAdminAction } from '@/lib/adminLog';
import { useToast } from '@/hooks/use-toast';
import CinematicLoader from '@/components/CinematicLoader';

function StatCard({ icon: Icon, label, value, hint, tone = 'primary' }: any) {
  const tones: any = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [stats, setStats] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [excuses, setExcuses] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [officeHours, setOfficeHours] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);

  const [filterRole, setFilterRole] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [attFrom, setAttFrom] = useState('');
  const [attTo, setAttTo] = useState('');

  const [disableTarget, setDisableTarget] = useState<any | null>(null);
  const [disableReason, setDisableReason] = useState('');

  // Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'student' | 'doctor'>('all');
  const [broadcasting, setBroadcasting] = useState(false);

  // Bulk ops
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user]);
  useEffect(() => {
    if (!user) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const loadAll = async () => {
    const [s, d, l, a, dep, p, ex, w, m, oh, ob, r, ur] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'doctor'),
      supabase.from('lectures').select('*', { count: 'exact', head: true }),
      supabase.from('attendance').select('*', { count: 'exact', head: true }),
      supabase.from('departments').select('*').order('name'),
      supabase.from('profiles').select('*, departments(name, name_ar)').order('created_at', { ascending: false }).limit(1000),
      supabase.from('excuses').select('*, profiles(full_name, student_id), lectures(title)').order('created_at', { ascending: false }).limit(200),
      supabase.from('warning_alerts').select('*, profiles(full_name, student_id)').order('created_at', { ascending: false }).limit(200),
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('office_hours').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(200),
      supabase.from('office_hour_bookings').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('lecture_ratings').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('user_roles').select('*'),
    ]);

    const disabledCount = (p.data || []).filter((u: any) => u.is_disabled).length;
    setStats({
      students: s.count || 0,
      doctors: d.count || 0,
      lectures: l.count || 0,
      attendance: a.count || 0,
      departments: dep.data?.length || 0,
      disabled: disabledCount,
      excuses: ex.data?.length || 0,
      warnings: w.data?.length || 0,
      messages: m.data?.length || 0,
      ratings: r.data?.length || 0,
    });
    setDepartments(dep.data || []);
    setUsers(p.data || []);
    setExcuses(ex.data || []);
    setWarnings(w.data || []);
    setMessages(m.data || []);
    setOfficeHours(oh.data || []);
    setBookings(ob.data || []);
    setRatings(r.data || []);
    setUserRoles(ur.data || []);

    const { data: lec } = await supabase
      .from('lectures')
      .select('*, profiles(full_name), departments(name, name_ar), subjects(name)')
      .order('created_at', { ascending: false })
      .limit(300);
    setLectures(lec || []);

    const { data: att } = await supabase
      .from('attendance')
      .select('*, profiles(full_name, student_id, department_id), lectures(title)')
      .order('created_at', { ascending: false })
      .limit(500);
    setAttendance(att || []);
  };

  const filteredUsers = users.filter(u => {
    if (filterRole === 'admin') {
      if (!userRoles.some(r => r.user_id === u.user_id && r.role === 'admin')) return false;
    } else if (filterRole === 'disabled') {
      if (!u.is_disabled) return false;
    } else if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterDept !== 'all' && u.department_id !== filterDept) return false;
    if (search && !(u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                     u.student_id?.toLowerCase().includes(search.toLowerCase()) ||
                     u.phone?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const filteredAttendance = attendance.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterDept !== 'all' && a.profiles?.department_id !== filterDept) return false;
    if (attFrom && new Date(a.created_at) < new Date(attFrom)) return false;
    if (attTo && new Date(a.created_at) > new Date(attTo + 'T23:59:59')) return false;
    return true;
  });

  // Actions
  const toggleDisable = async (u: any, enable: boolean) => {
    if (!enable) { setDisableTarget(u); return; }
    const { error } = await supabase
      .from('profiles')
      .update({ is_disabled: false, disabled_at: null, disabled_reason: null })
      .eq('id', u.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: 'user.enable', entity_type: 'profile', entity_id: u.id, details: { name: u.full_name } });
    toast({ title: 'User enabled', description: u.full_name });
    loadAll();
  };

  const confirmDisable = async () => {
    if (!disableTarget) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_disabled: true, disabled_at: new Date().toISOString(), disabled_reason: disableReason || 'Disabled by admin' })
      .eq('id', disableTarget.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: 'user.disable', entity_type: 'profile', entity_id: disableTarget.id, details: { name: disableTarget.full_name, reason: disableReason } });
    toast({ title: 'User disabled', description: disableTarget.full_name });
    setDisableTarget(null);
    setDisableReason('');
    loadAll();
  };

  const grantAdmin = async (u: any) => {
    const existing = userRoles.find(r => r.user_id === u.user_id && r.role === 'admin');
    if (existing) {
      const { error } = await supabase.from('user_roles').delete().eq('id', existing.id);
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
      await logAdminAction({ action: 'role.revoke', entity_type: 'user', entity_id: u.user_id, details: { name: u.full_name, role: 'admin' } });
      toast({ title: 'Admin revoked', description: u.full_name });
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: u.user_id, role: 'admin' });
      if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
      await logAdminAction({ action: 'role.grant', entity_type: 'user', entity_id: u.user_id, details: { name: u.full_name, role: 'admin' } });
      toast({ title: 'Admin granted', description: u.full_name });
    }
    loadAll();
  };

  const exportUsers = (kind: 'pdf' | 'excel') => {
    const rows = filteredUsers.map(u => ({
      studentName: u.full_name,
      studentId: u.student_id || u.user_id?.slice(0, 8),
      lectureTitle: u.departments?.name || '—',
      status: `${u.role}${u.is_disabled ? ' (disabled)' : ''}`,
      date: new Date(u.created_at).toLocaleDateString(),
      time: `pts: ${u.points || 0} · L${u.level || '-'}`,
    }));
    kind === 'pdf' ? exportToPDF(rows, 'Users') : exportToExcel(rows, 'Users');
  };

  const exportAttendance = (kind: 'pdf' | 'excel') => {
    const rows = filteredAttendance.map(a => ({
      studentName: a.profiles?.full_name || '—',
      studentId: a.profiles?.student_id || '—',
      lectureTitle: a.lectures?.title || '—',
      status: a.status,
      date: new Date(a.created_at).toLocaleDateString(),
      time: new Date(a.created_at).toLocaleTimeString(),
    }));
    kind === 'pdf' ? exportToPDF(rows, 'Attendance') : exportToExcel(rows, 'Attendance');
  };

  // Broadcast notification to many users
  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      return toast({ title: 'Title & message required', variant: 'destructive' });
    }
    setBroadcasting(true);
    try {
      const targets = users.filter(u => !u.is_disabled && (broadcastTarget === 'all' || u.role === broadcastTarget));
      const rows = targets.map(u => ({
        user_id: u.user_id,
        title: broadcastTitle.trim(),
        message: broadcastBody.trim(),
        type: 'announcement',
      }));
      // chunk insert to keep request size sane
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from('notifications').insert(chunk);
        if (error) throw error;
      }
      await logAdminAction({
        action: 'broadcast.send',
        details: { target: broadcastTarget, count: rows.length, title: broadcastTitle },
      });
      toast({ title: 'Broadcast sent', description: `${rows.length} recipients` });
      setBroadcastTitle(''); setBroadcastBody('');
    } catch (e: any) {
      toast({ title: 'Broadcast failed', description: e.message, variant: 'destructive' });
    } finally {
      setBroadcasting(false);
    }
  };

  const selectedIds = Object.keys(selected).filter(k => selected[k]);

  const bulkAction = async (kind: 'enable' | 'disable' | 'delete') => {
    if (selectedIds.length === 0) return toast({ title: 'Select users first', variant: 'destructive' });
    if (!confirm(`Apply "${kind}" to ${selectedIds.length} user(s)?`)) return;
    setBulkBusy(true);
    try {
      if (kind === 'enable') {
        await supabase.from('profiles').update({ is_disabled: false, disabled_at: null, disabled_reason: null }).in('id', selectedIds);
      } else if (kind === 'disable') {
        await supabase.from('profiles').update({ is_disabled: true, disabled_at: new Date().toISOString(), disabled_reason: 'Bulk disabled by admin' }).in('id', selectedIds);
      } else {
        await supabase.from('profiles').delete().in('id', selectedIds);
      }
      await logAdminAction({ action: `bulk.${kind}`, details: { count: selectedIds.length } });
      toast({ title: `Bulk ${kind} done`, description: `${selectedIds.length} user(s)` });
      setSelected({});
      loadAll();
    } catch (e: any) {
      toast({ title: 'Bulk action failed', description: e.message, variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  // ---- Derived analytics for AI insights & health ----
  const last24h = attendance.filter(a => Date.now() - new Date(a.created_at).getTime() < 86400_000);
  const presentRate = attendance.length ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;
  const offlineQueueSize = attendance.filter(a => !a.synced).length;
  const topAbsentees = users
    .filter(u => u.role === 'student')
    .map(u => ({ u, absents: attendance.filter(a => a.profiles?.full_name === u.full_name && a.status === 'absent').length }))
    .sort((a, b) => b.absents - a.absents)
    .slice(0, 5);


  if (loading || isAdmin === null) {
    return <CinematicLoader />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center rounded-2xl bg-card p-8 shadow-card">
          <Shield className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-4">
            You don't have administrator privileges.
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
              <h1 className="text-lg font-bold">Admin Control Center</h1>
              <p className="text-xs text-muted-foreground">BSUT Attendance — full system oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/admin/reports"><FileSpreadsheet className="me-2 h-4 w-4" /> Reports</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/logs"><ScrollText className="me-2 h-4 w-4" /> Logs</Link></Button>
            <Button variant="outline" size="sm" onClick={() => navigate(profile?.role === 'doctor' ? '/doctor' : '/student')}>
              <ArrowLeft className="me-2 h-4 w-4" /> Back to App
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <StatCard icon={Users} label="Students" value={stats.students} />
          <StatCard icon={GraduationCap} label="Doctors" value={stats.doctors} />
          <StatCard icon={BookOpen} label="Lectures" value={stats.lectures} />
          <StatCard icon={ClipboardCheck} label="Attendance" value={stats.attendance} tone="success" />
          <StatCard icon={Building2} label="Departments" value={stats.departments} />
          <StatCard icon={Ban} label="Disabled" value={stats.disabled} tone="destructive" />
          <StatCard icon={AlertTriangle} label="Excuses" value={stats.excuses} tone="warning" />
          <StatCard icon={Activity} label="Warnings" value={stats.warnings} tone="warning" />
          <StatCard icon={MessageSquare} label="Messages" value={stats.messages} />
          <StatCard icon={BarChart3} label="Ratings" value={stats.ratings} />
        </div>

        <Tabs defaultValue="users">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="excuses">Excuses</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
            <TabsTrigger value="office">Office Hours</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="broadcast"><Megaphone className="me-1 h-3.5 w-3.5" /> Broadcast</TabsTrigger>
            <TabsTrigger value="bulk"><Layers className="me-1 h-3.5 w-3.5" /> Bulk Ops</TabsTrigger>
            <TabsTrigger value="health"><HeartPulse className="me-1 h-3.5 w-3.5" /> Health</TabsTrigger>
            <TabsTrigger value="insights"><Sparkles className="me-1 h-3.5 w-3.5" /> AI Insights</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, ID or phone..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="disabled">Disabled only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => exportUsers('pdf')}><FileText className="me-1.5 h-4 w-4" /> PDF</Button>
              <Button variant="outline" size="sm" onClick={() => exportUsers('excel')}><FileSpreadsheet className="me-1.5 h-4 w-4" /> Excel</Button>
              <p className="text-sm text-muted-foreground ms-auto">{filteredUsers.length} / {users.length}</p>
            </div>

            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left whitespace-nowrap">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const isUserAdmin = userRoles.some(r => r.user_id === u.user_id && r.role === 'admin');
                    return (
                      <tr key={u.id} className={`border-t border-border hover:bg-muted/30 ${u.is_disabled ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3 font-medium">
                          {u.full_name}
                          {isUserAdmin && <span className="ms-2 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">ADMIN</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${u.role === 'doctor' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{u.student_id || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.departments?.name || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.level || '—'}</td>
                        <td className="px-4 py-3 tabular-nums font-medium">{u.points || 0}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.phone || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {u.is_disabled
                            ? <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs">Disabled</span>
                            : <span className="rounded-full bg-success/10 text-success px-2 py-0.5 text-xs">Active</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => grantAdmin(u)} title={isUserAdmin ? 'Revoke admin' : 'Grant admin'}>
                              {isUserAdmin ? <ShieldCheck className="h-3.5 w-3.5 text-primary" /> : <UserCog className="h-3.5 w-3.5" />}
                            </Button>
                            {u.is_disabled
                              ? <Button size="sm" variant="outline" className="h-7 px-2 text-success" onClick={() => toggleDisable(u, true)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                              : <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={() => toggleDisable(u, false)}><Ban className="h-3.5 w-3.5" /></Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No users match the filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Lectures */}
          <TabsContent value="lectures">
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left whitespace-nowrap">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Doctor</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Hall</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {lectures.map(l => (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{l.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.departments?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.subjects?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.day_of_week || '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{l.start_time?.slice(0,5)} - {l.end_time?.slice(0,5)}</td>
                      <td className="px-4 py-3">{l.hall_number || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.level || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.type || '—'}</td>
                      <td className="px-4 py-3">{l.is_active ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={attFrom} onChange={e => setAttFrom(e.target.value)} className="w-[150px]" />
              <Input type="date" value={attTo} onChange={e => setAttTo(e.target.value)} className="w-[150px]" />
              <Button variant="outline" size="sm" onClick={() => exportAttendance('pdf')}><FileText className="me-1.5 h-4 w-4" /> PDF</Button>
              <Button variant="outline" size="sm" onClick={() => exportAttendance('excel')}><FileSpreadsheet className="me-1.5 h-4 w-4" /> Excel</Button>
              <p className="text-sm text-muted-foreground ms-auto">{filteredAttendance.length}</p>
            </div>
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left whitespace-nowrap">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Lecture</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">GPS</th>
                    <th className="px-4 py-3">Bio</th>
                    <th className="px-4 py-3">Synced</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map(a => (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{a.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{a.profiles?.student_id || '—'}</td>
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
                      <td className="px-4 py-3">{a.synced ? '✓' : '⏳'}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Excuses */}
          <TabsContent value="excuses">
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left">
                  <th className="px-4 py-3">Student</th><th className="px-4 py-3">Lecture</th>
                  <th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th>
                </tr></thead>
                <tbody>
                  {excuses.map(e => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{e.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.lectures?.title || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{e.reason}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{e.status}</span></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {excuses.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No excuses</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Warnings */}
          <TabsContent value="warnings">
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left">
                  <th className="px-4 py-3">Student</th><th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Reason</th><th className="px-4 py-3">Date</th>
                </tr></thead>
                <tbody>
                  {warnings.map(w => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{w.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          w.risk_level === 'high' ? 'bg-destructive/10 text-destructive' :
                          w.risk_level === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted'
                        }`}>{w.risk_level || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{w.message || w.alert_type}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {warnings.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No warnings</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Office Hours */}
          <TabsContent value="office">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-card shadow-card overflow-hidden">
                <div className="border-b border-border bg-muted/50 px-4 py-2 font-semibold">Office Hour Slots</div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/30"><tr className="text-left">
                    <th className="px-4 py-2">Doctor</th><th className="px-4 py-2">Day</th><th className="px-4 py-2">Time</th>
                  </tr></thead>
                  <tbody>
                    {officeHours.map(o => (
                      <tr key={o.id} className="border-t border-border">
                        <td className="px-4 py-2">{o.profiles?.full_name || '—'}</td>
                        <td className="px-4 py-2">{o.day_of_week}</td>
                        <td className="px-4 py-2 tabular-nums">{o.start_time?.slice(0,5)}-{o.end_time?.slice(0,5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-2xl bg-card shadow-card overflow-hidden">
                <div className="border-b border-border bg-muted/50 px-4 py-2 font-semibold">Bookings ({bookings.length})</div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/30"><tr className="text-left">
                    <th className="px-4 py-2">Booking date</th><th className="px-4 py-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(b.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Ratings */}
          <TabsContent value="ratings">
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left">
                  <th className="px-4 py-3">Lecture ID</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Comment</th><th className="px-4 py-3">Date</th>
                </tr></thead>
                <tbody>
                  {ratings.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{String(r.lecture_id).slice(0, 8)}</td>
                      <td className="px-4 py-3">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-md truncate">{r.comment || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {ratings.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No ratings</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-left">
                  <th className="px-4 py-3">From</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Content</th><th className="px-4 py-3">Read</th><th className="px-4 py-3">Date</th>
                </tr></thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{String(m.sender_id).slice(0, 8)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{String(m.receiver_id).slice(0, 8)}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-md truncate">{m.content}</td>
                      <td className="px-4 py-3">{m.read ? '✓' : '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(m.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {messages.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No messages</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Departments */}
          <TabsContent value="departments">
            <div className="grid gap-3 md:grid-cols-3">
              {departments.map(d => {
                const deptUsers = users.filter(u => u.department_id === d.id);
                const studentCount = deptUsers.filter(u => u.role === 'student').length;
                const doctorCount = deptUsers.filter(u => u.role === 'doctor').length;
                const disabledCount = deptUsers.filter(u => u.is_disabled).length;
                const deptLectures = lectures.filter(l => l.department_id === d.id).length;
                return (
                  <div key={d.id} className="rounded-2xl bg-card p-5 shadow-card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold">{d.name}</p>
                        <p className="text-sm text-muted-foreground">{d.name_ar}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">Students</p><p className="font-bold tabular-nums">{studentCount}</p></div>
                      <div className="rounded-lg bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">Doctors</p><p className="font-bold tabular-nums">{doctorCount}</p></div>
                      <div className="rounded-lg bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">Lectures</p><p className="font-bold tabular-nums">{deptLectures}</p></div>
                      <div className="rounded-lg bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">Disabled</p><p className="font-bold tabular-nums text-destructive">{disabledCount}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Disable dialog */}
      <Dialog open={!!disableTarget} onOpenChange={(v) => !v && setDisableTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable account: {disableTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The user will be signed out and shown a "Account disabled" screen with the support phone number.
          </p>
          <Textarea
            placeholder="Reason (shown to the user)"
            value={disableReason}
            onChange={e => setDisableReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDisable}><Ban className="me-2 h-4 w-4" /> Disable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
