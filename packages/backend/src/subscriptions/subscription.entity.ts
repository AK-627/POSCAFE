import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'annual';

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  tenantId!: string;

  @Column({ type: 'varchar' })
  plan!: SubscriptionPlan;

  @Column({ type: 'varchar', default: 'trial' })
  status!: SubscriptionStatus;

  @Column({ type: 'varchar', default: 'monthly' })
  billingCycle!: BillingCycle;

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerMonth!: number;

  @Column({ type: 'int', default: 1 })
  maxLocations!: number;

  @Column({ type: 'int', default: 5 })
  maxUsers!: number;

  @Column({ type: 'timestamptz' })
  currentPeriodStart!: Date;

  @Column({ type: 'timestamptz' })
  currentPeriodEnd!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  trialEndsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column({ nullable: true })
  stripeSubscriptionId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('subscription_invoices')
export class SubscriptionInvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  subscriptionId!: string;

  @Column({ unique: true })
  invoiceNumber!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'paid' | 'failed' | 'void';

  @Column({ type: 'timestamptz' })
  periodStart!: Date;

  @Column({ type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ nullable: true })
  stripeInvoiceId?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
