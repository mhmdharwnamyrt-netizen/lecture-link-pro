// BSUT Attendance - Full PWA Service Worker
// Handles: offline caching, push notifications, background sync, navigation

const CACHE_VERSION = 'bsut-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Core app shell files that must be cached for offline
const STATIC_ASSETS = [
  '/',
  '/login',
  '/register',
  '/manifest.json',
  '/icons/icon-192x192.jpg',
  '/icons/icon-512x512.jpg',
  '/favicon.ico',
];

// API/Supabase patterns we should try network-first
const API_PATTERNS = [
  'supabase.co',
  'supabase.in',
  '/rest/v1/',
  '/auth/v1/',
  '/functions/v1/',
];

// Navigation routes to cache for offline access
const APP_ROUTES = [
  '/student',
  '/student/lectures',
  '/student/calendar',
  '/student/schedule-ai',
  '/student/face-registration',
  '/student/notifications',
  '/student/profile',
  '/student/messages',
  '/student/office-hours',
  '/doctor',
  '/doctor/lectures',
  '/doctor/analytics',
  '/doctor/schedule-parser',
  '/doctor/early-warning',
  '/doctor/notifications',
  '/doctor/profile',
  '/doctor/messages',
  '/doctor/office-hours',
];

// ========== INSTALL ==========
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Some assets might fail in dev, that's okay
        console.warn('SW: Some static assets failed to cache:', err);
      });
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// ========== ACTIVATE ==========
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// ========== FETCH ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE should go to network)
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Check if this is an API request
  const isAPI = API_PATTERNS.some((pattern) => request.url.includes(pattern));

  if (isAPI) {
    // Network-first for API requests with fallback to cache
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Check if this is a navigation request (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // For static assets (JS, CSS, images, fonts) - cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // Everything else: network-first with dynamic cache
  event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
});

// ========== STRATEGIES ==========

// Cache-first: Good for static assets that rarely change
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return createOfflineFallback();
  }
}

// Network-first: Good for dynamic content / API
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return createOfflineFallback();
  }
}

// Navigation handler: serves the app shell for all routes (SPA)
async function navigationHandler(request) {
  try {
    // Try network first
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      // Also cache as the root index for offline SPA routing
      if (request.url.includes('/login') || request.url.endsWith('/')) {
        cache.put('/', response.clone());
      }
    }
    return response;
  } catch {
    // Offline: serve cached version of same URL or fallback to root
    const cached = await caches.match(request);
    if (cached) return cached;

    // For SPA routing, serve the root index page
    const rootCached = await caches.match('/');
    if (rootCached) return rootCached;

    // Last resort: offline HTML
    return createOfflinePage();
  }
}

// ========== HELPERS ==========

function isStaticAsset(url) {
  const staticExts = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExts.some((ext) => url.pathname.endsWith(ext));
}

function createOfflineFallback() {
  return new Response(JSON.stringify({ error: 'offline', message: 'You are currently offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createOfflinePage() {
  const html = `<!DOCTYPE html>
<html lang="en" dir="auto">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BSUT Attendance - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #EFF6FF;
      color: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon-box {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: rgba(59, 130, 246, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .icon-box svg {
      width: 40px;
      height: 40px;
      color: #3B82F6;
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
    button {
      background: #3B82F6;
      color: white;
      border: none;
      padding: 0.875rem 2rem;
      border-radius: 1rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    button:active { transform: scale(0.97); }
    @media (prefers-color-scheme: dark) {
      body { background: #0c1220; color: #e2e8f0; }
      p { color: #94a3b8; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon-box">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    </div>
    <h1>You are offline</h1>
    <p>Please check your internet connection and try again. Some features may still work offline.</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'BSUT Attendance', body: event.data.text() };
  }

  const options = {
    body: data.body || 'You have a lecture coming up!',
    icon: '/icons/icon-192x192.jpg',
    badge: '/icons/icon-192x192.jpg',
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendanceData());
  }
});

async function syncAttendanceData() {
  // This would sync any queued attendance records when back online
  // For now, notify the client that sync is available
  const allClients = await clients.matchAll();
  for (const client of allClients) {
    client.postMessage({ type: 'SYNC_COMPLETE', tag: 'sync-attendance' });
  }
}

// ========== MESSAGE HANDLER ==========
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.jpg',
      badge: '/icons/icon-192x192.jpg',
      tag: tag || 'lecture-reminder',
      vibrate: [200, 100, 200],
      renotify: true,
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
