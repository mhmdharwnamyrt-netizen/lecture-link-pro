/**
 * Check if a lecture is currently active based on day_of_week and start/end time.
 * If no schedule info, falls back to is_active field.
 */
export function isLectureCurrentlyActive(lecture: {
  is_active: boolean;
  day_of_week?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}): boolean {
  // If lecture has no schedule, use manual is_active flag
  if (!lecture.day_of_week || !lecture.start_time || !lecture.end_time) {
    return lecture.is_active;
  }

  // If manually deactivated, respect that
  if (!lecture.is_active) return false;

  const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const currentDay = DAY_ORDER[now.getDay()];

  if (lecture.day_of_week !== currentDay) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = lecture.start_time.split(':').map(Number);
  const [eh, em] = lecture.end_time.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  // Allow 15 min early access
  return currentMinutes >= (startMin - 15) && currentMinutes <= endMin;
}

/**
 * Check if a lecture is scheduled for today (regardless of time)
 */
export function isLectureToday(lecture: { day_of_week?: string | null }): boolean {
  if (!lecture.day_of_week) return false;
  const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return lecture.day_of_week === DAY_ORDER[new Date().getDay()];
}
