import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import IdentityVerification from '@/components/student/IdentityVerification';
import InstallApp from '@/components/InstallApp';
import { LogOut, User, GraduationCap, Shield, Globe, Camera, Sun, Moon, Monitor } from 'lucide-react';

export default function ProfilePage({ role }: { role: 'doctor' | 'student' }) {
  const { profile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [hasFace, setHasFace] = useState(false);

  useEffect(() => {
    if (profile && role === 'student') {
      supabase
        .from('face_templates')
        .select('id')
        .eq('student_id', profile.id)
        .maybeSingle()
        .then(({ data }) => setHasFace(!!data));
    }
  }, [profile, role]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!profile) return null;

  // Calculate attendance percentage for ring
  const [stats, setStats] = useState({ attendance: 0 });
  useEffect(() => {
    if (!profile || role !== 'student') return;
    (async () => {
      const { data } = await supabase.from('attendance').select('status').eq('student_id', profile.id);
      if (!data || data.length === 0) return;
      const present = data.filter(a => a.status === 'present' || a.status === 'excused').length;
      setStats({ attendance: Math.round((present / data.length) * 100) });
    })();
  }, [profile, role]);

  const ringPct = role === 'student' ? stats.attendance : 100;
  const circ = 2 * Math.PI * 44;
  const dash = (ringPct / 100) * circ;

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-2 md:px-8">
        {/* Hero Cover with animated gradient */}
        <div className="relative -mx-4 md:-mx-8 mb-20 h-44 overflow-hidden md:rounded-3xl md:h-52">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary" />
          <motion.div
            className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-white/20 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
            transition={{ duration: 9, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-warning/30 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -15, 0] }}
            transition={{ duration: 11, repeat: Infinity }}
          />

          {/* Avatar with progress ring */}
          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
            <div className="relative h-28 w-28">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--card))" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="hsl(var(--success))" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: circ - dash }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-card shadow-elevated">
                {role === 'doctor' ? <GraduationCap className="h-10 w-10 text-primary" /> : <User className="h-10 w-10 text-primary" />}
              </div>
              {role === 'student' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow">
                  {ringPct}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">{profile.full_name}</h2>
          <p className="text-sm text-muted-foreground">{role === 'doctor' ? t('common.doctor') : t('common.student')}</p>
          {profile.academic_title && <p className="text-sm text-muted-foreground">{profile.academic_title}</p>}
          {profile.student_id && <p className="text-sm tabular-nums text-muted-foreground">{t('common.id')}: {profile.student_id}</p>}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">{t('profile.phone')}</p>
            <p className="font-medium">{profile.phone || t('profile.notSet')}</p>
          </div>
          {role === 'student' && (
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">{t('student.totalPoints')}</p>
              <p className="text-2xl font-bold tabular-nums text-primary">{profile.points}</p>
            </div>
          )}

          {/* Face Registration Status */}
          {role === 'student' && (
            <div
              className="rounded-2xl bg-card p-4 shadow-card cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => navigate('/student/face-registration')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('face.registration')}</p>
                    <p className="font-medium">
                      {hasFace ? t('profile.faceRegistered') : t('profile.registerFace')}
                    </p>
                  </div>
                </div>
                {hasFace ? (
                  <Shield className="h-5 w-5 text-success" />
                ) : (
                  <span className="rounded-lg bg-warning/10 px-2 py-1 text-xs text-warning font-medium">{t('profile.required')}</span>
                )}
              </div>
            </div>
          )}

          {/* Identity Verification - Student Only */}
          {role === 'student' && (
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <IdentityVerification />
            </div>
          )}

          {/* Theme Toggle */}
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <Sun className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">{t('common.theme')}</p>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'system', label: t('common.themeSystem'), icon: Monitor },
                { value: 'light', label: t('common.themeLight'), icon: Sun },
                { value: 'dark', label: t('common.themeDark'), icon: Moon },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-medium transition-colors ${
                    theme === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Toggle */}
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">{t('common.language')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                  language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {t('common.english')}
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                  language === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {t('common.arabic')}
              </button>
            </div>
          </div>

          {/* Install App (PWA / APK) */}
          <InstallApp />
        </div>

        <Button onClick={handleSignOut} variant="outline" className="mt-8 h-14 w-full rounded-2xl text-destructive">
          <LogOut className="me-2 h-5 w-5" /> {t('common.signOut')}
        </Button>
      </div>
    </MobileLayout>
  );
}
