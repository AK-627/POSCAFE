import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService, SyncBatchInput } from './sync.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '@skynether/shared/types/user';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  @ApiOperation({ summary: 'Submit a batch of sync operations' })
  async processBatch(
    @CurrentUser() user: AuthPayload,
    @Body() batch: SyncBatchInput,
  ) {
    return this.syncService.processSyncBatch(user.tenantId, batch);
  }

  @Get('changes')
  @ApiOperation({ summary: 'Get server changes since a given timestamp' })
  async getChanges(
    @CurrentUser() user: AuthPayload,
    @Query('since') since: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.syncService.getChangesSince(user.tenantId, new Date(since), deviceId);
  }

  @Post('resolve')
  @ApiOperation({ summary: 'Resolve a sync conflict' })
  async resolveConflict(
    @CurrentUser() user: AuthPayload,
    @Body() body: {
      operationId: string;
      resolution: 'keep_local' | 'keep_remote' | 'merge';
      mergedData?: Record<string, any>;
    },
  ) {
    return this.syncService.resolveConflict(
      user.tenantId,
      body.operationId,
      body.resolution,
      body.mergedData,
    );
  }
}
