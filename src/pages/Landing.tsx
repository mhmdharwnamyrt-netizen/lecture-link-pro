import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, QrCode, ScanFace, GraduationCap, BarChart3, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import logoAsset from '@/assets/bsut-logo.png.asset.json';
import { Button } from '@/components/ui/button';

function useCountUp(target: number, duration = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function Typewriter({ text, speed = 60 }: { text: string; speed?: number }) {
  const [out, setOut] = useState('');
  useEffect(() => {
    let i = 0;
    setOut('');
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span>{out}<span className="inline-block w-1 animate-pulse">|</span></span>;
}

export default function Landing() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [counts, setCounts] = useState({ students: 0, doctors: 0, lectures: 0 });
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, 120]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.15]);

  useEffect(() => {
    if (!loading && user && profile) {
      navigate(profile.role === 'doctor' ? '/doctor' : '/student', { replace: true });
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    (async () => {
      const [{ count: s }, { count: d }, { count: l }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'doctor'),
        supabase.from('lectures').select('*', { count: 'exact', head: true }),
      ]);
      setCounts({ students: s || 0, doctors: d || 0, lectures: l || 0 });
    })();
  }, []);

  const sStudents = useCountUp(counts.students);
  const sDoctors = useCountUp(counts.doctors);
  const sLectures = useCountUp(counts.lectures);

  const features = [
    { icon: MapPin, color: 'from-blue-500 to-cyan-400', title: 'GPS Verified', desc: 'تحقق دقيق من موقع الطالب داخل حرم الجامعة (400م)' },
    { icon: QrCode, color: 'from-emerald-500 to-teal-400', title: 'QR Code', desc: 'مسح كود ديناميكي يتغير كل 60 ثانية لمنع التزوير' },
    { icon: ScanFace, color: 'from-fuchsia-500 to-pink-400', title: 'Face AI', desc: 'تحقق بيومتري بالذكاء الاصطناعي (دقة > 85٪)' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* HERO */}
      <section className="relative flex min-h-[100svh] items-center justify-center px-5 overflow-hidden">
        {/* Parallax bg */}
        <motion.div
          style={{ y: heroY, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f44] via-primary to-accent" />
          <div className="absolute inset-0 opacity-40" style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.2), transparent 45%)'
          }} />
          {/* Floating orbs */}
          {[0,1,2,3].map(i => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/10 blur-3xl"
              style={{
                width: 200 + i * 60,
                height: 200 + i * 60,
                top: `${15 + i * 20}%`,
                left: `${10 + i * 18}%`,
              }}
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </motion.div>


        <div className="relative z-10 mx-auto max-w-3xl text-center text-white">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-bloom"
          >
            <img src={logoAsset.url} alt="BSUT" className="h-20 w-20 rounded-full object-cover" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-white/80"
          >
            Beni Suef Technological University
          </motion.p>

          <h1 className="text-4xl font-bold leading-tight md:text-6xl drop-shadow-md">
            <Typewriter text="نظام الحضور الذكي" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}
            className="mx-auto mt-5 max-w-xl text-base text-white/90 md:text-lg"
          >
            GPS · QR Code · Face AI — تجربة حضور متكاملة، آمنة، فورية، تعمل حتى بدون إنترنت.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.1 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button onClick={() => navigate('/register')} className="h-14 w-full rounded-2xl bg-white px-8 text-base text-primary hover:bg-white/90 sm:w-auto">
              إنشاء حساب <ArrowRight className="ms-2 h-5 w-5" />
            </Button>
            <Link to="/login" className="h-14 inline-flex items-center justify-center rounded-2xl border border-white/40 bg-white/10 px-8 text-base text-white backdrop-blur hover:bg-white/20 w-full sm:w-auto">
              تسجيل الدخول
            </Link>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-xs"
        >
          ↓ Scroll
        </motion.div>
      </section>

      {/* COUNT UP */}
      <section className="px-5 py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 md:gap-8">
          {[
            { label: 'طالب', value: sStudents, color: 'text-primary' },
            { label: 'دكتور', value: sDoctors, color: 'text-accent' },
            { label: 'محاضرة', value: sLectures, color: 'text-warning' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl bg-card p-6 text-center shadow-elevated"
            >
              <p className={`text-4xl font-bold tabular-nums md:text-5xl ${s.color}`}>{s.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES — 3D scroll cards */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mb-12 text-center text-3xl font-bold md:text-4xl"
          >
            ثلاث طرق متطورة للتحقق
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, rotateY: -25, y: 60 }}
                whileInView={{ opacity: 1, rotateY: 0, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.15, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                whileHover={{ y: -8, rotateY: 6 }}
                style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
                className="group relative overflow-hidden rounded-3xl bg-card p-6 shadow-elevated"
              >
                <div className={`absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br ${f.color} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`} />
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-lg`}>
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MORE FEATURES */}
      <section className="px-5 py-20">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {[
            { icon: GraduationCap, t: 'وكيل ذكي للطلاب', d: 'يقرأ جدولك تلقائياً ويذكرك بالمحاضرات' },
            { icon: BarChart3, t: 'تحليلات لحظية', d: 'إحصائيات حية للأقسام والدكاترة' },
            { icon: ShieldCheck, t: 'يعمل offline', d: 'مزامنة تلقائية فور عودة الإنترنت' },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl border border-border bg-card/50 p-6 backdrop-blur"
            >
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-bold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-primary to-accent p-10 text-center text-white shadow-elevated"
        >
          <h2 className="text-3xl font-bold md:text-4xl">جاهز للبدء؟</h2>
          <p className="mt-3 text-white/90">انضم لمئات الطلاب والدكاترة الذين يستخدمون النظام يومياً</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={() => navigate('/register')} className="h-14 rounded-2xl bg-white px-8 text-primary hover:bg-white/90">
              إنشاء حساب جديد
            </Button>
            <Link to="/login" className="h-14 inline-flex items-center rounded-2xl border border-white/40 px-8 text-white hover:bg-white/10">
              لدي حساب بالفعل
            </Link>
          </div>
        </motion.div>
        <p className="mt-8 text-center text-xs text-muted-foreground">© Beni Suef Technological University</p>
      </section>
    </div>
  );
}
