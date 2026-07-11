import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('staff_schedules')
export class StaffScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({ nullable: true })
  shiftType?: string; // 'morning', 'afternoon', 'evening', 'night'

  @Column({ nullable: true })
  notes?: string;

  @Column({ default: false })
  isClockedIn!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  clockedInAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  clockedOutAt?: Date;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  hoursWorked!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('staff_performance')
export class StaffPerformanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'int', default: 0 })
  ordersHandled!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  revenueGenerated!: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  averageOrderTime!: number; // minutes

  @Column({ type: 'int', default: 0 })
  itemsPrepared!: number;

  @Column('decimal', { precision: 3, scale: 2, default: 5 })
  rating!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
