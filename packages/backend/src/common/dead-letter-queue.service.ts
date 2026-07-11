import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';

const DLQ_KEY = 'sky-nether:dlq';
const MAX_DLQ_SIZE = 1000;

export interface DeadLetterEntry {
  id: string;
  operation: string;
  payload: Record<string, unknown>;
  error: string;
  retryCount: number;
  enqueuedAt: string;
  tenantId?: string;
}

/**
 * DeadLetterQueueService
 *
 * Stores failed operations that cannot be retried automatically.
 * Backed by a Redis list for persistence across restarts.
 * Owners / ops engineers can inspect and replay from the admin panel.
 */
@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async enqueue(entry: Omit<DeadLetterEntry, 'id' | 'enqueuedAt'>): Promise<void> {
    const record: DeadLetterEntry = {
      ...entry,
      id: `dlq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      enqueuedAt: new Date().toISOString(),
    };

    this.logger.warn(`DLQ: ${record.operation} failed — ${record.error}`);

    await this.redis.lpush(DLQ_KEY, JSON.stringify(record));
    // Cap list size to avoid unbounded growth
    await this.redis.ltrim(DLQ_KEY, 0, MAX_DLQ_SIZE - 1);
  }

  async list(limit = 50): Promise<DeadLetterEntry[]> {
    const raw = await this.redis.lrange(DLQ_KEY, 0, limit - 1);
    return raw.map((r) => JSON.parse(r) as DeadLetterEntry);
  }

  async size(): Promise<number> {
    return this.redis.llen(DLQ_KEY);
  }

  async clear(): Promise<void> {
    await this.redis.del(DLQ_KEY);
    this.logger.log('DLQ cleared');
  }
}
