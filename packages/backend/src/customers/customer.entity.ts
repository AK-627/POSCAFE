import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customers')
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ type: 'int', default: 0 })
  loyaltyPoints!: number;

  @Column({ type: 'int', default: 0 })
  totalOrders!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalSpent!: number;

  @Column({ nullable: true })
  notes?: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastOrderAt?: Date;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  dataConsentGiven!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  dataConsentAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
