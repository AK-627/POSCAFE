import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfflineQueueEntity, OfflineOperationType } from './offline-queue.entity';

export interface OfflineOperation {
  operationType: OfflineOperationType;
  entityType: string;
  entityId?: string;
  payload: Record<string, any>;
  clientTimestamp: Date;
}

export interface OfflineSyncResult {
  applied: OfflineQueueEntity[];
  failed: OfflineQueueEntity[];
  conflicts: OfflineQueueEntity[];
  serverTimestamp: Date;
}

@Injectable()
export class OfflineService {
  private readonly logger = new Logger(OfflineService.name);

  constructor(
    @InjectRepository(OfflineQueueEntity)
    private readonly queueRepository: Repository<OfflineQueueEntity>,
  ) {}

  /**
   * Receive a batch of operations that were queued offline on the client.
   * Process them in order and return results.
   */
  async processOfflineBatch(
    tenantId: string,
    deviceId: string,
    operations: OfflineOperation[],
  ): Promise<OfflineSyncResult> {
    const applied: OfflineQueueEntity[] = [];
    const failed: OfflineQueueEntity[] = [];
    const conflicts: OfflineQueueEntity[] = [];

    for (const op of operations) {
      const entry = this.queueRepository.create({
        tenantId,
        deviceId,
        operationType: op.operationType,
        entityType: op.entityType,
        entityId: op.entityId,
        payload: op.payload,
        clientTimestamp: op.clientTimestamp,
        status: 'pending',
      });

      try {
        // In production, this would dispatch to the appropriate service
        // For now, mark as applied and let the sync service handle conflicts
        entry.status = 'applied';
        const saved = await this.queueRepository.save(entry);
        applied.push(saved);
      } catch (error: any) {
        entry.status = 'failed';
        entry.errorMessage = error.message ?? 'Unknown error';
        entry.retryCount += 1;
        const saved = await this.queueRepository.save(entry);
        failed.push(saved);
      }
    }

    this.logger.log(
      `Offline batch from device ${deviceId}: ${applied.length} applied, ${failed.length} failed`,
    );

    return {
      applied,
      failed,
      conflicts,
      serverTimestamp: new Date(),
    };
  }

  /**
   * Get pending operations for a device (for retry).
   */
  async getPendingOperations(
    tenantId: string,
    deviceId: string,
  ): Promise<OfflineQueueEntity[]> {
    return this.queueRepository.find({
      where: { tenantId, deviceId, status: 'pending' },
      order: { clientTimestamp: 'ASC' },
    });
  }

  /**
   * Get the last sync timestamp for a device.
   */
  async getLastSyncTimestamp(
    tenantId: string,
    deviceId: string,
  ): Promise<Date | null> {
    const latest = await this.queueRepository.findOne({
      where: { tenantId, deviceId, status: 'applied' },
      order: { receivedAt: 'DESC' },
    });
    return latest?.receivedAt ?? null;
  }

  /**
   * Health check endpoint — returns server status for network detection.
   */
  getServerStatus(): { online: boolean; timestamp: Date } {
    return { online: true, timestamp: new Date() };
  }
}
