import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { NotificationEntity } from './notification.entity';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Notification client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Notification client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinNotifications')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; userId: string },
  ) {
    const room = `notif:${data.userId}`;
    await client.join(room);

    // Send unread count on join
    const { unreadCount } = await this.notificationsService.getUserNotifications(
      data.tenantId,
      data.userId,
      { unreadOnly: true, limit: 1 },
    );
    client.emit('unreadCount', { count: unreadCount });
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; userId: string; notificationId: string },
  ) {
    await this.notificationsService.markAsRead(data.tenantId, data.userId, data.notificationId);
    client.emit('notificationRead', { notificationId: data.notificationId });
  }

  /**
   * Push a notification to a specific user via WebSocket.
   */
  emitToUser(userId: string, notification: NotificationEntity) {
    const room = `notif:${userId}`;
    this.server.to(room).emit('notification', notification);
  }

  /**
   * Push updated unread count to a user.
   */
  emitUnreadCount(userId: string, count: number) {
    const room = `notif:${userId}`;
    this.server.to(room).emit('unreadCount', { count });
  }
}
