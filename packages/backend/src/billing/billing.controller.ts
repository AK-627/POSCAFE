import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { ProcessPaymentDto, RefundPaymentDto, EmailInvoiceDto } from './dto/billing.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';
import { PaymentMethod, PaymentStatus } from './payment.entity';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ── Payments ────────────────────────────────────────────────

  @Post('payments')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Process a payment for an order' })
  async processPayment(
    @CurrentUser() user: AuthPayload,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.billingService.processPayment(user.tenantId, user.userId, dto);
  }

  @Get('payments')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List payments with filters' })
  async listPayments(
    @CurrentUser() user: AuthPayload,
    @Query('method') method?: PaymentMethod,
    @Query('status') status?: PaymentStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.billingService.listPayments(user.tenantId, {
      method,
      status,
      limit,
      offset,
    });
  }

  @Get('payments/:paymentId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get payment details' })
  async getPayment(
    @CurrentUser() user: AuthPayload,
    @Param('paymentId') paymentId: string,
  ) {
    return this.billingService.getPayment(user.tenantId, paymentId);
  }

  @Get('payments/order/:orderId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get payments for a specific order' })
  async getPaymentsByOrder(
    @CurrentUser() user: AuthPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.billingService.getPaymentsByOrder(user.tenantId, orderId);
  }

  @Post('payments/:paymentId/refund')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Refund a payment' })
  async refundPayment(
    @CurrentUser() user: AuthPayload,
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.billingService.refundPayment(user.tenantId, paymentId, user.userId, dto);
  }

  // ── Invoices ────────────────────────────────────────────────

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice details' })
  async getInvoice(
    @CurrentUser() user: AuthPayload,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.billingService.getInvoice(user.tenantId, invoiceId);
  }

  @Get('invoices/order/:orderId')
  @ApiOperation({ summary: 'Get invoice for a specific order' })
  async getInvoiceByOrder(
    @CurrentUser() user: AuthPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.billingService.getInvoiceByOrder(user.tenantId, orderId);
  }

  @Post('invoices/:invoiceId/email')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Email an invoice to a customer' })
  async emailInvoice(
    @CurrentUser() user: AuthPayload,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: EmailInvoiceDto,
  ) {
    // In production, this would trigger an actual email send
    return this.billingService.markInvoiceEmailed(
      user.tenantId,
      invoiceId,
      dto.email,
      dto.customerName,
    );
  }

  @Patch('invoices/:invoiceId/void')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Void an invoice' })
  async voidInvoice(
    @CurrentUser() user: AuthPayload,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.billingService.voidInvoice(user.tenantId, invoiceId, user.userId);
  }

  // ── Financial Reports ───────────────────────────────────────

  @Get('summary/daily')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get daily financial summary' })
  async getDailySummary(
    @CurrentUser() user: AuthPayload,
    @Query('date') dateStr?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.billingService.getDailySummary(user.tenantId, date);
  }

  // ── Audit Trail ─────────────────────────────────────────────

  @Get('audit-trail')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get financial audit trail' })
  async getAuditTrail(
    @CurrentUser() user: AuthPayload,
    @Query('orderId') orderId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.billingService.getAuditTrail(user.tenantId, { orderId, limit });
  }
}
