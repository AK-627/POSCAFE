import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OfflineService, OfflineOperation } from './offline.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuthPayload } from '@skynether/shared/types/user';

@ApiTags('offline')
@ApiBearerAuth()
@Controller('offline')
export class OfflineController {
  constructor(private readonly offlineService: OfflineService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Server health check for network detection' })
  async getServerStatus() {
    return this.offlineService.getServerStatus();
  }

  @Post('sync')
  @ApiOperation({ summary: 'Submit offline-queued operations for processing' })
  async syncOfflineOperations(
    @CurrentUser() user: AuthPayload,
    @Body() body: { deviceId: string; operations: OfflineOperation[] },
  ) {
    return this.offlineService.processOfflineBatch(
      user.tenantId,
      body.deviceId,
      body.operations,
    );
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending operations for a device' })
  async getPending(
    @CurrentUser() user: AuthPayload,
    @Query('deviceId') deviceId: string,
  ) {
    return this.offlineService.getPendingOperations(user.tenantId, deviceId);
  }

  @Get('last-sync')
  @ApiOperation({ summary: 'Get last sync timestamp for a device' })
  async getLastSync(
    @CurrentUser() user: AuthPayload,
    @Query('deviceId') deviceId: string,
  ) {
    const timestamp = await this.offlineService.getLastSyncTimestamp(user.tenantId, deviceId);
    return { deviceId, lastSync: timestamp };
  }
}
