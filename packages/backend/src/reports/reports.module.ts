import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/order.entity';
import { PaymentEntity } from '../billing/payment.entity';
import { StaffPerformanceEntity } from '../staff/staff.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, PaymentEntity, StaffPerformanceEntity]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
