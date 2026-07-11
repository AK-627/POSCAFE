import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity, NotificationPreferenceEntity } from './notification.entity';
import { NotificationsService, NOTIFICATIONS_GATEWAY } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, NotificationPreferenceEntity])],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    {
      provide: NOTIFICATIONS_GATEWAY,
      useExisting: NotificationsGateway,
    },
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
