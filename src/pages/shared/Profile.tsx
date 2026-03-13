import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { LogOut, User, BookOpen, GraduationCap } from 'lucide-react';

export default function ProfilePage({ role }: { role: 'doctor' | 'student' }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!profile) return null;

  return (
    <MobileLayout role={role}>
      <div className="md:ml-64">
        <div className="px-4 pt-6 md:px-8">
          <h1 className="mb-6 text-2xl font-bold">Profile</h1>

          <div className="mb-6 rounded-2xl bg-card p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                {role === 'doctor' ? <GraduationCap className="h-8 w-8 text-primary" /> : <User className="h-8 w-8 text-primary" />}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.full_name}</h2>
                <p className="text-sm text-muted-foreground capitalize">{role}</p>
                {profile.academic_title && <p className="text-sm text-muted-foreground">{profile.academic_title}</p>}
                {profile.student_id && <p className="text-sm tabular-nums text-muted-foreground">ID: {profile.student_id}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{profile.phone || 'Not set'}</p>
            </div>
            {role === 'student' && (
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold tabular-nums text-primary">{profile.points}</p>
              </div>
            )}
          </div>

          <Button onClick={handleSignOut} variant="outline" className="mt-8 h-14 w-full rounded-2xl text-destructive">
            <LogOut className="mr-2 h-5 w-5" /> Sign Out
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
