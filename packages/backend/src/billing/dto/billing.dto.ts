import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEmail,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Order ID to process payment for' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({
    enum: ['cash', 'card', 'digital_wallet', 'bank_transfer'],
    description: 'Payment method',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod!: 'cash' | 'card' | 'digital_wallet' | 'bank_transfer';

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ description: 'Tip amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @ApiPropertyOptional({ description: 'Reference number for card/digital payments' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

export class RefundPaymentDto {
  @ApiProperty({ description: 'Reason for refund' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ description: 'Partial refund amount (defaults to full amount)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class EmailInvoiceDto {
  @ApiProperty({ description: 'Email address to send invoice to' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Customer name for the invoice' })
  @IsOptional()
  @IsString()
  customerName?: string;
}
