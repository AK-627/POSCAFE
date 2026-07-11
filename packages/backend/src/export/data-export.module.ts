import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/order.entity';
import { PaymentEntity } from '../billing/payment.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { BackupEntity, RestoreRequestEntity } from './backup.entity';
import { DataExportService } from './data-export.service';
import { DataExportController } from './data-export.controller';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    OrderEntity, PaymentEntity, CustomerEntity,
    BackupEntity, RestoreRequestEntity,
  ])],
  controllers: [DataExportController, BackupController],
  providers: [DataExportService, BackupService],
  exports: [DataExportService, BackupService],
})
export class DataExportModule {}
