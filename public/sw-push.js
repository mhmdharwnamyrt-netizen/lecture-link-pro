// Service Worker for Web Push Notifications
// This runs in the background even when the app is closed

self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'You have a lecture coming up!',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    vibrate: [200, 100, 200],
    tag: data.tag || 'lecture-reminder',
    renotify: true,
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Lecture Reminder', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
