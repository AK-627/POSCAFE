import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SyncStatus = 'pending' | 'synced' | 'conflict';
export type SyncEntityType = 'order' | 'menu_item' | 'table' | 'customer' | 'payment';
export type SyncOperationType = 'create' | 'update' | 'delete';

@Entity('sync_metadata')
export class SyncMetadataEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  entityType!: SyncEntityType;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', default: 'pending' })
  syncStatus!: SyncStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ type: 'timestamptz' })
  lastModifiedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('sync_operations')
export class SyncOperationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  operationType!: SyncOperationType;

  @Column({ type: 'varchar' })
  entityType!: SyncEntityType;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'jsonb' })
  data!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  previousData?: Record<string, any>;

  @Column()
  deviceId!: string;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'applied' | 'rejected' | 'conflict';

  @Column({ nullable: true })
  conflictResolution?: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
