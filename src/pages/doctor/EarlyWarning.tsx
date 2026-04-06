import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, RefreshCw, Shield, UserX, CheckCircle2, ArrowLeft } from 'lucide-react';

interface Alert {
  student_id: string;
  student_name: string;
  student_number: string;
  risk_level: string;
  message: string;
  absence_count: number;
  total_lectures: number;
  attendance_rate: number;
}

export default function EarlyWarning() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [savedAlerts, setSavedAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (profile) loadSavedAlerts();
  }, [profile]);

  const loadSavedAlerts = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('warning_alerts' as any)
      .select('*, profiles!warning_alerts_student_id_fkey(full_name, student_id)')
      .eq('doctor_id', profile.id)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false }) as any;
    if (data) setSavedAlerts(data);
  };

  const runAnalysis = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-attendance', {
        body: { doctorId: profile.id },
      });

      if (error) throw error;

      setAlerts(data?.alerts || []);
      setSummary(data?.summary || '');
      await loadSavedAlerts();
      toast({ title: t('warning.analysisComplete'), description: data?.summary });
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    await supabase.from('warning_alerts' as any).update({ is_resolved: true } as any).eq('id', alertId);
    loadSavedAlerts();
    toast({ title: t('warning.resolved') });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'high': return 'bg-warning/10 text-warning border-warning/20';
      case 'medium': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return <UserX className="h-5 w-5 text-destructive" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-warning" />;
      default: return <Shield className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <MobileLayout role="doctor">
      <div >
        <div className="px-4 pt-6 md:px-8">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('warning.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('warning.subtitle')}</p>
              </div>
            </div>
          </div>

          <Button onClick={runAnalysis} disabled={loading} className="mb-6 h-14 w-full rounded-2xl text-base gap-2">
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> {t('warning.analyzing')}</>
            ) : (
              <><RefreshCw className="h-5 w-5" /> {t('warning.runAnalysis')}</>
            )}
          </Button>

          {summary && (
            <div className="mb-4 rounded-2xl bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">{summary}</p>
            </div>
          )}

          {/* Live Analysis Results */}
          {alerts.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold">{t('warning.analysisResults')}</h2>
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl border p-4 shadow-card cursor-pointer ${getRiskColor(alert.risk_level)}`}
                    onClick={() => navigate(`/doctor/student/${alert.student_id}`)}
                  >
                    <div className="flex items-start gap-3">
                      {getRiskIcon(alert.risk_level)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{alert.student_name}</p>
                          <span className={`rounded-xl px-2 py-0.5 text-xs font-bold uppercase ${getRiskColor(alert.risk_level)}`}>
                            {alert.risk_level}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5">ID: {alert.student_number}</p>
                        <p className="text-xs mt-1">{t('warning.attendanceRate')}: {alert.attendance_rate}% • {alert.absence_count}/{alert.total_lectures} {t('warning.absences')}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Alerts */}
          {savedAlerts.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold">{t('warning.activeAlerts')}</h2>
              <div className="space-y-2">
                {savedAlerts.map((alert: any) => (
                  <div key={alert.id} className={`rounded-2xl border p-4 shadow-card ${getRiskColor(alert.risk_level)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getRiskIcon(alert.risk_level)}
                        <div>
                          <p className="font-medium text-sm">{alert.message}</p>
                          <p className="text-xs mt-1">{new Date(alert.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                        className="rounded-xl text-xs h-8"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {t('warning.resolve')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alerts.length === 0 && savedAlerts.length === 0 && !loading && (
            <div className="rounded-2xl bg-card p-8 text-center shadow-card">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
              <p className="font-medium text-success">{t('warning.allGood')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('warning.noAlerts')}</p>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
