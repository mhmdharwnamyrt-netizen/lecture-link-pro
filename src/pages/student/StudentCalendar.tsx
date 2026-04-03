import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Calendar, Clock, MapPin, BookOpen, Bell } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_AR: Record<string, string> = {
  Sunday: 'الأحد', Monday: 'الإثنين', Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
};

export default function StudentCalendar() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [lectures, setLectures] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay()]);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) navigate('/login');
  }, [loading, user, profile]);

  useEffect(() => {
    if (profile) loadLectures();
  }, [profile]);

  const loadLectures = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('lectures')
      .select('*, departments(name), subjects(name), profiles!lectures_doctor_id_fkey(full_name)')
      .eq('department_id', profile.department_id!)
      .eq('level', profile.level!)
      .eq('is_active', true)
      .not('day_of_week', 'is', null)
      .order('start_time', { ascending: true });

    if (data) setLectures(data);
  };

  const todayLectures = lectures.filter(l => l.day_of_week === selectedDay);
  const today = DAYS[new Date().getDay()];

  const isUpcoming = (startTime: string) => {
    if (selectedDay !== today) return false;
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    const lectureTime = new Date();
    lectureTime.setHours(hours, minutes, 0, 0);
    const diff = lectureTime.getTime() - now.getTime();
    return diff > 0 && diff < 30 * 60 * 1000; // Within 30 minutes
  };

  if (loading || !profile) return null;

  return (
    <MobileLayout role="student">
      <div >
        <div className="px-4 pt-6 md:px-8">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
          </div>

          {/* Day Selector */}
          <div className="mb-6 flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {DAYS.filter(d => d !== 'Friday').map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  selectedDay === day
                    ? 'bg-primary text-primary-foreground'
                    : day === today
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {language === 'ar' ? DAYS_AR[day] : day.substring(0, 3)}
              </button>
            ))}
          </div>

          {/* Lectures for selected day */}
          {todayLectures.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center shadow-card">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">{t('calendar.noLectures')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayLectures.map((lecture, i) => {
                const upcoming = isUpcoming(lecture.start_time);
                return (
                  <motion.div
                    key={lecture.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl bg-card p-4 shadow-card ${upcoming ? 'ring-2 ring-warning' : ''}`}
                  >
                    {upcoming && (
                      <div className="flex items-center gap-2 mb-2 text-warning">
                        <Bell className="h-4 w-4 animate-pulse" />
                        <span className="text-xs font-medium">{t('calendar.startingSoon')}</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                            lecture.type === 'section' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                          }`}>
                            {lecture.type}
                          </span>
                        </div>
                        <p className="font-semibold">{lecture.title}</p>
                        <p className="text-sm text-muted-foreground">{lecture.profiles?.full_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium tabular-nums">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {lecture.start_time?.substring(0, 5)} - {lecture.end_time?.substring(0, 5)}
                        </div>
                        {lecture.hall_number && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" /> Hall {lecture.hall_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* All days overview */}
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">{t('calendar.weekOverview')}</h2>
            <div className="space-y-2">
              {DAYS.filter(d => d !== 'Friday').map(day => {
                const count = lectures.filter(l => l.day_of_week === day).length;
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex items-center justify-between rounded-2xl bg-card p-3 shadow-card cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedDay === day ? 'ring-1 ring-primary' : ''
                    }`}
                  >
                    <span className="font-medium text-sm">
                      {language === 'ar' ? DAYS_AR[day] : day}
                      {day === today && <span className="ml-2 text-xs text-primary">({t('calendar.today')})</span>}
                    </span>
                    <span className={`rounded-xl px-2 py-0.5 text-xs font-medium ${count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {count} {t('calendar.lectures')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
