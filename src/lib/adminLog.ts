import { supabase } from '@/integrations/supabase/client';

export async function logAdminAction(params: {
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  status?: 'success' | 'error' | 'pending';
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();
    await supabase.from('admin_logs').insert({
      actor_id: user.id,
      actor_name: profile?.full_name || user.email,
      action: params.action,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      details: params.details ?? {},
      status: params.status ?? 'success',
    });
  } catch (e) {
    console.warn('admin log failed', e);
  }
}
