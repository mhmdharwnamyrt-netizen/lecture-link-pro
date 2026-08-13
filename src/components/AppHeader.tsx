import { Link, useLocation } from 'react-router-dom';
import { Bell, Search, Moon, Sun, Languages, User as UserIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import logoAsset from '@/assets/bsut-logo.png.asset.json';
import SmartAvatarImage from './SmartAvatarImage';
import { Avatar, AvatarFallback } from './ui/avatar';

interface AppHeaderProps {
  role: 'doctor' | 'student';
}

export default function AppHeader({ role }: AppHeaderProps) {
  const { language, setLanguage } = useLanguage();
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const isAr = language === 'ar';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (!cancelled) setUnread(count || 0);
    })();
    return () => { cancelled = true; };
  }, [user, location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl safe-top md:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link to={`/${role}`} className="flex min-w-0 items-center gap-2.5">
          <img src={logoAsset.url} alt="" className="h-8 w-8 rounded-lg object-contain" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">
              {isAr ? 'جامعة بني سويف التكنولوجية' : 'Beni-Suef Tech University'}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {isAr ? (role === 'doctor' ? 'بوابة أعضاء هيئة التدريس' : 'بوابة الطالب') : role === 'doctor' ? 'Faculty Portal' : 'Student Portal'}
            </p>
          </div>
        </Link>

        <div className="ms-auto flex items-center gap-1">
          <Link
            to={`/${role}/profile`}
            className="group flex items-center gap-2 rounded-xl p-1 transition hover:bg-muted"
          >
            <Avatar className="h-8 w-8 ring-2 ring-background transition group-hover:ring-primary/20">
              <SmartAvatarImage src={profile?.avatar_url} gender={profile?.gender} role={profile?.role} isTa={profile?.is_ta} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Link>

          <button
            type="button"
            onClick={() => setLanguage(isAr ? 'en' : 'ar')}
            aria-label="Language"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted"
          >
            <Languages className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Theme"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
            aria-label="Search"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <Link
            to={`/${role}/notifications`}
            aria-label="Notifications"
            className="relative grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
