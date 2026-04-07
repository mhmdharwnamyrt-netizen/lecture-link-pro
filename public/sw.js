/**
 * BSUT Attendance PWA Service Worker
 * Full offline support, caching, background sync, and push notifications
 */

const CACHE_NAME = 'bsut-attendance-v1';
const STATIC_CACHE = 'bsut-static-v1';
const DYNAMIC_CACHE = 'bsut-dynamic-v1';
const API_CACHE = 'bsut-api-v1';

// Core app shell files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-72x72.jpg',
  '/icons/icon-96x96.jpg',
  '/icons/icon-128x128.jpg',
  '/icons/icon-144x144.jpg',
  '/icons/icon-152x152.jpg',
  '/icons/icon-192x192.jpg',
  '/icons/icon-384x384.jpg',
  '/icons/icon-512x512.jpg',
];

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/login',
  '/student',
  '/student/lectures',
  '/student/calendar',
  '/student/notifications',
  '/student/profile',
  '/doctor',
  '/doctor/lectures',
  '/doctor/analytics',
  '/doctor/notifications',
  '/doctor/profile',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/rest/v1/lectures',
  '/rest/v1/attendance',
  '/rest/v1/profiles',
  '/rest/v1/departments',
  '/rest/v1/subjects',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.log('[SW] Cache install error:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Helper: Check if request is an API call
function isApiRequest(url) {
  return url.includes('/rest/v1/') || url.includes('/auth/v1/') || url.includes('supabase');
}

// Helper: Check if request is for static asset
function isStaticAsset(url) {
  return url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// Helper: Network first with cache fallback
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    throw error;
  }
}

// Helper: Cache first with network fallback
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    throw error;
  }
}

// Helper: Stale while revalidate
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(API_CACHE);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Fetch event - handle all requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests - stale while revalidate
  if (isApiRequest(url.href)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Handle static assets - cache first
  if (isStaticAsset(url.href)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle navigation requests - network first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default: network first
  event.respondWith(networkFirst(request));
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'BSUT Attendance',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.jpg',
    badge: '/icons/icon-72x72.jpg',
    tag: 'default',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.jpg',
    badge: data.badge || '/icons/icon-72x72.jpg',
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(targetUrl);
      })
  );
});

// Background sync for offline attendance
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  }
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncAllData());
  }
});

// Sync offline attendance records
async function syncAttendance() {
  try {
    const db = await openIndexedDB();
    const offlineRecords = await getAllOfflineAttendance(db);
    
    for (const record of offlineRecords) {
      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        
        if (response.ok) {
          await deleteOfflineRecord(db, record.id);
        }
      } catch (error) {
        console.log('[SW] Sync failed for record:', record.id);
      }
    }
    
    // Notify user of sync completion
    self.registration.showNotification('Sync Complete', {
      body: 'Your offline attendance records have been synchronized.',
      icon: '/icons/icon-192x192.jpg',
      tag: 'sync-complete'
    });
  } catch (error) {
    console.log('[SW] Sync attendance error:', error);
  }
}

// Sync all cached data
async function syncAllData() {
  // Re-fetch critical API data
  const criticalEndpoints = [
    '/rest/v1/lectures',
    '/rest/v1/attendance'
  ];
  
  const cache = await caches.open(API_CACHE);
  
  for (const endpoint of criticalEndpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        await cache.put(endpoint, response);
      }
    } catch (error) {
      console.log('[SW] Failed to sync:', endpoint);
    }
  }
}

// IndexedDB helpers for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bsut-attendance-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('attendance')) {
        db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllOfflineAttendance(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['attendance'], 'readonly');
    const store = transaction.objectStore('attendance');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteOfflineRecord(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['attendance'], 'readwrite');
    const store = transaction.objectStore('attendance');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((names) => Promise.all(names.map((name) => caches.delete(name))))
    );
  }
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: '/icons/icon-192x192.jpg',
      badge: '/icons/icon-72x72.jpg',
      tag: event.data.tag || 'notification',
      vibrate: [200, 100, 200]
    });
  }
  
  if (event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then((size) => {
      event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
    });
  }
});

// Get total cache size
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-lectures') {
    event.waitUntil(syncAllData());
  }
});

console.log('[SW] Service Worker loaded successfully');
