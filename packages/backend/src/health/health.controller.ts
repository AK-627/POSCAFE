import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';
import { Public } from '../auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../subscriptions/skip-subscription-check.decorator';

@ApiTags('health')
@Public()
@SkipSubscriptionCheck()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check including dependencies' })
  async detailed() {
    const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; detail?: string }> = {};

    // Database
    const dbStart = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      checks['database'] = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err: any) {
      checks['database'] = { status: 'error', detail: err?.message };
    }

    // Redis
    const redisStart = Date.now();
    try {
      await this.redis.ping();
      checks['redis'] = { status: 'ok', latencyMs: Date.now() - redisStart };
    } catch (err: any) {
      checks['redis'] = { status: 'error', detail: err?.message };
    }

    const overall = Object.values(checks).every((c) => c.status === 'ok') ? 'ok' : 'degraded';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      checks,
      uptime: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    };
  }
}
