import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity, OrderStatus } from './order.entity';
import { OrderItemEntity, OrderItemStatus } from './order-item.entity';
import { MenuService } from '../menu/menu.service';
import { TablesService } from '../tables/tables.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderItemStatusDto,
  AddOrderItemsDto,
} from './dto/order.dto';

// Default tax rate — would come from tenant config in production
const DEFAULT_TAX_RATE = 5.0; // 5%
const DEFAULT_SERVICE_CHARGE_RATE = 10.0; // 10%

// Valid order status transitions
const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: ['paid'],
  cancelled: [],
  paid: [],
};

// Valid order item status transitions
const VALID_ITEM_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: [],
  cancelled: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private orderCounter = 0;

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepository: Repository<OrderItemEntity>,
    private readonly menuService: MenuService,
    private readonly tablesService: TablesService,
  ) {}

  // ── Order CRUD ──────────────────────────────────────────────

  async createOrder(
    tenantId: string,
    branchId: string,
    userId: string,
    dto: CreateOrderDto,
  ): Promise<OrderEntity> {
    // Build order items from menu items (snapshot pricing)
    const orderItems: Partial<OrderItemEntity>[] = [];
    let subtotal = 0;

    for (const item of dto.items) {
      const menuItem = await this.menuService.getItem(tenantId, item.menuItemId);

      if (!menuItem.isAvailable) {
        throw new BadRequestException(`Menu item "${menuItem.name}" is currently unavailable`);
      }

      const itemTotal = Number(menuItem.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(menuItem.price),
        totalPrice: itemTotal,
        specialInstructions: item.specialInstructions,
        status: 'pending',
      });
    }

    // Calculate financial totals
    const taxRate = DEFAULT_TAX_RATE;
    const taxAmount = (subtotal * taxRate) / 100;
    const serviceCharge = (subtotal * DEFAULT_SERVICE_CHARGE_RATE) / 100;
    const discountAmount = dto.discountAmount ?? 0;
    const totalAmount = subtotal + taxAmount + serviceCharge - discountAmount;

    // Generate order number
    const orderNumber = this.generateOrderNumber();

    // Create order entity
    const order = this.orderRepository.create({
      tenantId,
      branchId,
      tableId: dto.tableId,
      customerId: dto.customerId,
      orderNumber,
      status: 'pending',
      subtotalAmount: subtotal,
      taxAmount,
      taxRate,
      serviceCharge,
      discountAmount,
      totalAmount: Math.max(0, totalAmount),
      notes: dto.notes,
      createdBy: userId,
      items: orderItems as OrderItemEntity[],
    });

    const savedOrder = await this.orderRepository.save(order);

    // If table is associated, update its status to occupied
    if (dto.tableId) {
      try {
        await this.tablesService.updateStatus(tenantId, dto.tableId, {
          status: 'occupied',
          orderId: savedOrder.id,
        });
      } catch (error) {
        // Table might already be occupied — log but don't fail
        this.logger.warn(`Could not update table status for order ${orderNumber}: ${error}`);
      }
    }

    this.logger.log(`Order ${orderNumber} created by user ${userId}`);
    return savedOrder;
  }

  async getOrder(tenantId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, tenantId },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async listOrders(
    tenantId: string,
    options?: {
      branchId?: string;
      status?: OrderStatus;
      tableId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ orders: OrderEntity[]; total: number }> {
    const where: any = { tenantId };
    if (options?.branchId) where.branchId = options.branchId;
    if (options?.status) where.status = options.status;
    if (options?.tableId) where.tableId = options.tableId;

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return { orders, total };
  }

  // ── Status Management ───────────────────────────────────────

  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    userId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderEntity> {
    const order = await this.getOrder(tenantId, orderId);

    // Validate transition
    const allowedTransitions = VALID_ORDER_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid order status transition: ${order.status} → ${dto.status}. Allowed: ${allowedTransitions.join(', ')}`,
      );
    }

    order.status = dto.status;

    // Set timestamps for specific transitions
    switch (dto.status) {
      case 'confirmed':
        order.confirmedAt = new Date();
        break;
      case 'served':
        order.servedAt = new Date();
        order.servedBy = userId;
        break;
      case 'paid':
        order.paidAt = new Date();
        // Release table when order is paid
        if (order.tableId) {
          try {
            await this.tablesService.updateStatus(tenantId, order.tableId, {
              status: 'cleaning',
            });
          } catch (error) {
            this.logger.warn(`Could not update table status after payment: ${error}`);
          }
        }
        break;
      case 'cancelled':
        order.cancelledAt = new Date();
        // Cancel all pending items
        for (const item of order.items) {
          if (item.status === 'pending' || item.status === 'preparing') {
            item.status = 'cancelled';
          }
        }
        // Release table
        if (order.tableId) {
          try {
            await this.tablesService.updateStatus(tenantId, order.tableId, {
              status: 'available',
            });
          } catch (error) {
            this.logger.warn(`Could not release table after cancellation: ${error}`);
          }
        }
        break;
    }

    const saved = await this.orderRepository.save(order);
    this.logger.log(`Order ${order.orderNumber} status → ${dto.status} by user ${userId}`);
    return saved;
  }

  // ── Item Status Management ──────────────────────────────────

  async updateItemStatus(
    tenantId: string,
    orderId: string,
    itemId: string,
    userId: string,
    dto: UpdateOrderItemStatusDto,
  ): Promise<OrderItemEntity> {
    const order = await this.getOrder(tenantId, orderId);
    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Order item not found');
    }

    const allowedTransitions = VALID_ITEM_TRANSITIONS[item.status];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid item status transition: ${item.status} → ${dto.status}`,
      );
    }

    item.status = dto.status;

    if (dto.status === 'ready' || dto.status === 'preparing') {
      item.preparedBy = userId;
    }
    if (dto.status === 'ready') {
      item.preparedAt = new Date();
    }

    const saved = await this.orderItemRepository.save(item);

    // Auto-update order status based on items
    await this.autoUpdateOrderStatus(tenantId, orderId);

    this.logger.log(`Order ${order.orderNumber} item ${item.menuItemName} → ${dto.status}`);
    return saved;
  }

  // ── Order Modification ──────────────────────────────────────

  async addItems(
    tenantId: string,
    orderId: string,
    dto: AddOrderItemsDto,
  ): Promise<OrderEntity> {
    const order = await this.getOrder(tenantId, orderId);

    // Only allow adding items before the order is served/paid/cancelled
    if (['served', 'paid', 'cancelled'].includes(order.status)) {
      throw new BadRequestException('Cannot add items to a completed or cancelled order');
    }

    for (const item of dto.items) {
      const menuItem = await this.menuService.getItem(tenantId, item.menuItemId);

      if (!menuItem.isAvailable) {
        throw new BadRequestException(`Menu item "${menuItem.name}" is unavailable`);
      }

      const itemTotal = Number(menuItem.price) * item.quantity;

      const orderItem = this.orderItemRepository.create({
        orderId: order.id,
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        quantity: item.quantity,
        unitPrice: Number(menuItem.price),
        totalPrice: itemTotal,
        specialInstructions: item.specialInstructions,
        status: 'pending',
      });

      await this.orderItemRepository.save(orderItem);
    }

    // Recalculate totals
    return this.recalculateOrderTotals(tenantId, orderId);
  }

  async removeItem(
    tenantId: string,
    orderId: string,
    itemId: string,
  ): Promise<OrderEntity> {
    const order = await this.getOrder(tenantId, orderId);

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Order item not found');
    }

    // Only allow removing pending items (not already being prepared)
    if (item.status !== 'pending') {
      throw new BadRequestException('Can only remove items that are still pending');
    }

    await this.orderItemRepository.remove(item);

    // Recalculate totals
    return this.recalculateOrderTotals(tenantId, orderId);
  }

  // ── Kitchen View ────────────────────────────────────────────

  async getActiveKitchenOrders(tenantId: string, branchId?: string): Promise<OrderEntity[]> {
    const where: any = {
      tenantId,
      status: 'confirmed' as OrderStatus,
    };
    if (branchId) where.branchId = branchId;

    // Get orders that are confirmed or preparing (relevant for kitchen)
    const confirmedOrders = await this.orderRepository.find({
      where: { ...where, status: 'confirmed' },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });

    const preparingOrders = await this.orderRepository.find({
      where: { ...where, status: 'preparing' },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });

    return [...confirmedOrders, ...preparingOrders];
  }

  // ── Helpers ─────────────────────────────────────────────────

  private async recalculateOrderTotals(
    tenantId: string,
    orderId: string,
  ): Promise<OrderEntity> {
    const order = await this.getOrder(tenantId, orderId);

    const activeItems = order.items.filter((i) => i.status !== 'cancelled');
    const subtotal = activeItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const taxAmount = (subtotal * Number(order.taxRate)) / 100;
    const serviceCharge = (subtotal * DEFAULT_SERVICE_CHARGE_RATE) / 100;
    const totalAmount = subtotal + taxAmount + serviceCharge - Number(order.discountAmount);

    order.subtotalAmount = subtotal;
    order.taxAmount = taxAmount;
    order.serviceCharge = serviceCharge;
    order.totalAmount = Math.max(0, totalAmount);

    return this.orderRepository.save(order);
  }

  private async autoUpdateOrderStatus(
    tenantId: string,
    orderId: string,
  ): Promise<void> {
    const order = await this.getOrder(tenantId, orderId);
    const activeItems = order.items.filter((i) => i.status !== 'cancelled');

    if (activeItems.length === 0) return;

    // If all items are ready, auto-update order to ready
    const allReady = activeItems.every((i) => i.status === 'ready' || i.status === 'served');
    if (allReady && order.status === 'preparing') {
      order.status = 'ready';
      await this.orderRepository.save(order);
      this.logger.log(`Order ${order.orderNumber} auto-updated to ready (all items ready)`);
    }

    // If any item is preparing and order is confirmed, move to preparing
    const anyPreparing = activeItems.some((i) => i.status === 'preparing');
    if (anyPreparing && order.status === 'confirmed') {
      order.status = 'preparing';
      await this.orderRepository.save(order);
      this.logger.log(`Order ${order.orderNumber} auto-updated to preparing`);
    }
  }

  private generateOrderNumber(): string {
    this.orderCounter++;
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const seq = String(this.orderCounter).padStart(4, '0');
    return `ORD-${dateStr}-${seq}`;
  }
}
