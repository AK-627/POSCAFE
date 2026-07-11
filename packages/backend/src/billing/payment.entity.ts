import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type PaymentMethod = 'cash' | 'card' | 'digital_wallet' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'varchar' })
  paymentMethod!: PaymentMethod;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tipAmount!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  changeGiven!: number;

  @Column({ nullable: true })
  referenceNumber?: string;

  @Column({ nullable: true })
  transactionId?: string;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status!: PaymentStatus;

  @Column({ type: 'uuid', nullable: true })
  processedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @Column({ nullable: true })
  failureReason?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
