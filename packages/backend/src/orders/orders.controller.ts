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
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderItemStatusDto,
  AddOrderItemsDto,
} from './dto/order.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '@skynether/shared/types/user';
import { OrderStatus } from './order.entity';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── Order CRUD ──────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(
    @CurrentUser() user: AuthPayload,
    @Body() dto: CreateOrderDto,
    @Query('branchId') branchId: string,
  ) {
    return this.ordersService.createOrder(user.tenantId, branchId, user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with optional filters' })
  async listOrders(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId?: string,
    @Query('status') status?: OrderStatus,
    @Query('tableId') tableId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.ordersService.listOrders(user.tenantId, {
      branchId,
      status,
      tableId,
      limit,
      offset,
    });
  }

  @Get('kitchen')
  @ApiOperation({ summary: 'Get active orders for kitchen display' })
  async getKitchenOrders(
    @CurrentUser() user: AuthPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.ordersService.getActiveKitchenOrders(user.tenantId, branchId);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get a single order by ID' })
  async getOrder(
    @CurrentUser() user: AuthPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.getOrder(user.tenantId, orderId);
  }

  // ── Status Management ───────────────────────────────────────

  @Patch(':orderId/status')
  @ApiOperation({ summary: 'Update order status' })
  async updateOrderStatus(
    @CurrentUser() user: AuthPayload,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(user.tenantId, orderId, user.userId, dto);
  }

  @Patch(':orderId/items/:itemId/status')
  @ApiOperation({ summary: 'Update individual item preparation status' })
  async updateItemStatus(
    @CurrentUser() user: AuthPayload,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.ordersService.updateItemStatus(
      user.tenantId,
      orderId,
      itemId,
      user.userId,
      dto,
    );
  }

  // ── Order Modification ──────────────────────────────────────

  @Post(':orderId/items')
  @ApiOperation({ summary: 'Add items to an existing order' })
  async addItems(
    @CurrentUser() user: AuthPayload,
    @Param('orderId') orderId: string,
    @Body() dto: AddOrderItemsDto,
  ) {
    return this.ordersService.addItems(user.tenantId, orderId, dto);
  }

  @Delete(':orderId/items/:itemId')
  @ApiOperation({ summary: 'Remove a pending item from an order' })
  async removeItem(
    @CurrentUser() user: AuthPayload,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.ordersService.removeItem(user.tenantId, orderId, itemId);
  }
}
