import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import IdentityVerification from '@/components/student/IdentityVerification';
import InstallApp from '@/components/InstallApp';
import AvatarUploader from '@/components/AvatarUploader';
import CoverUploader from '@/components/CoverUploader';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, GraduationCap, Shield, Globe, Camera, Sun, Moon, Monitor, Pencil, Sparkles, X, ExternalLink } from 'lucide-react';

export default function ProfilePage({ role }: { role: 'doctor' | 'student' }) {
  const { profile, signOut, refreshProfile, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasFace, setHasFace] = useState(false);
  const [stats, setStats] = useState({ attendance: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [hobbyInput, setHobbyInput] = useState('');
  const [favoriteInput, setFavoriteInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p: any = profile;
    if (!p) return;
    setBio(p.bio || '');
    setSkills(Array.isArray(p.skills) ? p.skills : []);
    setInterests(Array.isArray(p.interests) ? p.interests : []);
    setHobbies(Array.isArray(p.hobbies) ? p.hobbies : []);
    setFavorites(Array.isArray(p.favorites) ? p.favorites : []);
  }, [profile]);

  const addTag = (list: string[], setter: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const v = input.trim();
    if (!v || list.includes(v) || list.length >= 15) return;
    setter([...list, v]);
    setInput('');
  };

  const saveProfileMeta = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ bio: bio.trim() || null, skills, interests, hobbies, favorites } as any)
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      toast({ title: language === 'ar' ? 'فشل الحفظ' : 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    await refreshProfile();
    setEditOpen(false);
    toast({ title: language === 'ar' ? 'تم التحديث' : 'Profile updated' });
  };

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

  useEffect(() => {
    if (!profile || role !== 'student') return;
    (async () => {
      const { data } = await supabase.from('attendance').select('status').eq('student_id', profile.id);
      if (!data || data.length === 0) return;
      const present = data.filter(a => a.status === 'present' || a.status === 'excused').length;
      setStats({ attendance: Math.round((present / data.length) * 100) });
    })();
  }, [profile, role]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!profile) return null;

  const ringPct = role === 'student' ? stats.attendance : 100;
  const circ = 2 * Math.PI * 44;
  const dash = (ringPct / 100) * circ;

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-4 md:px-8">
        {/* Hero Cover — themable, with picker */}
        <div className="relative -mx-4 md:-mx-8 mb-16 h-40 overflow-hidden md:rounded-3xl md:h-48">
          <CoverUploader />

          {/* Avatar with progress ring + upload */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="relative h-28 w-28">
              {role === 'student' && (
                <svg className="absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
                  <motion.circle
                    cx="50" cy="50" r="46" fill="none"
                    stroke="hsl(var(--success))" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 46}
                    initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 46 - (ringPct / 100) * 2 * Math.PI * 46 }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                  />
                </svg>
              )}
              <div className="absolute inset-1.5">
                <AvatarUploader size={100} role={role} />
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


        {/* Quick actions: edit profile + view public profile */}
        <div className="mb-3 flex gap-2">
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 me-2" /> {language === 'ar' ? 'تعديل الملف' : 'Edit profile'}
          </Button>
          {user && (
            <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => navigate(`/u/${user.id}`)}>
              <ExternalLink className="h-4 w-4 me-2" /> {language === 'ar' ? 'عرض الملف العام' : 'View public'}
            </Button>
          )}
        </div>

        {/* About / Skills / Interests / Hobbies / Favorites preview */}
        {(() => {
          const p: any = profile;
          const anyItems = p.bio || (p.skills?.length ?? 0) || (p.interests?.length ?? 0) || (p.hobbies?.length ?? 0) || (p.favorites?.length ?? 0);
          if (!anyItems) return null;
          const sections = [
            { key: 'skills', label: language === 'ar' ? 'المهارات' : 'Skills', items: p.skills, variant: 'secondary' as const },
            { key: 'interests', label: language === 'ar' ? 'الاهتمامات' : 'Interests', items: p.interests, variant: 'outline' as const },
            { key: 'hobbies', label: language === 'ar' ? 'الهوايات' : 'Hobbies', items: p.hobbies, variant: 'secondary' as const },
            { key: 'favorites', label: language === 'ar' ? 'المفضلات' : 'Favorites', items: p.favorites, variant: 'outline' as const },
          ];
          return (
            <div className="mb-3 rounded-2xl bg-card p-4 shadow-card space-y-3">
              {p.bio && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> {language === 'ar' ? 'نبذة' : 'About'}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{p.bio}</p>
                </div>
              )}
              {sections.map((sec) => (sec.items?.length ?? 0) > 0 ? (
                <div key={sec.key}>
                  <p className="text-xs text-muted-foreground mb-1.5">{sec.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sec.items.map((s: string, i: number) => (
                      <Badge key={i} variant={sec.variant} className="rounded-full">{s}</Badge>
                    ))}
                  </div>
                </div>
              ) : null)}
            </div>
          );
        })()}

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

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل الملف الشخصي' : 'Edit profile'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{language === 'ar' ? 'نبذة' : 'About'}</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                placeholder={language === 'ar' ? 'اكتب نبذة قصيرة عنك...' : 'Write a short bio...'}
                className="min-h-[90px]"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{bio.length}/500</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{language === 'ar' ? 'المهارات' : 'Skills'}</label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(skills, setSkills, skillInput, setSkillInput); } }}
                  placeholder={language === 'ar' ? 'أضف مهارة واضغط Enter' : 'Add a skill, press Enter'}
                />
                <Button type="button" variant="outline" onClick={() => addTag(skills, setSkills, skillInput, setSkillInput)}>+</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full gap-1">
                    {s}
                    <button onClick={() => setSkills(skills.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{language === 'ar' ? 'الاهتمامات' : 'Interests'}</label>
              <div className="flex gap-2">
                <Input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(interests, setInterests, interestInput, setInterestInput); } }}
                  placeholder={language === 'ar' ? 'أضف اهتمامًا واضغط Enter' : 'Add an interest, press Enter'}
                />
                <Button type="button" variant="outline" onClick={() => addTag(interests, setInterests, interestInput, setInterestInput)}>+</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {interests.map((s, i) => (
                  <Badge key={i} variant="outline" className="rounded-full gap-1">
                    {s}
                    <button onClick={() => setInterests(interests.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            {[
              { key: 'hobbies', label: language === 'ar' ? 'الهوايات' : 'Hobbies', placeholder: language === 'ar' ? 'أضف هواية واضغط Enter' : 'Add a hobby, press Enter', list: hobbies, setList: setHobbies, input: hobbyInput, setInput: setHobbyInput, variant: 'secondary' as const },
              { key: 'favorites', label: language === 'ar' ? 'المفضلات' : 'Favorites', placeholder: language === 'ar' ? 'أضف عنصرًا مفضلاً واضغط Enter' : 'Add a favorite, press Enter', list: favorites, setList: setFavorites, input: favoriteInput, setInput: setFavoriteInput, variant: 'outline' as const },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-sm font-medium mb-1.5 block">{f.label}</label>
                <div className="flex gap-2">
                  <Input
                    value={f.input}
                    onChange={(e) => f.setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(f.list, f.setList, f.input, f.setInput); } }}
                    placeholder={f.placeholder}
                  />
                  <Button type="button" variant="outline" onClick={() => addTag(f.list, f.setList, f.input, f.setInput)}>+</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.list.map((s, i) => (
                    <Badge key={i} variant={f.variant} className="rounded-full gap-1">
                      {s}
                      <button onClick={() => f.setList(f.list.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={saveProfileMeta} disabled={saving}>
              {saving ? (language === 'ar' ? 'يحفظ…' : 'Saving…') : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
