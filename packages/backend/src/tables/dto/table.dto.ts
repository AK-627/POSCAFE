import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({ description: 'Table number (e.g. "T1", "A3")' })
  @IsString()
  @IsNotEmpty()
  tableNumber!: string;

  @ApiPropertyOptional({ description: 'Optional display name for the table' })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiProperty({ description: 'Seating capacity', default: 4 })
  @IsNumber()
  @Min(1)
  @Max(50)
  capacity!: number;

  @ApiPropertyOptional({ description: 'X position on floor plan' })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y position on floor plan' })
  @IsOptional()
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional({ description: 'Floor level (e.g. "Ground", "First")' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ description: 'Section (e.g. "Indoor", "Outdoor", "Rooftop")' })
  @IsOptional()
  @IsString()
  section?: string;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  tableName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  capacity?: number;

  @IsOptional()
  @IsNumber()
  positionX?: number;

  @IsOptional()
  @IsNumber()
  positionY?: number;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  section?: string;
}

export class UpdateTableStatusDto {
  @ApiProperty({
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
    description: 'New table status',
  })
  @IsString()
  @IsNotEmpty()
  status!: 'available' | 'occupied' | 'reserved' | 'cleaning';

  @ApiPropertyOptional({ description: 'Associated order ID when occupying' })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class CreateTableGroupDto {
  @ApiProperty({ description: 'Group name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'IDs of tables to group', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  tableIds!: string[];
}

export class UpdateTableGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tableIds?: string[];
}
