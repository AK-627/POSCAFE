import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AuditCategory = 'auth' | 'order' | 'menu' | 'table' | 'staff' | 'billing' | 'customer' | 'system' | 'config';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  category!: AuditCategory;

  @Column()
  action!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ nullable: true })
  userEmail?: string;

  @Column({ nullable: true })
  entityType?: string;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string;

  @Column({ type: 'jsonb', nullable: true })
  previousState?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newState?: Record<string, any>;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
