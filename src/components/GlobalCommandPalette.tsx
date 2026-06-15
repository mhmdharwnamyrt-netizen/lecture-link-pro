import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Home,
  BookOpen,
  BarChart3,
  Bot,
  Bell,
  User as UserIcon,
  MessageCircle,
  Clock,
  Trophy,
  Shield,
  AlertTriangle,
  Calendar,
  Search as SearchIcon,
} from 'lucide-react';

type Hit = {
  id: string;
  type: 'student' | 'lecture' | 'message';
  label: string;
  sub?: string;
  go: string;
};

export default function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim() || !profile) {
      setHits([]);
      return;
    }
    const q = query.trim();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const results: Hit[] = [];

        // Students (doctor or admin)
        if (profile.role === 'doctor' || isAdmin) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, student_id')
            .eq('role', 'student')
            .or(`full_name.ilike.%${q}%,student_id.ilike.%${q}%`)
            .limit(5);
          (data || []).forEach((s: any) =>
            results.push({
              id: `s-${s.id}`,
              type: 'student',
              label: s.full_name,
              sub: s.student_id ? `ID: ${s.student_id}` : '',
              go: profile.role === 'doctor' ? `/doctor/student/${s.id}` : `/admin`,
            }),
          );
        }

        // Lectures
        const lectureQuery = supabase
          .from('lectures')
          .select('id, title, day_of_week, hall_number, doctor_id')
          .ilike('title', `%${q}%`)
          .limit(5);
        if (profile.role === 'doctor') lectureQuery.eq('doctor_id', profile.id);
        const { data: lectures } = await lectureQuery;
        (lectures || []).forEach((l: any) =>
          results.push({
            id: `l-${l.id}`,
            type: 'lecture',
            label: l.title,
            sub: [l.day_of_week, l.hall_number ? `Hall ${l.hall_number}` : ''].filter(Boolean).join(' • '),
            go: profile.role === 'doctor' ? `/doctor/lectures/${l.id}` : `/student/lectures`,
          }),
        );

        // Messages
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, content, sender_id, receiver_id')
          .ilike('content', `%${q}%`)
          .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
          .limit(5);
        (msgs || []).forEach((m: any) =>
          results.push({
            id: `m-${m.id}`,
            type: 'message',
            label: m.content?.slice(0, 80) || '',
            sub: 'Message',
            go: profile.role === 'doctor' ? '/doctor/messages' : '/student/messages',
          }),
        );

        setHits(results);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, profile, isAdmin]);

  if (!profile) return null;

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const role = profile.role;
  const nav =
    role === 'doctor'
      ? [
          { icon: Home, label: 'Home', path: '/doctor' },
          { icon: BookOpen, label: 'Lectures', path: '/doctor/lectures' },
          { icon: Bot, label: 'Schedule AI', path: '/doctor/schedule-parser' },
          { icon: BarChart3, label: 'Analytics', path: '/doctor/analytics' },
          { icon: AlertTriangle, label: 'Early Warning', path: '/doctor/early-warning' },
          { icon: Bell, label: 'Notifications', path: '/doctor/notifications' },
          { icon: MessageCircle, label: 'Messages', path: '/doctor/messages' },
          { icon: Clock, label: 'Office Hours', path: '/doctor/office-hours' },
          { icon: UserIcon, label: 'Profile', path: '/doctor/profile' },
        ]
      : [
          { icon: Home, label: 'Home', path: '/student' },
          { icon: BookOpen, label: 'Lectures', path: '/student/lectures' },
          { icon: Calendar, label: 'Calendar', path: '/student/calendar' },
          { icon: Bot, label: 'Schedule AI', path: '/student/schedule-ai' },
          { icon: Bell, label: 'Notifications', path: '/student/notifications' },
          { icon: MessageCircle, label: 'Messages', path: '/student/messages' },
          { icon: Clock, label: 'Office Hours', path: '/student/office-hours' },
          { icon: UserIcon, label: 'Profile', path: '/student/profile' },
        ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search students, lectures, messages… (⌘K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{loading ? 'Searching…' : 'No results.'}</CommandEmpty>

        {hits.length > 0 && (
          <CommandGroup heading="Results">
            {hits.map((h) => {
              const Icon = h.type === 'student' ? UserIcon : h.type === 'lecture' ? BookOpen : MessageCircle;
              return (
                <CommandItem key={h.id} value={`${h.label} ${h.sub}`} onSelect={() => go(h.go)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{h.label}</span>
                    {h.sub && <span className="text-xs text-muted-foreground">{h.sub}</span>}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {nav.map((n) => (
            <CommandItem key={n.path} value={n.label} onSelect={() => go(n.path)}>
              <n.icon className="mr-2 h-4 w-4" />
              {n.label}
            </CommandItem>
          ))}
          <CommandItem value="Leaderboard" onSelect={() => go('/leaderboard')}>
            <Trophy className="mr-2 h-4 w-4" />
            Leaderboard
          </CommandItem>
          {isAdmin && (
            <>
              <CommandItem value="Admin Dashboard" onSelect={() => go('/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                Admin Dashboard
              </CommandItem>
              <CommandItem value="Admin Logs" onSelect={() => go('/admin/logs')}>
                <SearchIcon className="mr-2 h-4 w-4" />
                Admin Logs
              </CommandItem>
              <CommandItem value="Admin Reports" onSelect={() => go('/admin/reports')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Admin Reports
              </CommandItem>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
