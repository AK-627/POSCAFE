import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLogEntity, AuditCategory } from './audit.entity';

export interface AuditLogInput {
  tenantId: string;
  category: AuditCategory;
  action: string;
  userId?: string;
  userEmail?: string;
  entityType?: string;
  entityId?: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
  ) {}

  async log(input: AuditLogInput): Promise<AuditLogEntity> {
    const entry = this.auditRepository.create(input);
    return this.auditRepository.save(entry);
  }

  async getAuditLogs(
    tenantId: string,
    options?: {
      category?: AuditCategory;
      userId?: string;
      entityType?: string;
      entityId?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: AuditLogEntity[]; total: number }> {
    const query = this.auditRepository
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId });

    if (options?.category) {
      query.andWhere('log.category = :category', { category: options.category });
    }
    if (options?.userId) {
      query.andWhere('log.userId = :userId', { userId: options.userId });
    }
    if (options?.entityType) {
      query.andWhere('log.entityType = :entityType', { entityType: options.entityType });
    }
    if (options?.entityId) {
      query.andWhere('log.entityId = :entityId', { entityId: options.entityId });
    }
    if (options?.from) {
      query.andWhere('log.createdAt >= :from', { from: options.from });
    }
    if (options?.to) {
      query.andWhere('log.createdAt <= :to', { to: options.to });
    }

    const total = await query.getCount();
    const logs = await query
      .orderBy('log.createdAt', 'DESC')
      .take(options?.limit ?? 50)
      .skip(options?.offset ?? 0)
      .getMany();

    return { logs, total };
  }

  async getEntityHistory(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<AuditLogEntity[]> {
    return this.auditRepository.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Clean up audit logs older than the retention period.
   * Default retention: 12 months.
   */
  async cleanupOldLogs(tenantId: string, retentionMonths: number = 12): Promise<number> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - retentionMonths);

    const result = await this.auditRepository.delete({
      tenantId,
      createdAt: LessThan(cutoff),
    });

    const deleted = result.affected ?? 0;
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} audit logs older than ${retentionMonths} months for tenant ${tenantId}`);
    }
    return deleted;
  }
}
