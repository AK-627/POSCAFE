import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionEntity, SubscriptionInvoiceEntity } from './subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionAccessGuard } from './subscription-access.guard';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity, SubscriptionInvoiceEntity])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionAccessGuard],
  exports: [SubscriptionsService, SubscriptionAccessGuard],
})
export class SubscriptionsModule {}
