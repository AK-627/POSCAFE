import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';

export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'uuid' })
  menuItemId!: string;

  @Column()
  menuItemName!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({ nullable: true })
  specialInstructions?: string;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status!: OrderItemStatus;

  @Column({ type: 'uuid', nullable: true })
  preparedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  preparedAt?: Date;

  @ManyToOne(() => OrderEntity, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order!: OrderEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
