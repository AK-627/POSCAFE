import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfflineQueueEntity } from './offline-queue.entity';
import { OfflineService } from './offline.service';
import { OfflineController } from './offline.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OfflineQueueEntity])],
  controllers: [OfflineController],
  providers: [OfflineService],
  exports: [OfflineService],
})
export class OfflineModule {}
