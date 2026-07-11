'use client';

/**
 * IndexedDB wrapper for offline storage.
 * Provides strongly-typed access to the local database.
 */

const DB_NAME = 'sky-nether-offline';
const DB_VERSION = 1;

export type OfflineEntityType =
  | 'orders'
  | 'order_items'
  | 'tables'
  | 'menu_items'
  | 'menu_categories'
  | 'customers'
  | 'notifications';

export interface OfflineRecord {
  id: string;
  tenantId: string;
  data: Record<string, unknown>;
  updatedAt: string; // ISO string
  _deleted?: boolean;
}

export interface PendingOperation {
  id: string;
  operationType: 'create' | 'update' | 'delete';
  entityType: OfflineEntityType;
  entityId: string;
  payload: Record<string, unknown>;
  clientTimestamp: string; // ISO string
  retryCount: number;
  status: 'pending' | 'applied' | 'failed';
}

const STORES: Record<string, { keyPath: string; indexes: string[] }> = {
  orders: { keyPath: 'id', indexes: ['tenantId', 'updatedAt'] },
  order_items: { keyPath: 'id', indexes: ['tenantId', 'updatedAt'] },
  tables: { keyPath: 'id', indexes: ['tenantId', 'updatedAt'] },
  menu_items: { keyPath: 'id', indexes: ['tenantId', 'updatedAt'] },
  menu_categories: { keyPath: 'id', indexes: ['tenantId', 'updatedAt'] },
  customers: { keyPath: 'id', indexes: ['tenantId', 'updatedAt'] },
  notifications: { keyPath: 'id', indexes: ['tenantId', 'updatedAt'] },
  pending_operations: { keyPath: 'id', indexes: ['status', 'clientTimestamp'] },
  sync_metadata: { keyPath: 'key', indexes: [] },
};

let dbInstance: IDBDatabase | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      for (const [storeName, config] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
          for (const index of config.indexes) {
            store.createIndex(index, index, { unique: false });
          }
        }
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
    };
  });
}

// ----------------------------------------------------------------
// Generic CRUD helpers
// ----------------------------------------------------------------

export async function dbPut<T extends { id: string }>(
  storeName: string,
  record: T,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet<T>(
  storeName: string,
  key: string,
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(
  storeName: string,
  indexName?: string,
  query?: IDBKeyRange,
): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const target = indexName ? store.index(indexName) : store;
    const req = query ? target.getAll(query) : target.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClear(storeName: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
