import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './payment.entity';
import { InvoiceEntity } from './invoice.entity';
import { FinancialAuditEntity } from './financial-audit.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, InvoiceEntity, FinancialAuditEntity]),
    OrdersModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
