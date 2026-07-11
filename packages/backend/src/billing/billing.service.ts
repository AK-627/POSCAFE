import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PaymentEntity, PaymentMethod, PaymentStatus } from './payment.entity';
import { InvoiceEntity } from './invoice.entity';
import { FinancialAuditEntity, AuditAction } from './financial-audit.entity';
import { OrdersService } from '../orders/orders.service';
import { ProcessPaymentDto, RefundPaymentDto } from './dto/billing.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private invoiceCounter = 0;

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    @InjectRepository(FinancialAuditEntity)
    private readonly auditRepository: Repository<FinancialAuditEntity>,
    private readonly ordersService: OrdersService,
  ) {}

  // ── Payment Processing ──────────────────────────────────────

  async processPayment(
    tenantId: string,
    userId: string,
    dto: ProcessPaymentDto,
  ): Promise<{ payment: PaymentEntity; invoice: InvoiceEntity }> {
    const order = await this.ordersService.getOrder(tenantId, dto.orderId);

    // Verify order is in a payable state
    if (order.status !== 'served') {
      throw new BadRequestException(
        `Order must be in "served" status to process payment. Current: ${order.status}`,
      );
    }

    // Check for existing completed payment
    const existingPayment = await this.paymentRepository.findOne({
      where: { orderId: dto.orderId, tenantId, status: 'completed' },
    });
    if (existingPayment) {
      throw new BadRequestException('Payment already processed for this order');
    }

    // Validate payment amount
    const expectedAmount = Number(order.totalAmount);
    const tipAmount = dto.tipAmount ?? 0;
    const totalWithTip = expectedAmount + tipAmount;

    if (dto.amount < expectedAmount) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) is less than order total (${expectedAmount})`,
      );
    }

    // Calculate change for cash payments
    const changeGiven = dto.paymentMethod === 'cash' ? Math.max(0, dto.amount - totalWithTip) : 0;

    // Create payment record
    const payment = this.paymentRepository.create({
      tenantId,
      orderId: dto.orderId,
      paymentMethod: dto.paymentMethod,
      amount: expectedAmount,
      tipAmount,
      changeGiven,
      referenceNumber: dto.referenceNumber,
      status: 'completed', // For MVP, payments complete immediately
      processedBy: userId,
      processedAt: new Date(),
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Update order status to paid
    await this.ordersService.updateOrderStatus(tenantId, dto.orderId, userId, {
      status: 'paid',
    });

    // Generate invoice
    const invoice = await this.generateInvoice(tenantId, order.id, savedPayment.id, order);

    // Audit trail
    await this.createAuditEntry(tenantId, 'payment_completed', userId, {
      orderId: dto.orderId,
      paymentId: savedPayment.id,
      invoiceId: invoice.id,
      amount: expectedAmount,
      description: `Payment of ${expectedAmount} via ${dto.paymentMethod} for order ${order.orderNumber}`,
      metadata: {
        paymentMethod: dto.paymentMethod,
        tipAmount,
        changeGiven,
        referenceNumber: dto.referenceNumber,
      },
    });

    this.logger.log(
      `Payment ${savedPayment.id} completed for order ${order.orderNumber} — ${dto.paymentMethod}`,
    );

    return { payment: savedPayment, invoice };
  }

  async refundPayment(
    tenantId: string,
    paymentId: string,
    userId: string,
    dto: RefundPaymentDto,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new BadRequestException('Can only refund completed payments');
    }

    const refundAmount = dto.amount ?? Number(payment.amount);
    if (refundAmount > Number(payment.amount)) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    payment.status = 'refunded';
    const saved = await this.paymentRepository.save(payment);

    await this.createAuditEntry(tenantId, 'payment_refunded', userId, {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: refundAmount,
      description: `Refund of ${refundAmount}: ${dto.reason}`,
      metadata: { reason: dto.reason, refundAmount },
    });

    this.logger.log(`Payment ${paymentId} refunded: ${dto.reason}`);
    return saved;
  }

  async getPayment(tenantId: string, paymentId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async getPaymentsByOrder(tenantId: string, orderId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      where: { orderId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async listPayments(
    tenantId: string,
    options?: {
      from?: Date;
      to?: Date;
      method?: PaymentMethod;
      status?: PaymentStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ payments: PaymentEntity[]; total: number }> {
    const where: any = { tenantId };
    if (options?.method) where.paymentMethod = options.method;
    if (options?.status) where.status = options.status;
    if (options?.from && options?.to) {
      where.createdAt = Between(options.from, options.to);
    }

    const [payments, total] = await this.paymentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return { payments, total };
  }

  // ── Invoice Management ──────────────────────────────────────

  private async generateInvoice(
    tenantId: string,
    orderId: string,
    paymentId: string,
    order: any,
  ): Promise<InvoiceEntity> {
    const invoiceNumber = this.generateInvoiceNumber();

    const invoice = this.invoiceRepository.create({
      tenantId,
      orderId,
      paymentId,
      invoiceNumber,
      status: 'issued',
      subtotal: Number(order.subtotalAmount),
      taxAmount: Number(order.taxAmount),
      serviceCharge: Number(order.serviceCharge),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
    });

    return this.invoiceRepository.save(invoice);
  }

  async getInvoice(tenantId: string, invoiceId: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async getInvoiceByOrder(tenantId: string, orderId: string): Promise<InvoiceEntity | null> {
    return this.invoiceRepository.findOne({
      where: { orderId, tenantId },
    });
  }

  async markInvoiceEmailed(
    tenantId: string,
    invoiceId: string,
    email: string,
    customerName?: string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.getInvoice(tenantId, invoiceId);
    invoice.status = 'emailed';
    invoice.emailedTo = email;
    invoice.emailedAt = new Date();
    if (customerName) invoice.customerName = customerName;
    invoice.customerEmail = email;
    return this.invoiceRepository.save(invoice);
  }

  async voidInvoice(
    tenantId: string,
    invoiceId: string,
    userId: string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.getInvoice(tenantId, invoiceId);
    invoice.status = 'void';
    const saved = await this.invoiceRepository.save(invoice);

    await this.createAuditEntry(tenantId, 'invoice_voided', userId, {
      invoiceId,
      description: `Invoice ${invoice.invoiceNumber} voided`,
    });

    return saved;
  }

  // ── Audit Trail ─────────────────────────────────────────────

  async getAuditTrail(
    tenantId: string,
    options?: {
      orderId?: string;
      action?: AuditAction;
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<FinancialAuditEntity[]> {
    const where: any = { tenantId };
    if (options?.orderId) where.orderId = options.orderId;
    if (options?.action) where.action = options.action;
    if (options?.from && options?.to) {
      where.createdAt = Between(options.from, options.to);
    }

    return this.auditRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 100,
    });
  }

  private async createAuditEntry(
    tenantId: string,
    action: AuditAction,
    performedBy: string,
    data: {
      orderId?: string;
      paymentId?: string;
      invoiceId?: string;
      amount?: number;
      description?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<FinancialAuditEntity> {
    const entry = this.auditRepository.create({
      tenantId,
      action,
      performedBy,
      ...data,
    });
    return this.auditRepository.save(entry);
  }

  // ── Financial Summary ───────────────────────────────────────

  async getDailySummary(
    tenantId: string,
    date: Date,
  ): Promise<{
    totalRevenue: number;
    totalPayments: number;
    totalRefunds: number;
    paymentsByMethod: Record<string, { count: number; total: number }>;
    totalTips: number;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const payments = await this.paymentRepository.find({
      where: {
        tenantId,
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    const completed = payments.filter((p) => p.status === 'completed');
    const refunded = payments.filter((p) => p.status === 'refunded');

    const paymentsByMethod: Record<string, { count: number; total: number }> = {};
    for (const payment of completed) {
      const method = payment.paymentMethod;
      if (!paymentsByMethod[method]) {
        paymentsByMethod[method] = { count: 0, total: 0 };
      }
      paymentsByMethod[method].count++;
      paymentsByMethod[method].total += Number(payment.amount);
    }

    return {
      totalRevenue: completed.reduce((sum, p) => sum + Number(p.amount), 0),
      totalPayments: completed.length,
      totalRefunds: refunded.reduce((sum, p) => sum + Number(p.amount), 0),
      paymentsByMethod,
      totalTips: completed.reduce((sum, p) => sum + Number(p.tipAmount), 0),
    };
  }

  private generateInvoiceNumber(): string {
    this.invoiceCounter++;
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const seq = String(this.invoiceCounter).padStart(4, '0');
    return `INV-${dateStr}-${seq}`;
  }
}
