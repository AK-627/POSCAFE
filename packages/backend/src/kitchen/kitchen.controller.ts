import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthPayload, UserRole } from '@skynether/shared/types/user';

@ApiTags('kitchen')
@ApiBearerAuth()
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('orders')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF)
  @ApiOperation({ summary: 'Get prioritized kitchen orders for display' })
  async getKitchenOrders(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.kitchenService.getKitchenOrders(user.tenantId, branchId);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF)
  @ApiOperation({ summary: 'Get kitchen dashboard statistics' })
  async getKitchenStats(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.kitchenService.getKitchenStats(user.tenantId, branchId);
  }

  @Get('items-by-station')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CHEF)
  @ApiOperation({ summary: 'Get active items grouped by menu item name (station view)' })
  async getItemsByStation(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.kitchenService.getItemsByStation(user.tenantId, branchId);
  }
}
