import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { PaymentEntity } from '../billing/payment.entity';
import { CustomerEntity } from '../customers/customer.entity';

export interface ExportOptions {
  tenantId: string;
  from: Date;
  to: Date;
  format?: 'csv' | 'json';
}

export interface BackupManifest {
  tenantId: string;
  createdAt: Date;
  tables: string[];
  recordCounts: Record<string, number>;
  sizeBytes: number;
  encrypted: boolean;
}

@Injectable()
export class DataExportService {

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  // ── CSV Export ──────────────────────────────────────────────

  async exportOrdersCsv(options: ExportOptions): Promise<string> {
    const orders = await this.orderRepository.find({
      where: { tenantId: options.tenantId, createdAt: Between(options.from, options.to) },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });

    const headers = [
      'Order Number', 'Status', 'Table ID', 'Subtotal', 'Tax',
      'Service Charge', 'Discount', 'Total', 'Items Count',
      'Created At', 'Paid At',
    ];

    const rows = orders.map((o) => [
      o.orderNumber,
      o.status,
      o.tableId ?? '',
      Number(o.subtotalAmount).toFixed(2),
      Number(o.taxAmount).toFixed(2),
      Number(o.serviceCharge).toFixed(2),
      Number(o.discountAmount).toFixed(2),
      Number(o.totalAmount).toFixed(2),
      o.items.length.toString(),
      o.createdAt.toISOString(),
      o.paidAt?.toISOString() ?? '',
    ]);

    return this.toCsv(headers, rows);
  }

  async exportPaymentsCsv(options: ExportOptions): Promise<string> {
    const payments = await this.paymentRepository.find({
      where: { tenantId: options.tenantId, createdAt: Between(options.from, options.to) },
      order: { createdAt: 'ASC' },
    });

    const headers = [
      'Payment ID', 'Order ID', 'Method', 'Amount', 'Tip',
      'Change', 'Status', 'Reference', 'Processed At',
    ];

    const rows = payments.map((p) => [
      p.id,
      p.orderId,
      p.paymentMethod,
      Number(p.amount).toFixed(2),
      Number(p.tipAmount).toFixed(2),
      Number(p.changeGiven).toFixed(2),
      p.status,
      p.referenceNumber ?? '',
      p.processedAt?.toISOString() ?? '',
    ]);

    return this.toCsv(headers, rows);
  }

  async exportCustomersCsv(tenantId: string): Promise<string> {
    const customers = await this.customerRepository.find({
      where: { tenantId, isActive: true, dataConsentGiven: true },
      order: { firstName: 'ASC' },
    });

    const headers = [
      'ID', 'First Name', 'Last Name', 'Email', 'Phone',
      'Loyalty Points', 'Total Orders', 'Total Spent', 'Last Order',
    ];

    const rows = customers.map((c) => [
      c.id,
      c.firstName ?? '',
      c.lastName ?? '',
      c.email ?? '',
      c.phoneNumber ?? '',
      c.loyaltyPoints.toString(),
      c.totalOrders.toString(),
      Number(c.totalSpent).toFixed(2),
      c.lastOrderAt?.toISOString() ?? '',
    ]);

    return this.toCsv(headers, rows);
  }

  // ── Tax Report ──────────────────────────────────────────────

  async generateTaxReport(options: ExportOptions): Promise<string> {
    const orders = await this.orderRepository.find({
      where: { tenantId: options.tenantId, createdAt: Between(options.from, options.to), status: 'paid' as any },
      order: { createdAt: 'ASC' },
    });

    const headers = [
      'Period', 'Order Number', 'Subtotal', 'Tax Rate %', 'Tax Amount',
      'Service Charge', 'Total', 'Date',
    ];

    const period = `${options.from.toISOString().split('T')[0]} - ${options.to.toISOString().split('T')[0]}`;

    const rows = orders.map((o) => [
      period,
      o.orderNumber,
      Number(o.subtotalAmount).toFixed(2),
      Number(o.taxRate).toFixed(2),
      Number(o.taxAmount).toFixed(2),
      Number(o.serviceCharge).toFixed(2),
      Number(o.totalAmount).toFixed(2),
      o.createdAt.toISOString().split('T')[0]!,
    ]);

    // Add summary row
    const totalSubtotal = orders.reduce((s, o) => s + Number(o.subtotalAmount), 0);
    const totalTax = orders.reduce((s, o) => s + Number(o.taxAmount), 0);
    const totalServiceCharge = orders.reduce((s, o) => s + Number(o.serviceCharge), 0);
    const totalAmount = orders.reduce((s, o) => s + Number(o.totalAmount), 0);

    rows.push([
      'TOTAL', `${orders.length} orders`,
      totalSubtotal.toFixed(2), '', totalTax.toFixed(2),
      totalServiceCharge.toFixed(2), totalAmount.toFixed(2), '',
    ]);

    return this.toCsv(headers, rows);
  }

  // ── Backup Manifest ─────────────────────────────────────────

  async createBackupManifest(tenantId: string): Promise<BackupManifest> {
    const [orderCount, paymentCount, customerCount] = await Promise.all([
      this.orderRepository.count({ where: { tenantId } }),
      this.paymentRepository.count({ where: { tenantId } }),
      this.customerRepository.count({ where: { tenantId } }),
    ]);

    return {
      tenantId,
      createdAt: new Date(),
      tables: ['orders', 'order_items', 'payments', 'invoices', 'customers', 'menu_items', 'tables'],
      recordCounts: {
        orders: orderCount,
        payments: paymentCount,
        customers: customerCount,
      },
      sizeBytes: 0, // Would be calculated from actual data
      encrypted: true,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────

  private toCsv(headers: string[], rows: string[][]): string {
    const escape = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const lines = [headers.map(escape).join(',')];
    for (const row of rows) {
      lines.push(row.map(escape).join(','));
    }
    return lines.join('\n');
  }
}
