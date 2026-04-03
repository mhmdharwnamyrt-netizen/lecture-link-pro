import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
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

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-6 md:px-8">
        <h1 className="mb-6 text-2xl font-bold">{t('profile.title')}</h1>

        <div className="mb-6 rounded-2xl bg-card p-6 shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              {role === 'doctor' ? <GraduationCap className="h-8 w-8 text-primary" /> : <User className="h-8 w-8 text-primary" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <p className="text-sm text-muted-foreground">{role === 'doctor' ? t('common.doctor') : t('common.student')}</p>
              {profile.academic_title && <p className="text-sm text-muted-foreground">{profile.academic_title}</p>}
              {profile.student_id && <p className="text-sm tabular-nums text-muted-foreground">{t('common.id')}: {profile.student_id}</p>}
            </div>
          </div>
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
        </div>

        <Button onClick={handleSignOut} variant="outline" className="mt-8 h-14 w-full rounded-2xl text-destructive">
          <LogOut className="mr-2 h-5 w-5" /> {t('common.signOut')}
        </Button>
      </div>
    </MobileLayout>
  );
}
