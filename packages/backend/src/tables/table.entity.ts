import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

@Entity('tables')
export class TableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column()
  tableNumber!: string;

  @Column({ nullable: true })
  tableName?: string;

  @Column({ type: 'int', default: 4 })
  capacity!: number;

  @Column({ type: 'float', nullable: true })
  positionX?: number;

  @Column({ type: 'float', nullable: true })
  positionY?: number;

  @Column({
    type: 'varchar',
    default: 'available',
  })
  status!: TableStatus;

  @Column({ type: 'uuid', nullable: true })
  currentOrderId?: string;

  @Column({ type: 'uuid', nullable: true })
  groupId?: string;

  @Column({ nullable: true })
  floor?: string;

  @Column({ nullable: true })
  section?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
