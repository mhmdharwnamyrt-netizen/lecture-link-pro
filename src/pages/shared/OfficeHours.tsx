import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Plus, Calendar, CheckCircle2, XCircle, MapPin, Trash2, Users, Ban, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

type Filter = 'all' | 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export default function OfficeHoursPage({ role }: { role: 'doctor' | 'student' }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day_of_week: 'Sunday',
    start_time: '09:00',
    end_time: '10:00',
    max_bookings: 5,
    location: '',
    notes: '',
  });
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState<any>(null);
  const [cancellingBooking, setCancellingBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const days = language === 'ar' ? DAYS_AR : DAYS_EN;

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    if (role === 'doctor') {
      const { data } = await supabase
        .from('office_hours')
        .select('*')
        .eq('doctor_id', profile.id)
        .order('day_of_week');
      if (data) setSlots(data);

      const { data: bData } = await supabase
        .from('office_hour_bookings')
        .select('*, slot:office_hours!office_hour_bookings_slot_id_fkey(*), student:profiles!office_hour_bookings_student_id_fkey(id, user_id, full_name, student_id)')
        .order('booking_date', { ascending: false });
      const filtered = (bData || []).filter((b: any) => b.slot?.doctor_id === profile.id);
      setBookings(filtered);
      countSlots(filtered);
    } else {
      const { data } = await supabase
        .from('office_hours')
        .select('*, doctor:profiles!office_hours_doctor_id_fkey(id, user_id, full_name, academic_title)')
        .eq('is_active', true)
        .order('day_of_week');
      if (data) setSlots(data);

      const { data: bData } = await supabase
        .from('office_hour_bookings')
        .select('*, slot:office_hours!office_hour_bookings_slot_id_fkey(*, doctor:profiles!office_hours_doctor_id_fkey(id, user_id, full_name, academic_title))')
        .eq('student_id', profile.id)
        .order('booking_date', { ascending: false });
      setBookings(bData || []);
      countSlots(bData || []);
    }
  };

  const countSlots = (rows: any[]) => {
    const map: Record<string, number> = {};
    rows.forEach((b) => {
      if (b.status === 'pending' || b.status === 'confirmed') {
        const key = `${b.slot_id}:${b.booking_date}`;
        map[key] = (map[key] || 0) + 1;
      }
    });
    setSlotCounts(map);
  };

  const addSlot = async () => {
    if (!profile) return;
    const { error } = await supabase.from('office_hours').insert({ ...newSlot, doctor_id: profile.id });
    if (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: language === 'ar' ? 'تمت الإضافة' : 'Slot Added' });
    setShowAdd(false);
    setNewSlot({ day_of_week: 'Sunday', start_time: '09:00', end_time: '10:00', max_bookings: 5, location: '', notes: '' });
    loadData();
  };

  const deleteSlot = async (id: string) => {
    if (!confirm(language === 'ar' ? 'حذف الموعد؟' : 'Delete this slot?')) return;
    await supabase.from('office_hours').delete().eq('id', id);
    loadData();
  };

  const toggleActive = async (slot: any) => {
    await supabase.from('office_hours').update({ is_active: !slot.is_active }).eq('id', slot.id);
    loadData();
  };

  const openBooking = (slot: any) => {
    setBookingSlot(slot);
    setBookingDate(getNextDayDate(slot.day_of_week));
    setBookingNotes('');
  };

  const bookSlot = async () => {
    if (!profile || !bookingSlot) return;
    const { error } = await supabase.from('office_hour_bookings').insert({
      slot_id: bookingSlot.id,
      student_id: profile.id,
      booking_date: bookingDate,
      notes: bookingNotes.trim() || null,
    });
    if (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('notifications').insert({
        user_id: bookingSlot.doctor?.user_id,
        title: language === 'ar' ? 'حجز ساعة مكتبية جديد' : 'New Office Hour Booking',
        message: language === 'ar'
          ? `الطالب ${profile.full_name} حجز موعد ${bookingDate}`
          : `Student ${profile.full_name} booked ${bookingDate}`,
        type: 'info',
      });
      toast({ title: language === 'ar' ? 'تم الحجز بنجاح!' : 'Booked Successfully!' });
      setBookingSlot(null);
      loadData();
    }
  };

  const handleBookingAction = async (booking: any, status: 'confirmed' | 'rejected') => {
    await supabase.from('office_hour_bookings').update({ status }).eq('id', booking.id);
    if (booking.student?.user_id) {
      await supabase.from('notifications').insert({
        user_id: booking.student.user_id,
        title: language === 'ar'
          ? (status === 'confirmed' ? 'تم تأكيد الحجز' : 'تم رفض الحجز')
          : (status === 'confirmed' ? 'Booking Confirmed' : 'Booking Rejected'),
        message: language === 'ar'
          ? (status === 'confirmed' ? 'تم تأكيد حجز الساعة المكتبية' : 'تم رفض حجز الساعة المكتبية')
          : (status === 'confirmed' ? 'Your office hour booking has been confirmed' : 'Your office hour booking has been rejected'),
        type: status === 'confirmed' ? 'success' : 'warning',
      });
    }
    toast({ title: language === 'ar' ? 'تم التحديث' : 'Updated' });
    loadData();
  };

  const cancelBooking = async () => {
    if (!cancellingBooking || !profile) return;
    const { error } = await supabase
      .from('office_hour_bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: profile.id,
        reason: cancelReason.trim() || null,
      })
      .eq('id', cancellingBooking.id);
    if (error) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    // Notify the other party
    const otherUserId = role === 'doctor'
      ? cancellingBooking.student?.user_id
      : cancellingBooking.slot?.doctor?.user_id;
    if (otherUserId) {
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        title: language === 'ar' ? 'تم إلغاء الحجز' : 'Booking Cancelled',
        message: language === 'ar'
          ? `تم إلغاء حجز يوم ${cancellingBooking.booking_date}${cancelReason ? ` — ${cancelReason}` : ''}`
          : `Booking on ${cancellingBooking.booking_date} was cancelled${cancelReason ? ` — ${cancelReason}` : ''}`,
        type: 'warning',
      });
    }
    toast({ title: language === 'ar' ? 'تم الإلغاء' : 'Cancelled' });
    setCancellingBooking(null);
    setCancelReason('');
    loadData();
  };

  const getNextDayDate = (dayName: string) => {
    const dayIndex = DAYS_EN.indexOf(dayName);
    const today = new Date();
    let diff = dayIndex - today.getDay();
    if (diff <= 0) diff += 7;
    const next = new Date(today);
    next.setDate(today.getDate() + diff);
    return next.toISOString().split('T')[0];
  };

  const upcomingDatesFor = (dayName: string) => {
    const dates: string[] = [];
    const dayIndex = DAYS_EN.indexOf(dayName);
    const today = new Date();
    for (let w = 0; w < 4; w++) {
      let diff = dayIndex - today.getDay() + w * 7;
      if (diff <= 0) diff += 7;
      const d = new Date(today);
      d.setDate(today.getDate() + diff);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const filteredBookings = useMemo(
    () => filter === 'all' ? bookings : bookings.filter((b) => b.status === filter),
    [bookings, filter]
  );

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <MobileLayout role={role}>
      <div className="px-4 pt-6 md:px-8 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{language === 'ar' ? 'الساعات المكتبية' : 'Office Hours'}</h1>
            {role === 'doctor' && pendingCount > 0 && (
              <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                <Bell className="h-3 w-3" /> {pendingCount} {language === 'ar' ? 'طلبات معلقة' : 'pending requests'}
              </p>
            )}
          </div>
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
            slots.map((slot, i) => {
              const nextDate = getNextDayDate(slot.day_of_week);
              const takenNext = slotCounts[`${slot.id}:${nextDate}`] || 0;
              const full = takenNext >= slot.max_bookings;
              return (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl bg-card p-4 shadow-card ${role === 'doctor' && !slot.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{language === 'ar' ? days[DAYS_EN.indexOf(slot.day_of_week)] : slot.day_of_week}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Clock className="h-3.5 w-3.5" /> {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                      </p>
                      {slot.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3.5 w-3.5" /> {slot.location}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Users className="h-3.5 w-3.5" /> {takenNext}/{slot.max_bookings} {language === 'ar' ? 'محجوز' : 'booked'}
                      </p>
                      {slot.notes && <p className="text-xs text-muted-foreground mt-1 italic">{slot.notes}</p>}
                      {role === 'student' && slot.doctor && (
                        <p className="text-sm text-primary mt-1">{slot.doctor.academic_title || 'Dr.'} {slot.doctor.full_name}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {role === 'doctor' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Switch checked={slot.is_active} onCheckedChange={() => toggleActive(slot)} />
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteSlot(slot.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-xl"
                          disabled={full}
                          onClick={() => openBooking(slot)}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          {full ? (language === 'ar' ? 'مكتمل' : 'Full') : (language === 'ar' ? 'حجز' : 'Book')}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Bookings */}
        {bookings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{language === 'ar' ? 'الحجوزات' : 'Bookings'}</h2>
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="w-40 rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="pending">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                  <SelectItem value="confirmed">{language === 'ar' ? 'مؤكد' : 'Confirmed'}</SelectItem>
                  <SelectItem value="rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</SelectItem>
                  <SelectItem value="cancelled">{language === 'ar' ? 'ملغى' : 'Cancelled'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredBookings.map((b: any) => {
              const isPast = new Date(b.booking_date) < new Date(new Date().toDateString());
              const canCancel = !isPast && (b.status === 'pending' || b.status === 'confirmed');
              return (
                <div key={b.id} className="rounded-2xl bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {role === 'doctor' && <p className="font-medium">{b.student?.full_name} <span className="text-xs text-muted-foreground">({b.student?.student_id})</span></p>}
                      {role === 'student' && b.slot?.doctor && <p className="font-medium">{b.slot.doctor.academic_title} {b.slot.doctor.full_name}</p>}
                      <p className="text-sm text-muted-foreground">
                        {new Date(b.booking_date).toLocaleDateString(locale, { dateStyle: 'medium' })}
                        {b.slot && <> · {b.slot.start_time?.slice(0, 5)}</>}
                      </p>
                      {b.notes && <p className="text-xs text-muted-foreground mt-1">💬 {b.notes}</p>}
                      {b.reason && b.status === 'cancelled' && (
                        <p className="text-xs text-destructive mt-1">✕ {b.reason}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        b.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        b.status === 'cancelled' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {b.status === 'confirmed' ? (language === 'ar' ? 'مؤكد' : 'Confirmed') :
                          b.status === 'rejected' ? (language === 'ar' ? 'مرفوض' : 'Rejected') :
                          b.status === 'cancelled' ? (language === 'ar' ? 'ملغى' : 'Cancelled') :
                          (language === 'ar' ? 'قيد الانتظار' : 'Pending')}
                      </span>
                      <div className="flex gap-1">
                        {b.status === 'pending' && role === 'doctor' && (
                          <>
                            <Button size="sm" variant="outline" className="rounded-xl h-8 px-2" onClick={() => handleBookingAction(b, 'confirmed')}>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl h-8 px-2" onClick={() => handleBookingAction(b, 'rejected')}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {canCancel && (
                          <Button size="sm" variant="ghost" className="rounded-xl h-8 px-2 text-destructive" onClick={() => setCancellingBooking(b)}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Slot Dialog (Doctor) */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إضافة ساعة مكتبية' : 'Add Office Hour'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={newSlot.day_of_week} onValueChange={(v) => setNewSlot((s) => ({ ...s, day_of_week: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_EN.map((d, i) => <SelectItem key={d} value={d}>{language === 'ar' ? DAYS_AR[i] : d}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot((s) => ({ ...s, start_time: e.target.value }))} className="rounded-xl" />
                <Input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot((s) => ({ ...s, end_time: e.target.value }))} className="rounded-xl" />
              </div>
              <Input
                value={newSlot.location}
                onChange={(e) => setNewSlot((s) => ({ ...s, location: e.target.value }))}
                placeholder={language === 'ar' ? 'المكان (اختياري)' : 'Location (optional)'}
                className="rounded-xl"
              />
              <Input
                type="number"
                min={1}
                value={newSlot.max_bookings}
                onChange={(e) => setNewSlot((s) => ({ ...s, max_bookings: parseInt(e.target.value) || 5 }))}
                placeholder={language === 'ar' ? 'الحد الأقصى للحجوزات' : 'Max bookings'}
                className="rounded-xl"
              />
              <Textarea
                value={newSlot.notes}
                onChange={(e) => setNewSlot((s) => ({ ...s, notes: e.target.value }))}
                placeholder={language === 'ar' ? 'ملاحظات للطلاب (اختياري)' : 'Notes for students (optional)'}
                rows={2}
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
                <p className="text-sm">{language === 'ar' ? 'الوقت' : 'Time'}: <strong>{bookingSlot.start_time?.slice(0, 5)} - {bookingSlot.end_time?.slice(0, 5)}</strong></p>
                <div>
                  <Label className="text-xs">{language === 'ar' ? 'اختر التاريخ' : 'Pick a date'}</Label>
                  <Select value={bookingDate} onValueChange={setBookingDate}>
                    <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {upcomingDatesFor(bookingSlot.day_of_week).map((d) => {
                        const taken = slotCounts[`${bookingSlot.id}:${d}`] || 0;
                        const isFull = taken >= bookingSlot.max_bookings;
                        return (
                          <SelectItem key={d} value={d} disabled={isFull}>
                            {new Date(d).toLocaleDateString(locale, { dateStyle: 'medium' })} — {taken}/{bookingSlot.max_bookings}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'سبب الزيارة (اختياري)...' : 'Reason for visit (optional)...'}
                  rows={3}
                />
                <Button onClick={bookSlot} className="w-full rounded-xl">{language === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Booking Dialog */}
        <Dialog open={!!cancellingBooking} onOpenChange={() => setCancellingBooking(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إلغاء الحجز' : 'Cancel Booking'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={language === 'ar' ? 'سبب الإلغاء (اختياري)...' : 'Reason for cancellation (optional)...'}
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setCancellingBooking(null)}>
                  {language === 'ar' ? 'تراجع' : 'Back'}
                </Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={cancelBooking}>
                  {language === 'ar' ? 'تأكيد الإلغاء' : 'Cancel Booking'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
