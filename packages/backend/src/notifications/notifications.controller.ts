import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '@skynether/shared/types/user';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for the current user' })
  async getNotifications(
    @CurrentUser() user: AuthPayload,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationsService.getUserNotifications(user.tenantId, user.userId, {
      unreadOnly: unreadOnly === 'true',
      limit,
      offset,
    });
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthPayload,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(user.tenantId, user.userId, notificationId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: AuthPayload) {
    const count = await this.notificationsService.markAllAsRead(user.tenantId, user.userId);
    return { markedRead: count };
  }

  @Patch(':notificationId/dismiss')
  @ApiOperation({ summary: 'Dismiss a notification' })
  async dismiss(
    @CurrentUser() user: AuthPayload,
    @Param('notificationId') notificationId: string,
  ) {
    await this.notificationsService.dismiss(user.tenantId, user.userId, notificationId);
    return { dismissed: true };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser() user: AuthPayload) {
    return this.notificationsService.getPreferences(user.tenantId, user.userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthPayload,
    @Body() updates: Record<string, boolean>,
  ) {
    return this.notificationsService.updatePreferences(user.tenantId, user.userId, updates);
  }
}
