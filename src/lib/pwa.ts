/**
 * PWA Utilities for BSUT Attendance
 * Handles service worker registration, install prompts, and offline detection
 */

// Types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  registration: ServiceWorkerRegistration | null;
}

// Global state
const pwaState: PWAState = {
  isInstallable: false,
  isInstalled: false,
  isOnline: navigator.onLine,
  isUpdateAvailable: false,
  installPrompt: null,
  registration: null,
};

// Listeners
type PWAStateListener = (state: PWAState) => void;
const listeners: Set<PWAStateListener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...pwaState }));
}

export function subscribeToPWAState(listener: PWAStateListener): () => void {
  listeners.add(listener);
  listener({ ...pwaState });
  return () => listeners.delete(listener);
}

// Check if app is installed
export function checkIfInstalled(): boolean {
  // Check display mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // iOS Safari check
  if ((navigator as any).standalone === true) {
    return true;
  }
  // Check if launched from home screen
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  return false;
}

// Initialize PWA
export async function initializePWA(): Promise<void> {
  // Check if installed
  pwaState.isInstalled = checkIfInstalled();
  
  // Listen for online/offline
  window.addEventListener('online', () => {
    pwaState.isOnline = true;
    notifyListeners();
    // Trigger background sync
    if (pwaState.registration?.sync) {
      pwaState.registration.sync.register('sync-attendance');
    }
  });
  
  window.addEventListener('offline', () => {
    pwaState.isOnline = false;
    notifyListeners();
  });
  
  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    pwaState.installPrompt = event as BeforeInstallPromptEvent;
    pwaState.isInstallable = true;
    notifyListeners();
  });
  
  // Listen for app installed
  window.addEventListener('appinstalled', () => {
    pwaState.isInstalled = true;
    pwaState.isInstallable = false;
    pwaState.installPrompt = null;
    notifyListeners();
    // Track installation
    console.log('[PWA] App installed successfully');
  });
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      
      pwaState.registration = registration;
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              pwaState.isUpdateAvailable = true;
              notifyListeners();
            }
          });
        }
      });
      
      // Periodic update check
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour
      
      console.log('[PWA] Service Worker registered successfully');
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }
  
  notifyListeners();
}

// Trigger install prompt
export async function promptInstall(): Promise<boolean> {
  if (!pwaState.installPrompt) {
    console.log('[PWA] Install prompt not available');
    return false;
  }
  
  try {
    await pwaState.installPrompt.prompt();
    const { outcome } = await pwaState.installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      pwaState.isInstallable = false;
      pwaState.installPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return false;
  }
}

// Apply update
export function applyUpdate(): void {
  if (pwaState.registration?.waiting) {
    pwaState.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

// Get cache size
export async function getCacheSize(): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve('0 KB');
      return;
    }
    
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data.type === 'CACHE_SIZE') {
        const sizeInMB = (event.data.size / (1024 * 1024)).toFixed(2);
        resolve(`${sizeInMB} MB`);
      }
    };
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_CACHE_SIZE' },
      [channel.port2]
    );
    
    // Timeout fallback
    setTimeout(() => resolve('Unknown'), 3000);
  });
}

// Clear all caches
export async function clearCaches(): Promise<void> {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }
  
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

// Pre-cache specific URLs
export function preCacheUrls(urls: string[]): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls });
  }
}

// Show notification via service worker
export function showNotification(title: string, body: string, tag?: string): void {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      tag,
    });
  }
}

// Get PWA state
export function getPWAState(): PWAState {
  return { ...pwaState };
}

// iOS specific install instructions check
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function canShowIOSInstallPrompt(): boolean {
  return isIOSDevice() && isSafari() && !checkIfInstalled();
}

// Android specific check
export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

// Desktop check
export function isDesktop(): boolean {
  return !isIOSDevice() && !isAndroid();
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    console.log(`[PWA] Persistent storage ${granted ? 'granted' : 'denied'}`);
    return granted;
  }
  return false;
}

// Get storage estimate
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}

// Background sync registration
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (pwaState.registration?.sync) {
    try {
      await pwaState.registration.sync.register(tag);
      return true;
    } catch (error) {
      console.error('[PWA] Background sync registration failed:', error);
      return false;
    }
  }
  return false;
}

// Periodic sync registration (if supported)
export async function registerPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
  if (pwaState.registration && 'periodicSync' in pwaState.registration) {
    try {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName,
      });
      
      if (status.state === 'granted') {
        await (pwaState.registration as any).periodicSync.register(tag, { minInterval });
        return true;
      }
    } catch (error) {
      console.error('[PWA] Periodic sync registration failed:', error);
    }
  }
  return false;
}
