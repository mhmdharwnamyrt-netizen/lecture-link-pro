import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Bell, User, BarChart3, Bot, AlertTriangle, Calendar, MessageCircle, Clock, Shield, CloudOff, Trophy, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface MobileLayoutProps {
  children: ReactNode;
  role: 'doctor' | 'student';
}

export default function MobileLayout({ children, role }: MobileLayoutProps) {
  const location = useLocation();
  const { t, isRTL, language } = useLanguage();
  const { profile, isAdmin } = useAuth();

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
    { path: '/student/schedule-ai', icon: Bot, label: t('nav.mySchedule') },
    { path: '/student/notifications', icon: Bell, label: t('nav.alerts') },
    { path: '/student/profile', icon: User, label: t('nav.profile') },
  ];

  const navItems = role === 'doctor' ? doctorNav : studentNav;

  const doctorSidebarExtra = [
    { path: '/doctor/early-warning', icon: AlertTriangle, label: t('nav.warnings') },
    { path: '/doctor/notifications', icon: Bell, label: t('nav.alerts') },
    { path: '/doctor/messages', icon: MessageCircle, label: language === 'ar' ? 'الرسائل' : 'Messages' },
    { path: '/doctor/office-hours', icon: Clock, label: language === 'ar' ? 'الساعات المكتبية' : 'Office Hours' },
  ];

  const studentSidebarExtra = [
    { path: '/student/calendar', icon: Calendar, label: t('nav.calendar') },
    { path: '/student/offline-queue', icon: CloudOff, label: language === 'ar' ? 'قائمة الانتظار' : 'Offline Queue' },
    { path: '/student/messages', icon: MessageCircle, label: language === 'ar' ? 'الرسائل' : 'Messages' },
    { path: '/student/office-hours', icon: Clock, label: language === 'ar' ? 'الساعات المكتبية' : 'Office Hours' },
  ];

  const sidebarExtra = role === 'doctor' ? [...doctorSidebarExtra] : [...studentSidebarExtra];
  sidebarExtra.push({ path: '/leaderboard', icon: Trophy, label: language === 'ar' ? 'لوحة الصدارة' : 'Leaderboard' });
  if (isAdmin) {
    sidebarExtra.push({ path: '/admin', icon: Shield, label: language === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard' });
  }

  // Determine display name for header
  const displayName = profile?.full_name || '';
  const subtitle = role === 'doctor'
    ? (profile?.academic_title || 'Dr.')
    : (profile?.student_id ? `${t('common.id')}: ${profile.student_id}` : '');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className={`flex-1 pb-20 md:pb-4 ${isRTL ? 'md:mr-64' : 'md:ml-64'}`}>
        {children}
      </main>

      {/* Floating search FAB (opens global command palette) */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
        aria-label="Open search"
        className={`fixed bottom-24 md:bottom-6 ${isRTL ? 'left-4' : 'right-4'} z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-bloom hover:scale-105 transition-transform`}
      >
        <Search className="h-5 w-5" />
      </button>


      {/* Mobile Bottom Navigation - Curved / Liquid */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom md:hidden">
        <div className="relative mx-auto max-w-md">
          {/* Curved svg backdrop */}
          <svg viewBox="0 0 400 80" className="absolute -top-px left-0 right-0 w-full h-20 drop-shadow-[0_-4px_12px_rgba(0,0,0,0.08)]" preserveAspectRatio="none">
            <path d="M0 20 L0 80 L400 80 L400 20 Q200 60 0 20 Z" fill="hsl(var(--card))" />
          </svg>
          <div className="relative flex items-end justify-around px-2 pb-2 pt-3 h-20">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-1 flex-1"
                >
                  {isActive && (
                    <motion.div
                      layoutId="navBubble"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute -top-5 h-11 w-11 rounded-full bg-primary shadow-bloom flex items-center justify-center"
                    >
                      <item.icon className="h-5 w-5 text-primary-foreground" />
                    </motion.div>
                  )}
                  {!isActive && <item.icon className="h-5 w-5 text-muted-foreground" />}
                  <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-primary mt-6' : 'text-muted-foreground'}`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
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
          {sidebarExtra.map(item => {
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
