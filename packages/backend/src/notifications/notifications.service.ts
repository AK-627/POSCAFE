import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationType,
  NotificationPriority,
} from './notification.entity';

/** Minimal interface to avoid circular module dependency */
export interface IOrdersQueryService {
  findReadyOrdersOlderThan(minutes: number): Promise<Array<{ id: string; tenantId: string; tableId?: string; createdBy: string }>>;
}

export interface SendNotificationInput {
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
}

// Forward-ref type to avoid circular injection
export interface INotificationsGateway {
  emitToUser(userId: string, notification: NotificationEntity): void;
  emitUnreadCount(userId: string, count: number): void;
}

export const NOTIFICATIONS_GATEWAY = 'NOTIFICATIONS_GATEWAY';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferenceRepository: Repository<NotificationPreferenceEntity>,
    @Optional() @Inject(NOTIFICATIONS_GATEWAY)
    private readonly gateway?: INotificationsGateway,
  ) {}

  // ── Send Notifications ──────────────────────────────────────

  async send(input: SendNotificationInput): Promise<NotificationEntity | null> {
    // Check user preferences
    const allowed = await this.isNotificationAllowed(input.recipientId, input.type);
    if (!allowed) {
      this.logger.debug(`Notification ${input.type} suppressed for user ${input.recipientId} (preference)`);
      return null;
    }

    const notification = this.notificationRepository.create({
      tenantId: input.tenantId,
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      priority: input.priority ?? 'normal',
      data: input.data,
      channel: 'websocket',
    });

    const saved = await this.notificationRepository.save(notification);
    this.logger.log(`Notification sent: ${input.type} → user ${input.recipientId}`);

    // Push to WebSocket if gateway is available
    if (this.gateway) {
      this.gateway.emitToUser(input.recipientId, saved);

      // Update unread count for the user
      const unreadCount = await this.notificationRepository.count({
        where: {
          tenantId: input.tenantId,
          recipientId: input.recipientId,
          isRead: false,
          isDismissed: false,
        },
      });
      this.gateway.emitUnreadCount(input.recipientId, unreadCount);
    }

    return saved;
  }

  async sendToRole(
    tenantId: string,
    recipientIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<NotificationEntity[]> {
    const notifications: NotificationEntity[] = [];
    for (const recipientId of recipientIds) {
      const notif = await this.send({ tenantId, recipientId, type, title, message, data });
      if (notif) notifications.push(notif);
    }
    return notifications;
  }

  // ── Read / Dismiss ──────────────────────────────────────────

  async getUserNotifications(
    tenantId: string,
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number },
  ): Promise<{ notifications: NotificationEntity[]; total: number; unreadCount: number }> {
    const where: any = { tenantId, recipientId: userId, isDismissed: false };
    if (options?.unreadOnly) where.isRead = false;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { tenantId, recipientId: userId, isRead: false, isDismissed: false },
    });

    return { notifications, total, unreadCount };
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string): Promise<NotificationEntity> {
    const notif = await this.notificationRepository.findOne({
      where: { id: notificationId, tenantId, recipientId: userId },
    });
    if (!notif) throw new Error('Notification not found');

    notif.isRead = true;
    notif.readAt = new Date();
    return this.notificationRepository.save(notif);
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { tenantId, recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return result.affected ?? 0;
  }

  async dismiss(tenantId: string, userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, tenantId, recipientId: userId },
      { isDismissed: true },
    );
  }

  // ── Preferences ─────────────────────────────────────────────

  async getPreferences(tenantId: string, userId: string): Promise<NotificationPreferenceEntity> {
    let prefs = await this.preferenceRepository.findOne({
      where: { tenantId, userId },
    });

    if (!prefs) {
      prefs = this.preferenceRepository.create({ tenantId, userId });
      prefs = await this.preferenceRepository.save(prefs);
    }

    return prefs;
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    updates: Partial<Omit<NotificationPreferenceEntity, 'id' | 'tenantId' | 'userId' | 'updatedAt'>>,
  ): Promise<NotificationPreferenceEntity> {
    let prefs = await this.getPreferences(tenantId, userId);
    Object.assign(prefs, updates);
    return this.preferenceRepository.save(prefs);
  }

  private async isNotificationAllowed(userId: string, type: NotificationType): Promise<boolean> {
    const prefs = await this.preferenceRepository.findOne({ where: { userId } });
    if (!prefs) return true; // Default: all allowed

    const typeMap: Record<NotificationType, keyof NotificationPreferenceEntity> = {
      order_ready: 'orderReady',
      order_new: 'newOrder',
      table_status: 'tableStatus',
      low_stock: 'lowStock',
      system: 'systemAlerts',
      shift_reminder: 'shiftReminders',
      payment_received: 'paymentReceived',
    };

    const prefKey = typeMap[type];
    return prefKey ? Boolean(prefs[prefKey]) : true;
  }

  // ── Timed Triggers ──────────────────────────────────────────

  /**
   * Scheduled job: check for orders in 'ready' status for more than 5 minutes
   * and send reminder notifications to the waiter who created the order.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkOverdueReadyOrders(): Promise<void> {
    try {
      this.logger.debug('Checking for overdue ready orders...');

      // Find orders that have been 'ready' for more than 5 minutes.
      // We query directly from the orders table using a raw query to avoid
      // circular dependency injection with OrdersService.
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const overdueOrders: Array<{
        id: string;
        tenant_id: string;
        created_by: string;
        table_id?: string;
        order_number: string;
      }> = await this.notificationRepository.manager.query(`
        SELECT id, tenant_id, created_by, table_id, order_number
        FROM orders
        WHERE status = 'ready'
          AND updated_at <= $1
      `, [fiveMinutesAgo]);

      for (const order of overdueOrders) {
        // Avoid duplicate notifications: check if we already sent one in the last 10 min
        const recentNotif = await this.notificationRepository.findOne({
          where: {
            tenantId: order.tenant_id,
            recipientId: order.created_by,
            type: 'order_ready',
          },
          order: { createdAt: 'DESC' },
        });

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (recentNotif && recentNotif.createdAt > tenMinutesAgo) {
          continue; // Already notified recently
        }

        await this.send({
          tenantId: order.tenant_id,
          recipientId: order.created_by,
          type: 'order_ready',
          title: 'Order Ready — Awaiting Collection',
          message: `Order #${order.order_number} has been ready for over 5 minutes.`,
          priority: 'high',
          data: { orderId: order.id, tableId: order.table_id },
        });
      }
    } catch (error) {
      this.logger.error('Error in checkOverdueReadyOrders', error);
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.notificationRepository.delete({
      isDismissed: true,
      createdAt: LessThan(thirtyDaysAgo),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} old dismissed notifications`);
    }
  }
}
