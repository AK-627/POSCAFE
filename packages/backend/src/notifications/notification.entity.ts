import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type NotificationType = 'order_ready' | 'order_new' | 'table_status' | 'low_stock' | 'system' | 'shift_reminder' | 'payment_received';
export type NotificationChannel = 'websocket' | 'push' | 'email';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  recipientId!: string;

  @Column({ type: 'varchar' })
  type!: NotificationType;

  @Column({ type: 'varchar', default: 'normal' })
  priority!: NotificationPriority;

  @Column()
  title!: string;

  @Column()
  message!: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  @Column({ default: false })
  isRead!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt?: Date;

  @Column({ default: false })
  isDismissed!: boolean;

  @Column({ type: 'varchar', default: 'websocket' })
  channel!: NotificationChannel;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('notification_preferences')
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @Column({ default: true })
  orderReady!: boolean;

  @Column({ default: true })
  newOrder!: boolean;

  @Column({ default: true })
  tableStatus!: boolean;

  @Column({ default: true })
  lowStock!: boolean;

  @Column({ default: true })
  systemAlerts!: boolean;

  @Column({ default: true })
  shiftReminders!: boolean;

  @Column({ default: true })
  paymentReceived!: boolean;

  @Column({ default: true })
  soundEnabled!: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
