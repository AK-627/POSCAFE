import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../orders/order.entity';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';
import { KitchenGateway } from './kitchen.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity])],
  controllers: [KitchenController],
  providers: [KitchenService, KitchenGateway],
  exports: [KitchenService, KitchenGateway],
})
export class KitchenModule {}
