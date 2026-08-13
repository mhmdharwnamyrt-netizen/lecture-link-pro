import { supabase } from '@/integrations/supabase/client';

export const GROUP_BUCKET = 'group-media';
export const MAX_GROUP_FILE_MB = 25;

export interface StudyGroup {
  id: string;
  department_id: string;
  level: number;
  name: string;
  name_ar: string | null;
  description: string | null;
  is_active: boolean;
  departments?: { name: string; name_ar: string | null } | null;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  media_type: 'image' | 'video' | 'audio' | 'file' | null;
  media_path: string | null;
  media_mime: string | null;
  media_name: string | null;
  media_size: number | null;
  duration_seconds: number | null;
  reply_to_id: string | null;
  is_deleted: boolean;
  likes_count: number;
  reactions?: Record<string, number>;
  my_reaction?: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_ta: boolean;
}

/**
 * Groups relevant to the signed-in user only:
 *  - students: their own department + level
 *  - doctors / TAs: every (department, level) pair they teach (doctor_departments)
 */
export async function fetchMyGroups(): Promise<StudyGroup[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, department_id, level, is_ta')
    .eq('user_id', uid)
    .maybeSingle();
  if (!profile) return [];

  const { data } = await supabase
    .from('study_groups' as any)
    .select('*, departments(name, name_ar)')
    .eq('is_active', true)
    .order('level');
  const all = (data || []) as unknown as StudyGroup[];

  const isStaff = (profile as any).role === 'doctor' || (profile as any).is_ta;
  if (isStaff) {
    const { data: assign } = await supabase
      .from('doctor_departments')
      .select('department_id, level')
      .eq('doctor_id', (profile as any).id);
    const keys = new Set((assign || []).map((a: any) => `${a.department_id}:${a.level}`));
    if (keys.size === 0) return [];
    return all.filter((g) => keys.has(`${g.department_id}:${g.level}`));
  }

  return all.filter(
    (g) => g.department_id === (profile as any).department_id && g.level === (profile as any).level,
  );
}

export async function fetchGroup(id: string): Promise<StudyGroup | null> {
  const { data } = await supabase
    .from('study_groups' as any)
    .select('*, departments(name, name_ar)')
    .eq('id', id)
    .maybeSingle();
  return (data || null) as unknown as StudyGroup | null;
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data } = await supabase.rpc('study_group_members' as any, { _group: groupId });
  return (data || []) as unknown as GroupMember[];
}

export async function fetchMessages(groupId: string, limit = 200): Promise<GroupMessage[]> {
  const { data } = await supabase
    .from('study_group_messages' as any)
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data || []) as unknown as GroupMessage[];
}

const urlCache = new Map<string, { url: string; exp: number }>();

export async function groupMediaUrl(path: string): Promise<string | null> {
  const hit = urlCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data } = await supabase.storage.from(GROUP_BUCKET).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

export function mediaKindOf(file: File): 'image' | 'video' | 'audio' | 'file' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

export function initialsOf(name?: string | null) {
  const n = (name || '').trim();
  if (!n) return '?';
  return n.slice(0, 1).toUpperCase();
}

/** Stable pastel-ish accent per user for avatar fallbacks. */
export function colorOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}
