'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus, Users } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import api from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { useOrderStore } from '../../../lib/stores/order.store';

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

interface Table {
  id: string;
  tableNumber: string;
  tableName?: string;
  capacity: number;
  status: TableStatus;
  positionX?: number;
  positionY?: number;
  floor?: string;
  section?: string;
  currentOrderId?: string;
  groupId?: string;
}

const STATUS_CONFIG: Record<
  TableStatus,
  { label: string; bg: string; border: string; text: string }
> = {
  available:  { label: 'Available',  bg: 'bg-green-50  dark:bg-green-900/20',  border: 'border-green-300 dark:border-green-700',  text: 'text-green-700 dark:text-green-400'  },
  occupied:   { label: 'Occupied',   bg: 'bg-red-50    dark:bg-red-900/20',    border: 'border-red-300   dark:border-red-700',    text: 'text-red-700   dark:text-red-400'   },
  reserved:   { label: 'Reserved',   bg: 'bg-amber-50  dark:bg-amber-900/20',  border: 'border-amber-300 dark:border-amber-700',  text: 'text-amber-700 dark:text-amber-400'  },
  cleaning:   { label: 'Cleaning',   bg: 'bg-blue-50   dark:bg-blue-900/20',   border: 'border-blue-300  dark:border-blue-700',   text: 'text-blue-700  dark:text-blue-400'   },
};

const STATUS_CYCLE: Record<TableStatus, TableStatus> = {
  available: 'occupied',
  occupied:  'cleaning',
  cleaning:  'available',
  reserved:  'available',
};

export default function TablesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setTable } = useOrderStore();

  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFloor, setActiveFloor] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TableStatus | 'all'>('all');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get<Table[]>('/tables');
      setTables(res.data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  // Real-time table status via WebSocket
  useEffect(() => {
    if (!user) return;
    const socket: Socket = io(
      `${process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001'}/tables`,
      { auth: { tenantId: user.tenantId } },
    );

    socket.on('tableUpdated', (updated: Table) => {
      setTables((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
    });

    return () => { socket.disconnect(); };
  }, [user]);

  const floors = [...new Set(tables.map((t) => t.floor ?? 'Main Floor'))];

  const displayedTables = tables.filter((t) => {
    const floorMatch = !activeFloor || (t.floor ?? 'Main Floor') === activeFloor;
    const statusMatch = filterStatus === 'all' || t.status === filterStatus;
    return floorMatch && statusMatch;
  });

  const handleStatusToggle = async (table: Table) => {
    const nextStatus = STATUS_CYCLE[table.status];
    try {
      await api.patch(`/tables/${table.id}/status`, { status: nextStatus });
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, status: nextStatus } : t)),
      );
    } catch {
      // revert on error
      fetchTables();
    }
  };

  const handleStartOrder = (table: Table) => {
    setTable(table.id);
    router.push('/dashboard/orders/new');
  };

  const stats = {
    available: tables.filter((t) => t.status === 'available').length,
    occupied:  tables.filter((t) => t.status === 'occupied').length,
    reserved:  tables.filter((t) => t.status === 'reserved').length,
    cleaning:  tables.filter((t) => t.status === 'cleaning').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Floor Plan</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {tables.length} tables · {stats.occupied} occupied
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchTables}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Refresh tables"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(stats) as [TableStatus, number][]).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus((f) => (f === status ? 'all' : status))}
              className={`rounded-xl border-2 p-3 text-center transition-all ${cfg.bg} ${
                filterStatus === status ? cfg.border : 'border-transparent'
              }`}
            >
              <p className={`text-2xl font-bold ${cfg.text}`}>{count}</p>
              <p className={`text-xs ${cfg.text}`}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Floor tabs */}
      {floors.length > 1 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveFloor(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !activeFloor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            All floors
          </button>
          {floors.map((floor) => (
            <button
              key={floor}
              type="button"
              onClick={() => setActiveFloor(floor)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFloor === floor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      )}

      {/* Tables grid */}
      {isLoading ? (
        <p className="text-center text-sm text-gray-500">Loading tables…</p>
      ) : displayedTables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
          <p className="text-sm text-gray-500">No tables found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {displayedTables.map((table) => {
            const cfg = STATUS_CONFIG[table.status];
            const isSelected = selectedTable?.id === table.id;
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedTable(isSelected ? null : table)}
                className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 transition-all
                  ${cfg.bg} ${isSelected ? cfg.border : 'border-transparent hover:' + cfg.border}`}
                aria-pressed={isSelected}
                aria-label={`Table ${table.tableNumber} — ${cfg.label}`}
              >
                <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {table.tableNumber}
                </span>
                <span className={`mt-1 flex items-center gap-1 text-xs ${cfg.text}`}>
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {table.capacity}
                </span>
                <span className={`mt-1 text-xs font-medium ${cfg.text}`}>
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Table detail panel */}
      {selectedTable && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Table {selectedTable.tableNumber}
                {selectedTable.tableName && ` — ${selectedTable.tableName}`}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Capacity: {selectedTable.capacity} · Floor: {selectedTable.floor ?? 'Main'}
                {selectedTable.section && ` · Section: ${selectedTable.section}`}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CONFIG[selectedTable.status].bg} ${STATUS_CONFIG[selectedTable.status].text}`}
            >
              {STATUS_CONFIG[selectedTable.status].label}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTable.status === 'available' && (
              <button
                type="button"
                onClick={() => handleStartOrder(selectedTable)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Order
              </button>
            )}
            {selectedTable.status === 'occupied' && selectedTable.currentOrderId && (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/orders/${selectedTable.currentOrderId}`)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
              >
                View Order
              </button>
            )}
            <button
              type="button"
              onClick={() => handleStatusToggle(selectedTable)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Mark as {STATUS_CONFIG[STATUS_CYCLE[selectedTable.status]].label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
