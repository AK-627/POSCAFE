import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean, IsArray, ArrayUnique, IsUUID } from 'class-validator';

export class CreateMenuItemDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  preparationTime?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  tags?: string[];
}
