import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DOCTOR_SECRET_KEY, ACADEMIC_TITLES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, User, ArrowRight, ArrowLeft, Shield, Check, BookOpen, Plus, X } from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const [role, setRole] = useState<'doctor' | 'student' | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center p-4">
        <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="ml-3 text-lg font-semibold">Create Account</h1>
      </div>

      <div className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">
          {!role ? (
            <RoleSelection key="role" onSelect={setRole} />
          ) : role === 'doctor' ? (
            <DoctorRegistration key="doctor" onBack={() => setRole(null)} />
          ) : (
            <StudentRegistration key="student" onBack={() => setRole(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RoleSelection({ onSelect }: { onSelect: (role: 'doctor' | 'student') => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center pt-16 gap-8"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome to BSUT</h2>
        <p className="mt-2 text-muted-foreground">Select your role to get started</p>
      </div>
      <div className="grid w-full max-w-sm gap-4">
        <button
          onClick={() => onSelect('doctor')}
          className="flex items-center gap-4 rounded-2xl bg-card p-6 shadow-card transition-all hover:shadow-elevated active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Doctor / Instructor</p>
            <p className="text-sm text-muted-foreground">Manage lectures & attendance</p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
        </button>
        <button
          onClick={() => onSelect('student')}
          className="flex items-center gap-4 rounded-2xl bg-card p-6 shadow-card transition-all hover:shadow-elevated active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
            <User className="h-7 w-7 text-accent" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Student</p>
            <p className="text-sm text-muted-foreground">Register attendance & track points</p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

function DoctorRegistration({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [secretKey, setSecretKey] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [academicTitle, setAcademicTitle] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<{ dept: Department; levels: number[] }[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyVerified, setKeyVerified] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadData = async () => {
    const [dRes, sRes] = await Promise.all([
      supabase.from('departments').select('*'),
      supabase.from('subjects').select('*'),
    ]);
    if (dRes.data) setDepartments(dRes.data);
    if (sRes.data) setSubjects(sRes.data);
  };

  const verifyKey = () => {
    if (secretKey === DOCTOR_SECRET_KEY) {
      setKeyVerified(true);
      setStep(2);
      loadData();
    } else {
      toast({ title: 'Invalid key', description: 'The university secret key is incorrect.', variant: 'destructive' });
    }
  };

  const toggleDept = (dept: Department) => {
    setSelectedDepts(prev => {
      const existing = prev.find(d => d.dept.id === dept.id);
      if (existing) return prev.filter(d => d.dept.id !== dept.id);
      if (prev.length >= 4) {
        toast({ title: 'Maximum 4 departments', variant: 'destructive' });
        return prev;
      }
      return [...prev, { dept, levels: [] }];
    });
  };

  const toggleLevel = (deptId: string, level: number) => {
    setSelectedDepts(prev =>
      prev.map(d => {
        if (d.dept.id !== deptId) return d;
        const levels = d.levels.includes(level)
          ? d.levels.filter(l => l !== level)
          : [...d.levels, level];
        return { ...d, levels };
      })
    );
  };

  const toggleSubject = (subject: Subject) => {
    setSelectedSubjects(prev =>
      prev.find(s => s.id === subject.id)
        ? prev.filter(s => s.id !== subject.id)
        : [...prev, subject]
    );
  };

  const addCustomSubject = async () => {
    if (!newSubject.trim()) return;
    // Store locally with a temp ID; will be created after auth
    const tempSubject = { id: `temp-${Date.now()}`, name: newSubject.trim() };
    setSubjects(prev => [...prev, tempSubject]);
    setSelectedSubjects(prev => [...prev, tempSubject]);
    setNewSubject('');
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (selectedDepts.length === 0 || selectedDepts.some(d => d.levels.length === 0)) {
      toast({ title: 'Select at least one level for each department', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed');

      // Wait for session to be established
      if (!authData.session) {
        toast({ title: 'Please check your email to verify your account', description: 'Then sign in.' });
        navigate('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: fullName,
        phone,
        role: 'doctor',
        academic_title: academicTitle,
      }).select().single();
      if (profileError) throw profileError;

      // Insert doctor departments
      const deptInserts = selectedDepts.flatMap(d =>
        d.levels.map(level => ({
          doctor_id: profileData.id,
          department_id: d.dept.id,
          level,
        }))
      );
      await supabase.from('doctor_departments').insert(deptInserts);

      // Resolve temp subjects (custom ones added during registration)
      const resolvedSubjects: Subject[] = [];
      for (const s of selectedSubjects) {
        if (s.id.startsWith('temp-')) {
          const { data } = await supabase.from('subjects').insert({ name: s.name }).select().single();
          if (data) resolvedSubjects.push(data);
        } else {
          resolvedSubjects.push(s);
        }
      }

      // Insert doctor subjects
      if (resolvedSubjects.length > 0) {
        await supabase.from('doctor_subjects').insert(
          resolvedSubjects.map(s => ({ doctor_id: profileData.id, subject_id: s.id }))
        );
      }

      toast({ title: 'Account created successfully!' });
      // Small delay to let AuthContext pick up the session
      setTimeout(() => navigate('/doctor'), 500);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="mx-auto max-w-lg"
    >
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to role selection
      </button>

      {/* Progress */}
      <div className="mb-6 flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Verify Identity</h3>
                <p className="text-sm text-muted-foreground">Enter the university secret key</p>
              </div>
            </div>
            <div>
              <Label>University Secret Key</Label>
              <Input
                type="password"
                placeholder="Enter secret key..."
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                className="mt-2 h-14 rounded-2xl text-lg"
              />
              <p className="mt-2 text-xs text-muted-foreground">Contact the university administration for the secret key</p>
            </div>
            <Button onClick={verifyKey} className="h-14 w-full rounded-2xl text-base" size="lg">
              Verify <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div>
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="Dr. Ahmed Mohamed" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="doctor@bsut.edu.eg" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <Label>Password *</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="Min 6 characters" />
            </div>
            <div>
              <Label>Academic Title</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ACADEMIC_TITLES.map(t => (
                  <button
                    key={t}
                    onClick={() => setAcademicTitle(t)}
                    className={`rounded-xl px-4 py-2 text-sm transition-colors ${academicTitle === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(3)} className="h-14 w-full rounded-2xl text-base" disabled={!fullName || !email || !password}>
              Continue <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <h3 className="text-lg font-semibold">Departments & Levels</h3>
            <p className="text-sm text-muted-foreground">Select departments you teach (max 4) and levels for each</p>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {departments.map(dept => {
                const selected = selectedDepts.find(d => d.dept.id === dept.id);
                return (
                  <div key={dept.id} className={`rounded-2xl p-4 transition-colors ${selected ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-card shadow-card'}`}>
                    <button onClick={() => toggleDept(dept)} className="flex w-full items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {selected && <Check className="h-4 w-4" />}
                      </div>
                      <span className="font-medium">{dept.name}</span>
                    </button>
                    {selected && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="mt-3 flex gap-2 overflow-hidden">
                        {[1, 2, 3, 4].map(level => (
                          <button
                            key={level}
                            onClick={() => toggleLevel(dept.id, level)}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                              selected.levels.includes(level) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            Level {level}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="h-14 flex-1 rounded-2xl">
                <ArrowLeft className="mr-2 h-5 w-5" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="h-14 flex-1 rounded-2xl" disabled={selectedDepts.length === 0 || selectedDepts.some(d => d.levels.length === 0)}>
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <h3 className="text-lg font-semibold">Subjects</h3>
            <p className="text-sm text-muted-foreground">Select subjects you teach or add new ones</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSubject(s)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    selectedSubjects.find(ss => ss.id === s.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom subject..."
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="h-12 rounded-xl"
                onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
              />
              <Button variant="outline" onClick={addCustomSubject} className="h-12 rounded-xl" disabled={!newSubject.trim()}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="h-14 flex-1 rounded-2xl">
                <ArrowLeft className="mr-2 h-5 w-5" /> Back
              </Button>
              <Button onClick={handleRegister} className="h-14 flex-1 rounded-2xl" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StudentRegistration({ onBack }: { onBack: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [studentIdNum, setStudentIdNum] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [level, setLevel] = useState<number>(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load departments on mount
  useState(() => {
    supabase.from('departments').select('*').then(({ data }) => {
      if (data) setDepartments(data);
    });
  });

  const handleRegister = async () => {
    if (!fullName || !email || !password || !departmentId || !level || !studentIdNum) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (studentIdNum.length !== 9) {
      toast({ title: 'Student ID must be 9 digits', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed');

      if (!authData.session) {
        toast({ title: 'Please check your email to verify your account', description: 'Then sign in.' });
        navigate('/login');
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: fullName,
        phone,
        role: 'student',
        student_id: studentIdNum,
        department_id: departmentId,
        level,
      });
      if (profileError) throw profileError;

      toast({ title: 'Account created successfully!' });
      // Redirect to face registration
      setTimeout(() => navigate('/student/face-registration'), 500);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="mx-auto max-w-lg space-y-4"
    >
      <button onClick={onBack} className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to role selection
      </button>

      <h3 className="text-lg font-semibold">Student Registration</h3>

      <div>
        <Label>Full Name *</Label>
        <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="Ahmed Mohamed" />
      </div>
      <div>
        <Label>University ID (8 digits) *</Label>
        <Input value={studentIdNum} onChange={e => setStudentIdNum(e.target.value.replace(/\D/g, '').slice(0, 8))} className="mt-1 h-12 rounded-xl tabular-nums" placeholder="12345678" />
      </div>
      <div>
        <Label>Email *</Label>
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="student@bsut.edu.eg" />
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="01xxxxxxxxx" />
      </div>
      <div>
        <Label>Password *</Label>
        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 h-12 rounded-xl" placeholder="Min 6 characters" />
      </div>
      <div>
        <Label>Department *</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {departments.map(d => (
            <button
              key={d.id}
              onClick={() => setDepartmentId(d.id)}
              className={`rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                departmentId === d.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Level *</Label>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4].map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
                level === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              Level {l}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleRegister} className="h-14 w-full rounded-2xl text-base" disabled={loading}>
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </motion.div>
  );
}
