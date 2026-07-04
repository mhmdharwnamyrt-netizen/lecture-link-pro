import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all doctors
    const { data: doctors, error: docErr } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('role', 'doctor');
    if (docErr) throw docErr;

    let totalAlerts = 0;
    const perDoctor: Array<{ doctor_id: string; alerts: number }> = [];

    for (const doc of doctors || []) {
      const { data: lectures } = await supabase
        .from('lectures')
        .select('id, department_id, level')
        .eq('doctor_id', doc.id);
      if (!lectures?.length) continue;

      const lectureIds = lectures.map((l) => l.id);
      const departments = [...new Set(lectures.map((l) => l.department_id))];
      const levels = [...new Set(lectures.map((l) => l.level))];

      const { data: attendance } = await supabase
        .from('attendance')
        .select('student_id, lecture_id, status')
        .in('lecture_id', lectureIds);

      const { data: students } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, student_id, department_id, level')
        .eq('role', 'student')
        .in('department_id', departments)
        .in('level', levels);

      if (!students?.length) continue;

      let docAlerts = 0;
      for (const s of students) {
        const relLectures = lectures.filter(
          (l) => l.department_id === s.department_id && l.level === s.level,
        );
        if (!relLectures.length) continue;
        const relIds = relLectures.map((l) => l.id);
        const att = (attendance || []).filter(
          (a) => a.student_id === s.id && relIds.includes(a.lecture_id),
        );
        const present = att.filter(
          (a) => a.status === 'present' || a.status === 'excused',
        ).length;
        const absent = relLectures.length - present;
        const rate = (present / relLectures.length) * 100;

        let risk: string | null = null;
        if (rate < 50) risk = 'critical';
        else if (rate < 70) risk = 'high';
        else if (rate < 85) risk = 'medium';
        if (!risk) continue;

        const { data: existing } = await supabase
          .from('warning_alerts')
          .select('id')
          .eq('student_id', s.id)
          .eq('doctor_id', doc.id)
          .eq('is_resolved', false)
          .maybeSingle();
        if (existing) continue;

        const message = `${s.full_name} (${s.student_id}) — ${Math.round(rate)}% attendance (${absent}/${relLectures.length}). Recommendation: contact student, review excuses, offer catch-up session.`;

        await supabase.from('warning_alerts').insert({
          student_id: s.id,
          doctor_id: doc.id,
          alert_type: 'absence_risk',
          message,
          risk_level: risk,
          absence_count: absent,
          total_lectures: relLectures.length,
        });

        if (s.user_id) {
          await supabase.from('notifications').insert({
            user_id: s.user_id,
            title: '⚠️ Attendance Warning',
            message: `Your attendance is ${Math.round(rate)}%. Please improve or submit excuses.`,
            type: 'warning',
          });
        }
        docAlerts++;
      }
      totalAlerts += docAlerts;
      perDoctor.push({ doctor_id: doc.id, alerts: docAlerts });
    }

    // Log to activity feed as system event
    await supabase.from('activity_events').insert({
      kind: 'ai.analysis.completed',
      severity: totalAlerts > 0 ? 'warning' : 'info',
      title: `AI analysis: ${totalAlerts} new at-risk alerts`,
      details: { totalAlerts, perDoctor, ranAt: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({ success: true, totalAlerts, perDoctor }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('scheduled-attendance-analysis error', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
