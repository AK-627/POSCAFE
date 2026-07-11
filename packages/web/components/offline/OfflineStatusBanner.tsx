'use client';

/**
 * OfflineStatusBanner
 *
 * Renders a small banner at the top of the screen when the device
 * is offline, and a brief "syncing" indicator when flushing the queue.
 */

import React from 'react';
import { useOfflineSync } from '../../lib/offline/use-offline-sync';

export function OfflineStatusBanner() {
  const { isOnline, isSyncing, pendingCount, sync } = useOfflineSync();

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-4 py-2 text-sm font-medium shadow-md transition-all ${
        isOnline
          ? 'bg-blue-600 text-white'
          : 'bg-amber-500 text-white'
      }`}
    >
      <span>
        {!isOnline
          ? '⚠ You are offline — changes will sync when reconnected'
          : isSyncing
          ? '⟳ Syncing changes with server…'
          : `↑ ${pendingCount} pending change${pendingCount > 1 ? 's' : ''} to sync`}
      </span>

      {isOnline && !isSyncing && pendingCount > 0 && (
        <button
          type="button"
          onClick={() => sync()}
          className="ml-4 rounded bg-white/20 px-3 py-1 text-xs hover:bg-white/30"
        >
          Sync now
        </button>
      )}
    </div>
  );
}
