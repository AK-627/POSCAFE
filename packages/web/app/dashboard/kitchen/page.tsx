'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, ChefHat, AlertTriangle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import api from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/stores/auth.store';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready';
type ItemStatus = 'pending' | 'preparing' | 'ready' | 'served';

interface KitchenOrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  specialInstructions?: string;
  status: ItemStatus;
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  tableId?: string;
  tableNumber?: string;
  status: OrderStatus;
  items: KitchenOrderItem[];
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  priority: number; // higher = more urgent
}

function elapsedMinutes(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000);
}

function ElapsedBadge({ isoDate }: { isoDate: string }) {
  const [mins, setMins] = useState(elapsedMinutes(isoDate));
  useEffect(() => {
    const id = setInterval(() => setMins(elapsedMinutes(isoDate)), 30_000);
    return () => clearInterval(id);
  }, [isoDate]);
  const urgent = mins >= 10;
  const warning = mins >= 5;
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        urgent
          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
          : warning
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      {urgent && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
      <Clock className="h-3 w-3" aria-hidden="true" />
      {mins}m
    </span>
  );
}

const STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'preparing',
  preparing: 'ready',
};

const ITEM_TRANSITIONS: Partial<Record<ItemStatus, ItemStatus>> = {
  pending:   'preparing',
  preparing: 'ready',
};

export default function KitchenPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get<KitchenOrder[]>('/kitchen/orders');
      setOrders(res.data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Real-time kitchen updates
  useEffect(() => {
    if (!user) return;
    const socket: Socket = io(
      `${process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001'}/kitchen`,
      { auth: { tenantId: user.tenantId } },
    );

    socket.on('orderUpdated', (updated: KitchenOrder) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === updated.id ? updated : o))
          .filter((o) => ['confirmed', 'preparing', 'ready'].includes(o.status)),
      );
    });

    socket.on('newOrder', (order: KitchenOrder) => {
      setOrders((prev) => [order, ...prev]);
    });

    return () => { socket.disconnect(); };
  }, [user]);

  const advanceOrderStatus = async (order: KitchenOrder) => {
    const next = STATUS_TRANSITIONS[order.status];
    if (!next) return;
    try {
      await api.patch(`/kitchen/orders/${order.id}/status`, { status: next });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)),
      );
    } catch { fetchOrders(); }
  };

  const advanceItemStatus = async (orderId: string, itemId: string, currentStatus: ItemStatus) => {
    const next = ITEM_TRANSITIONS[currentStatus];
    if (!next) return;
    try {
      await api.patch(`/kitchen/items/${itemId}/status`, { status: next });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, items: o.items.map((i) => (i.id === itemId ? { ...i, status: next } : i)) }
            : o,
        ),
      );
    } catch { fetchOrders(); }
  };

  // Sort by priority desc, then creation time asc
  const sortedOrders = [...orders]
    .filter((o) =>
      filter === 'all'
        ? ['confirmed', 'preparing', 'ready'].includes(o.status)
        : o.status === filter,
    )
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const statusConfig: Record<OrderStatus, { label: string; headerBg: string }> = {
    pending:  { label: 'Pending',   headerBg: 'bg-gray-500' },
    confirmed: { label: 'New',       headerBg: 'bg-blue-600' },
    preparing: { label: 'Preparing', headerBg: 'bg-amber-500' },
    ready:    { label: 'Ready',     headerBg: 'bg-green-600' },
  };

  const counts = {
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready:    orders.filter((o) => o.status === 'ready').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ChefHat className="h-7 w-7 text-gray-700 dark:text-gray-300" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kitchen Display</h1>
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          Live · auto-updating
        </span>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'all', label: `All (${sortedOrders.length})` },
          { key: 'confirmed', label: `New (${counts.confirmed})` },
          { key: 'preparing', label: `Preparing (${counts.preparing})` },
          { key: 'ready',    label: `Ready (${counts.ready})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key as OrderStatus | 'all')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders grid */}
      {isLoading ? (
        <p className="text-center text-sm text-gray-500">Loading orders…</p>
      ) : sortedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 dark:border-gray-600">
          <ChefHat className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          <p className="text-sm text-gray-500">No orders in queue.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedOrders.map((order) => {
            const cfg = statusConfig[order.status];
            const elapsed = elapsedMinutes(order.createdAt);
            const allItemsReady = order.items.every(
              (i) => i.status === 'ready' || i.status === 'served',
            );

            return (
              <article
                key={order.id}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
                aria-label={`Order ${order.orderNumber}`}
              >
                {/* Card header */}
                <div className={`flex items-center justify-between px-4 py-2.5 text-white ${cfg.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">#{order.orderNumber}</span>
                    {order.tableNumber && (
                      <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs">
                        T{order.tableNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {elapsed >= 5 && (
                      <AlertTriangle className="h-4 w-4 text-yellow-300" aria-hidden="true" />
                    )}
                    <ElapsedBadge isoDate={order.createdAt} />
                  </div>
                </div>

                {/* Items */}
                <ul className="flex-1 divide-y divide-gray-100 dark:divide-gray-800">
                  {order.items.map((item) => {
                    const itemDone = item.status === 'ready' || item.status === 'served';
                    const nextItem = ITEM_TRANSITIONS[item.status];
                    return (
                      <li
                        key={item.id}
                        className={`flex items-start gap-3 px-4 py-2.5 ${
                          itemDone ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${itemDone ? 'line-through' : ''} text-gray-900 dark:text-white`}>
                            <span className="mr-1 font-bold text-blue-600">{item.quantity}×</span>
                            {item.menuItemName}
                          </p>
                          {item.specialInstructions && (
                            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                              ⚠ {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        {nextItem && (
                          <button
                            type="button"
                            onClick={() => advanceItemStatus(order.id, item.id, item.status)}
                            className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                            aria-label={`Mark ${item.menuItemName} as ${nextItem}`}
                          >
                            {nextItem === 'preparing' ? 'Start' : '✓ Done'}
                          </button>
                        )}
                        {itemDone && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Notes */}
                {order.notes && (
                  <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      📝 {order.notes}
                    </p>
                  </div>
                )}

                {/* Order action */}
                <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                  {STATUS_TRANSITIONS[order.status] && (
                    <button
                      type="button"
                      onClick={() => advanceOrderStatus(order)}
                      disabled={order.status === 'preparing' && !allItemsReady}
                      className="w-full rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white
                                 transition-colors hover:bg-gray-800
                                 disabled:cursor-not-allowed disabled:opacity-40
                                 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    >
                      {order.status === 'confirmed'
                        ? '▶ Start Preparing'
                        : '✓ Mark Ready'}
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <p className="text-center text-xs font-semibold text-green-600 dark:text-green-400">
                      ✓ Ready for pickup
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
