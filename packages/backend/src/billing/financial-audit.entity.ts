import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AuditAction =
  | 'payment_created'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_refunded'
  | 'invoice_issued'
  | 'invoice_emailed'
  | 'invoice_voided'
  | 'discount_applied'
  | 'price_override';

@Entity('financial_audit_log')
export class FinancialAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  action!: AuditAction;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string;

  @Column({ type: 'uuid', nullable: true })
  invoiceId?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amount?: number;

  @Column({ type: 'uuid' })
  performedBy!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
