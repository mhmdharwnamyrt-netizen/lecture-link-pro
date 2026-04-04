import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Bot, BookOpen, Clock, MapPin, Loader2, Calendar, Bell, CheckCircle2 } from 'lucide-react';

interface ParsedLecture {
  title: string;
  type: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  hall_number?: number;
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
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
    try {
      // Upload to storage
      const fileName = `student-schedules/${profile!.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('face-photos')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('face-photos').getPublicUrl(fileName);

      // Call AI parser
      const { data, error } = await supabase.functions.invoke('parse-schedule', {
        body: { imageUrl: urlData.publicUrl },
      });

      if (error) throw error;

      const lectures = data.lectures || [];
      setParsedLectures(lectures);
      setHasSchedule(true);
      saveSchedule(lectures, selectedGroup);

      toast({
        title: t('student.scheduleAnalyzed'),
        description: `${lectures.length} ${t('student.lecturesFound')}`,
      });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
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

  // Upload view
  if (!hasSchedule) {
    return (
      <MobileLayout role="student">
        <div className="px-4 pt-6 md:px-8">
          <h1 className="mb-2 text-2xl font-bold">{t('student.scheduleAI')}</h1>
          <p className="mb-6 text-muted-foreground">{t('student.uploadScheduleHint')}</p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            {/* Group Selection */}
            <div className="mb-6 rounded-2xl bg-card p-4 shadow-card">
              <p className="mb-3 text-sm font-medium">{t('student.yourGroup')}</p>
              <div className="flex gap-2">
                {['A', 'B'].map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                      selectedGroup === g ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {t('common.group')} {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center transition-colors hover:bg-primary/10"
            >
              {analyzing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-medium">{t('schedule.analyzing')}</p>
                  <p className="text-sm text-muted-foreground">{t('schedule.analyzingHint')}</p>
                </div>
              ) : imagePreview ? (
                <img src={imagePreview} alt="Schedule" className="mx-auto max-h-48 rounded-xl object-contain" />
              ) : (
                <>
                  <Upload className="mx-auto mb-3 h-10 w-10 text-primary" />
                  <p className="font-medium">{t('student.uploadSchedule')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('schedule.uploadHint')}</p>
                </>
              )}
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
      <div className="px-4 pt-6 md:px-8 pb-4">
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
            className="mb-6 rounded-2xl bg-primary/10 p-4 shadow-card"
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
            <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-success hidden" />
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
                {lectures.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((l, i) => (
                  <div key={i} className={`rounded-2xl bg-card p-3 shadow-card ${
                    day === currentDay && l.start_time <= currentTime && l.end_time > currentTime
                      ? 'ring-2 ring-success' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{l.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.start_time?.substring(0, 5)} - {l.end_time?.substring(0, 5)}
                          {l.hall_number ? ` • ${t('common.hall')} ${l.hall_number}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                        l.type === 'section' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                      }`}>
                        {l.type === 'section' ? t('common.section') : t('common.lecture')}
                      </span>
                    </div>
                  </div>
                ))}
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
