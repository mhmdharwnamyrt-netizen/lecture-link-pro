import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Users, GraduationCap, BookOpen, ClipboardCheck, Search, ArrowLeft, Shield, Ban, CheckCircle2,
  AlertTriangle, MessageSquare, Calendar, FileText, FileSpreadsheet, ScrollText, BarChart3,
  Activity, UserCog, Trash2, Building2, ShieldCheck, Megaphone, Layers, HeartPulse, Sparkles, Send,
  Plus, Pencil, Wrench, Bell, Radio, BookMarked, RotateCcw, XCircle, Languages
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
  const { user, profile, loading } = useAuth();
  const { t, isRTL, language, setLanguage } = useLanguage();
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

  // New: departments/subjects CRUD
  const [subjects, setSubjects] = useState<any[]>([]);
  const [deptDialog, setDeptDialog] = useState<{ open: boolean; edit?: any }>({ open: false });
  const [deptForm, setDeptForm] = useState({ name: '', name_ar: '', code: '' });
  const [subjDialog, setSubjDialog] = useState<{ open: boolean; edit?: any }>({ open: false });
  const [subjForm, setSubjForm] = useState({ name: '', code: '', department_id: '' });

  // New: notifications inbox admin
  const [allNotifications, setAllNotifications] = useState<any[]>([]);

  // New: maintenance
  const [maintBusy, setMaintBusy] = useState<string | null>(null);

  // New: live feed
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [liveFilterKind, setLiveFilterKind] = useState<string>('all');
  const [liveFilterSeverity, setLiveFilterSeverity] = useState<string>('all');
  const [liveFilterDept, setLiveFilterDept] = useState<string>('all');
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [integrity, setIntegrity] = useState<any>(null);


  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user]);
  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle().then(({ data }) => setIsAdmin(!!data));
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

    const [sj, nt] = await Promise.all([
      supabase.from('subjects').select('*, departments(name)').order('name'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(300),
    ]);
    setSubjects(sj.data || []);
    setAllNotifications(nt.data || []);
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

  // ---- Departments CRUD ----
  const openDeptDialog = (edit?: any) => {
    setDeptForm(edit ? { name: edit.name || '', name_ar: edit.name_ar || '', code: edit.code || '' } : { name: '', name_ar: '', code: '' });
    setDeptDialog({ open: true, edit });
  };
  const saveDept = async () => {
    if (!deptForm.name.trim()) return toast({ title: 'Name required', variant: 'destructive' });
    const payload = { name: deptForm.name.trim(), name_ar: deptForm.name_ar.trim() || null, code: deptForm.code.trim() || null };
    const q = deptDialog.edit
      ? supabase.from('departments').update(payload).eq('id', deptDialog.edit.id)
      : supabase.from('departments').insert(payload);
    const { error } = await q;
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: deptDialog.edit ? 'dept.update' : 'dept.create', entity_type: 'department', details: payload });
    toast({ title: deptDialog.edit ? 'Department updated' : 'Department created' });
    setDeptDialog({ open: false });
    loadAll();
  };
  const deleteDept = async (d: any) => {
    if (!confirm(`Delete department "${d.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('departments').delete().eq('id', d.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: 'dept.delete', entity_type: 'department', entity_id: d.id, details: { name: d.name } });
    toast({ title: 'Department deleted' });
    loadAll();
  };

  // ---- Subjects CRUD ----
  const openSubjDialog = (edit?: any) => {
    setSubjForm(edit ? { name: edit.name || '', code: edit.code || '', department_id: edit.department_id || '' } : { name: '', code: '', department_id: '' });
    setSubjDialog({ open: true, edit });
  };
  const saveSubj = async () => {
    if (!subjForm.name.trim() || !subjForm.department_id) return toast({ title: 'Name and department required', variant: 'destructive' });
    const payload = { name: subjForm.name.trim(), code: subjForm.code.trim() || null, department_id: subjForm.department_id };
    const q = subjDialog.edit
      ? supabase.from('subjects').update(payload).eq('id', subjDialog.edit.id)
      : supabase.from('subjects').insert(payload);
    const { error } = await q;
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: subjDialog.edit ? 'subject.update' : 'subject.create', entity_type: 'subject', details: payload });
    toast({ title: subjDialog.edit ? 'Subject updated' : 'Subject created' });
    setSubjDialog({ open: false });
    loadAll();
  };
  const deleteSubj = async (s: any) => {
    if (!confirm(`Delete subject "${s.name}"?`)) return;
    const { error } = await supabase.from('subjects').delete().eq('id', s.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: 'subject.delete', entity_type: 'subject', entity_id: s.id, details: { name: s.name } });
    toast({ title: 'Subject deleted' });
    loadAll();
  };

  // ---- Moderation deletes ----
  const deleteRow = async (table: 'messages' | 'lecture_ratings' | 'warning_alerts' | 'notifications', id: string, label: string) => {
    if (!confirm(`Delete this ${label}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: `${table}.delete`, entity_type: table, entity_id: id });
    toast({ title: `${label} deleted` });
    loadAll();
  };

  // ---- Maintenance actions ----
  const runMaintenance = async (kind: 'recompute-points' | 'mark-synced' | 'purge-typing' | 'purge-read-notifications' | 'run-ai' | 'rebuild-stats' | 'integrity-check' | 'health-check' | 'purge-events') => {
    setMaintBusy(kind);
    try {
      if (kind === 'recompute-points') {
        // 3 points per present attendance + 3 per approved excuse
        const students = users.filter(u => u.role === 'student');
        let updated = 0;
        for (const s of students) {
          const [{ count: pCount }, { count: eCount }] = await Promise.all([
            supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', s.user_id).eq('status', 'present'),
            supabase.from('excuses').select('*', { count: 'exact', head: true }).eq('student_id', s.user_id).eq('status', 'approved'),
          ]);
          const points = ((pCount || 0) + (eCount || 0)) * 3;
          const level = Math.max(1, Math.floor(points / 30) + 1);
          if (points !== (s.points || 0) || level !== (s.level || 1)) {
            await supabase.from('profiles').update({ points, level }).eq('id', s.id);
            updated++;
          }
        }
        await logAdminAction({ action: 'maintenance.recompute_points', details: { updated } });
        toast({ title: 'Points recomputed', description: `${updated} student(s) updated` });
      } else if (kind === 'mark-synced') {
        const { data, error } = await supabase.from('attendance').update({ synced: true }).eq('synced', false).select('id');
        if (error) throw error;
        const count = data?.length || 0;
        await logAdminAction({ action: 'maintenance.mark_synced', details: { count } });
        toast({ title: 'Attendance rows marked synced', description: `${count || 0} row(s)` });
      } else if (kind === 'purge-typing') {
        const cutoff = new Date(Date.now() - 60_000).toISOString();
        const { error } = await supabase.from('typing_indicators').delete().lt('updated_at', cutoff);
        if (error) throw error;
        await logAdminAction({ action: 'maintenance.purge_typing' });
        toast({ title: 'Stale typing indicators purged' });
      } else if (kind === 'purge-read-notifications') {
        const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString();
        const { error } = await supabase.from('notifications').delete().eq('read', true).lt('created_at', cutoff);
        if (error) throw error;
        await logAdminAction({ action: 'maintenance.purge_notifications' });
        toast({ title: 'Old read notifications purged' });
      } else if (kind === 'run-ai') {
        const { data, error } = await supabase.functions.invoke('scheduled-attendance-analysis', { body: {} });
        if (error) throw error;
        await logAdminAction({ action: 'maintenance.run_ai_analysis', details: data });
        toast({ title: 'AI analysis complete', description: `${data?.totalAlerts ?? 0} new alerts` });
      } else if (kind === 'rebuild-stats') {
        const { data, error } = await supabase.rpc('rebuild_statistics');
        if (error) throw error;
        await logAdminAction({ action: 'maintenance.rebuild_stats', details: { result: data } });
        toast({ title: 'Statistics rebuilt', description: String(data) });
      } else if (kind === 'integrity-check') {
        const { data, error } = await supabase.rpc('db_integrity_check');
        if (error) throw error;
        setIntegrity(data);
        await logAdminAction({ action: 'maintenance.integrity_check', details: data as any });
        toast({ title: 'Integrity check complete' });
      } else if (kind === 'health-check') {
        const { data, error } = await supabase.rpc('db_health_snapshot');
        if (error) throw error;
        setDbHealth(data);
        toast({ title: 'DB health snapshot updated' });
      } else if (kind === 'purge-events') {
        const cutoff = new Date(Date.now() - 90 * 86400_000).toISOString();
        const { error } = await supabase.from('activity_events').delete().lt('created_at', cutoff);
        if (error) throw error;
        await logAdminAction({ action: 'maintenance.purge_events' });
        toast({ title: 'Old activity events purged' });
      }
      loadAll();
    } catch (e: any) {
      toast({ title: 'Maintenance failed', description: e.message, variant: 'destructive' });
    } finally {
      setMaintBusy(null);
    }
  };

  // ---- Excuse approval workflow ----
  const reviewExcuse = async (e: any, decision: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('excuses')
      .update({ status: decision, reviewed_by: user?.id, updated_at: new Date().toISOString() })
      .eq('id', e.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    if (decision === 'approved' && e.student_id) {
      // Award 3 points + push a notification
      const target = users.find(u => u.user_id === e.student_id);
      if (target) {
        await supabase.from('profiles').update({
          points: (target.points || 0) + 3,
          level: Math.max(1, Math.floor(((target.points || 0) + 3) / 30) + 1),
        }).eq('id', target.id);
      }
      await supabase.from('notifications').insert({
        user_id: e.student_id,
        title: 'تم قبول عذرك / Excuse approved',
        message: e.reason || 'Your excuse has been approved.',
        type: 'excuse',
      });
    } else if (decision === 'rejected' && e.student_id) {
      await supabase.from('notifications').insert({
        user_id: e.student_id,
        title: 'تم رفض عذرك / Excuse rejected',
        message: e.reason || 'Your excuse has been rejected.',
        type: 'excuse',
      });
    }
    await logAdminAction({ action: `excuse.${decision}`, entity_type: 'excuse', entity_id: e.id });
    toast({ title: decision === 'approved' ? 'Excuse approved' : 'Excuse rejected' });
    loadAll();
  };

  // ---- Warning resolve ----
  const resolveWarning = async (w: any) => {
    const { error } = await supabase.from('warning_alerts').update({ is_resolved: true }).eq('id', w.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: 'warning.resolve', entity_type: 'warning', entity_id: w.id });
    toast({ title: 'Warning resolved' });
    loadAll();
  };

  // ---- Cancel office-hours booking ----
  const cancelBooking = async (b: any) => {
    if (!confirm('Cancel this booking?')) return;
    const { error } = await supabase.from('office_hour_bookings').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id,
      reason: 'Cancelled by admin',
    }).eq('id', b.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    if (b.student_id) {
      await supabase.from('notifications').insert({
        user_id: b.student_id,
        title: 'تم إلغاء الحجز / Booking cancelled',
        message: 'Your office-hours booking was cancelled by an administrator.',
        type: 'office_hours',
      });
    }
    await logAdminAction({ action: 'booking.cancel', entity_type: 'booking', entity_id: b.id });
    toast({ title: 'Booking cancelled' });
    loadAll();
  };

  // ---- Lecture toggle / delete ----
  const toggleLecture = async (l: any) => {
    const { error } = await supabase.from('lectures').update({ is_active: !l.is_active }).eq('id', l.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: 'lecture.toggle', entity_type: 'lecture', entity_id: l.id, details: { active: !l.is_active } });
    loadAll();
  };
  const deleteLecture = async (l: any) => {
    if (!confirm(`Delete lecture "${l.title}"? Attendance rows will also be removed.`)) return;
    const { error } = await supabase.from('lectures').delete().eq('id', l.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    await logAdminAction({ action: 'lecture.delete', entity_type: 'lecture', entity_id: l.id, details: { title: l.title } });
    toast({ title: 'Lecture deleted' });
    loadAll();
  };


  useEffect(() => {
    if (!isAdmin) return;
    // Load recent persisted events
    (async () => {
      const { data } = await supabase
        .from('activity_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setLiveEvents(data || []);
    })();
    const channel = supabase
      .channel('admin-activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_events' },
        (p: any) => setLiveEvents(evs => [p.new, ...evs].slice(0, 200)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);


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
      <div dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center rounded-2xl bg-card p-8 shadow-card">
          <Shield className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold mb-2">{t('admin.accessDenied')}</h1>
          <p className="text-sm text-muted-foreground mb-4">{t('admin.noPrivileges')}</p>
          <Button onClick={() => navigate(profile?.role === 'doctor' ? '/doctor' : '/student')} variant="outline" className="w-full">
            {t('admin.backToApp')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{t('admin.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('admin.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <Languages className="me-2 h-4 w-4" />
              {language === 'ar' ? 'EN' : 'ع'}
            </Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/reports"><FileSpreadsheet className="me-2 h-4 w-4" /> {t('admin.reports')}</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/moderation"><Flag className="me-2 h-4 w-4" /> {language === 'ar' ? 'الإشراف' : 'Moderation'}</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/admin/logs"><ScrollText className="me-2 h-4 w-4" /> {t('admin.logs')}</Link></Button>
            <Button variant="outline" size="sm" onClick={() => navigate(profile?.role === 'doctor' ? '/doctor' : '/student')}>
              <ArrowLeft className="me-2 h-4 w-4" /> {t('admin.backToApp')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <StatCard icon={Users} label={t('admin.stat.students')} value={stats.students} />
          <StatCard icon={GraduationCap} label={t('admin.stat.doctors')} value={stats.doctors} />
          <StatCard icon={BookOpen} label={t('admin.stat.lectures')} value={stats.lectures} />
          <StatCard icon={ClipboardCheck} label={t('admin.stat.attendance')} value={stats.attendance} tone="success" />
          <StatCard icon={Building2} label={t('admin.stat.departments')} value={stats.departments} />
          <StatCard icon={Ban} label={t('admin.stat.disabled')} value={stats.disabled} tone="destructive" />
          <StatCard icon={AlertTriangle} label={t('admin.stat.excuses')} value={stats.excuses} tone="warning" />
          <StatCard icon={Activity} label={t('admin.stat.warnings')} value={stats.warnings} tone="warning" />
          <StatCard icon={MessageSquare} label={t('admin.stat.messages')} value={stats.messages} />
          <StatCard icon={BarChart3} label={t('admin.stat.ratings')} value={stats.ratings} />
        </div>


        <Tabs defaultValue="users">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="users">{t('admin.tab.users')}</TabsTrigger>
            <TabsTrigger value="lectures">{t('admin.tab.lectures')}</TabsTrigger>
            <TabsTrigger value="attendance">{t('admin.tab.attendance')}</TabsTrigger>
            <TabsTrigger value="excuses">{t('admin.tab.excuses')}</TabsTrigger>
            <TabsTrigger value="warnings">{t('admin.tab.warnings')}</TabsTrigger>
            <TabsTrigger value="office">{t('admin.tab.office')}</TabsTrigger>
            <TabsTrigger value="ratings">{t('admin.tab.ratings')}</TabsTrigger>
            <TabsTrigger value="messages">{t('admin.tab.messages')}</TabsTrigger>
            <TabsTrigger value="departments">{t('admin.tab.departments')}</TabsTrigger>
            <TabsTrigger value="broadcast"><Megaphone className="me-1 h-3.5 w-3.5" /> {t('admin.tab.broadcast')}</TabsTrigger>
            <TabsTrigger value="bulk"><Layers className="me-1 h-3.5 w-3.5" /> {t('admin.tab.bulk')}</TabsTrigger>
            <TabsTrigger value="health"><HeartPulse className="me-1 h-3.5 w-3.5" /> {t('admin.tab.health')}</TabsTrigger>
            <TabsTrigger value="subjects"><BookMarked className="me-1 h-3.5 w-3.5" /> {t('admin.tab.subjects')}</TabsTrigger>
            <TabsTrigger value="notif"><Bell className="me-1 h-3.5 w-3.5" /> {t('admin.tab.notif')}</TabsTrigger>
            <TabsTrigger value="maintenance"><Wrench className="me-1 h-3.5 w-3.5" /> {t('admin.tab.maintenance')}</TabsTrigger>
            <TabsTrigger value="live"><Radio className="me-1 h-3.5 w-3.5" /> {t('admin.tab.live')}</TabsTrigger>
            <TabsTrigger value="insights"><Sparkles className="me-1 h-3.5 w-3.5" /> {t('admin.tab.insights')}</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('admin.searchUsers')} className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.filter.allRoles')}</SelectItem>
                  <SelectItem value="student">{t('admin.filter.students')}</SelectItem>
                  <SelectItem value="doctor">{t('admin.filter.doctors')}</SelectItem>
                  <SelectItem value="admin">{t('admin.filter.admins')}</SelectItem>
                  <SelectItem value="disabled">{t('admin.filter.disabledOnly')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.filter.allDepts')}</SelectItem>
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
                  <tr className="text-start whitespace-nowrap">
                    <th className="px-4 py-3 text-start">{t('admin.col.name')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.role')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.studentId')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.department')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.level')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.points')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.phone')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.joined')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.status')}</th>
                    <th className="px-4 py-3 text-end">{t('admin.col.actions')}</th>
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
                  <tr className="text-start whitespace-nowrap">
                    <th className="px-4 py-3 text-start">{t('admin.col.title')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.doctor')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.department')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.subject')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.day')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.time')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.hall')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.level')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.type')}</th>
                    <th className="px-4 py-3 text-start">{t('admin.col.active')}</th>
                    <th className="px-4 py-3 text-end">{t('admin.col.actions')}</th>
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
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => toggleLecture(l)} title={l.is_active ? t('admin.action.disable') : t('admin.action.enable')}>
                          {l.is_active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteLecture(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div></td>
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
                <thead className="bg-muted/50"><tr className="text-start">
                  <th className="px-4 py-3 text-start">{t('admin.col.student')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.lecture')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.reason')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.status')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.date')}</th>
                  <th className="px-4 py-3 text-end">{t('admin.col.actions')}</th>
                </tr></thead>
                <tbody>
                  {excuses.map(e => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{e.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.lectures?.title || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={e.reason}>{e.reason}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${
                        e.status === 'approved' ? 'bg-success/10 text-success' :
                        e.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        'bg-warning/10 text-warning'
                      }`}>{e.status}</span></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        {e.status !== 'approved' && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-success" onClick={() => reviewExcuse(e, 'approved')} title={t('admin.action.approve')}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {e.status !== 'rejected' && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={() => reviewExcuse(e, 'rejected')} title={t('admin.action.reject')}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div></td>
                    </tr>
                  ))}
                  {excuses.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('admin.empty.excuses')}</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>


          {/* Warnings */}
          <TabsContent value="warnings">
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-start">
                  <th className="px-4 py-3 text-start">{t('admin.col.student')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.riskLevel')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.reason')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.date')}</th>
                  <th className="px-4 py-3 text-end">{t('admin.col.actions')}</th>
                </tr></thead>
                <tbody>
                  {warnings.map(w => (
                    <tr key={w.id} className={`border-t border-border ${w.is_resolved ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium">{w.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${
                        w.risk_level === 'high' ? 'bg-destructive/10 text-destructive' :
                        w.risk_level === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted'
                      }`}>{w.risk_level || '—'}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{w.message || w.alert_type}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        {!w.is_resolved && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-success" onClick={() => resolveWarning(w)}>
                            <CheckCircle2 className="me-1 h-3.5 w-3.5" /> {t('admin.action.resolve')}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('warning_alerts', w.id, 'warning')}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div></td>
                    </tr>
                  ))}
                  {warnings.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('admin.empty.warnings')}</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>


          {/* Office Hours */}
          <TabsContent value="office">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-card shadow-card overflow-hidden">
                <div className="border-b border-border bg-muted/50 px-4 py-2 font-semibold">{t('admin.tab.office')}</div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/30"><tr className="text-start">
                    <th className="px-4 py-2 text-start">{t('admin.col.doctor')}</th>
                    <th className="px-4 py-2 text-start">{t('admin.col.day')}</th>
                    <th className="px-4 py-2 text-start">{t('admin.col.time')}</th>
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
                  <thead className="bg-muted/30"><tr className="text-start">
                    <th className="px-4 py-2 text-start">{t('admin.col.date')}</th>
                    <th className="px-4 py-2 text-start">{t('admin.col.status')}</th>
                    <th className="px-4 py-2 text-end">{t('admin.col.actions')}</th>
                  </tr></thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground text-xs">{b.booking_date || new Date(b.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${b.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : b.status === 'confirmed' ? 'bg-success/10 text-success' : 'bg-muted'}`}>{b.status}</span></td>
                        <td className="px-4 py-2 text-end">
                          {b.status !== 'cancelled' && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-destructive" onClick={() => cancelBooking(b)} title={t('admin.action.cancel')}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
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
                <thead className="bg-muted/50"><tr className="text-start">
                  <th className="px-4 py-3 text-start">{t('admin.col.lecture')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.rating')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.comment')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.date')}</th>
                  <th className="px-4 py-3 text-end">{t('admin.col.actions')}</th>
                </tr></thead>
                <tbody>
                  {ratings.map(r => {
                    const lec = lectures.find(l => l.id === r.lecture_id);
                    return (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{lec?.title || String(r.lecture_id).slice(0, 8)}</td>
                        <td className="px-4 py-3 text-warning">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-md truncate" title={r.comment}>{r.comment || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-end">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('lecture_ratings', r.id, 'rating')}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {ratings.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('admin.empty.ratings')}</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>


          {/* Messages */}
          <TabsContent value="messages">
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-start">
                  <th className="px-4 py-3 text-start">{t('admin.col.from')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.to')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.content')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.read')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.date')}</th>
                  <th className="px-4 py-3 text-end">{t('admin.col.actions')}</th>
                </tr></thead>
                <tbody>
                  {messages.map(m => {
                    const from = users.find(u => u.user_id === m.sender_id);
                    const to = users.find(u => u.user_id === m.receiver_id);
                    return (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-3 text-xs">{from?.full_name || String(m.sender_id).slice(0, 8)}</td>
                        <td className="px-4 py-3 text-xs">{to?.full_name || String(m.receiver_id).slice(0, 8)}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-md truncate" title={m.content}>{m.content}</td>
                        <td className="px-4 py-3">{m.read ? '✓' : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(m.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-end">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('messages', m.id, 'message')}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                  {messages.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('admin.empty.messages')}</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>


          {/* Departments */}
          <TabsContent value="departments" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{departments.length} · {t('admin.tab.departments')}</p>
              <Button size="sm" onClick={() => openDeptDialog()}><Plus className="me-1.5 h-4 w-4" /> {t('admin.action.newDept')}</Button>
            </div>
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
                        <p className="text-sm text-muted-foreground">{d.name_ar} {d.code && <span className="ms-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">{d.code}</span>}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openDeptDialog(d)} title={t('admin.action.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteDept(d)} title={t('admin.action.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">{t('admin.stat.students')}</p><p className="font-bold tabular-nums">{studentCount}</p></div>
                      <div className="rounded-lg bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">{t('admin.stat.doctors')}</p><p className="font-bold tabular-nums">{doctorCount}</p></div>
                      <div className="rounded-lg bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">{t('admin.stat.lectures')}</p><p className="font-bold tabular-nums">{deptLectures}</p></div>
                      <div className="rounded-lg bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">{t('admin.stat.disabled')}</p><p className="font-bold tabular-nums text-destructive">{disabledCount}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>


          {/* Broadcast */}
          <TabsContent value="broadcast">
            <div className="rounded-2xl bg-card p-6 shadow-card max-w-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Megaphone className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold">{t('admin.broadcast.title')}</h2>
                  <p className="text-xs text-muted-foreground">{t('admin.broadcast.subtitle')}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={broadcastTarget} onValueChange={(v: any) => setBroadcastTarget(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.broadcast.allUsers')} ({users.filter(u => !u.is_disabled).length})</SelectItem>
                    <SelectItem value="student">{t('admin.broadcast.studentsOnly')} ({users.filter(u => u.role === 'student' && !u.is_disabled).length})</SelectItem>
                    <SelectItem value="doctor">{t('admin.broadcast.doctorsOnly')} ({users.filter(u => u.role === 'doctor' && !u.is_disabled).length})</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="md:col-span-2" placeholder={t('admin.broadcast.titlePh')} value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} />
              </div>
              <Textarea rows={5} placeholder={t('admin.broadcast.bodyPh')} value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={sendBroadcast} disabled={broadcasting}>
                  <Send className="me-2 h-4 w-4" /> {broadcasting ? t('admin.action.working') : t('admin.action.sendBroadcast')}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Bulk Ops */}
          <TabsContent value="bulk" className="space-y-4">
            <div className="rounded-2xl bg-card p-4 shadow-card flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium">{selectedIds.length} selected</p>
              <Button size="sm" variant="outline" onClick={() => bulkAction('enable')} disabled={bulkBusy}><CheckCircle2 className="me-1.5 h-4 w-4" /> Enable</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction('disable')} disabled={bulkBusy}><Ban className="me-1.5 h-4 w-4" /> Disable</Button>
              <Button size="sm" variant="destructive" onClick={() => bulkAction('delete')} disabled={bulkBusy}><Trash2 className="me-1.5 h-4 w-4" /> Delete</Button>
              <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setSelected({})}>Clear selection</Button>
            </div>
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredUsers.length > 0 && filteredUsers.every(u => selected[u.id])}
                        onChange={(e) => {
                          const next = { ...selected };
                          filteredUsers.forEach(u => { next[u.id] = e.target.checked; });
                          setSelected(next);
                        }}
                      />
                    </th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice(0, 200).map(u => (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={!!selected[u.id]}
                          onChange={(e) => setSelected({ ...selected, [u.id]: e.target.checked })}
                        />
                      </td>
                      <td className="px-4 py-2 font-medium">{u.full_name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{u.role}</td>
                      <td className="px-4 py-2 text-muted-foreground">{u.departments?.name || '—'}</td>
                      <td className="px-4 py-2">
                        {u.is_disabled
                          ? <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs">Disabled</span>
                          : <span className="rounded-full bg-success/10 text-success px-2 py-0.5 text-xs">Active</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-2 text-xs text-muted-foreground">Tip: use the Users tab filters to narrow this list, then come back to Bulk Ops.</p>
            </div>
          </TabsContent>

          {/* System Health */}
          <TabsContent value="health">
            <div className="grid gap-3 md:grid-cols-4">
              <StatCard icon={Activity} label={t('admin.health.att24')} value={last24h.length} tone="success" />
              <StatCard icon={ClipboardCheck} label={t('admin.health.presentRate')} value={`${presentRate}%`} tone={presentRate >= 70 ? 'success' : presentRate >= 50 ? 'warning' : 'destructive'} />
              <StatCard icon={AlertTriangle} label={t('admin.health.pendingSync')} value={offlineQueueSize} tone={offlineQueueSize ? 'warning' : 'primary'} />
              <StatCard icon={Users} label={t('admin.health.activeAccounts')} value={users.filter(u => !u.is_disabled).length} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <p className="font-semibold mb-2 flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary" /> {t('admin.health.dataFresh')}</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>{t('admin.stat.students')} + {t('admin.stat.doctors')}: {users.length}</li>
                  <li>{t('admin.stat.lectures')}: {lectures.length}</li>
                  <li>{t('admin.stat.attendance')}: {attendance.length}</li>
                  <li>{t('admin.stat.excuses')}: {excuses.filter(e => e.status === 'pending').length}</li>
                </ul>
                <Button size="sm" variant="outline" className="mt-3" onClick={loadAll}>{t('admin.action.refresh')}</Button>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <p className="font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> {t('admin.health.security')}</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>{t('admin.filter.admins')}: {userRoles.filter(r => r.role === 'admin').length}</li>
                  <li>{t('admin.stat.disabled')}: {stats.disabled}</li>
                  <li>{t('admin.col.riskLevel')} (high): {warnings.filter(w => w.risk_level === 'high').length}</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* AI Insights */}
          <TabsContent value="insights" className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-transparent p-6 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold">Smart system insights</h2>
                  <p className="text-xs text-muted-foreground">Derived from your live data, refreshed every load.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-card/70 backdrop-blur p-4">
                  <p className="text-xs text-muted-foreground">Overall attendance health</p>
                  <p className="mt-1 text-2xl font-bold">{presentRate}% present</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {presentRate >= 75 ? '🌟 Excellent — keep current policies.' : presentRate >= 55 ? '⚠️ Acceptable but improvable — consider attendance incentives.' : '🚨 Low — investigate scheduling or doctor engagement.'}
                  </p>
                </div>
                <div className="rounded-xl bg-card/70 backdrop-blur p-4">
                  <p className="text-xs text-muted-foreground">Top absentees (last batch)</p>
                  {topAbsentees.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No absences yet.</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm">
                      {topAbsentees.map(({ u, absents }) => (
                        <li key={u.id} className="flex items-center justify-between">
                          <span className="font-medium">{u.full_name}</span>
                          <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs">{absents}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl bg-card/70 backdrop-blur p-4">
                  <p className="text-xs text-muted-foreground">Engagement</p>
                  <p className="mt-1 text-2xl font-bold">{ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : '—'} / 5</p>
                  <p className="text-xs text-muted-foreground mt-1">{ratings.length} ratings collected</p>
                </div>
                <div className="rounded-xl bg-card/70 backdrop-blur p-4">
                  <p className="text-xs text-muted-foreground">Recommendation</p>
                  <p className="text-sm mt-1">
                    {warnings.filter(w => w.risk_level === 'high').length > 0
                      ? `Reach out to ${warnings.filter(w => w.risk_level === 'high').length} high-risk students before next week.`
                      : 'No urgent interventions needed. Schedule a review next cycle.'}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Subjects CRUD */}
          <TabsContent value="subjects" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{subjects.length} · {t('admin.tab.subjects')}</p>
              <Button size="sm" onClick={() => openSubjDialog()}><Plus className="me-1.5 h-4 w-4" /> {t('admin.action.newSubject')}</Button>
            </div>
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-start">
                  <th className="px-4 py-3 text-start">{t('admin.col.name')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.code')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.department')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.stat.lectures')}</th>
                  <th className="px-4 py-3 text-end">{t('admin.col.actions')}</th>
                </tr></thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.code || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.departments?.name || '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{lectures.filter(l => l.subject_id === s.id).length}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openSubjDialog(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteSubj(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div></td>
                    </tr>
                  ))}
                  {subjects.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('admin.empty.subjects')}</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* All Notifications */}
          <TabsContent value="notif" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{allNotifications.length} · {t('admin.tab.notif')}</p>
              <Button size="sm" variant="outline" onClick={() => runMaintenance('purge-read-notifications')} disabled={maintBusy === 'purge-read-notifications'}>
                <Trash2 className="me-1.5 h-4 w-4" /> {t('admin.maint.purgeNotifTitle')}
              </Button>
            </div>
            <div className="rounded-2xl bg-card shadow-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr className="text-start">
                  <th className="px-4 py-3 text-start">{t('admin.col.recipient')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.title')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.type')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.read')}</th>
                  <th className="px-4 py-3 text-start">{t('admin.col.when')}</th>
                  <th className="px-4 py-3 text-end"></th>
                </tr></thead>
                <tbody>
                  {allNotifications.map(n => {
                    const target = users.find(u => u.user_id === n.user_id);
                    return (
                      <tr key={n.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{target?.full_name || <span className="text-xs text-muted-foreground">{String(n.user_id).slice(0,8)}</span>}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-md truncate" title={n.message}>{n.title}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{n.type || '—'}</span></td>
                        <td className="px-4 py-3">{n.read ? '✓' : '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-end"><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRow('notifications', n.id, 'notification')}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                      </tr>
                    );
                  })}
                  {allNotifications.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('admin.empty.notif')}</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance" className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><RotateCcw className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{t('admin.maint.recomputeTitle')}</p><p className="text-xs text-muted-foreground">{t('admin.maint.recomputeDesc')}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('recompute-points')} disabled={maintBusy === 'recompute-points'}>{maintBusy === 'recompute-points' ? t('admin.action.working') : t('admin.action.run')}</Button>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CheckCircle2 className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{t('admin.maint.markSyncedTitle')}</p><p className="text-xs text-muted-foreground">{t('admin.maint.markSyncedDesc')}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('mark-synced')} disabled={maintBusy === 'mark-synced'}>{maintBusy === 'mark-synced' ? t('admin.action.working') : t('admin.action.run')}</Button>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning"><MessageSquare className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{t('admin.maint.purgeTypingTitle')}</p><p className="text-xs text-muted-foreground">{t('admin.maint.purgeTypingDesc')}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('purge-typing')} disabled={maintBusy === 'purge-typing'}>{maintBusy === 'purge-typing' ? t('admin.action.working') : t('admin.action.run')}</Button>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Trash2 className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{t('admin.maint.purgeNotifTitle')}</p><p className="text-xs text-muted-foreground">{t('admin.maint.purgeNotifDesc')}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('purge-read-notifications')} disabled={maintBusy === 'purge-read-notifications'}>{maintBusy === 'purge-read-notifications' ? t('admin.action.working') : t('admin.action.run')}</Button>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{language === 'ar' ? 'تشغيل تحليل الذكاء الاصطناعي الآن' : 'Run AI Analysis Now'}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? 'يمر على كل الطلاب ويصدر تنبيهات المخاطر تلقائيًا (يعمل أيضًا كل 6 ساعات).' : 'Scans all students and produces risk alerts (also runs every 6h).'}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('run-ai')} disabled={maintBusy === 'run-ai'}>{maintBusy === 'run-ai' ? t('admin.action.working') : t('admin.action.run')}</Button>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success"><BarChart3 className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{language === 'ar' ? 'إعادة بناء الإحصائيات' : 'Rebuild Statistics'}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? 'يشغل ANALYZE على كل الجداول لتسريع الاستعلامات.' : 'Runs ANALYZE on all tables to speed up queries.'}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('rebuild-stats')} disabled={maintBusy === 'rebuild-stats'}>{maintBusy === 'rebuild-stats' ? t('admin.action.working') : t('admin.action.run')}</Button>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning"><ShieldCheck className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{language === 'ar' ? 'فحص سلامة قاعدة البيانات' : 'Integrity Check'}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? 'يبحث عن سجلات يتيمة ومؤشرات كتابة قديمة وتحذيرات مفتوحة.' : 'Detects orphan rows, stale typing, unresolved warnings.'}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('integrity-check')} disabled={maintBusy === 'integrity-check'}>{maintBusy === 'integrity-check' ? t('admin.action.working') : t('admin.action.run')}</Button>
                {integrity && (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted p-2 text-[10px]">{JSON.stringify(integrity, null, 2)}</pre>
                )}
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><HeartPulse className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{language === 'ar' ? 'صحة قاعدة البيانات' : 'DB Health Snapshot'}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? 'الحجم، عدد الصفوف لكل جدول، الاتصالات النشطة.' : 'Size, per-table rows, active connections.'}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('health-check')} disabled={maintBusy === 'health-check'}>{maintBusy === 'health-check' ? t('admin.action.working') : t('admin.action.run')}</Button>
                {dbHealth && (
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-muted p-2 text-[10px]">{JSON.stringify(dbHealth, null, 2)}</pre>
                )}
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Trash2 className="h-5 w-5" /></div>
                  <div><p className="font-semibold">{language === 'ar' ? 'تنظيف سجل الأحداث' : 'Purge Old Events'}</p><p className="text-xs text-muted-foreground">{language === 'ar' ? 'يحذف أحداث النشاط الأقدم من 90 يومًا.' : 'Deletes activity events older than 90 days.'}</p></div>
                </div>
                <Button size="sm" onClick={() => runMaintenance('purge-events')} disabled={maintBusy === 'purge-events'}>{maintBusy === 'purge-events' ? t('admin.action.working') : t('admin.action.run')}</Button>
              </div>
              <div className="rounded-2xl bg-card p-5 shadow-card md:col-span-2">
                <p className="text-xs text-muted-foreground">{language === 'ar' ? '⏰ المهام المجدولة: تحليل الذكاء الاصطناعي كل 6 ساعات • صيانة ليلية 3:00 UTC (إحصائيات + تنظيف).' : '⏰ Scheduled jobs: AI analysis every 6 hours • Nightly maintenance at 03:00 UTC (stats + cleanup).'}</p>
              </div>
            </div>
          </TabsContent>

          {/* Live Feed */}
          <TabsContent value="live" className="space-y-3">
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success"><Radio className="h-5 w-5 animate-pulse" /></div>
                <div>
                  <p className="font-bold">{t('admin.live.title')}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'أحداث النظام الحية محفوظة في قاعدة البيانات' : 'Live system events persisted in the database'}</p>
                </div>
                <div className="ms-auto flex flex-wrap items-center gap-2">
                  <Select value={liveFilterKind} onValueChange={setLiveFilterKind}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Kind" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'كل الأنواع' : 'All kinds'}</SelectItem>
                      {Array.from(new Set(liveEvents.map(e => e.kind))).map(k => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={liveFilterSeverity} onValueChange={setLiveFilterSeverity}>
                    <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'كل الأهمية' : 'All severities'}</SelectItem>
                      <SelectItem value="info">info</SelectItem>
                      <SelectItem value="success">success</SelectItem>
                      <SelectItem value="warning">warning</SelectItem>
                      <SelectItem value="critical">critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={liveFilterDept} onValueChange={setLiveFilterDept}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Dept" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'كل الأقسام' : 'All departments'}</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{language === 'ar' ? (d.name_ar || d.name) : d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => {
                    const rows = liveEvents.filter(e =>
                      (liveFilterKind === 'all' || e.kind === liveFilterKind) &&
                      (liveFilterSeverity === 'all' || e.severity === liveFilterSeverity) &&
                      (liveFilterDept === 'all' || e.department_id === liveFilterDept)
                    );
                    const csv = ['created_at,kind,severity,actor,title', ...rows.map(r =>
                      [r.created_at, r.kind, r.severity, (r.actor_name || '').replace(/,/g, ' '), (r.title || '').replace(/,/g, ' ')].join(',')
                    )].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `activity-${Date.now()}.csv`; a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <FileSpreadsheet className="me-1 h-3.5 w-3.5" /> CSV
                  </Button>
                </div>
              </div>
              {(() => {
                const filtered = liveEvents.filter(e =>
                  (liveFilterKind === 'all' || e.kind === liveFilterKind) &&
                  (liveFilterSeverity === 'all' || e.severity === liveFilterSeverity) &&
                  (liveFilterDept === 'all' || e.department_id === liveFilterDept)
                );
                if (!filtered.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t('admin.empty.live')}</p>;
                return (
                  <ul className="divide-y divide-border max-h-[600px] overflow-auto">
                    {filtered.map(e => (
                      <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          e.severity === 'critical' ? 'bg-destructive/15 text-destructive' :
                          e.severity === 'warning' ? 'bg-warning/15 text-warning' :
                          e.severity === 'success' ? 'bg-success/15 text-success' :
                          'bg-primary/10 text-primary'
                        }`}>{e.severity}</span>
                        <span className="rounded bg-muted px-2 py-0.5 text-[10px] tabular-nums">{e.kind}</span>
                        <span className="flex-1 truncate">{e.title}</span>
                        {e.actor_name && <span className="text-xs text-muted-foreground">{e.actor_name}</span>}
                        <span className="text-xs text-muted-foreground tabular-nums">{new Date(e.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </main>


      {/* Disable dialog */}
      <Dialog open={!!disableTarget} onOpenChange={(v) => !v && setDisableTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.disable.title')}: {disableTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('admin.disable.warn')}</p>
          <Textarea
            placeholder={t('admin.disable.reasonPh')}
            value={disableReason}
            onChange={e => setDisableReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableTarget(null)}>{t('admin.action.cancel')}</Button>
            <Button variant="destructive" onClick={confirmDisable}><Ban className="me-2 h-4 w-4" /> {t('admin.action.disable')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department dialog */}
      <Dialog open={deptDialog.open} onOpenChange={(v) => !v && setDeptDialog({ open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{deptDialog.edit ? t('admin.action.edit') : t('admin.action.newDept')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t('admin.dept.namePh')} value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} />
            <Input placeholder={t('admin.dept.nameArPh')} value={deptForm.name_ar} onChange={e => setDeptForm({ ...deptForm, name_ar: e.target.value })} />
            <Input placeholder={t('admin.dept.codePh')} value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialog({ open: false })}>{t('admin.action.cancel')}</Button>
            <Button onClick={saveDept}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subject dialog */}
      <Dialog open={subjDialog.open} onOpenChange={(v) => !v && setSubjDialog({ open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{subjDialog.edit ? t('admin.action.edit') : t('admin.action.newSubject')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t('admin.subj.namePh')} value={subjForm.name} onChange={e => setSubjForm({ ...subjForm, name: e.target.value })} />
            <Input placeholder={t('admin.dept.codePh')} value={subjForm.code} onChange={e => setSubjForm({ ...subjForm, code: e.target.value })} />
            <Select value={subjForm.department_id} onValueChange={(v) => setSubjForm({ ...subjForm, department_id: v })}>
              <SelectTrigger><SelectValue placeholder={t('admin.col.department')} /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjDialog({ open: false })}>{t('admin.action.cancel')}</Button>
            <Button onClick={saveSubj}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
