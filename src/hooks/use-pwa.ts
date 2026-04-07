/**
 * React hook for PWA functionality
 */

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToPWAState,
  promptInstall,
  applyUpdate,
  getCacheSize,
  clearCaches,
  canShowIOSInstallPrompt,
  isIOSDevice,
  isAndroid,
  isDesktop,
  requestPersistentStorage,
  getStorageEstimate,
} from '@/lib/pwa';

interface PWAHookState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  showIOSPrompt: boolean;
  cacheSize: string;
  storageUsage: number;
  storageQuota: number;
}

interface PWAHookActions {
  install: () => Promise<boolean>;
  update: () => void;
  clearCache: () => Promise<void>;
  refreshCacheSize: () => Promise<void>;
}

export function usePWA(): PWAHookState & PWAHookActions {
  const [state, setState] = useState<PWAHookState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    isIOS: isIOSDevice(),
    isAndroid: isAndroid(),
    isDesktop: isDesktop(),
    showIOSPrompt: canShowIOSInstallPrompt(),
    cacheSize: '0 MB',
    storageUsage: 0,
    storageQuota: 0,
  });

  useEffect(() => {
    const unsubscribe = subscribeToPWAState((pwaState) => {
      setState((prev) => ({
        ...prev,
        isInstallable: pwaState.isInstallable,
        isInstalled: pwaState.isInstalled,
        isOnline: pwaState.isOnline,
        isUpdateAvailable: pwaState.isUpdateAvailable,
        showIOSPrompt: canShowIOSInstallPrompt(),
      }));
    });

    // Get initial cache size and storage
    refreshCacheSize();
    refreshStorageEstimate();

    // Request persistent storage
    requestPersistentStorage();

    return unsubscribe;
  }, []);

  const refreshCacheSize = useCallback(async () => {
    const size = await getCacheSize();
    setState((prev) => ({ ...prev, cacheSize: size }));
  }, []);

  const refreshStorageEstimate = useCallback(async () => {
    const estimate = await getStorageEstimate();
    if (estimate) {
      setState((prev) => ({
        ...prev,
        storageUsage: estimate.usage,
        storageQuota: estimate.quota,
      }));
    }
  }, []);

  const install = useCallback(async () => {
    return await promptInstall();
  }, []);

  const update = useCallback(() => {
    applyUpdate();
  }, []);

  const clearCache = useCallback(async () => {
    await clearCaches();
    await refreshCacheSize();
  }, [refreshCacheSize]);

  return {
    ...state,
    install,
    update,
    clearCache,
    refreshCacheSize,
  };
}

export default usePWA;
