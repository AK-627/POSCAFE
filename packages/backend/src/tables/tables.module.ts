import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableEntity } from './table.entity';
import { TableGroupEntity } from './table-group.entity';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { TablesGateway } from './tables.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([TableEntity, TableGroupEntity])],
  controllers: [TablesController],
  providers: [TablesService, TablesGateway],
  exports: [TablesService, TablesGateway],
})
export class TablesModule {}
