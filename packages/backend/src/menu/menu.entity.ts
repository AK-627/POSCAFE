import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cost?: number;

  @Column({ type: 'int', nullable: true })
  preparationTime?: number;

  @Column({ default: true })
  isAvailable!: boolean;

  @Column({ default: 0 })
  displayOrder!: number;

  @Column('simple-array', { default: '' })
  tags!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
