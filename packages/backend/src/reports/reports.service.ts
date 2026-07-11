import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { OrderEntity } from '../orders/order.entity';
import { PaymentEntity } from '../billing/payment.entity';
import { StaffPerformanceEntity } from '../staff/staff.entity';

export interface SalesReport {
  period: string;
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  totalServiceCharge: number;
  totalDiscount: number;
  averageOrderValue: number;
  cancelledOrders: number;
}

export interface TopSellingItem {
  menuItemName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export interface PeakHourData {
  hour: number;
  orderCount: number;
  revenue: number;
}

export interface StaffPerformanceReport {
  userId: string;
  ordersHandled: number;
  revenueGenerated: number;
  averageOrderTime: number;
  itemsPrepared: number;
}

@Injectable()
export class ReportsService {

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(StaffPerformanceEntity)
    private readonly performanceRepository: Repository<StaffPerformanceEntity>,
  ) {}

  // ── Sales Reports ───────────────────────────────────────────

  async getSalesReport(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<SalesReport> {
    const orders = await this.orderRepository.find({
      where: { tenantId, createdAt: Between(from, to) },
    });

    const paidOrders = orders.filter((o) => o.status === 'paid');
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      period: `${from.toISOString().split('T')[0]} to ${to.toISOString().split('T')[0]}`,
      totalOrders: paidOrders.length,
      totalRevenue,
      totalTax: paidOrders.reduce((sum, o) => sum + Number(o.taxAmount), 0),
      totalServiceCharge: paidOrders.reduce((sum, o) => sum + Number(o.serviceCharge), 0),
      totalDiscount: paidOrders.reduce((sum, o) => sum + Number(o.discountAmount), 0),
      averageOrderValue: paidOrders.length > 0 ? Math.round((totalRevenue / paidOrders.length) * 100) / 100 : 0,
      cancelledOrders: cancelledOrders.length,
    };
  }

  async getDailySalesBreakdown(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<SalesReport[]> {
    const orders = await this.orderRepository.find({
      where: { tenantId, createdAt: Between(from, to), status: 'paid' as any },
    });

    const byDate: Record<string, OrderEntity[]> = {};
    for (const order of orders) {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0]!;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey]!.push(order);
    }

    return Object.entries(byDate).map(([date, dayOrders]) => {
      const totalRevenue = dayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      return {
        period: date,
        totalOrders: dayOrders.length,
        totalRevenue,
        totalTax: dayOrders.reduce((sum, o) => sum + Number(o.taxAmount), 0),
        totalServiceCharge: dayOrders.reduce((sum, o) => sum + Number(o.serviceCharge), 0),
        totalDiscount: dayOrders.reduce((sum, o) => sum + Number(o.discountAmount), 0),
        averageOrderValue: dayOrders.length > 0 ? Math.round((totalRevenue / dayOrders.length) * 100) / 100 : 0,
        cancelledOrders: 0,
      };
    }).sort((a, b) => a.period.localeCompare(b.period));
  }

  // ── Top Selling Items ───────────────────────────────────────

  async getTopSellingItems(
    tenantId: string,
    from: Date,
    to: Date,
    limit: number = 10,
  ): Promise<TopSellingItem[]> {
    const orders = await this.orderRepository.find({
      where: { tenantId, createdAt: Between(from, to), status: 'paid' as any },
      relations: ['items'],
    });

    const itemMap: Record<string, TopSellingItem> = {};

    for (const order of orders) {
      for (const item of order.items) {
        if (item.status === 'cancelled') continue;
        const key = item.menuItemName;
        if (!itemMap[key]) {
          itemMap[key] = {
            menuItemName: key,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
          };
        }
        itemMap[key]!.totalQuantity += item.quantity;
        itemMap[key]!.totalRevenue += Number(item.totalPrice);
        itemMap[key]!.orderCount += 1;
      }
    }

    return Object.values(itemMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit);
  }

  // ── Peak Hours ──────────────────────────────────────────────

  async getPeakHours(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<PeakHourData[]> {
    const orders = await this.orderRepository.find({
      where: { tenantId, createdAt: Between(from, to), status: 'paid' as any },
    });

    const hourMap: Record<number, { count: number; revenue: number }> = {};

    for (let h = 0; h < 24; h++) {
      hourMap[h] = { count: 0, revenue: 0 };
    }

    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      hourMap[hour]!.count += 1;
      hourMap[hour]!.revenue += Number(order.totalAmount);
    }

    return Object.entries(hourMap).map(([hour, data]) => ({
      hour: parseInt(hour),
      orderCount: data.count,
      revenue: Math.round(data.revenue * 100) / 100,
    }));
  }

  // ── Staff Performance ───────────────────────────────────────

  async getStaffPerformanceReport(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<StaffPerformanceReport[]> {
    const performances = await this.performanceRepository
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.date >= :from', { from })
      .andWhere('p.date <= :to', { to })
      .getMany();

    const byUser: Record<string, StaffPerformanceReport> = {};

    for (const perf of performances) {
      if (!byUser[perf.userId]) {
        byUser[perf.userId] = {
          userId: perf.userId,
          ordersHandled: 0,
          revenueGenerated: 0,
          averageOrderTime: 0,
          itemsPrepared: 0,
        };
      }
      byUser[perf.userId]!.ordersHandled += perf.ordersHandled;
      byUser[perf.userId]!.revenueGenerated += Number(perf.revenueGenerated);
      byUser[perf.userId]!.itemsPrepared += perf.itemsPrepared;
    }

    return Object.values(byUser).sort((a, b) => b.revenueGenerated - a.revenueGenerated);
  }

  // ── Profit Margin ───────────────────────────────────────────

  async getProfitSummary(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<{
    totalRevenue: number;
    totalPayments: number;
    totalRefunds: number;
    netRevenue: number;
    totalTips: number;
  }> {
    const payments = await this.paymentRepository.find({
      where: { tenantId, createdAt: Between(from, to) },
    });

    const completed = payments.filter((p) => p.status === 'completed');
    const refunded = payments.filter((p) => p.status === 'refunded');
    const totalRevenue = completed.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRefunds = refunded.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalRevenue,
      totalPayments: completed.length,
      totalRefunds,
      netRevenue: totalRevenue - totalRefunds,
      totalTips: completed.reduce((sum, p) => sum + Number(p.tipAmount), 0),
    };
  }
}
