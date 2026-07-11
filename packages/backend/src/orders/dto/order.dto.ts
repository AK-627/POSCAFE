import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Menu item ID' })
  @IsUUID()
  menuItemId!: string;

  @ApiProperty({ description: 'Quantity ordered', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Special instructions for kitchen' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Table ID to associate with the order' })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({ description: 'Customer ID to associate with the order' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ description: 'Order items', type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: 'General order notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Discount amount to apply' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: ['confirmed', 'preparing', 'ready', 'served', 'cancelled', 'paid'],
    description: 'New order status',
  })
  @IsString()
  @IsNotEmpty()
  status!: 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'paid';

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateOrderItemStatusDto {
  @ApiProperty({
    enum: ['preparing', 'ready', 'served', 'cancelled'],
    description: 'New item preparation status',
  })
  @IsString()
  @IsNotEmpty()
  status!: 'preparing' | 'ready' | 'served' | 'cancelled';
}

export class AddOrderItemsDto {
  @ApiProperty({ description: 'Items to add to the order', type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
