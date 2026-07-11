import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Notes about the customer' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Data consent given', default: false })
  @IsOptional()
  @IsBoolean()
  dataConsentGiven?: boolean;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLoyaltyPointsDto {
  @ApiProperty({ description: 'Points to add (positive) or deduct (negative)' })
  @IsNumber()
  points!: number;

  @ApiProperty({ description: 'Reason for the loyalty points change' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class SearchCustomersDto {
  @ApiPropertyOptional({ description: 'Search by name, email, or phone' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Minimum loyalty points' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLoyaltyPoints?: number;

  @ApiPropertyOptional({ description: 'Minimum total orders' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrders?: number;
}
