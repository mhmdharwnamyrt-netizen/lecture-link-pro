import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Bell, User, BarChart3, Bot, AlertTriangle, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileLayoutProps {
  children: ReactNode;
  role: 'doctor' | 'student';
}

export default function MobileLayout({ children, role }: MobileLayoutProps) {
  const location = useLocation();
  const { t, isRTL } = useLanguage();

  const doctorNav = [
    { path: '/doctor', icon: Home, label: t('nav.home') },
    { path: '/doctor/lectures', icon: BookOpen, label: t('nav.lectures') },
    { path: '/doctor/schedule-parser', icon: Bot, label: t('nav.schedule') },
    { path: '/doctor/analytics', icon: BarChart3, label: t('nav.analytics') },
    { path: '/doctor/profile', icon: User, label: t('nav.profile') },
  ];

  const studentNav = [
    { path: '/student', icon: Home, label: t('nav.home') },
    { path: '/student/lectures', icon: BookOpen, label: t('nav.lectures') },
    { path: '/student/calendar', icon: Calendar, label: t('nav.calendar') },
    { path: '/student/notifications', icon: Bell, label: t('nav.alerts') },
    { path: '/student/profile', icon: User, label: t('nav.profile') },
  ];

  const navItems = role === 'doctor' ? doctorNav : studentNav;

  const doctorSidebarExtra = [
    { path: '/doctor/early-warning', icon: AlertTriangle, label: t('nav.warnings') },
    { path: '/doctor/notifications', icon: Bell, label: t('nav.alerts') },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className={`flex-1 pb-20 md:pb-4 ${isRTL ? 'md:mr-64' : 'md:ml-64'}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside
        className={`fixed top-0 hidden h-full w-64 border-border bg-card p-4 md:block ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">BSUT Attendance</p>
            <p className="text-xs text-muted-foreground">
              {role === 'doctor' ? t('common.doctor') : t('common.student')} {t('common.portal')}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          {role === 'doctor' && doctorSidebarExtra.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
