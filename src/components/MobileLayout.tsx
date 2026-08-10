import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, BookOpen, Bell, User, BarChart3, Bot, AlertTriangle, Calendar,
  MessageCircle, Clock, Shield, CloudOff, Trophy, Search, Users, MoreHorizontal,
  Briefcase, X, GraduationCap, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppHeader from '@/components/AppHeader';



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
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem('bsut_sidebar_collapsed') === '1');
  const isAr = language === 'ar';

  useEffect(() => {
    localStorage.setItem('bsut_sidebar_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);


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

  // Calm, professional tiles — single accent, no rainbow
  type ExtraItem = NavItem;
  const doctorExtra: ExtraItem[] = [
    { path: '/doctor/analytics',     icon: BarChart3,     label: t('nav.analytics') },
    { path: '/doctor/early-warning', icon: AlertTriangle, label: t('nav.warnings') },
    { path: '/doctor/notifications', icon: Bell,          label: t('nav.alerts') },
    { path: '/doctor/messages',      icon: MessageCircle, label: isAr ? 'الرسائل' : 'Messages' },
    { path: '/doctor/office-hours',  icon: Clock,         label: isAr ? 'الساعات المكتبية' : 'Office Hours' },
    { path: '/doctor/community',     icon: Users,         label: isAr ? 'الملتقى الطلابي' : 'Community' },
    { path: '/doctor/trainings',     icon: Briefcase,     label: isAr ? 'التدريبات' : 'Trainings' },
    { path: '/doctor/quizzes',       icon: GraduationCap, label: isAr ? 'الاختبارات' : 'Quizzes' },
  ];

  const studentExtra: ExtraItem[] = [
    { path: '/student/schedule-ai',   icon: Bot,           label: t('nav.mySchedule') },
    { path: '/student/calendar',      icon: Calendar,      label: t('nav.calendar') },
    { path: '/student/messages',      icon: MessageCircle, label: isAr ? 'الرسائل' : 'Messages' },
    { path: '/student/office-hours',  icon: Clock,         label: isAr ? 'الساعات المكتبية' : 'Office Hours' },
    { path: '/student/community',     icon: Users,         label: isAr ? 'الملتقى الطلابي' : 'Community' },
    { path: '/student/trainings',     icon: Briefcase,     label: isAr ? 'التدريبات' : 'Trainings' },
    { path: '/student/quizzes',       icon: GraduationCap, label: isAr ? 'الاختبارات' : 'Quizzes' },
    { path: '/student/offline-queue', icon: CloudOff,      label: isAr ? 'قائمة الانتظار' : 'Offline Queue' },
  ];

  const extras: ExtraItem[] = [
    ...(role === 'doctor' ? doctorExtra : studentExtra),
    { path: '/leaderboard', icon: Trophy, label: isAr ? 'لوحة الصدارة' : 'Leaderboard' },
  ];
  if (isAdmin) {
    extras.push({ path: '/admin', icon: Shield, label: isAr ? 'لوحة الإدارة' : 'Admin Dashboard' });
  }


  // Desktop sidebar shows every route in one column
  const sidebarAll = [...primary, ...extras];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader role={role} />
      <main
        className={`flex-1 pb-24 transition-[margin] duration-300 ease-out md:pb-4 ${
          isRTL ? (collapsed ? 'md:mr-[76px]' : 'md:mr-64') : collapsed ? 'md:ml-[76px]' : 'md:ml-64'
        }`}
      >

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
          <motion.button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={isAr ? 'المزيد' : 'More'}
            whileTap={{ scale: 0.9 }}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
          >
            {moreOpen && (
              <motion.span
                layoutId="mobileNavActive"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-2xl bg-primary/12"
              />
            )}
            <motion.span
              animate={{ rotate: moreOpen ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative"
            >
              <MoreHorizontal
                className={`h-[22px] w-[22px] transition-colors ${
                  moreOpen ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
            </motion.span>
            <span
              className={`relative text-[10px] font-medium leading-tight transition-colors ${
                moreOpen ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {isAr ? 'المزيد' : 'More'}
            </span>
          </motion.button>
        </div>
      </nav>

      {/* ============ More drawer (mobile) ============ */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[32px] border-0 bg-gradient-to-b from-card via-card to-card/95 p-0 backdrop-blur-2xl max-h-[85vh] md:hidden shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.35)]"
        >
          {/* Subtle top wash */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden rounded-t-[32px]">
            <div className="absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>


          {/* Grabber */}
          <div className="relative flex justify-center pt-3">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          </div>

          <SheetHeader className="relative px-5 pb-2 pt-4 text-start">
            <SheetTitle className="flex items-center justify-between">
              <span className="text-base font-semibold">
                {isAr ? 'المزيد من الأقسام' : 'More sections'}
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 hover:scale-110 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetTitle>
            {profile?.full_name && (
              <p className="text-xs text-muted-foreground">{profile.full_name}</p>
            )}
          </SheetHeader>

          <div className="relative px-4 pb-6 pt-3">
            <motion.div
              className="grid grid-cols-3 gap-2.5"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
              }}
            >
              {extras.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <motion.div
                    key={item.path}
                    variants={{
                      hidden: { opacity: 0, y: 16, scale: 0.9 },
                      show: {
                        opacity: 1, y: 0, scale: 1,
                        transition: { type: 'spring', stiffness: 320, damping: 24 },
                      },
                    }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={`group relative flex h-24 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border bg-secondary/60 p-2 text-center transition-all ${
                        active
                          ? 'border-primary/50 bg-primary/[0.07]'
                          : 'border-border/60 hover:border-border hover:bg-secondary'
                      }`}
                    >
                      <span
                        className={`relative grid h-11 w-11 place-items-center rounded-xl bg-background shadow-sm ring-1 ring-border/50 transition-transform group-hover:scale-105 group-active:scale-95 ${
                          active ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                      </span>
                      <span className="relative text-[11px] font-semibold leading-tight text-foreground line-clamp-2">
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>


      {/* ============ Desktop sidebar ============ */}
      <TooltipProvider delayDuration={150}>
        <aside
          className={`fixed top-0 hidden h-full flex-col border-border/70 bg-card/95 backdrop-blur-xl transition-[width] duration-300 ease-out md:flex ${
            collapsed ? 'w-[76px] px-2 py-4' : 'w-64 p-4'
          } ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}`}
        >
          {/* Brand */}
          <div className={`mb-6 flex items-center gap-3 ${collapsed ? 'justify-center px-0' : 'px-2'}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">BSUT Attendance</p>
                <p className="truncate text-xs text-muted-foreground">
                  {role === 'doctor' ? t('common.doctor') : t('common.student')} {t('common.portal')}
                </p>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? (isAr ? 'توسيع القائمة' : 'Expand menu') : isAr ? 'طي القائمة' : 'Collapse menu'}
            className={`mb-3 flex h-9 items-center gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
              collapsed ? 'w-full justify-center' : 'w-full px-3'
            }`}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span className="text-xs font-medium">{isAr ? 'طي القائمة' : 'Collapse'}</span>}
          </button>

          <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto overscroll-contain pb-4">
            {sidebarAll.map((item) => {
              const isActive = location.pathname === item.path;
              const link = (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={`group relative flex items-center rounded-xl text-sm font-medium transition-colors ${
                    collapsed ? 'h-11 w-full justify-center' : 'gap-3 px-3 py-2.5'
                  } ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  {isActive && (
                    <span
                      className={`absolute inset-y-1.5 w-[3px] rounded-full bg-primary ${isRTL ? 'right-0' : 'left-0'} ${
                        collapsed ? 'opacity-100' : 'opacity-100'
                      }`}
                    />
                  )}
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );

              if (!collapsed) return link;
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side={isRTL ? 'left' : 'right'}>{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </aside>
      </TooltipProvider>

    </div>
  );
}
