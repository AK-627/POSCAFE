'use client';

/**
 * useOfflineSync hook
 *
 * Monitors network status and triggers automatic sync when
 * connectivity is restored. Exposes online/offline state to React.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncManager, SyncResult } from './sync-manager';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

let managerInstance: SyncManager | null = null;

function getManager(): SyncManager {
  if (!managerInstance) {
    managerInstance = new SyncManager(API_BASE);
  }
  return managerInstance;
}

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  pendingCount: number;
  sync: () => Promise<void>;
}

export function useOfflineSync(
  pollIntervalMs = 30_000,
): OfflineSyncState {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const { getPendingOperations } = await import('./offline-queue');
    const ops = await getPendingOperations();
    setPendingCount(ops.length);
  }, []);

  const sync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const manager = getManager();
      const result = await manager.sync();
      setLastSyncResult(result);
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  // Browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);

  // Periodic background sync when online
  useEffect(() => {
    if (isOnline) {
      pollRef.current = setInterval(() => {
        sync();
      }, pollIntervalMs);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [isOnline, pollIntervalMs, sync]);

  // Count pending ops on mount
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return { isOnline, isSyncing, lastSyncResult, pendingCount, sync };
}
