import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * TenantContextService
 *
 * Sets the PostgreSQL session variable `app.current_tenant_id` so that
 * Row-Level Security policies can filter rows to the current tenant.
 *
 * Usage:
 *   await tenantContextService.setTenantContext(dataSource, tenantId);
 *   // ... run queries ...
 *   await tenantContextService.clearTenantContext(dataSource);
 */
@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  /**
   * Sets the tenant context for the current database session.
   * Must be called before any tenant-scoped queries.
   */
  async setTenantContext(dataSource: DataSource, tenantId: string): Promise<void> {
    try {
      await dataSource.query(`SELECT set_config('app.current_tenant_id', $1, FALSE)`, [tenantId]);
    } catch (error) {
      this.logger.error(`Failed to set tenant context for tenant ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Clears the tenant context for the current database session.
   * Call after tenant-scoped operations are complete.
   */
  async clearTenantContext(dataSource: DataSource): Promise<void> {
    try {
      await dataSource.query(`SELECT set_config('app.current_tenant_id', '', FALSE)`);
    } catch (error) {
      this.logger.warn('Failed to clear tenant context', error);
    }
  }

  /**
   * Executes a callback within a tenant context.
   * Automatically sets and clears the tenant context.
   */
  async withTenantContext<T>(
    dataSource: DataSource,
    tenantId: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    await this.setTenantContext(dataSource, tenantId);
    try {
      return await callback();
    } finally {
      await this.clearTenantContext(dataSource);
    }
  }
}
