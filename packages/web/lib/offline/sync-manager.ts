'use client';

/**
 * SyncManager
 *
 * Flushes pending offline operations to the server when connectivity
 * is restored, then pulls server-side changes down to IndexedDB.
 */

import axios from 'axios';
import {
  getPendingOperations,
  markOperationApplied,
  markOperationFailed,
  requeueFailedOperations,
} from './offline-queue';
import { dbPut, dbGetAll, OfflineRecord, OfflineEntityType } from './db';

const SYNC_METADATA_STORE = 'sync_metadata';

interface SyncMetaRecord {
  key: string; // e.g. "lastSync_orders"
  value: string; // ISO timestamp
}

async function getLastSync(entityType: OfflineEntityType): Promise<string | null> {
  const db = await import('./db');
  const record = await db.dbGet<SyncMetaRecord>(
    SYNC_METADATA_STORE,
    `lastSync_${entityType}`,
  );
  return record?.value ?? null;
}

async function setLastSync(
  entityType: OfflineEntityType,
  timestamp: string,
): Promise<void> {
  const db = await import('./db');
  await db.dbPut<SyncMetaRecord>(SYNC_METADATA_STORE, {
    key: `lastSync_${entityType}`,
    value: timestamp,
  });
}

export interface SyncResult {
  flushed: number;
  failed: number;
  pulled: number;
  conflicts: number;
  timestamp: string;
}

export class SyncManager {
  private isSyncing = false;
  private deviceId: string;
  private apiBase: string;

  constructor(apiBase: string) {
    this.apiBase = apiBase;
    // Stable device ID persisted in localStorage
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('sky-nether-device-id');
      if (!id) {
        id = `web-${crypto.randomUUID()}`;
        localStorage.setItem('sky-nether-device-id', id);
      }
      this.deviceId = id;
    } else {
      this.deviceId = 'ssr-device';
    }
  }

  /**
   * Perform a full sync cycle:
   * 1. Flush pending operations to the server
   * 2. Pull server changes since last sync
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { flushed: 0, failed: 0, pulled: 0, conflicts: 0, timestamp: new Date().toISOString() };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      flushed: 0,
      failed: 0,
      pulled: 0,
      conflicts: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      // Step 1: Requeue previously failed ops (up to 3 retries)
      await requeueFailedOperations(3);

      // Step 2: Flush pending operations
      const pending = await getPendingOperations();

      if (pending.length > 0) {
        try {
          const response = await axios.post(`${this.apiBase}/offline/batch`, {
            deviceId: this.deviceId,
            operations: pending.map((op) => ({
              operationType: op.operationType,
              entityType: op.entityType,
              entityId: op.entityId,
              payload: op.payload,
              clientTimestamp: op.clientTimestamp,
            })),
          });

          const { applied = [], failed = [] } = response.data as {
            applied: { entityId: string }[];
            failed: { entityId: string }[];
          };

          for (const op of pending) {
            const wasApplied = applied.some(
              (a) => a.entityId === op.entityId,
            );
            if (wasApplied) {
              await markOperationApplied(op.id);
              result.flushed++;
            } else {
              await markOperationFailed(op.id);
              result.failed++;
            }
          }
        } catch {
          // Network error — keep operations pending for next sync
          result.failed += pending.length;
        }
      }

      // Step 3: Pull server changes for key entity types
      const entityTypes: OfflineEntityType[] = [
        'orders',
        'tables',
        'menu_items',
        'menu_categories',
      ];

      for (const entityType of entityTypes) {
        try {
          const lastSync = await getLastSync(entityType);
          const url = `${this.apiBase}/sync/changes`;
          const response = await axios.get(url, {
            params: {
              entityType,
              since: lastSync,
              deviceId: this.deviceId,
            },
          });

          const {
            changes = [],
            conflicts = [],
            timestamp,
          } = response.data as {
            changes: OfflineRecord[];
            conflicts: OfflineRecord[];
            timestamp: string;
          };

          for (const record of changes) {
            if (record._deleted) {
              await import('./db').then((db) =>
                db.dbDelete(entityType, record.id),
              );
            } else {
              await dbPut(entityType, record);
            }
            result.pulled++;
          }

          result.conflicts += conflicts.length;

          if (timestamp) {
            await setLastSync(entityType, timestamp);
          }
        } catch {
          // Per-entity pull failure — skip and continue with next
        }
      }

      result.timestamp = new Date().toISOString();
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Check if the server is reachable.
   */
  async isOnline(): Promise<boolean> {
    try {
      await axios.get(`${this.apiBase}/offline/status`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
