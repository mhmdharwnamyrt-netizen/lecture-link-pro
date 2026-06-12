import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, RefreshCw, Search, Shield, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/exportUtils';

export default function AdminLogs() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [status, setStatus] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = async () => {
    setBusy(true);
    let q = supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (from) q = q.gte('created_at', new Date(from).toISOString());
    if (to) q = q.lte('created_at', new Date(to + 'T23:59:59').toISOString());
    if (status !== 'all') q = q.eq('status', status);
    if (action !== 'all') q = q.eq('action', action);
    const { data } = await q;
    setLogs(data || []);
    setBusy(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const filtered = logs.filter(l =>
    !search ||
    l.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase())
  );

  const actions = Array.from(new Set(logs.map(l => l.action))).sort();

  const exportCSV = () => {
    exportToExcel(filtered.map(l => ({
      studentName: l.actor_name || '—',
      studentId: l.actor_id?.slice(0, 8) || '—',
      lectureTitle: l.action,
      status: l.status,
      date: new Date(l.created_at).toLocaleDateString(),
      time: new Date(l.created_at).toLocaleTimeString(),
    })), 'Admin Logs');
  };

  if (loading || isAdmin === null) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center"><Shield className="mx-auto mb-3 h-10 w-10 text-destructive" /><p>Access Denied</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <Button variant="ghost" size="icon" asChild><Link to="/admin"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <FileText className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">Admin Logs</h1>
            <p className="text-xs text-muted-foreground">All system actions, sync events and admin changes</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="me-2 h-4 w-4" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-5 rounded-2xl bg-card p-4 shadow-card">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search actor / action..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={load} className="md:col-span-4">Apply filters</Button>
        </div>

        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{l.actor_name || '—'}</td>
                  <td className="px-4 py-3"><code className="rounded bg-muted px-2 py-0.5 text-xs">{l.action}</code></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{l.entity_type || '—'} {l.entity_id ? `#${String(l.entity_id).slice(0, 8)}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      l.status === 'success' ? 'bg-success/10 text-success' :
                      l.status === 'error' ? 'bg-destructive/10 text-destructive' :
                      'bg-warning/10 text-warning'
                    }`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={JSON.stringify(l.details)}>
                    {l.details && Object.keys(l.details).length > 0 ? JSON.stringify(l.details) : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No logs match the filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground text-center">{filtered.length} of {logs.length} entries · max 500 most recent</p>
      </main>
    </div>
  );
}
