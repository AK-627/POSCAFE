import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PrinterEntity,
  PrintJobEntity,
  PrinterType,
  PrintDocType,
} from './printer.entity';

export interface PrintContent {
  documentType: PrintDocType;
  content: string;
  printerType?: PrinterType;
  printerId?: string;
}

export interface PrintPreview {
  documentType: PrintDocType;
  content: string;
  printerName: string;
  paperWidth: number;
  estimatedLines: number;
}

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  constructor(
    @InjectRepository(PrinterEntity)
    private readonly printerRepository: Repository<PrinterEntity>,
    @InjectRepository(PrintJobEntity)
    private readonly printJobRepository: Repository<PrintJobEntity>,
  ) {}

  // ── Printer Configuration ──────────────────────────────────

  async addPrinter(
    tenantId: string,
    branchId: string,
    config: Partial<PrinterEntity>,
  ): Promise<PrinterEntity> {
    const printer = this.printerRepository.create({
      tenantId,
      branchId,
      ...config,
    });
    return this.printerRepository.save(printer);
  }

  async updatePrinter(
    tenantId: string,
    printerId: string,
    updates: Partial<Pick<PrinterEntity, 'name' | 'ipAddress' | 'port' | 'isOnline' | 'isDefault' | 'paperWidth'>>,
  ): Promise<PrinterEntity> {
    const printer = await this.getPrinter(tenantId, printerId);
    Object.assign(printer, updates);
    return this.printerRepository.save(printer);
  }

  async getPrinter(tenantId: string, printerId: string): Promise<PrinterEntity> {
    const printer = await this.printerRepository.findOne({
      where: { id: printerId, tenantId },
    });
    if (!printer) throw new NotFoundException('Printer not found');
    return printer;
  }

  async listPrinters(tenantId: string, branchId?: string): Promise<PrinterEntity[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.printerRepository.find({ where, order: { name: 'ASC' } });
  }

  async deletePrinter(tenantId: string, printerId: string): Promise<{ deleted: boolean }> {
    const printer = await this.getPrinter(tenantId, printerId);
    await this.printerRepository.remove(printer);
    return { deleted: true };
  }

  // ── Print Queue ─────────────────────────────────────────────

  async print(tenantId: string, branchId: string, input: PrintContent): Promise<PrintJobEntity> {
    let printer: PrinterEntity | null = null;

    if (input.printerId) {
      printer = await this.getPrinter(tenantId, input.printerId);
    } else {
      // Find default printer for the type
      const printerType = input.printerType ?? this.getDefaultPrinterType(input.documentType);
      printer = await this.printerRepository.findOne({
        where: { tenantId, branchId, printerType, isDefault: true, isOnline: true },
      });
    }

    if (!printer) {
      throw new BadRequestException('No suitable printer found');
    }

    const job = this.printJobRepository.create({
      tenantId,
      printerId: printer.id,
      documentType: input.documentType,
      content: input.content,
      status: 'queued',
    });

    const saved = await this.printJobRepository.save(job);
    this.logger.log(`Print job ${saved.id} queued for printer ${printer.name}`);
    return saved;
  }

  async getJobStatus(tenantId: string, jobId: string): Promise<PrintJobEntity> {
    const job = await this.printJobRepository.findOne({
      where: { id: jobId, tenantId },
    });
    if (!job) throw new NotFoundException('Print job not found');
    return job;
  }

  async getQueue(tenantId: string, printerId?: string): Promise<PrintJobEntity[]> {
    const where: any = { tenantId, status: 'queued' };
    if (printerId) where.printerId = printerId;

    return this.printJobRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async cancelJob(tenantId: string, jobId: string): Promise<PrintJobEntity> {
    const job = await this.getJobStatus(tenantId, jobId);
    if (job.status !== 'queued') {
      throw new BadRequestException('Can only cancel queued jobs');
    }
    job.status = 'cancelled';
    return this.printJobRepository.save(job);
  }

  // ── Print Preview ───────────────────────────────────────────

  async getPreview(tenantId: string, branchId: string, input: PrintContent): Promise<PrintPreview> {
    const printerType = input.printerType ?? this.getDefaultPrinterType(input.documentType);
    const printer = await this.printerRepository.findOne({
      where: { tenantId, branchId, printerType, isDefault: true },
    });

    const paperWidth = printer?.paperWidth ?? 80;
    const estimatedLines = input.content.split('\n').length;

    return {
      documentType: input.documentType,
      content: input.content,
      printerName: printer?.name ?? 'No printer configured',
      paperWidth,
      estimatedLines,
    };
  }

  // ── Kitchen Ticket Generator ────────────────────────────────

  generateKitchenTicket(order: {
    orderNumber: string;
    tableId?: string;
    items: Array<{ menuItemName: string; quantity: number; specialInstructions?: string }>;
    notes?: string;
    createdAt: Date;
  }): string {
    const lines: string[] = [];
    lines.push('================================');
    lines.push('        KITCHEN TICKET          ');
    lines.push('================================');
    lines.push(`Order: ${order.orderNumber}`);
    if (order.tableId) lines.push(`Table: ${order.tableId}`);
    lines.push(`Time: ${order.createdAt.toLocaleTimeString()}`);
    lines.push('--------------------------------');

    for (const item of order.items) {
      lines.push(`${item.quantity}x ${item.menuItemName}`);
      if (item.specialInstructions) {
        lines.push(`   >> ${item.specialInstructions}`);
      }
    }

    if (order.notes) {
      lines.push('--------------------------------');
      lines.push(`NOTE: ${order.notes}`);
    }

    lines.push('================================');
    return lines.join('\n');
  }

  generateReceipt(order: {
    orderNumber: string;
    items: Array<{ menuItemName: string; quantity: number; totalPrice: number }>;
    subtotal: number;
    tax: number;
    serviceCharge: number;
    discount: number;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    change: number;
  }): string {
    const lines: string[] = [];
    lines.push('================================');
    lines.push('        SKY NETHER CAFE         ');
    lines.push('================================');
    lines.push(`Order: ${order.orderNumber}`);
    lines.push(`Date: ${new Date().toLocaleString()}`);
    lines.push('--------------------------------');

    for (const item of order.items) {
      const price = Number(item.totalPrice).toFixed(2);
      lines.push(`${item.quantity}x ${item.menuItemName}`);
      lines.push(`${' '.repeat(24)}${price.padStart(8)}`);
    }

    lines.push('--------------------------------');
    lines.push(`Subtotal:${' '.repeat(15)}${order.subtotal.toFixed(2).padStart(8)}`);
    if (order.tax > 0) lines.push(`Tax:${' '.repeat(20)}${order.tax.toFixed(2).padStart(8)}`);
    if (order.serviceCharge > 0) lines.push(`Service:${' '.repeat(16)}${order.serviceCharge.toFixed(2).padStart(8)}`);
    if (order.discount > 0) lines.push(`Discount:${' '.repeat(15)}-${order.discount.toFixed(2).padStart(7)}`);
    lines.push('================================');
    lines.push(`TOTAL:${' '.repeat(18)}${order.total.toFixed(2).padStart(8)}`);
    lines.push('================================');
    lines.push(`Paid (${order.paymentMethod}):${' '.repeat(10)}${order.amountPaid.toFixed(2).padStart(8)}`);
    if (order.change > 0) lines.push(`Change:${' '.repeat(17)}${order.change.toFixed(2).padStart(8)}`);
    lines.push('');
    lines.push('     Thank you for dining!      ');
    lines.push('================================');
    return lines.join('\n');
  }

  // ── Retry Failed Jobs ──────────────────────────────────────

  @Cron(CronExpression.EVERY_30_SECONDS)
  async retryFailedJobs(): Promise<void> {
    const failedJobs = await this.printJobRepository
      .createQueryBuilder('j')
      .where('j.status = :status', { status: 'failed' })
      .andWhere('j.retryCount < j.maxRetries')
      .getMany();

    for (const job of failedJobs) {
      job.status = 'queued';
      job.retryCount += 1;
      await this.printJobRepository.save(job);
      this.logger.log(`Retrying print job ${job.id} (attempt ${job.retryCount}/${job.maxRetries})`);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────

  private getDefaultPrinterType(docType: PrintDocType): PrinterType {
    switch (docType) {
      case 'kitchen_ticket': return 'kitchen';
      case 'receipt':
      case 'invoice': return 'receipt';
      case 'daily_report': return 'receipt';
    }
  }
}
