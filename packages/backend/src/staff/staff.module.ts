import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffScheduleEntity, StaffPerformanceEntity } from './staff.entity';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffScheduleEntity, StaffPerformanceEntity]),
    UsersModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
