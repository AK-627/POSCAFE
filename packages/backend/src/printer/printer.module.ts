import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrinterEntity, PrintJobEntity } from './printer.entity';
import { PrinterService } from './printer.service';
import { PrinterController } from './printer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PrinterEntity, PrintJobEntity])],
  controllers: [PrinterController],
  providers: [PrinterService],
  exports: [PrinterService],
})
export class PrinterModule {}
