import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';

// Priority thresholds in minutes
const RUSH_TIME_THRESHOLD = 15; // minutes since order creation
const CRITICAL_TIME_THRESHOLD = 25; // minutes since order creation

export type KitchenPriority = 'normal' | 'rush' | 'critical';

export interface KitchenOrderView {
  orderId: string;
  orderNumber: string;
  tableId?: string;
  status: string;
  priority: KitchenPriority;
  elapsedMinutes: number;
  createdAt: Date;
  notes?: string;
  items: KitchenItemView[];
  totalItems: number;
  readyItems: number;
  pendingItems: number;
}

export interface KitchenItemView {
  id: string;
  menuItemName: string;
  quantity: number;
  status: string;
  specialInstructions?: string;
  preparedBy?: string;
  elapsedMinutes: number;
}

export interface KitchenStats {
  totalActiveOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  rushOrders: number;
  criticalOrders: number;
  averageWaitMinutes: number;
}

@Injectable()
export class KitchenService {

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {}

  /**
   * Get all active kitchen orders with priority scoring and sorting.
   * Orders are prioritized by: critical > rush > normal, then by creation time.
   */
  async getKitchenOrders(tenantId: string, branchId?: string): Promise<KitchenOrderView[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;

    const activeOrders = await this.orderRepository.find({
      where: [
        { ...where, status: 'confirmed' },
        { ...where, status: 'preparing' },
        { ...where, status: 'ready' },
      ],
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });

    const now = new Date();
    const kitchenOrders: KitchenOrderView[] = activeOrders.map((order) => {
      const elapsedMs = now.getTime() - new Date(order.createdAt).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);

      const activeItems = order.items.filter((i) => i.status !== 'cancelled');
      const readyItems = activeItems.filter((i) => i.status === 'ready' || i.status === 'served').length;
      const pendingItems = activeItems.filter((i) => i.status === 'pending').length;

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        status: order.status,
        priority: this.calculatePriority(elapsedMinutes),
        elapsedMinutes,
        createdAt: order.createdAt,
        notes: order.notes,
        items: activeItems.map((item) => ({
          id: item.id,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          status: item.status,
          specialInstructions: item.specialInstructions,
          preparedBy: item.preparedBy,
          elapsedMinutes: Math.floor(
            (now.getTime() - new Date(item.createdAt).getTime()) / 60000,
          ),
        })),
        totalItems: activeItems.length,
        readyItems,
        pendingItems,
      };
    });

    // Sort by priority (critical first), then by creation time (oldest first)
    return kitchenOrders.sort((a, b) => {
      const priorityOrder: Record<KitchenPriority, number> = {
        critical: 0,
        rush: 1,
        normal: 2,
      };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Get kitchen statistics for the dashboard.
   */
  async getKitchenStats(tenantId: string, branchId?: string): Promise<KitchenStats> {
    const orders = await this.getKitchenOrders(tenantId, branchId);

    const totalWaitMinutes = orders.reduce((sum, o) => sum + o.elapsedMinutes, 0);

    return {
      totalActiveOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'confirmed').length,
      preparingOrders: orders.filter((o) => o.status === 'preparing').length,
      readyOrders: orders.filter((o) => o.status === 'ready').length,
      rushOrders: orders.filter((o) => o.priority === 'rush').length,
      criticalOrders: orders.filter((o) => o.priority === 'critical').length,
      averageWaitMinutes: orders.length > 0 ? Math.round(totalWaitMinutes / orders.length) : 0,
    };
  }

  /**
   * Get items grouped by station/category for kitchen display.
   */
  async getItemsByStation(tenantId: string, branchId?: string): Promise<Record<string, KitchenItemView[]>> {
    const orders = await this.getKitchenOrders(tenantId, branchId);

    const itemsByName: Record<string, KitchenItemView[]> = {};

    for (const order of orders) {
      for (const item of order.items) {
        if (item.status === 'pending' || item.status === 'preparing') {
          if (!itemsByName[item.menuItemName]) {
            itemsByName[item.menuItemName] = [];
          }
          itemsByName[item.menuItemName]!.push(item);
        }
      }
    }

    return itemsByName;
  }

  private calculatePriority(elapsedMinutes: number): KitchenPriority {
    if (elapsedMinutes >= CRITICAL_TIME_THRESHOLD) {
      return 'critical';
    }
    if (elapsedMinutes >= RUSH_TIME_THRESHOLD) {
      return 'rush';
    }
    return 'normal';
  }
}
