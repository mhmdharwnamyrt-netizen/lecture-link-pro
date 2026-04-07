/**
 * Web Push Notification utilities
 * Uses the browser Notification API for lecture reminders
 */

let reminderIntervalId: ReturnType<typeof setInterval> | null = null;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function showLocalNotification(title: string, body: string, tag?: string) {
  if (Notification.permission !== 'granted') return;

  try {
    const options: Record<string, any> = {
      body,
      icon: '/placeholder.svg',
      badge: '/placeholder.svg',
      tag: tag || 'lecture-reminder',
      renotify: true,
      vibrate: [200, 100, 200],
    };
    const notification = new Notification(title, options as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  } catch {
    // Fallback for mobile - try service worker notification
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag,
      });
    }
  }
}

interface Lecture {
  id: string;
  title: string;
  day_of_week?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  hall_number?: number | null;
}

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const notifiedLectures = new Set<string>();

function checkAndNotify(lectures: Lecture[]) {
  const now = new Date();
  const currentDay = DAY_ORDER[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const lecture of lectures) {
    if (!lecture.day_of_week || !lecture.start_time) continue;
    if (lecture.day_of_week !== currentDay) continue;

    const [h, m] = lecture.start_time.split(':').map(Number);
    const startMin = h * 60 + m;
    const diffMin = startMin - currentMinutes;

    // Notify 15 minutes before
    const todayKey = `${lecture.id}-${now.toDateString()}`;
    if (diffMin > 0 && diffMin <= 15 && !notifiedLectures.has(todayKey)) {
      notifiedLectures.add(todayKey);
      const hallText = lecture.hall_number ? ` • Hall ${lecture.hall_number}` : '';
      showLocalNotification(
        `📚 ${lecture.title} in ${diffMin} min`,
        `Starting at ${lecture.start_time.substring(0, 5)}${hallText}. Get ready!`,
        `reminder-${lecture.id}`
      );
    }
  }
}

export function startLectureReminders(lectures: Lecture[]) {
  stopLectureReminders();

  // Check immediately
  checkAndNotify(lectures);

  // Check every minute
  reminderIntervalId = setInterval(() => {
    checkAndNotify(lectures);
  }, 60000);
}

export function stopLectureReminders() {
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Use the main PWA service worker which handles both caching and push notifications
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      // Service worker registration failed - notifications will use Notification API directly
    }
  }
}
