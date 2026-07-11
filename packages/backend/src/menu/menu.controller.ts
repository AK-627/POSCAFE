import { Body, Controller, Get, Param, Patch, Post, Query, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import {
  CreateMenuItemDto,
  MenuItemAvailabilityDto,
  UpdateMenuItemDto,
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
} from './menu.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';

@ApiTags('menu')
@ApiBearerAuth()
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ── Items ───────────────────────────────────────────────────

  @Get('items')
  @ApiOperation({ summary: 'List menu items, optionally filtered by category' })
  async listItems(
    @CurrentUser() user: AuthPayload,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.menuService.listItems(user.tenantId, categoryId);
  }

  @Get('items/:itemId')
  @ApiOperation({ summary: 'Get a single menu item' })
  async getItem(
    @CurrentUser() user: AuthPayload,
    @Param('itemId') itemId: string,
  ) {
    return this.menuService.getItem(user.tenantId, itemId);
  }

  @Post('items')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new menu item' })
  async createItem(
    @CurrentUser() user: AuthPayload,
    @Body() createDto: CreateMenuItemDto,
  ) {
    return this.menuService.createMenuItem(user.tenantId, createDto);
  }

  @Patch('items/:itemId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a menu item' })
  async updateItem(
    @CurrentUser() user: AuthPayload,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateMenuItem(user.tenantId, itemId, updateDto);
  }

  @Patch('items/:itemId/availability')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF)
  @ApiOperation({ summary: 'Toggle menu item availability' })
  async updateAvailability(
    @CurrentUser() user: AuthPayload,
    @Param('itemId') itemId: string,
    @Body() body: MenuItemAvailabilityDto,
  ) {
    return this.menuService.updateAvailability(user.tenantId, itemId, body.isAvailable);
  }

  // ── Categories ──────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all menu categories' })
  async listCategories(@CurrentUser() user: AuthPayload) {
    return this.menuService.listCategories(user.tenantId);
  }

  @Post('categories')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new menu category' })
  async createCategory(
    @CurrentUser() user: AuthPayload,
    @Body() createDto: CreateMenuCategoryDto,
  ) {
    return this.menuService.createCategory(user.tenantId, createDto);
  }

  @Patch('categories/:categoryId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a menu category' })
  async updateCategory(
    @CurrentUser() user: AuthPayload,
    @Param('categoryId') categoryId: string,
    @Body() updateDto: UpdateMenuCategoryDto,
  ) {
    return this.menuService.updateCategory(user.tenantId, categoryId, updateDto);
  }

  @Delete('categories/:categoryId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a menu category' })
  async deleteCategory(
    @CurrentUser() user: AuthPayload,
    @Param('categoryId') categoryId: string,
  ) {
    return this.menuService.removeCategory(user.tenantId, categoryId);
  }
}
