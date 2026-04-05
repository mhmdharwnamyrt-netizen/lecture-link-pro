import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Bot, BookOpen, Clock, MapPin, Loader2, Calendar, Bell, CheckCircle2, ChevronRight, User, ArrowLeft } from 'lucide-react';

interface ParsedLecture {
  title: string;
  type: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  hall_number?: number;
  doctor_name?: string;
  group?: string;
}

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_AR: Record<string, string> = {
  Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
};

export default function StudentScheduleParser() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [hasSchedule, setHasSchedule] = useState(false);
  const [parsedLectures, setParsedLectures] = useState<ParsedLecture[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedLecture, setSelectedLecture] = useState<ParsedLecture | null>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) navigate('/login');
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) loadSavedSchedule();
  }, [profile]);

  const loadSavedSchedule = () => {
    const saved = localStorage.getItem(`student_schedule_${profile?.id}`);
    if (saved) {
      const data = JSON.parse(saved);
      setParsedLectures(data.lectures || []);
      setSelectedGroup(data.group || '');
      setHasSchedule(true);
    }
  };

  const saveSchedule = (lectures: ParsedLecture[], group: string) => {
    localStorage.setItem(`student_schedule_${profile?.id}`, JSON.stringify({ lectures, group }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setAnalyzing(true);
    setAnalyzeProgress(0);

    // Animated progress
    const progressInterval = setInterval(() => {
      setAnalyzeProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const fileName = `student-schedules/${profile!.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('face-photos')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('face-photos').getPublicUrl(fileName);

      const { data, error } = await supabase.functions.invoke('parse-schedule', {
        body: { imageUrl: urlData.publicUrl },
      });

      if (error) throw error;

      clearInterval(progressInterval);
      setAnalyzeProgress(100);

      const lectures = data.lectures || [];
      setParsedLectures(lectures);
      setHasSchedule(true);
      saveSchedule(lectures, selectedGroup);

      toast({
        title: t('student.scheduleAnalyzed'),
        description: `${lectures.length} ${t('student.lecturesFound')}`,
      });
    } catch (err: any) {
      clearInterval(progressInterval);
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
      setAnalyzeProgress(0);
    }
  };

  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    saveSchedule(parsedLectures, group);
  };

  // Group lectures by day
  const byDay = DAY_ORDER.reduce<Record<string, ParsedLecture[]>>((acc, day) => {
    const dayLectures = parsedLectures.filter(l => l.day_of_week === day);
    if (dayLectures.length > 0) acc[day] = dayLectures;
    return acc;
  }, {});

  // Find next upcoming lecture
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const getNextLecture = (): ParsedLecture | null => {
    const todayLectures = parsedLectures
      .filter(l => l.day_of_week === currentDay && l.start_time > currentTime)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (todayLectures.length > 0) return todayLectures[0];

    const currentDayIdx = DAY_ORDER.indexOf(currentDay);
    for (let i = 1; i <= 7; i++) {
      const nextDay = DAY_ORDER[(currentDayIdx + i) % 7];
      const dayLectures = parsedLectures
        .filter(l => l.day_of_week === nextDay)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (dayLectures.length > 0) return dayLectures[0];
    }
    return null;
  };

  const nextLecture = getNextLecture();

  if (loading || !profile) return null;

  // Lecture detail view
  if (selectedLecture) {
    const isNow = selectedLecture.day_of_week === currentDay &&
      selectedLecture.start_time <= currentTime &&
      selectedLecture.end_time > currentTime;

    // Calculate duration
    const [sh, sm] = selectedLecture.start_time.split(':').map(Number);
    const [eh, em] = selectedLecture.end_time.split(':').map(Number);
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);
    const durationText = durationMin >= 60
      ? `${Math.floor(durationMin / 60)}${language === 'ar' ? ' ساعة' : 'h'} ${durationMin % 60 > 0 ? `${durationMin % 60}${language === 'ar' ? ' دقيقة' : 'm'}` : ''}`
      : `${durationMin} ${language === 'ar' ? 'دقيقة' : 'min'}`;

    return (
      <MobileLayout role="student">
        <div className="px-4 pt-2 md:pt-6 md:px-8">
          <button onClick={() => setSelectedLecture(null)} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Status Badge */}
            {isNow && (
              <div className="mb-4 rounded-2xl bg-success/10 p-3 text-center">
                <span className="text-sm font-bold text-success animate-pulse">● {language === 'ar' ? 'جارية الآن' : 'Happening Now'}</span>
              </div>
            )}

            {/* Lecture Title */}
            <div className="mb-6">
              <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-medium mb-2 ${
                selectedLecture.type === 'section' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
              }`}>
                {selectedLecture.type === 'section' ? t('common.section') : t('common.lecture')}
              </span>
              <h1 className="text-2xl font-bold">{selectedLecture.title}</h1>
            </div>

            {/* Details Card */}
            <div className="rounded-2xl bg-card p-5 shadow-card space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'اليوم' : 'Day'}</p>
                  <p className="font-medium">{language === 'ar' ? DAY_AR[selectedLecture.day_of_week] : selectedLecture.day_of_week}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('common.time')}</p>
                  <p className="font-medium">{selectedLecture.start_time?.substring(0, 5)} - {selectedLecture.end_time?.substring(0, 5)}</p>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'المدة:' : 'Duration:'} {durationText}</p>
                </div>
              </div>
              {selectedLecture.hall_number && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.hall')}</p>
                    <p className="font-medium">{t('common.hall')} {selectedLecture.hall_number}</p>
                  </div>
                </div>
              )}
              {selectedLecture.doctor_name && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.doctor')}</p>
                    <p className="font-medium">{selectedLecture.doctor_name}</p>
                  </div>
                </div>
              )}
              {selectedGroup && (
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('student.yourGroup')}</p>
                    <p className="font-medium">{t('common.group')} {selectedGroup}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reminder Info */}
            <div className="rounded-2xl bg-primary/5 p-4 text-center">
              <Bell className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'سيتم تذكيرك قبل 15 دقيقة من بداية المحاضرة' : 'You\'ll be reminded 15 minutes before this lecture starts'}
              </p>
            </div>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // Upload view
  if (!hasSchedule) {
    return (
      <MobileLayout role="student">
        <div className="px-4 pt-2 md:pt-6 md:px-8">
          <h1 className="mb-2 text-2xl font-bold">{t('student.scheduleAI')}</h1>
          <p className="mb-6 text-muted-foreground">{t('student.uploadScheduleHint')}</p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            {/* Group Selection */}
            <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
              <p className="mb-3 text-sm font-medium">{t('student.yourGroup')}</p>
              <div className="flex gap-2">
                {['A', 'B'].map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                      selectedGroup === g ? 'bg-primary text-primary-foreground shadow-md scale-[1.02]' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {t('common.group')} {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => !analyzing && fileRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                analyzing ? 'border-primary/50 bg-primary/5' : 'border-primary/30 bg-primary/5 hover:bg-primary/10'
              }`}
            >
              <AnimatePresence mode="wait">
                {analyzing ? (
                  <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                    {/* Animated AI Brain */}
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                        className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary"
                      />
                      <Bot className="absolute inset-0 m-auto h-7 w-7 text-primary" />
                    </div>
                    <div className="w-full max-w-xs">
                      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                        <span>{t('schedule.analyzing')}</span>
                        <span>{Math.round(analyzeProgress)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${analyzeProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{t('schedule.analyzingHint')}</p>
                    </div>
                  </motion.div>
                ) : imagePreview ? (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <img src={imagePreview} alt="Schedule" className="mx-auto max-h-48 rounded-xl object-contain" />
                  </motion.div>
                ) : (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Upload className="mx-auto mb-3 h-10 w-10 text-primary" />
                    <p className="font-medium">{t('student.uploadSchedule')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('schedule.uploadHint')}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // Dashboard view
  return (
    <MobileLayout role="student">
      <div className="px-4 pt-2 md:pt-6 md:px-8 pb-4">
        <h1 className="mb-2 text-2xl font-bold">{t('student.scheduleAI')}</h1>

        {/* Group */}
        {selectedGroup && (
          <p className="mb-4 text-sm text-muted-foreground">
            {t('student.yourGroup')}: <span className="font-semibold text-primary">{t('common.group')} {selectedGroup}</span>
          </p>
        )}

        {/* Next Lecture Card */}
        {nextLecture && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedLecture(nextLecture)}
            className="mb-6 rounded-2xl bg-primary/10 p-4 shadow-card cursor-pointer active:scale-[0.98] transition-transform"
          >
            <p className="text-xs font-medium text-primary mb-1">{t('student.nextLecture')}</p>
            <p className="text-lg font-bold">{nextLecture.title}</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {language === 'ar' ? DAY_AR[nextLecture.day_of_week] : nextLecture.day_of_week}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {nextLecture.start_time?.substring(0, 5)} - {nextLecture.end_time?.substring(0, 5)}
              </span>
              {nextLecture.hall_number && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {t('common.hall')} {nextLecture.hall_number}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-card p-3 shadow-card text-center">
            <BookOpen className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="text-xl font-bold">{parsedLectures.length}</p>
            <p className="text-[10px] text-muted-foreground">{t('common.total')}</p>
          </div>
          <div className="rounded-2xl bg-card p-3 shadow-card text-center">
            <Calendar className="mx-auto mb-1 h-5 w-5 text-success" />
            <p className="text-xl font-bold">{Object.keys(byDay).length}</p>
            <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'أيام' : 'Days'}</p>
          </div>
          <div className="rounded-2xl bg-card p-3 shadow-card text-center">
            <Bell className="mx-auto mb-1 h-5 w-5 text-warning" />
            <p className="text-xl font-bold">15</p>
            <p className="text-[10px] text-muted-foreground">{language === 'ar' ? 'دقيقة تنبيه' : 'min remind'}</p>
          </div>
        </div>

        {/* Weekly Schedule */}
        <h2 className="mb-3 text-lg font-semibold">{t('student.weeklySchedule')}</h2>
        <div className="space-y-4 mb-6">
          {Object.entries(byDay).map(([day, lectures]) => (
            <div key={day}>
              <p className="mb-2 text-sm font-semibold text-primary">
                {language === 'ar' ? DAY_AR[day] : day}
                {day === currentDay && (
                  <span className="ms-2 rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success">
                    {t('common.today')}
                  </span>
                )}
              </p>
              <div className="space-y-2">
                {lectures.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((l, i) => {
                  const isNow = day === currentDay && l.start_time <= currentTime && l.end_time > currentTime;
                  return (
                    <motion.div
                      key={i}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedLecture(l)}
                      className={`rounded-2xl bg-card p-3 shadow-card cursor-pointer transition-all active:shadow-elevated ${
                        isNow ? 'ring-2 ring-success' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            {isNow && (
                              <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success animate-pulse">● {t('common.now')}</span>
                            )}
                            <p className="font-medium text-sm">{l.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {l.start_time?.substring(0, 5)} - {l.end_time?.substring(0, 5)}
                            {l.hall_number ? ` • ${t('common.hall')} ${l.hall_number}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                            l.type === 'section' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                          }`}>
                            {l.type === 'section' ? t('common.section') : t('common.lecture')}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Re-upload */}
        <Button
          variant="outline"
          onClick={() => { setHasSchedule(false); setImagePreview(null); }}
          className="w-full rounded-2xl h-12"
        >
          <Upload className="me-2 h-4 w-4" /> {t('schedule.uploadAnother')}
        </Button>
      </div>
    </MobileLayout>
  );
}
