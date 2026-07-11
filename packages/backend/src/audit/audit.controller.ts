import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';
import { AuditCategory } from './audit.entity';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs with filters' })
  async getAuditLogs(
    @CurrentUser() user: AuthPayload,
    @Query('category') category?: AuditCategory,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditService.getAuditLogs(user.tenantId, {
      category,
      userId,
      entityType,
      entityId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit,
      offset,
    });
  }

  @Get('entity-history')
  @ApiOperation({ summary: 'Get change history for a specific entity' })
  async getEntityHistory(
    @CurrentUser() user: AuthPayload,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(user.tenantId, entityType, entityId);
  }
}
