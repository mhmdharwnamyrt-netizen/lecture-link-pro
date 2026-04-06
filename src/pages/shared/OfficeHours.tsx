import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Plus, Calendar, CheckCircle2, XCircle, MapPin, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export default function OfficeHoursPage({ role }: { role: 'doctor' | 'student' }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newSlot, setNewSlot] = useState({ day_of_week: 'Sunday', start_time: '09:00', end_time: '10:00', max_bookings: 5, location: '' });
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSlot, setBookingSlot] = useState<any>(null);
  const days = language === 'ar' ? DAYS_AR : DAYS_EN;

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user]);

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (role === 'doctor') {
      const { data } = await supabase.from('office_hours').select('*').eq('doctor_id', profile!.id).order('day_of_week');
      if (data) setSlots(data);
      const { data: bData } = await supabase
        .from('office_hour_bookings')
        .select('*, slot:office_hours!office_hour_bookings_slot_id_fkey(*), student:profiles!office_hour_bookings_student_id_fkey(full_name, student_id)')
        .order('booking_date', { ascending: false });
      if (bData) setBookings(bData.filter((b: any) => b.slot?.doctor_id === profile!.id));
    } else {
      const { data } = await supabase.from('office_hours').select('*, doctor:profiles!office_hours_doctor_id_fkey(full_name, academic_title)').order('day_of_week');
      if (data) setSlots(data);
      const { data: bData } = await supabase
        .from('office_hour_bookings')
        .select('*, slot:office_hours!office_hour_bookings_slot_id_fkey(*, doctor:profiles!office_hours_doctor_id_fkey(full_name, academic_title))')
        .eq('student_id', profile!.id)
        .order('booking_date', { ascending: false });
      if (bData) setBookings(bData);
    }
  };

  const addSlot = async () => {
    if (!profile) return;
    const { error } = await supabase.from('office_hours').insert({ ...newSlot, doctor_id: profile.id });
    if (!error) {
      toast({ title: language === 'ar' ? 'تمت الإضافة' : 'Slot Added' });
      setShowAdd(false);
      loadData();
    }
  };

  const deleteSlot = async (id: string) => {
    await supabase.from('office_hours').delete().eq('id', id);
    loadData();
  };

  const bookSlot = async () => {
    if (!profile || !bookingSlot) return;
    const nextDate = getNextDayDate(bookingSlot.day_of_week);
    const { error } = await supabase.from('office_hour_bookings').insert({
      slot_id: bookingSlot.id,
      student_id: profile.id,
      booking_date: nextDate,
      notes: bookingNotes.trim() || null,
    });
    if (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Notify doctor
      await supabase.from('notifications').insert({
        user_id: bookingSlot.doctor?.user_id || bookingSlot.doctor_id,
        title: language === 'ar' ? 'حجز ساعة مكتبية جديد' : 'New Office Hour Booking',
        message: language === 'ar'
          ? `الطالب ${profile.full_name} حجز موعد يوم ${bookingSlot.day_of_week}`
          : `Student ${profile.full_name} booked on ${bookingSlot.day_of_week}`,
        type: 'info',
      });
      toast({ title: language === 'ar' ? 'تم الحجز بنجاح!' : 'Booked Successfully!' });
      setBookingSlot(null);
      setBookingNotes('');
      loadData();
    }
  };

  const handleBookingAction = async (bookingId: string, status: 'confirmed' | 'rejected', studentId: string) => {
    await supabase.from('office_hour_bookings').update({ status }).eq('id', bookingId);
    // Notify student
    const studentProfile = await supabase.from('profiles').select('user_id').eq('id', studentId).single();
    if (studentProfile.data) {
      await supabase.from('notifications').insert({
        user_id: studentProfile.data.user_id,
        title: language === 'ar' ? (status === 'confirmed' ? 'تم تأكيد الحجز' : 'تم رفض الحجز') : (status === 'confirmed' ? 'Booking Confirmed' : 'Booking Rejected'),
        message: language === 'ar'
          ? (status === 'confirmed' ? 'تم تأكيد حجز الساعة المكتبية' : 'تم رفض حجز الساعة المكتبية')
          : (status === 'confirmed' ? 'Your office hour booking has been confirmed' : 'Your office hour booking has been rejected'),
        type: status === 'confirmed' ? 'success' : 'warning',
      });
    }
    toast({ title: language === 'ar' ? 'تم التحديث' : 'Updated' });
    loadData();
  };

  const getNextDayDate = (dayName: string) => {
    const dayIndex = DAYS_EN.indexOf(dayName);
    const today = new Date();
    const todayDay = today.getDay();
    let diff = dayIndex - todayDay;
    if (diff <= 0) diff += 7;
    const next = new Date(today);
    next.setDate(today.getDate() + diff);
    return next.toISOString().split('T')[0];
  };

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-6 md:px-8 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'الساعات المكتبية' : 'Office Hours'}</h1>
          {role === 'doctor' && (
            <Button size="sm" onClick={() => setShowAdd(true)} className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" /> {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          )}
        </div>

        {/* Available Slots */}
        <div className="space-y-3 mb-6">
          <h2 className="text-lg font-semibold">{language === 'ar' ? 'المواعيد المتاحة' : 'Available Slots'}</h2>
          {slots.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center shadow-card">
              <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد مواعيد مكتبية' : 'No office hours available'}</p>
            </div>
          ) : (
            slots.map((slot, i) => (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{language === 'ar' ? days[DAYS_EN.indexOf(slot.day_of_week)] : slot.day_of_week}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5" /> {slot.start_time?.slice(0,5)} - {slot.end_time?.slice(0,5)}
                    </p>
                    {slot.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3.5 w-3.5" /> {slot.location}
                      </p>
                    )}
                    {role === 'student' && slot.doctor && (
                      <p className="text-sm text-primary mt-1">{slot.doctor.academic_title || 'Dr.'} {slot.doctor.full_name}</p>
                    )}
                  </div>
                  {role === 'doctor' ? (
                    <Button variant="ghost" size="icon" onClick={() => deleteSlot(slot.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : (
                    <Button size="sm" className="rounded-xl" onClick={() => setBookingSlot(slot)}>
                      <Calendar className="h-4 w-4 mr-1" /> {language === 'ar' ? 'حجز' : 'Book'}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Bookings */}
        {bookings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{language === 'ar' ? 'الحجوزات' : 'Bookings'}</h2>
            {bookings.map((b: any) => (
              <div key={b.id} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    {role === 'doctor' && <p className="font-medium">{b.student?.full_name}</p>}
                    {role === 'student' && b.slot?.doctor && <p className="font-medium">{b.slot.doctor.academic_title} {b.slot.doctor.full_name}</p>}
                    <p className="text-sm text-muted-foreground">
                      {new Date(b.booking_date).toLocaleDateString(locale, { dateStyle: 'medium' })}
                    </p>
                    {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status === 'pending' && role === 'doctor' ? (
                      <>
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleBookingAction(b.id, 'confirmed', b.student_id)}>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleBookingAction(b.id, 'rejected', b.student_id)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        b.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {b.status === 'confirmed' ? (language === 'ar' ? 'مؤكد' : 'Confirmed') :
                         b.status === 'rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                         (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Slot Dialog (Doctor) */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إضافة ساعة مكتبية' : 'Add Office Hour'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={newSlot.day_of_week} onValueChange={v => setNewSlot(s => ({ ...s, day_of_week: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_EN.map((d, i) => <SelectItem key={d} value={d}>{language === 'ar' ? DAYS_AR[i] : d}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={newSlot.start_time} onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))} className="rounded-xl" />
                <Input type="time" value={newSlot.end_time} onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))} className="rounded-xl" />
              </div>
              <Input
                value={newSlot.location}
                onChange={e => setNewSlot(s => ({ ...s, location: e.target.value }))}
                placeholder={language === 'ar' ? 'المكان (اختياري)' : 'Location (optional)'}
                className="rounded-xl"
              />
              <Input
                type="number"
                value={newSlot.max_bookings}
                onChange={e => setNewSlot(s => ({ ...s, max_bookings: parseInt(e.target.value) || 5 }))}
                placeholder={language === 'ar' ? 'الحد الأقصى للحجوزات' : 'Max bookings'}
                className="rounded-xl"
              />
              <Button onClick={addSlot} className="w-full rounded-xl">{language === 'ar' ? 'إضافة' : 'Add Slot'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Book Slot Dialog (Student) */}
        <Dialog open={!!bookingSlot} onOpenChange={() => setBookingSlot(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'حجز ساعة مكتبية' : 'Book Office Hour'}</DialogTitle>
            </DialogHeader>
            {bookingSlot && (
              <div className="space-y-3">
                <p className="text-sm">{language === 'ar' ? 'اليوم' : 'Day'}: <strong>{bookingSlot.day_of_week}</strong></p>
                <p className="text-sm">{language === 'ar' ? 'الوقت' : 'Time'}: <strong>{bookingSlot.start_time?.slice(0,5)} - {bookingSlot.end_time?.slice(0,5)}</strong></p>
                <Textarea
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'ملاحظات أو سبب الزيارة (اختياري)...' : 'Notes or reason for visit (optional)...'}
                  rows={3}
                />
                <Button onClick={bookSlot} className="w-full rounded-xl">{language === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
