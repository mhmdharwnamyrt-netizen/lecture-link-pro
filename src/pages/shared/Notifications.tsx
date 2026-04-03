import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Bell, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function NotificationsPage({ role }: { role: 'doctor' | 'student' }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user]);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    loadNotifications();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-warning" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-6 md:px-8">
        <h1 className="mb-4 text-2xl font-bold">{t('notifications.title')}</h1>

        {notifications.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center shadow-card">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{t('notifications.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && markAsRead(n.id)}
                className={`cursor-pointer rounded-2xl p-4 shadow-card transition-colors ${n.read ? 'bg-card' : 'bg-primary/5'}`}
              >
                <div className="flex items-start gap-3">
                  {getIcon(n.type)}
                  <div className="flex-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString(locale, { dateStyle: 'medium' })} •{' '}
                      {new Date(n.created_at).toLocaleTimeString(locale, { timeStyle: 'short' })}
                    </p>
                  </div>
                  {!n.read && <div className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
