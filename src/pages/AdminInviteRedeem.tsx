import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminInviteRedeem() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const t = (a: string, e: string) => (isRTL ? a : e);

  const [status, setStatus] = useState<'idle' | 'redeeming' | 'ok' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Save intent then send to login
      sessionStorage.setItem('post_login_redirect', `/invite/admin/${token}`);
      navigate('/login');
      return;
    }
    if (!token) return;
    setStatus('redeeming');
    (async () => {
      const { data, error } = await (supabase as any).rpc('redeem_admin_invite', { p_token: token });
      if (error) {
        setStatus('err');
        setErrorMsg(error.message);
        return;
      }
      const res = data as { ok: boolean; error?: string };
      if (res?.ok) {
        setStatus('ok');
        toast.success(t('تم منحك صلاحية الإدارة', 'Admin access granted'));
        setTimeout(() => navigate('/admin'), 1200);
      } else {
        setStatus('err');
        const map: Record<string, string> = {
          invalid_token: t('رابط غير صالح', 'Invalid link'),
          already_used: t('تم استخدام هذا الرابط من قبل', 'This link was already used'),
          expired: t('انتهت صلاحية الرابط', 'This link has expired'),
          not_authenticated: t('يجب تسجيل الدخول أولًا', 'Please log in first'),
        };
        setErrorMsg(map[res?.error || ''] || res?.error || t('حدث خطأ', 'Something went wrong'));
      }
    })();
  }, [loading, user, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-elevated"
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Shield className="h-7 w-7" />
        </div>
        <h1 className="mb-1 text-xl font-bold">{t('دعوة إدارية', 'Admin invitation')}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {t('جارٍ التحقق من رابط الدعوة…', 'Verifying invite link…')}
        </p>

        {status === 'redeeming' && (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        )}
        {status === 'ok' && (
          <div className="rounded-2xl bg-success/10 p-4 text-success">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6" />
            <p className="text-sm font-medium">{t('تم! جاري تحويلك للوحة الإدارة…', 'Done! Redirecting to admin dashboard…')}</p>
          </div>
        )}
        {status === 'err' && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-destructive/10 p-4 text-destructive">
              <XCircle className="mx-auto mb-2 h-6 w-6" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">{t('الصفحة الرئيسية', 'Home')}</Link>
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
