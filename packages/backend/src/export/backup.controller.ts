import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';

@ApiTags('backup')
@ApiBearerAuth()
@Controller('backup')
@Roles(UserRole.OWNER)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @ApiOperation({ summary: 'List available backups' })
  async listBackups(@CurrentUser() user: AuthPayload) {
    return this.backupService.listBackups(user.tenantId);
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a backup' })
  async triggerBackup(@CurrentUser() user: AuthPayload) {
    return this.backupService.createBackup(user.tenantId, user.userId);
  }

  @Post('restore/request')
  @ApiOperation({ summary: 'Request a data restore from a backup' })
  async requestRestore(
    @CurrentUser() user: AuthPayload,
    @Body() body: { backupId: string; reason: string },
  ) {
    return this.backupService.requestRestore(
      user.tenantId,
      body.backupId,
      user.userId,
      body.reason,
    );
  }

  @Patch('restore/:requestId/review')
  @ApiOperation({ summary: 'Approve or reject a restore request' })
  async reviewRestore(
    @CurrentUser() user: AuthPayload,
    @Param('requestId') requestId: string,
    @Body() body: { approve: boolean; rejectionReason?: string },
  ) {
    return this.backupService.approveRestore(
      requestId,
      user.userId,
      body.approve,
      body.rejectionReason,
    );
  }

  @Get('restore/requests')
  @ApiOperation({ summary: 'List restore requests for this tenant' })
  async getRestoreRequests(@CurrentUser() user: AuthPayload) {
    return this.backupService.getRestoreRequests(user.tenantId);
  }
}
