import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItemEntity } from './order-item.entity';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'paid';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'uuid', nullable: true })
  tableId?: string;

  @Column({ type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ unique: true })
  orderNumber!: string;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status!: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  subtotalAmount!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  taxAmount!: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  taxRate!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  serviceCharge!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ nullable: true })
  notes?: string;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @Column({ type: 'uuid', nullable: true })
  servedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  servedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @OneToMany(() => OrderItemEntity, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items!: OrderItemEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
