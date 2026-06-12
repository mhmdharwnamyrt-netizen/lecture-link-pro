import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AccountDisabled from '@/pages/AccountDisabled';

export default function AccountStatusGuard({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile && (profile as any).is_disabled) {
    return <AccountDisabled reason={(profile as any).disabled_reason} />;
  }
  return <>{children}</>;
}
