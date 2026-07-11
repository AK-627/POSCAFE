import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type InvoiceStatus = 'draft' | 'issued' | 'emailed' | 'void';

@Entity('invoices')
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;

  @Column({ unique: true })
  invoiceNumber!: string;

  @Column({
    type: 'varchar',
    default: 'draft',
  })
  status!: InvoiceStatus;

  // Snapshot of order financials at invoice time
  @Column('decimal', { precision: 10, scale: 2 })
  subtotal!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  taxAmount!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  serviceCharge!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  discountAmount!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ nullable: true })
  pdfUrl?: string;

  @Column({ nullable: true })
  emailedTo?: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailedAt?: Date;

  @Column({ nullable: true })
  customerName?: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
