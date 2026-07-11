'use client';

/**
 * Offline Operation Queue
 *
 * Queues create/update/delete operations while offline and replays
 * them against the server when connectivity is restored.
 */

import { v4 as uuidv4 } from 'uuid';
import { dbPut, dbGetAll, dbGet, PendingOperation, OfflineEntityType } from './db';

const STORE = 'pending_operations';

export async function enqueueOperation(
  op: Omit<PendingOperation, 'id' | 'retryCount' | 'status'>,
): Promise<PendingOperation> {
  const record: PendingOperation = {
    ...op,
    id: uuidv4(),
    retryCount: 0,
    status: 'pending',
  };
  await dbPut(STORE, record);
  return record;
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  return dbGetAll<PendingOperation>(
    STORE,
    'status',
    IDBKeyRange.only('pending'),
  );
}

export async function markOperationApplied(id: string): Promise<void> {
  const op = await dbGet<PendingOperation>(STORE, id);
  if (op) {
    await dbPut(STORE, { ...op, status: 'applied' });
  }
}

export async function markOperationFailed(
  id: string,
  increment = true,
): Promise<void> {
  const op = await dbGet<PendingOperation>(STORE, id);
  if (op) {
    await dbPut(STORE, {
      ...op,
      status: 'failed',
      retryCount: increment ? op.retryCount + 1 : op.retryCount,
    });
  }
}

export async function requeueFailedOperations(maxRetries = 3): Promise<number> {
  const failed = await dbGetAll<PendingOperation>(
    STORE,
    'status',
    IDBKeyRange.only('failed'),
  );
  let requeued = 0;
  for (const op of failed) {
    if (op.retryCount < maxRetries) {
      await dbPut(STORE, { ...op, status: 'pending' });
      requeued++;
    }
  }
  return requeued;
}

// Convenience wrappers for specific entity types
export function enqueueCreate(
  entityType: OfflineEntityType,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<PendingOperation> {
  return enqueueOperation({
    operationType: 'create',
    entityType,
    entityId,
    payload,
    clientTimestamp: new Date().toISOString(),
  });
}

export function enqueueUpdate(
  entityType: OfflineEntityType,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<PendingOperation> {
  return enqueueOperation({
    operationType: 'update',
    entityType,
    entityId,
    payload,
    clientTimestamp: new Date().toISOString(),
  });
}

export function enqueueDelete(
  entityType: OfflineEntityType,
  entityId: string,
): Promise<PendingOperation> {
  return enqueueOperation({
    operationType: 'delete',
    entityType,
    entityId,
    payload: {},
    clientTimestamp: new Date().toISOString(),
  });
}
