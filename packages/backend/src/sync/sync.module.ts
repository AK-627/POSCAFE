import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncMetadataEntity, SyncOperationEntity } from './sync.entity';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncGateway } from './sync.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([SyncMetadataEntity, SyncOperationEntity])],
  controllers: [SyncController],
  providers: [SyncService, SyncGateway],
  exports: [SyncService, SyncGateway],
})
export class SyncModule {}
