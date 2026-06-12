import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Trash2, RotateCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { readQueue, retryItem, removeItem, syncQueue, OfflineAttendanceItem } from '@/lib/offlineQueue';
import { useToast } from '@/hooks/use-toast';

export default function OfflineQueue() {
  const { language, isRTL } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<OfflineAttendanceItem[]>([]);
  const [busy, setBusy] = useState(false);
  const isAr = language === 'ar';

  const refresh = () => setItems(readQueue().sort((a, b) => b.timestamp.localeCompare(a.timestamp)));

  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener('offline-queue-changed', h);
    window.addEventListener('online', h);
    window.addEventListener('offline', h);
    const t = setInterval(refresh, 4000);
    return () => {
      window.removeEventListener('offline-queue-changed', h);
      window.removeEventListener('online', h);
      window.removeEventListener('offline', h);
      clearInterval(t);
    };
  }, []);

  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      toast({ title: isAr ? 'لا يوجد اتصال' : 'No connection', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const r = await syncQueue();
    setBusy(false);
    refresh();
    toast({ title: isAr ? 'تمت المزامنة' : 'Sync complete', description: `${r.synced} ✓ · ${r.failed} ✗` });
  };

  const handleRetry = async (id: string) => {
    const ok = await retryItem(id);
    refresh();
    toast({ title: ok ? (isAr ? 'تمت المزامنة' : 'Synced') : (isAr ? 'فشلت المحاولة' : 'Failed'), variant: ok ? 'default' : 'destructive' });
  };

  const statusInfo = (s: OfflineAttendanceItem['status']) => {
    switch (s) {
      case 'synced': return { color: 'bg-success/10 text-success', icon: CheckCircle2, label: isAr ? 'تمت المزامنة' : 'Synced' };
      case 'pending': return { color: 'bg-warning/10 text-warning', icon: CloudOff, label: isAr ? 'بانتظار' : 'Pending' };
      case 'syncing': return { color: 'bg-primary/10 text-primary', icon: RefreshCw, label: isAr ? 'جارٍ المزامنة' : 'Syncing' };
      case 'failed': return { color: 'bg-destructive/10 text-destructive', icon: AlertCircle, label: isAr ? 'فشل' : 'Failed' };
    }
  };

  const pending = items.filter(i => i.status !== 'synced').length;

  return (
    <MobileLayout role="student">
      <div className="px-5 py-5 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isAr ? 'قائمة الانتظار' : 'Offline Queue'}</h1>
            <p className="text-sm text-muted-foreground">
              {isAr ? `${pending} عملية بانتظار المزامنة` : `${pending} pending sync`}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${navigator.onLine ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
            {navigator.onLine ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
            {navigator.onLine ? (isAr ? 'متصل' : 'Online') : (isAr ? 'بدون اتصال' : 'Offline')}
          </div>
        </div>

        <Button onClick={handleSyncAll} disabled={busy || items.length === 0} className="w-full rounded-2xl">
          <RefreshCw className={`me-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          {isAr ? 'مزامنة الكل الآن' : 'Sync all now'}
        </Button>

        {items.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center shadow-card">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
            <p className="font-bold">{isAr ? 'لا توجد عمليات معلقة' : 'No pending items'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? 'كل عمليات الحضور متزامنة مع الخادم' : 'All attendance is synced'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {items.map(it => {
            const s = statusInfo(it.status)!;
            const Icon = s.icon;
            return (
              <div key={it.id} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{it.lecture_title || it.lecture_id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(it.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                    </p>
                    {it.location_verified && (
                      <p className="text-xs text-success mt-1">📍 GPS {isAr ? 'مُتحقق' : 'verified'}</p>
                    )}
                    {it.last_error && it.status === 'failed' && (
                      <p className="text-xs text-destructive mt-1 truncate">⚠ {it.last_error}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isAr ? 'محاولات' : 'Attempts'}: {it.attempts}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${s.color}`}>
                      <Icon className={`h-3 w-3 ${it.status === 'syncing' ? 'animate-spin' : ''}`} />
                      {s.label}
                    </span>
                    <div className="flex gap-1">
                      {it.status !== 'synced' && (
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleRetry(it.id)}>
                          <RotateCw className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => { removeItem(it.id); refresh(); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
}
