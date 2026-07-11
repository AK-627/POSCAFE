import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type OfflineOperationType = 'create' | 'update' | 'delete';

@Entity('offline_queue')
export class OfflineQueueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column()
  deviceId!: string;

  @Column({ type: 'varchar' })
  operationType!: OfflineOperationType;

  @Column()
  entityType!: string;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'applied' | 'failed' | 'conflict';

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamptz' })
  clientTimestamp!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  receivedAt!: Date;
}
