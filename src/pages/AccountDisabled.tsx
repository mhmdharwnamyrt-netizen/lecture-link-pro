import { Button } from '@/components/ui/button';
import { ShieldAlert, Phone, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Props {
  reason?: string | null;
}

export default function AccountDisabled({ reason }: Props) {
  const navigate = useNavigate();
  const phone = '01274360522';

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-3xl bg-card p-8 shadow-card text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">تم تعطيل حسابك</h1>
        <p className="text-muted-foreground mb-1">Your account has been disabled by the administration.</p>
        {reason && (
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm">
            <span className="font-semibold">السبب / Reason:</span> {reason}
          </p>
        )}
        <p className="mt-5 text-sm text-muted-foreground">
          للاستفسار أو حل المشكلة تواصل مع الإدارة على الرقم:
        </p>
        <a
          href={`tel:${phone}`}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-primary-foreground font-bold tabular-nums"
        >
          <Phone className="h-5 w-5" /> {phone}
        </a>
        <Button variant="outline" className="mt-4 w-full" onClick={signOut}>
          <LogOut className="me-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
