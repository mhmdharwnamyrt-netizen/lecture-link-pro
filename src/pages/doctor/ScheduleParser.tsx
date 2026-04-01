import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Bot, Loader2, CheckCircle2, Calendar, Clock, MapPin, BookOpen, ArrowLeft, Sparkles, XCircle, RefreshCw, BarChart3, ChevronRight } from 'lucide-react';

interface ParsedLecture {
  title: string;
  type: 'lecture' | 'section';
  day_of_week: string;
  start_time: string;
  end_time: string;
  hall_number?: number;
  selected?: boolean;
}

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_COLORS: Record<string, string> = {
  Sunday: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Monday: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Tuesday: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Wednesday: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Thursday: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Friday: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Saturday: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function getCurrentDayName() {
  return DAY_ORDER[new Date().getDay()];
}

function getNextLectures(lectures: any[], count = 3) {
  const now = new Date();
  const currentDay = getCurrentDayName();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const currentDayIdx = DAY_ORDER.indexOf(currentDay);

  const scored = lectures
    .filter(l => l.day_of_week && l.start_time)
    .map(l => {
      const dayIdx = DAY_ORDER.indexOf(l.day_of_week);
      let dayDiff = dayIdx - currentDayIdx;
      if (dayDiff < 0) dayDiff += 7;

      const [h, m] = (l.start_time || '00:00').split(':').map(Number);
      const lectureMin = h * 60 + m;

      if (dayDiff === 0 && lectureMin < currentTime) dayDiff = 7;

      return { ...l, _score: dayDiff * 1440 + lectureMin };
    })
    .sort((a, b) => a._score - b._score);

  return scored.slice(0, count);
}

export default function ScheduleParser() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<'loading' | 'dashboard' | 'upload' | 'parsing' | 'review' | 'creating' | 'done'>('loading');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsedLectures, setParsedLectures] = useState<ParsedLecture[]>([]);
  const [summary, setSummary] = useState('');
  const [createdCount, setCreatedCount] = useState(0);

  // Dashboard state
  const [myLectures, setMyLectures] = useState<any[]>([]);
  const [lastUpload, setLastUpload] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  const loadDashboard = async () => {
    if (!profile) return;

    // Check if doctor has schedule-created lectures
    const { data: lectures } = await supabase
      .from('lectures')
      .select('*, departments(name), subjects(name)')
      .eq('doctor_id', profile.id)
      .not('day_of_week', 'is', null)
      .order('created_at', { ascending: false });

    // Check last upload
    const { data: uploads } = await supabase
      .from('schedule_uploads')
      .select('*')
      .eq('doctor_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1);

    setMyLectures(lectures || []);
    setLastUpload(uploads?.[0] || null);

    if (lectures && lectures.length > 0) {
      setPhase('dashboard');
    } else {
      setPhase('upload');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: t('common.error'), description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleParse = async () => {
    if (!imagePreview || !profile) return;
    setPhase('parsing');

    try {
      const base64 = imagePreview.split(',')[1];
      const byteChars = atob(base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' });

      const path = `${profile.id}/schedule_${Date.now()}.jpg`;
      await supabase.storage.from('face-photos').upload(path, blob, { contentType: 'image/jpeg' });
      const { data: urlData } = supabase.storage.from('face-photos').getPublicUrl(path);

      const { data, error } = await supabase.functions.invoke('parse-schedule', {
        body: { imageUrl: urlData.publicUrl },
      });

      if (error) throw error;

      const lectures = (data?.lectures || []).map((l: ParsedLecture) => ({ ...l, selected: true }));
      setParsedLectures(lectures);
      setSummary(data?.summary || '');

      await supabase.from('schedule_uploads').insert({
        doctor_id: profile.id,
        image_url: urlData.publicUrl,
        status: 'parsed',
        parsed_data: data,
        lectures_created: 0,
      });

      setPhase('review');
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
      setPhase(myLectures.length > 0 ? 'dashboard' : 'upload');
    }
  };

  const toggleLecture = (index: number) => {
    setParsedLectures(prev => prev.map((l, i) => i === index ? { ...l, selected: !l.selected } : l));
  };

  const handleCreateLectures = async () => {
    if (!profile) return;
    const selected = parsedLectures.filter(l => l.selected);
    if (selected.length === 0) {
      toast({ title: 'No lectures selected', variant: 'destructive' });
      return;
    }

    setPhase('creating');

    try {
      const { data: doctorDepts } = await supabase
        .from('doctor_departments')
        .select('department_id, level')
        .eq('doctor_id', profile.id);

      if (!doctorDepts || doctorDepts.length === 0) {
        throw new Error('No departments configured. Please update your profile.');
      }

      const defaultDept = doctorDepts[0];
      let created = 0;

      for (const lecture of selected) {
        let subjectId: string | null = null;
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', `%${lecture.title}%`)
          .maybeSingle();

        if (existingSubject) {
          subjectId = existingSubject.id;
        } else {
          const { data: newSubject } = await supabase
            .from('subjects')
            .insert({ name: lecture.title })
            .select('id')
            .single();
          if (newSubject) subjectId = newSubject.id;
        }

        // Lectures are created but NOT active - they activate at their scheduled time
        const { error } = await supabase.from('lectures').insert({
          doctor_id: profile.id,
          title: lecture.title,
          type: lecture.type,
          department_id: defaultDept.department_id,
          level: defaultDept.level,
          hall_number: lecture.hall_number || null,
          day_of_week: lecture.day_of_week,
          start_time: lecture.start_time + ':00',
          end_time: lecture.end_time + ':00',
          subject_id: subjectId,
          is_active: true,
        });

        if (!error) created++;
      }

      setCreatedCount(created);
      setPhase('done');
      toast({ title: `✓ ${created} lectures created successfully!` });

      // Reload dashboard data
      await loadDashboard();
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
      setPhase('review');
    }
  };

  // Group lectures by day
  const lecturesByDay = myLectures.reduce((acc: Record<string, any[]>, l) => {
    const day = l.day_of_week || 'Unscheduled';
    if (!acc[day]) acc[day] = [];
    acc[day].push(l);
    return acc;
  }, {});

  const sortedDays = Object.keys(lecturesByDay).sort((a, b) => {
    const ia = DAY_ORDER.indexOf(a);
    const ib = DAY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const todayLectures = myLectures.filter(l => l.day_of_week === getCurrentDayName());
  const nextUpcoming = getNextLectures(myLectures);
  const totalPerWeek = myLectures.length;
  const uniqueSubjects = new Set(myLectures.map(l => l.title)).size;

  if (phase === 'loading') {
    return (
      <MobileLayout role="doctor">
        <div className="flex h-screen items-center justify-center md:ml-64">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout role="doctor">
      <div className="md:ml-64">
        <div className="px-4 pt-6 md:px-8 pb-6">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('schedule.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('schedule.subtitle')}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ===== DASHBOARD ===== */}
            {phase === 'dashboard' && !showUpload && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {/* Stats */}
                <div className="mb-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-card p-4 shadow-card text-center">
                    <BookOpen className="mx-auto mb-1 h-5 w-5 text-primary" />
                    <p className="text-xl font-bold tabular-nums">{totalPerWeek}</p>
                    <p className="text-xs text-muted-foreground">Weekly</p>
                  </div>
                  <div className="rounded-2xl bg-card p-4 shadow-card text-center">
                    <BarChart3 className="mx-auto mb-1 h-5 w-5 text-accent" />
                    <p className="text-xl font-bold tabular-nums">{uniqueSubjects}</p>
                    <p className="text-xs text-muted-foreground">Subjects</p>
                  </div>
                  <div className="rounded-2xl bg-card p-4 shadow-card text-center">
                    <Calendar className="mx-auto mb-1 h-5 w-5 text-success" />
                    <p className="text-xl font-bold tabular-nums">{todayLectures.length}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                </div>

                {/* Next Upcoming */}
                {nextUpcoming.length > 0 && (
                  <div className="mb-6">
                    <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" /> Upcoming Lectures
                    </h2>
                    <div className="space-y-2">
                      {nextUpcoming.map((l, i) => (
                        <motion.div
                          key={l.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => navigate(`/doctor/lectures/${l.id}`)}
                          className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card cursor-pointer transition-all hover:shadow-elevated active:scale-[0.98]"
                        >
                          <div className={`rounded-xl px-2 py-1 text-xs font-medium ${DAY_COLORS[l.day_of_week] || 'bg-muted text-muted-foreground'}`}>
                            {l.day_of_week?.slice(0, 3)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{l.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {l.start_time?.substring(0, 5)} - {l.end_time?.substring(0, 5)} • Hall {l.hall_number}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly Schedule */}
                <div className="mb-6">
                  <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> Weekly Schedule
                  </h2>
                  {sortedDays.map(day => (
                    <div key={day} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`rounded-xl px-3 py-1 text-xs font-medium ${DAY_COLORS[day] || 'bg-muted text-muted-foreground'}`}>
                          {day}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {lecturesByDay[day].length} {lecturesByDay[day].length === 1 ? 'lecture' : 'lectures'}
                        </span>
                        {day === getCurrentDayName() && (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Today</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {lecturesByDay[day]
                          .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''))
                          .map((l: any) => (
                            <div
                              key={l.id}
                              onClick={() => navigate(`/doctor/lectures/${l.id}`)}
                              className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card cursor-pointer transition-all hover:shadow-elevated active:scale-[0.98]"
                            >
                              <div className="flex flex-col items-center min-w-[48px]">
                                <p className="text-sm font-bold tabular-nums">{l.start_time?.substring(0, 5)}</p>
                                <p className="text-xs text-muted-foreground tabular-nums">{l.end_time?.substring(0, 5)}</p>
                              </div>
                              <div className="h-8 w-0.5 rounded-full bg-primary/30" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-lg px-1.5 py-0.5 text-[10px] font-medium ${
                                    l.type === 'section' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                                  }`}>{l.type}</span>
                                </div>
                                <p className="font-medium text-sm truncate">{l.title}</p>
                                {l.hall_number && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Hall {l.hall_number}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload New Schedule */}
                <div className="border-t border-border pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowUpload(true)}
                    className="w-full h-12 rounded-2xl gap-2"
                  >
                    <RefreshCw className="h-4 w-4" /> Upload New Schedule
                  </Button>
                  {lastUpload && (
                    <p className="mt-2 text-xs text-center text-muted-foreground">
                      Last uploaded: {new Date(lastUpload.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ===== UPLOAD PHASE ===== */}
            {(phase === 'upload' || showUpload) && phase !== 'parsing' && phase !== 'review' && phase !== 'creating' && phase !== 'done' && (
              <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {showUpload && myLectures.length > 0 && (
                  <Button variant="ghost" onClick={() => setShowUpload(false)} className="mb-4 gap-2 text-muted-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to Schedule
                  </Button>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-card p-8 shadow-card cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Schedule" className="max-h-64 rounded-xl object-contain mb-4" />
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="font-medium mb-1">{t('schedule.uploadImage')}</p>
                      <p className="text-sm text-muted-foreground text-center">{t('schedule.uploadHint')}</p>
                    </>
                  )}
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

                {imagePreview && (
                  <div className="space-y-3">
                    <Button onClick={handleParse} className="h-14 w-full rounded-2xl text-base gap-2">
                      <Sparkles className="h-5 w-5" /> {t('schedule.parseWithAI')}
                    </Button>
                    <Button variant="outline" onClick={() => setImagePreview(null)} className="h-12 w-full rounded-2xl">
                      {t('schedule.chooseAnother')}
                    </Button>
                  </div>
                )}

                {!showUpload && (
                  <div className="mt-8 rounded-2xl bg-card p-4 shadow-card">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" /> {t('schedule.howItWorks')}
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>1. {t('schedule.step1')}</p>
                      <p>2. {t('schedule.step2')}</p>
                      <p>3. {t('schedule.step3')}</p>
                      <p>4. {t('schedule.step4')}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Parsing Phase */}
            {phase === 'parsing' && (
              <motion.div key="parsing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="relative mb-6">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <Bot className="absolute inset-0 m-auto h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold mb-2">{t('schedule.analyzing')}</h2>
                <p className="text-sm text-muted-foreground text-center">{t('schedule.analyzingHint')}</p>
              </motion.div>
            )}

            {/* Review Phase */}
            {phase === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {summary && (
                  <div className="mb-4 rounded-2xl bg-primary/5 p-4 shadow-card">
                    <p className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium">{summary}</span>
                    </p>
                  </div>
                )}

                <p className="text-sm text-muted-foreground mb-3">
                  {t('schedule.selectLectures')} ({parsedLectures.filter(l => l.selected).length}/{parsedLectures.length})
                </p>

                <div className="space-y-2 mb-6">
                  {parsedLectures.map((lecture, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => toggleLecture(i)}
                      className={`rounded-2xl p-4 shadow-card cursor-pointer transition-all ${
                        lecture.selected ? 'bg-card ring-2 ring-primary' : 'bg-card opacity-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                              lecture.type === 'section' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                            }`}>{lecture.type}</span>
                            <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${DAY_COLORS[lecture.day_of_week] || 'bg-muted text-muted-foreground'}`}>
                              {lecture.day_of_week}
                            </span>
                          </div>
                          <p className="font-semibold">{lecture.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {lecture.start_time} - {lecture.end_time}
                            </span>
                            {lecture.hall_number && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Hall {lecture.hall_number}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          lecture.selected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                          {lecture.selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Button onClick={handleCreateLectures} className="h-14 w-full rounded-2xl text-base gap-2"
                    disabled={parsedLectures.filter(l => l.selected).length === 0}
                  >
                    <CheckCircle2 className="h-5 w-5" /> {t('schedule.createSelected')} ({parsedLectures.filter(l => l.selected).length})
                  </Button>
                  <Button variant="outline" onClick={() => { setPhase(myLectures.length > 0 ? 'dashboard' : 'upload'); setShowUpload(false); }} className="h-12 w-full rounded-2xl">
                    {t('schedule.tryAgain')}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Creating Phase */}
            {phase === 'creating' && (
              <motion.div key="creating" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                <h2 className="text-lg font-bold mb-2">{t('schedule.creating')}</h2>
                <p className="text-sm text-muted-foreground">{t('schedule.creatingHint')}</p>
              </motion.div>
            )}

            {/* Done Phase */}
            {phase === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10 mb-6"
                >
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </motion.div>
                <h2 className="text-xl font-bold mb-2">{t('schedule.done')}</h2>
                <p className="text-muted-foreground mb-8">
                  {createdCount} {t('schedule.lecturesCreated')}
                </p>
                <div className="space-y-3 w-full">
                  <Button onClick={() => { setPhase('dashboard'); setShowUpload(false); setImagePreview(null); setParsedLectures([]); }} className="h-14 w-full rounded-2xl text-base gap-2">
                    <Calendar className="h-5 w-5" /> View My Schedule
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/doctor/lectures')} className="h-12 w-full rounded-2xl">
                    <BookOpen className="mr-2 h-5 w-5" /> {t('schedule.viewLectures')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MobileLayout>
  );
}
