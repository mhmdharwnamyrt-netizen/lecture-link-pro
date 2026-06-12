import { supabase } from '@/integrations/supabase/client';

export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OfflineAttendanceItem {
  id: string;
  student_id: string;
  lecture_id: string;
  lecture_title?: string;
  latitude?: number;
  longitude?: number;
  location_verified?: boolean;
  timestamp: string;
  status: QueueStatus;
  attempts: number;
  last_error?: string;
  synced_at?: string;
}

const KEY = 'offline_attendance_v2';

export function readQueue(): OfflineAttendanceItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function writeQueue(items: OfflineAttendanceItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('offline-queue-changed'));
}

export function enqueueAttendance(item: Omit<OfflineAttendanceItem, 'id' | 'status' | 'attempts' | 'timestamp'>) {
  const items = readQueue();
  items.push({
    ...item,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  });
  writeQueue(items);
  triggerBackgroundSync().catch(() => {});
}

export async function syncOne(item: OfflineAttendanceItem): Promise<boolean> {
  try {
    const { error } = await supabase.from('attendance').insert({
      student_id: item.student_id,
      lecture_id: item.lecture_id,
      status: 'present',
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      location_verified: item.location_verified ?? false,
      synced: true,
    });
    if (error && !error.message?.toLowerCase().includes('duplicate')) throw error;
    return true;
  } catch (e: any) {
    item.last_error = e?.message || String(e);
    return false;
  }
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  let items = readQueue();
  let synced = 0, failed = 0;
  for (const it of items) {
    if (it.status === 'synced') continue;
    it.status = 'syncing';
    it.attempts += 1;
    writeQueue(items);
    const ok = await syncOne(it);
    if (ok) { it.status = 'synced'; it.synced_at = new Date().toISOString(); synced++; }
    else { it.status = 'failed'; failed++; }
    writeQueue(items);
  }
  // Auto-clear synced older than 1h to keep list short
  const cutoff = Date.now() - 60 * 60 * 1000;
  items = readQueue().filter(i => !(i.status === 'synced' && i.synced_at && new Date(i.synced_at).getTime() < cutoff));
  writeQueue(items);
  return { synced, failed };
}

export async function retryItem(id: string): Promise<boolean> {
  const items = readQueue();
  const it = items.find(i => i.id === id);
  if (!it) return false;
  it.status = 'syncing';
  it.attempts += 1;
  writeQueue(items);
  const ok = await syncOne(it);
  it.status = ok ? 'synced' : 'failed';
  if (ok) it.synced_at = new Date().toISOString();
  writeQueue(items);
  return ok;
}

export function removeItem(id: string) {
  writeQueue(readQueue().filter(i => i.id !== id));
}

export async function triggerBackgroundSync() {
  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      // @ts-ignore - sync is experimental
      if (reg.sync) await reg.sync.register('sync-attendance');
    }
  } catch { /* ignore */ }
}

export function installAutoSync() {
  const handler = () => { syncQueue(); };
  window.addEventListener('online', handler);
  if (navigator.onLine) syncQueue();
  // Poll every 60s as belt-and-suspenders
  const interval = setInterval(() => { if (navigator.onLine) syncQueue(); }, 60000);
  return () => {
    window.removeEventListener('online', handler);
    clearInterval(interval);
  };
}
