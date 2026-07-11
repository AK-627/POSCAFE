import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type BackupStatus = 'pending' | 'completed' | 'failed';
export type RestoreStatus = 'pending_approval' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';

@Entity('backups')
export class BackupEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', default: 'pending' })
  status!: BackupStatus;

  /** Storage path / URL for the backup file */
  @Column({ nullable: true })
  storageKey?: string;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes!: number;

  @Column({ type: 'jsonb', nullable: true })
  manifest?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isEncrypted!: boolean;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ nullable: true })
  triggeredBy?: string; // 'scheduled' | userId

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('restore_requests')
export class RestoreRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  backupId!: string;

  @Column({ type: 'uuid' })
  requestedBy!: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ type: 'varchar', default: 'pending_approval' })
  status!: RestoreStatus;

  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
