export type SyncStatus = 'pending' | 'synced' | 'conflict';
export type SyncEntityType = 'order' | 'menu_item' | 'table' | 'customer' | 'payment';

export interface SyncMetadata {
  id: string;
  tenantId: string;
  entityType: SyncEntityType;
  entityId: string;
  lastModifiedAt: Date;
  deviceId?: string;
  syncStatus: SyncStatus;
  version: number;
  createdAt: Date;
}

export interface SyncOperation {
  type: 'create' | 'update' | 'delete';
  entityType: SyncEntityType;
  entityId: string;
  data: Record<string, any>;
  timestamp: Date;
  deviceId: string;
}

export interface SyncBatch {
  operations: SyncOperation[];
  since?: Date;
  deviceId: string;
}

export interface SyncResponse {
  appliedOperations: SyncOperation[];
  conflicts: SyncOperation[];
  latestTimestamp: Date;
}

export interface ConflictResolution {
  operationId: string;
  resolution: 'keep_local' | 'keep_remote' | 'merge';
  mergedData?: Record<string, any>;
}