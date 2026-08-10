/**
 * Localizes server-generated (English) notification / alert strings into Arabic.
 * The backend stores messages in English; the UI must be fully bilingual, so we
 * translate known patterns on the client instead of showing raw English text.
 */

const AR_LEVEL: Record<string, string> = {
  critical: 'حرجة',
  high: 'مرتفعة',
  medium: 'متوسطة',
  low: 'منخفضة',
  warning: 'تحذير',
  info: 'معلومة',
  success: 'نجاح',
};

export function riskLabel(level: string, isAr: boolean) {
  if (!isAr) return level.toUpperCase();
  return AR_LEVEL[level?.toLowerCase()] || level;
}

/** Convert latin digits to arabic-indic for nicer RTL rendering is intentionally skipped
 *  (tabular numbers stay latin for readability). */

type Rule = { re: RegExp; ar: (m: RegExpMatchArray) => string };

const RULES: Rule[] = [
  // "NAME (205236056) — 11% attendance (17/19). Recommendation: contact student, review excuses, offer catch-up session"
  {
    re: /^(.+?)\s*\((\d+)\)\s*[—-]\s*(\d+)%\s*attendance\s*\((\d+)\/(\d+)\)\.?\s*Recommendation:.*$/i,
    ar: (m) =>
      `${m[1]} (${m[2]}) — نسبة الحضور ${m[3]}% (${m[4]} من ${m[5]}). التوصية: التواصل مع الطالب ومراجعة الأعذار وتحديد جلسة تعويضية.`,
  },
  // "NAME (id) has critical absence rate: 40% attendance (6 absences out of 10 lectures)"
  {
    re: /^(.+?)\s*\((.+?)\)\s*has critical absence rate:\s*(\d+)%\s*attendance\s*\((\d+)\s*absences out of\s*(\d+)\s*lectures\)/i,
    ar: (m) =>
      `${m[1]} (${m[2]}) لديه نسبة غياب حرجة: الحضور ${m[3]}% (${m[4]} غياب من أصل ${m[5]} محاضرة).`,
  },
  {
    re: /^(.+?)\s*\((.+?)\)\s*is at high risk:\s*(\d+)%\s*attendance\s*\((\d+)\s*absences out of\s*(\d+)\s*lectures\)/i,
    ar: (m) =>
      `${m[1]} (${m[2]}) في خطر مرتفع: الحضور ${m[3]}% (${m[4]} غياب من أصل ${m[5]} محاضرة).`,
  },
  {
    re: /^(.+?)\s*\((.+?)\)\s*needs attention:\s*(\d+)%\s*attendance\s*\((\d+)\s*absences out of\s*(\d+)\s*lectures\)/i,
    ar: (m) =>
      `${m[1]} (${m[2]}) يحتاج إلى متابعة: الحضور ${m[3]}% (${m[4]} غياب من أصل ${m[5]} محاضرة).`,
  },
  // "Warning (critical) for NAME [CRITICAL]"
  {
    re: /^Warning\s*\((\w+)\)\s*for\s*(.+?)(?:\s*\[[A-Z]+\])?$/i,
    ar: (m) => `تنبيه (${AR_LEVEL[m[1].toLowerCase()] || m[1]}) بخصوص ${m[2]}`,
  },
  // "AI analysis: 3 new at-risk alerts"
  {
    re: /^AI analysis:\s*(\d+)\s*new at-risk alerts?/i,
    ar: (m) => `تحليل الذكاء الاصطناعي: ${m[1]} تنبيه جديد لطلاب معرضين للخطر`,
  },
  // "Found 4 at-risk students out of 30 total"
  {
    re: /^Found\s*(\d+)\s*at-risk students out of\s*(\d+)\s*total/i,
    ar: (m) => `تم رصد ${m[1]} طالب معرض للخطر من إجمالي ${m[2]} طالب`,
  },
  {
    re: /^No students found$/i,
    ar: () => 'لا يوجد طلاب مرتبطون بمحاضراتك',
  },
  // "Your attendance rate is 42%. You have 6 absences. Please improve your attendance."
  {
    re: /^Your attendance rate is\s*(\d+)%\.\s*You have\s*(\d+)\s*absences\./i,
    ar: (m) => `نسبة حضورك ${m[1]}% ولديك ${m[2]} غياب. يرجى تحسين نسبة الحضور.`,
  },
  { re: /^⚠️?\s*Attendance Warning$/i, ar: () => '⚠️ تنبيه حضور' },
  { re: /^New message$/i, ar: () => 'رسالة جديدة' },
  { re: /^New follower$/i, ar: () => 'متابع جديد' },
  { re: /^Attendance recorded$/i, ar: () => 'تم تسجيل الحضور' },
];

/** Strip trailing severity markers like " [CRITICAL]" / " [WARNING]" */
function stripSeverityTag(text: string): { body: string; tag: string | null } {
  const m = text.match(/^(.*?)\s*\[([A-Z]{3,})\]\s*$/);
  if (m) return { body: m[1], tag: m[2] };
  return { body: text, tag: null };
}

export function localizeServerText(text: string | null | undefined, isAr: boolean): string {
  if (!text) return '';
  if (!isAr) return text;

  const { body, tag } = stripSeverityTag(text.trim());

  for (const rule of RULES) {
    const m = body.match(rule.re);
    if (m) {
      const translated = rule.ar(m);
      return tag ? `${translated} • ${AR_LEVEL[tag.toLowerCase()] || tag}` : translated;
    }
  }

  // Fallback: translate common standalone words so nothing looks like raw code
  let out = body
    .replace(/\bRecommendation:/gi, 'التوصية:')
    .replace(/\bcontact student\b/gi, 'التواصل مع الطالب')
    .replace(/\breview excuses\b/gi, 'مراجعة الأعذار')
    .replace(/\boffer catch-up session\b/gi, 'تحديد جلسة تعويضية')
    .replace(/\battendance\b/gi, 'الحضور')
    .replace(/\babsences?\b/gi, 'غياب')
    .replace(/\blectures?\b/gi, 'محاضرة');

  if (tag) out = `${out} • ${AR_LEVEL[tag.toLowerCase()] || tag}`;
  return out;
}
