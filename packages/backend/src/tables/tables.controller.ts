import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStatusDto,
  CreateTableGroupDto,
} from './dto/table.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';

@ApiTags('tables')
@ApiBearerAuth()
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // ── Table CRUD ──────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all tables for the tenant' })
  async listTables(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.tablesService.listTables(user.tenantId, branchId);
  }

  @Get('available')
  @ApiOperation({ summary: 'List available tables' })
  async getAvailableTables(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.tablesService.getAvailableTables(user.tenantId, branchId);
  }

  @Get('floor-plan')
  @ApiOperation({ summary: 'Get floor plan with tables and groups' })
  async getFloorPlan(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId: string,
  ) {
    return this.tablesService.getFloorPlan(user.tenantId, branchId);
  }

  @Get(':tableId')
  @ApiOperation({ summary: 'Get a single table by ID' })
  async getTable(
    @CurrentUser() user: AuthPayload,
    @Param('tableId') tableId: string,
  ) {
    return this.tablesService.getTable(user.tenantId, tableId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new table' })
  async createTable(
    @CurrentUser() user: AuthPayload,
    @Body() dto: CreateTableDto,
    @Query('branchId') branchId: string,
  ) {
    return this.tablesService.createTable(user.tenantId, branchId, dto);
  }

  @Patch(':tableId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update table properties' })
  async updateTable(
    @CurrentUser() user: AuthPayload,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.updateTable(user.tenantId, tableId, dto);
  }

  @Delete(':tableId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a table' })
  async deleteTable(
    @CurrentUser() user: AuthPayload,
    @Param('tableId') tableId: string,
  ) {
    return this.tablesService.deleteTable(user.tenantId, tableId);
  }

  // ── Status Management ───────────────────────────────────────

  @Patch(':tableId/status')
  @ApiOperation({ summary: 'Update table status (available/occupied/reserved/cleaning)' })
  async updateStatus(
    @CurrentUser() user: AuthPayload,
    @Param('tableId') tableId: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateStatus(user.tenantId, tableId, dto);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'List tables by status' })
  async getTablesByStatus(
    @CurrentUser() user: AuthPayload,
    @Param('status') status: 'available' | 'occupied' | 'reserved' | 'cleaning',
  ) {
    return this.tablesService.getTablesByStatus(user.tenantId, status);
  }

  // ── Table Grouping ─────────────────────────────────────────

  @Get('groups/list')
  @ApiOperation({ summary: 'List all active table groups' })
  async listGroups(@CurrentUser() user: AuthPayload) {
    return this.tablesService.listGroups(user.tenantId);
  }

  @Post('groups')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.WAITER)
  @ApiOperation({ summary: 'Create a table group for larger parties' })
  async createGroup(
    @CurrentUser() user: AuthPayload,
    @Body() dto: CreateTableGroupDto,
    @Query('branchId') branchId: string,
  ) {
    return this.tablesService.createGroup(user.tenantId, branchId, dto);
  }

  @Delete('groups/:groupId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.WAITER)
  @ApiOperation({ summary: 'Disband a table group' })
  async disbandGroup(
    @CurrentUser() user: AuthPayload,
    @Param('groupId') groupId: string,
  ) {
    return this.tablesService.disbandGroup(user.tenantId, groupId);
  }
}
