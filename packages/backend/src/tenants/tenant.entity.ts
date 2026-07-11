import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  logoUrl?: string;

  @Column({ default: 'UTC' })
  timezone!: string;

  @Column({ default: 'USD' })
  currency!: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  taxRate!: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  serviceCharge!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: {} })
  settings!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
