import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TableEntity, TableStatus } from './table.entity';
import { TableGroupEntity } from './table-group.entity';
import {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStatusDto,
  CreateTableGroupDto,
} from './dto/table.dto';

// Valid status transitions
const VALID_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  available: ['occupied', 'reserved', 'cleaning'],
  occupied: ['cleaning', 'available'],
  reserved: ['occupied', 'available'],
  cleaning: ['available'],
};

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    @InjectRepository(TableEntity)
    private readonly tableRepository: Repository<TableEntity>,
    @InjectRepository(TableGroupEntity)
    private readonly groupRepository: Repository<TableGroupEntity>,
  ) {}

  // ── Table CRUD ──────────────────────────────────────────────

  async listTables(tenantId: string, branchId?: string): Promise<TableEntity[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    return this.tableRepository.find({
      where,
      order: { tableNumber: 'ASC' },
    });
  }

  async getTable(tenantId: string, tableId: string): Promise<TableEntity> {
    const table = await this.tableRepository.findOne({
      where: { id: tableId, tenantId },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  async createTable(tenantId: string, branchId: string, dto: CreateTableDto): Promise<TableEntity> {
    // Check for duplicate table number within the branch
    const existing = await this.tableRepository.findOne({
      where: { tenantId, branchId, tableNumber: dto.tableNumber },
    });
    if (existing) {
      throw new BadRequestException(`Table number "${dto.tableNumber}" already exists in this branch`);
    }

    const entity = this.tableRepository.create({
      tenantId,
      branchId,
      tableNumber: dto.tableNumber,
      tableName: dto.tableName,
      capacity: dto.capacity,
      positionX: dto.positionX,
      positionY: dto.positionY,
      floor: dto.floor,
      section: dto.section,
      status: 'available',
    });

    const saved = await this.tableRepository.save(entity);
    this.logger.log(`Table ${dto.tableNumber} created for tenant ${tenantId}`);
    return saved;
  }

  async updateTable(tenantId: string, tableId: string, dto: UpdateTableDto): Promise<TableEntity> {
    const table = await this.getTable(tenantId, tableId);
    Object.assign(table, dto);
    return this.tableRepository.save(table);
  }

  async deleteTable(tenantId: string, tableId: string): Promise<{ deleted: boolean }> {
    const table = await this.getTable(tenantId, tableId);

    if (table.status === 'occupied') {
      throw new BadRequestException('Cannot delete an occupied table');
    }

    await this.tableRepository.remove(table);
    return { deleted: true };
  }

  // ── Status Management ───────────────────────────────────────

  async updateStatus(
    tenantId: string,
    tableId: string,
    dto: UpdateTableStatusDto,
  ): Promise<TableEntity> {
    const table = await this.getTable(tenantId, tableId);

    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[table.status];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: ${table.status} → ${dto.status}. Allowed: ${allowedTransitions.join(', ')}`,
      );
    }

    table.status = dto.status;

    if (dto.status === 'occupied' && dto.orderId) {
      table.currentOrderId = dto.orderId;
    }

    if (dto.status === 'available') {
      table.currentOrderId = undefined;
    }

    const saved = await this.tableRepository.save(table);
    this.logger.log(`Table ${table.tableNumber} status changed to ${dto.status}`);
    return saved;
  }

  async getTablesByStatus(tenantId: string, status: TableStatus): Promise<TableEntity[]> {
    return this.tableRepository.find({
      where: { tenantId, status },
      order: { tableNumber: 'ASC' },
    });
  }

  async getAvailableTables(tenantId: string, branchId?: string): Promise<TableEntity[]> {
    const where: any = { tenantId, status: 'available' };
    if (branchId) where.branchId = branchId;

    return this.tableRepository.find({
      where,
      order: { capacity: 'ASC' },
    });
  }

  // ── Table Grouping ─────────────────────────────────────────

  async createGroup(tenantId: string, branchId: string, dto: CreateTableGroupDto): Promise<TableGroupEntity> {
    // Verify all tables exist, belong to this tenant, and are available
    const tables = await this.tableRepository.find({
      where: { id: In(dto.tableIds), tenantId },
    });

    if (tables.length !== dto.tableIds.length) {
      throw new BadRequestException('One or more table IDs are invalid');
    }

    const alreadyGrouped = tables.filter((t) => t.groupId);
    if (alreadyGrouped.length > 0) {
      throw new BadRequestException(
        `Tables already in a group: ${alreadyGrouped.map((t) => t.tableNumber).join(', ')}`,
      );
    }

    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

    const group = this.groupRepository.create({
      tenantId,
      branchId,
      name: dto.name,
      tableIds: dto.tableIds,
      totalCapacity,
      isActive: true,
    });

    const savedGroup = await this.groupRepository.save(group);

    // Update tables with the group ID
    await this.tableRepository.update(
      { id: In(dto.tableIds), tenantId },
      { groupId: savedGroup.id },
    );

    this.logger.log(`Table group "${dto.name}" created with ${tables.length} tables`);
    return savedGroup;
  }

  async listGroups(tenantId: string): Promise<TableGroupEntity[]> {
    return this.groupRepository.find({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getGroup(tenantId: string, groupId: string): Promise<TableGroupEntity> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId, tenantId },
    });
    if (!group) {
      throw new NotFoundException('Table group not found');
    }
    return group;
  }

  async disbandGroup(tenantId: string, groupId: string): Promise<{ disbanded: boolean }> {
    const group = await this.getGroup(tenantId, groupId);

    // Clear groupId from all tables in the group
    await this.tableRepository.update(
      { id: In(group.tableIds), tenantId },
      { groupId: undefined as any },
    );

    group.isActive = false;
    await this.groupRepository.save(group);

    this.logger.log(`Table group "${group.name}" disbanded`);
    return { disbanded: true };
  }

  // ── Floor Plan Data ─────────────────────────────────────────

  async getFloorPlan(tenantId: string, branchId: string): Promise<{
    tables: TableEntity[];
    groups: TableGroupEntity[];
  }> {
    const [tables, groups] = await Promise.all([
      this.tableRepository.find({
        where: { tenantId, branchId },
        order: { tableNumber: 'ASC' },
      }),
      this.groupRepository.find({
        where: { tenantId, branchId, isActive: true },
      }),
    ]);

    return { tables, groups };
  }

  async updateTablePositions(
    tenantId: string,
    positions: Array<{ tableId: string; positionX: number; positionY: number }>,
  ): Promise<TableEntity[]> {
    const updated: TableEntity[] = [];

    for (const pos of positions) {
      const table = await this.getTable(tenantId, pos.tableId);
      table.positionX = pos.positionX;
      table.positionY = pos.positionY;
      updated.push(await this.tableRepository.save(table));
    }

    return updated;
  }
}
