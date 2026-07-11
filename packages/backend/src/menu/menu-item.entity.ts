import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('menu_items')
export class MenuItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('numeric', { precision: 10, scale: 2 })
  price!: number;

  @Column('numeric', { precision: 10, scale: 2, nullable: true })
  cost?: number;

  @Column({ type: 'int', nullable: true })
  preparationTime?: number;

  @Column({ default: true })
  isAvailable!: boolean;

  @Column({ default: 0 })
  displayOrder!: number;

  @Column('text', { array: true, default: [] })
  tags!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
