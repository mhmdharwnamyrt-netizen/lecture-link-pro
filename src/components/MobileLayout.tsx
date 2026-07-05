import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, BookOpen, Bell, User, BarChart3, Bot, AlertTriangle, Calendar,
  MessageCircle, Clock, Shield, CloudOff, Trophy, Search, Users, MoreHorizontal,
  Briefcase, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MobileLayoutProps {
  children: ReactNode;
  role: 'doctor' | 'student';
}

type NavItem = { path: string; icon: any; label: string };

export default function MobileLayout({ children, role }: MobileLayoutProps) {
  const location = useLocation();
  const { t, isRTL, language } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const isAr = language === 'ar';

  // 4 primary + a persistent "More" button (5 slots total)
  const doctorPrimary: NavItem[] = [
    { path: '/doctor',                 icon: Home,     label: t('nav.home') },
    { path: '/doctor/lectures',        icon: BookOpen, label: t('nav.lectures') },
    { path: '/doctor/schedule-parser', icon: Bot,      label: t('nav.schedule') },
    { path: '/doctor/profile',         icon: User,     label: t('nav.profile') },
  ];

  const studentPrimary: NavItem[] = [
    { path: '/student',               icon: Home,     label: t('nav.home') },
    { path: '/student/lectures',      icon: BookOpen, label: t('nav.lectures') },
    { path: '/student/notifications', icon: Bell,     label: t('nav.alerts') },
    { path: '/student/profile',       icon: User,     label: t('nav.profile') },
  ];

  const primary = role === 'doctor' ? doctorPrimary : studentPrimary;

  // Each extra tile gets a distinct gradient so the drawer feels vivid, not gray
  type ExtraItem = NavItem & { gradient: string; iconTint: string };
  const doctorExtra: ExtraItem[] = [
    { path: '/doctor/analytics',     icon: BarChart3,     label: t('nav.analytics'),        gradient: 'from-sky-500/25 to-blue-500/10',      iconTint: 'text-sky-500' },
    { path: '/doctor/early-warning', icon: AlertTriangle, label: t('nav.warnings'),         gradient: 'from-amber-500/25 to-orange-500/10',  iconTint: 'text-amber-500' },
    { path: '/doctor/notifications', icon: Bell,          label: t('nav.alerts'),           gradient: 'from-rose-500/25 to-pink-500/10',     iconTint: 'text-rose-500' },
    { path: '/doctor/messages',      icon: MessageCircle, label: isAr ? 'الرسائل' : 'Messages',      gradient: 'from-violet-500/25 to-indigo-500/10', iconTint: 'text-violet-500' },
    { path: '/doctor/office-hours',  icon: Clock,         label: isAr ? 'الساعات المكتبية' : 'Office Hours', gradient: 'from-cyan-500/25 to-teal-500/10',     iconTint: 'text-cyan-500' },
    { path: '/doctor/community',     icon: Users,         label: isAr ? 'الملتقى الطلابي' : 'Community',     gradient: 'from-fuchsia-500/25 to-purple-500/10', iconTint: 'text-fuchsia-500' },
    { path: '/doctor/trainings',     icon: Briefcase,     label: isAr ? 'التدريبات' : 'Trainings',    gradient: 'from-emerald-500/25 to-green-500/10', iconTint: 'text-emerald-500' },
  ];

  const studentExtra: ExtraItem[] = [
    { path: '/student/schedule-ai',   icon: Bot,           label: t('nav.mySchedule'),                        gradient: 'from-violet-500/25 to-indigo-500/10', iconTint: 'text-violet-500' },
    { path: '/student/calendar',      icon: Calendar,      label: t('nav.calendar'),                          gradient: 'from-sky-500/25 to-blue-500/10',      iconTint: 'text-sky-500' },
    { path: '/student/messages',      icon: MessageCircle, label: isAr ? 'الرسائل' : 'Messages',              gradient: 'from-rose-500/25 to-pink-500/10',     iconTint: 'text-rose-500' },
    { path: '/student/office-hours',  icon: Clock,         label: isAr ? 'الساعات المكتبية' : 'Office Hours', gradient: 'from-cyan-500/25 to-teal-500/10',     iconTint: 'text-cyan-500' },
    { path: '/student/community',     icon: Users,         label: isAr ? 'الملتقى الطلابي' : 'Community',     gradient: 'from-fuchsia-500/25 to-purple-500/10', iconTint: 'text-fuchsia-500' },
    { path: '/student/trainings',     icon: Briefcase,     label: isAr ? 'التدريبات' : 'Trainings',           gradient: 'from-emerald-500/25 to-green-500/10', iconTint: 'text-emerald-500' },
    { path: '/student/offline-queue', icon: CloudOff,      label: isAr ? 'قائمة الانتظار' : 'Offline Queue',  gradient: 'from-slate-500/25 to-zinc-500/10',    iconTint: 'text-slate-500' },
  ];

  const extras: ExtraItem[] = [
    ...(role === 'doctor' ? doctorExtra : studentExtra),
    { path: '/leaderboard', icon: Trophy, label: isAr ? 'لوحة الصدارة' : 'Leaderboard', gradient: 'from-amber-500/25 to-yellow-500/10', iconTint: 'text-amber-500' },
  ];
  if (isAdmin) {
    extras.push({ path: '/admin', icon: Shield, label: isAr ? 'لوحة الإدارة' : 'Admin Dashboard', gradient: 'from-red-500/25 to-rose-500/10', iconTint: 'text-red-500' });
  }

  // Desktop sidebar shows every route in one column
  const sidebarAll = [...primary, ...extras];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className={`flex-1 pb-24 md:pb-4 ${isRTL ? 'md:mr-64' : 'md:ml-64'}`}>
        {children}
      </main>

      {/* Floating search FAB (hidden on messaging routes to avoid overlapping the send button) */}
      {!location.pathname.includes('/messages') && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          aria-label="Open search"
          className={`fixed bottom-28 md:bottom-6 ${isRTL ? 'left-4' : 'right-4'} z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-bloom hover:scale-105 transition-transform`}
        >
          <Search className="h-5 w-5" />
        </button>
      )}

      {/* ============ Mobile bottom navigation — floating pill ============ */}
      <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 pt-2 safe-bottom md:hidden pointer-events-none">
        <div className="mx-auto flex max-w-md items-stretch justify-between gap-1 rounded-[28px] border border-border/60 bg-card/95 p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] backdrop-blur-xl pointer-events-auto">
          {primary.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
              >
                {active && (
                  <motion.span
                    layoutId="mobileNavActive"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-2xl bg-primary/12"
                  />
                )}
                <item.icon
                  className={`relative h-[22px] w-[22px] transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`relative text-[10px] font-medium leading-tight transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More trigger */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={isAr ? 'المزيد' : 'More'}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
          >
            {moreOpen && (
              <span className="absolute inset-0 rounded-2xl bg-primary/12" />
            )}
            <MoreHorizontal
              className={`relative h-[22px] w-[22px] transition-colors ${
                moreOpen ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <span
              className={`relative text-[10px] font-medium leading-tight transition-colors ${
                moreOpen ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {isAr ? 'المزيد' : 'More'}
            </span>
          </button>
        </div>
      </nav>

      {/* ============ More drawer (mobile) ============ */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 bg-card/95 p-0 backdrop-blur-xl max-h-[85vh] md:hidden"
        >
          {/* Grabber */}
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          </div>

          <SheetHeader className="px-5 pb-3 pt-4 text-start">
            <SheetTitle className="flex items-center justify-between">
              <span className="text-base font-semibold">
                {isAr ? 'المزيد من الأقسام' : 'More sections'}
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetTitle>
            {profile?.full_name && (
              <p className="text-xs text-muted-foreground">{profile.full_name}</p>
            )}
          </SheetHeader>

          <div className="px-4 pb-6 pt-1">
            <div className="grid grid-cols-3 gap-2.5">
              <AnimatePresence>
                {extras.map((item, i) => {
                  const active = location.pathname === item.path;
                  return (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025 }}
                    >
                      <Link
                        to={item.path}
                        onClick={() => setMoreOpen(false)}
                        className={`flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center transition ${
                          active
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-border/60 bg-background hover:bg-muted/60'
                        }`}
                      >
                        <span
                          className={`grid h-11 w-11 place-items-center rounded-xl ${
                            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                        </span>
                        <span className="text-[11px] font-medium leading-tight text-foreground line-clamp-2">
                          {item.label}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============ Desktop sidebar ============ */}
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
        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-6rem)] pr-1">
          {sidebarAll.map((item) => {
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
