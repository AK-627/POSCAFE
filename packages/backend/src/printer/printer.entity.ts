import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type PrinterType = 'kitchen' | 'bar' | 'receipt' | 'label';
export type PrintJobStatus = 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled';
export type PrintDocType = 'kitchen_ticket' | 'receipt' | 'invoice' | 'daily_report';

@Entity('printers')
export class PrinterEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar' })
  printerType!: PrinterType;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  port?: string;

  @Column({ default: true })
  isOnline!: boolean;

  @Column({ default: true })
  isDefault!: boolean;

  @Column({ type: 'int', default: 80 })
  paperWidth!: number; // mm

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('print_jobs')
export class PrintJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  printerId!: string;

  @Column({ type: 'varchar' })
  documentType!: PrintDocType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', default: 'queued' })
  status!: PrintJobStatus;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'int', default: 3 })
  maxRetries!: number;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ type: 'timestamptz', nullable: true })
  printedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
