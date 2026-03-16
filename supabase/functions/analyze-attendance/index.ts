import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { doctorId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all lectures for this doctor
    const { data: lectures } = await supabase
      .from("lectures")
      .select("id, title, department_id, level")
      .eq("doctor_id", doctorId);

    if (!lectures || lectures.length === 0) {
      return new Response(JSON.stringify({ alerts: [], summary: "No lectures found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lectureIds = lectures.map(l => l.id);

    // Get all attendance records
    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, lecture_id, status")
      .in("lecture_id", lectureIds);

    // Get all students in the relevant departments/levels
    const deptLevels = [...new Set(lectures.map(l => `${l.department_id}_${l.level}`))];
    const departments = [...new Set(lectures.map(l => l.department_id))];
    const levels = [...new Set(lectures.map(l => l.level))];

    const { data: students } = await supabase
      .from("profiles")
      .select("id, full_name, student_id, department_id, level")
      .eq("role", "student")
      .in("department_id", departments)
      .in("level", levels);

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ alerts: [], summary: "No students found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Analyze each student
    const alerts: any[] = [];
    const totalLectures = lectures.length;

    for (const student of students) {
      // Only count lectures matching student's dept + level
      const relevantLectures = lectures.filter(
        l => l.department_id === student.department_id && l.level === student.level
      );
      const relevantLectureIds = relevantLectures.map(l => l.id);
      
      const studentAttendance = attendance?.filter(
        a => a.student_id === student.id && relevantLectureIds.includes(a.lecture_id)
      ) || [];

      const presentCount = studentAttendance.filter(a => a.status === "present" || a.status === "excused").length;
      const absenceCount = relevantLectures.length - presentCount;
      const attendanceRate = relevantLectures.length > 0 ? (presentCount / relevantLectures.length) * 100 : 100;

      let riskLevel: string | null = null;
      let message = "";

      if (attendanceRate < 50) {
        riskLevel = "critical";
        message = `${student.full_name} (${student.student_id}) has critical absence rate: ${Math.round(attendanceRate)}% attendance (${absenceCount} absences out of ${relevantLectures.length} lectures)`;
      } else if (attendanceRate < 70) {
        riskLevel = "high";
        message = `${student.full_name} (${student.student_id}) is at high risk: ${Math.round(attendanceRate)}% attendance (${absenceCount} absences out of ${relevantLectures.length} lectures)`;
      } else if (attendanceRate < 85) {
        riskLevel = "medium";
        message = `${student.full_name} (${student.student_id}) needs attention: ${Math.round(attendanceRate)}% attendance (${absenceCount} absences out of ${relevantLectures.length} lectures)`;
      }

      if (riskLevel) {
        alerts.push({
          student_id: student.id,
          student_name: student.full_name,
          student_number: student.student_id,
          risk_level: riskLevel,
          message,
          absence_count: absenceCount,
          total_lectures: relevantLectures.length,
          attendance_rate: Math.round(attendanceRate),
        });
      }
    }

    // Sort by risk level
    const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
    alerts.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level]);

    // Save alerts to database
    for (const alert of alerts) {
      // Check if alert already exists and is unresolved
      const { data: existing } = await supabase
        .from("warning_alerts")
        .select("id")
        .eq("student_id", alert.student_id)
        .eq("doctor_id", doctorId)
        .eq("is_resolved", false)
        .maybeSingle();

      if (!existing) {
        await supabase.from("warning_alerts").insert({
          student_id: alert.student_id,
          doctor_id: doctorId,
          alert_type: "absence_risk",
          message: alert.message,
          risk_level: alert.risk_level,
          absence_count: alert.absence_count,
          total_lectures: alert.total_lectures,
        });

        // Send notification to student
        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("id", alert.student_id)
          .single();

        if (studentProfile) {
          await supabase.from("notifications").insert({
            user_id: studentProfile.user_id,
            title: "⚠️ Attendance Warning",
            message: `Your attendance rate is ${alert.attendance_rate}%. You have ${alert.absence_count} absences. Please improve your attendance.`,
            type: "warning",
          });
        }
      }
    }

    return new Response(JSON.stringify({
      alerts,
      summary: `Found ${alerts.length} at-risk students out of ${students.length} total`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-attendance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
