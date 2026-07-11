import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SyncMetadataEntity,
  SyncOperationEntity,
  SyncEntityType,
  SyncOperationType,
} from './sync.entity';

export interface SyncBatchInput {
  operations: Array<{
    type: SyncOperationType;
    entityType: SyncEntityType;
    entityId: string;
    data: Record<string, any>;
    timestamp: Date;
  }>;
  deviceId: string;
  since?: Date;
}

export interface SyncResult {
  applied: SyncOperationEntity[];
  conflicts: SyncOperationEntity[];
  serverChanges: SyncOperationEntity[];
  latestTimestamp: Date;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncMetadataEntity)
    private readonly metadataRepository: Repository<SyncMetadataEntity>,
    @InjectRepository(SyncOperationEntity)
    private readonly operationRepository: Repository<SyncOperationEntity>,
  ) {}

  /**
   * Process a batch of sync operations from a client device.
   * Applies non-conflicting operations and returns conflicts + server changes.
   */
  async processSyncBatch(tenantId: string, batch: SyncBatchInput): Promise<SyncResult> {
    const applied: SyncOperationEntity[] = [];
    const conflicts: SyncOperationEntity[] = [];

    for (const op of batch.operations) {
      const result = await this.processOperation(tenantId, batch.deviceId, op);
      if (result.conflict) {
        conflicts.push(result.operation);
      } else {
        applied.push(result.operation);
      }
    }

    // Get server changes since the client's last sync
    const serverChanges = batch.since
      ? await this.getChangesSince(tenantId, batch.since, batch.deviceId)
      : [];

    const latestTimestamp = new Date();

    this.logger.log(
      `Sync batch processed for tenant ${tenantId}: ${applied.length} applied, ${conflicts.length} conflicts, ${serverChanges.length} server changes`,
    );

    return { applied, conflicts, serverChanges, latestTimestamp };
  }

  /**
   * Process a single sync operation with conflict detection.
   */
  private async processOperation(
    tenantId: string,
    deviceId: string,
    op: {
      type: SyncOperationType;
      entityType: SyncEntityType;
      entityId: string;
      data: Record<string, any>;
      timestamp: Date;
    },
  ): Promise<{ operation: SyncOperationEntity; conflict: boolean }> {
    // Check for conflicts: another device modified same entity after this operation's timestamp
    const metadata = await this.metadataRepository.findOne({
      where: { tenantId, entityType: op.entityType, entityId: op.entityId },
    });

    let conflict = false;

    if (metadata && op.type !== 'create') {
      // Conflict: server version was modified after client's timestamp by a different device
      if (
        metadata.deviceId !== deviceId &&
        new Date(metadata.lastModifiedAt).getTime() > new Date(op.timestamp).getTime()
      ) {
        conflict = true;
      }
    }

    // Create the operation record
    const operation = this.operationRepository.create({
      tenantId,
      operationType: op.type,
      entityType: op.entityType,
      entityId: op.entityId,
      data: op.data,
      deviceId,
      status: conflict ? 'conflict' : 'applied',
      timestamp: op.timestamp,
    });

    const saved = await this.operationRepository.save(operation);

    // Update metadata if no conflict
    if (!conflict) {
      await this.upsertMetadata(tenantId, op.entityType, op.entityId, deviceId);
    }

    return { operation: saved, conflict };
  }

  /**
   * Get all changes from the server since a given timestamp, excluding the requesting device's own changes.
   */
  async getChangesSince(
    tenantId: string,
    since: Date,
    excludeDeviceId?: string,
  ): Promise<SyncOperationEntity[]> {
    const query = this.operationRepository
      .createQueryBuilder('op')
      .where('op.tenantId = :tenantId', { tenantId })
      .andWhere('op.timestamp > :since', { since })
      .andWhere('op.status = :status', { status: 'applied' });

    if (excludeDeviceId) {
      query.andWhere('op.deviceId != :deviceId', { deviceId: excludeDeviceId });
    }

    return query.orderBy('op.timestamp', 'ASC').getMany();
  }

  /**
   * Resolve a conflict by choosing local, remote, or merged data.
   */
  async resolveConflict(
    tenantId: string,
    operationId: string,
    resolution: 'keep_local' | 'keep_remote' | 'merge',
    mergedData?: Record<string, any>,
  ): Promise<SyncOperationEntity> {
    const operation = await this.operationRepository.findOne({
      where: { id: operationId, tenantId },
    });

    if (!operation) {
      throw new Error('Sync operation not found');
    }

    operation.conflictResolution = resolution;

    if (resolution === 'keep_local') {
      operation.status = 'applied';
      await this.upsertMetadata(tenantId, operation.entityType, operation.entityId, operation.deviceId);
    } else if (resolution === 'merge' && mergedData) {
      operation.data = mergedData;
      operation.status = 'applied';
      await this.upsertMetadata(tenantId, operation.entityType, operation.entityId, operation.deviceId);
    } else {
      operation.status = 'rejected';
    }

    return this.operationRepository.save(operation);
  }

  /**
   * Get sync status for a specific entity.
   */
  async getEntitySyncStatus(
    tenantId: string,
    entityType: SyncEntityType,
    entityId: string,
  ): Promise<SyncMetadataEntity | null> {
    return this.metadataRepository.findOne({
      where: { tenantId, entityType, entityId },
    });
  }

  /**
   * Track an entity change (called by other services when entities are modified).
   */
  async trackChange(
    tenantId: string,
    entityType: SyncEntityType,
    entityId: string,
    operationType: SyncOperationType,
    data: Record<string, any>,
    deviceId: string = 'server',
  ): Promise<void> {
    const operation = this.operationRepository.create({
      tenantId,
      operationType,
      entityType,
      entityId,
      data,
      deviceId,
      status: 'applied',
      timestamp: new Date(),
    });

    await this.operationRepository.save(operation);
    await this.upsertMetadata(tenantId, entityType, entityId, deviceId);
  }

  private async upsertMetadata(
    tenantId: string,
    entityType: SyncEntityType,
    entityId: string,
    deviceId: string,
  ): Promise<void> {
    let metadata = await this.metadataRepository.findOne({
      where: { tenantId, entityType, entityId },
    });

    if (metadata) {
      metadata.version += 1;
      metadata.lastModifiedAt = new Date();
      metadata.syncStatus = 'synced';
      metadata.deviceId = deviceId;
    } else {
      metadata = this.metadataRepository.create({
        tenantId,
        entityType,
        entityId,
        version: 1,
        lastModifiedAt: new Date(),
        syncStatus: 'synced',
        deviceId,
      });
    }

    await this.metadataRepository.save(metadata);
  }
}
