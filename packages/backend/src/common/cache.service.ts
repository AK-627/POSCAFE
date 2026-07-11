import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';

/**
 * CacheService — typed Redis wrapper for application-level caching.
 *
 * Key namespaces:
 *   menu:{tenantId}         — menu items + categories (TTL 5m)
 *   reports:{tenantId}:{range} — report results (TTL 10m)
 *   subscription:{tenantId} — subscription status (TTL 2m)
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  // ── Core operations ─────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed for key ${key}`, err);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err) {
      this.logger.warn(`Cache delPattern failed for ${pattern}`, err);
    }
  }

  // ── Cache-aside helper ──────────────────────────────────────

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  // ── Named cache invalidation helpers ───────────────────────

  async invalidateMenu(tenantId: string): Promise<void> {
    await this.delPattern(`menu:${tenantId}:*`);
  }

  async invalidateReports(tenantId: string): Promise<void> {
    await this.delPattern(`reports:${tenantId}:*`);
  }

  async invalidateSubscription(tenantId: string): Promise<void> {
    await this.del(`subscription:${tenantId}`);
  }
}
