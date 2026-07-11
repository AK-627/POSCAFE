'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, DollarSign, ShoppingCart, Users,
  Download, Calendar, BarChart2,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import api from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/stores/auth.store';

interface SalesReport {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTax: number;
  totalServiceCharge: number;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  peakHours: Array<{ hour: number; orderCount: number }>;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  paymentMethods: Array<{ method: string; count: number; total: number }>;
}

type DatePreset = '7d' | '30d' | '90d' | 'custom';

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: '7d',  label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'custom', label: 'Custom' },
];

function StatCard({
  label, value, icon: Icon, color = 'blue', sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'amber' | 'purple';
  sub?: string;
}) {
  const colors = {
    blue:   'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green:  'text-green-600 bg-green-50 dark:bg-green-900/20',
    amber:  'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <span className={`rounded-lg p-2.5 ${colors[color]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

/** Simple inline bar chart rendered with divs */
function InlineBarChart({
  data,
  valueKey,
  labelKey,
  color = 'bg-blue-500',
}: {
  data: Record<string, number | string>[];
  valueKey: string;
  labelKey: string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-1.5" role="list" aria-label="Bar chart">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3" role="listitem">
            <span className="w-20 shrink-0 truncate text-right text-xs text-gray-500 dark:text-gray-400">
              {String(d[labelKey])}
            </span>
            <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-5 rounded-full ${color} transition-all`}
                style={{ width: `${pct}%` }}
                role="presentation"
              />
            </div>
            <span className="w-16 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
              {typeof d[valueKey] === 'number' && String(d[valueKey]).includes('.')
                ? `$${val.toFixed(2)}`
                : val.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    const today = new Date();
    if (p === '7d')  { setFrom(format(subDays(today, 7), 'yyyy-MM-dd')); setTo(format(today, 'yyyy-MM-dd')); }
    if (p === '30d') { setFrom(format(subDays(today, 30), 'yyyy-MM-dd')); setTo(format(today, 'yyyy-MM-dd')); }
    if (p === '90d') { setFrom(format(subDays(today, 90), 'yyyy-MM-dd')); setTo(format(today, 'yyyy-MM-dd')); }
  };

  const fetchReport = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.get<SalesReport>('/reports/sales', {
        params: { from, to },
      });
      setReport(res.data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [user, from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportCsv = async (type: 'orders' | 'payments' | 'tax-report') => {
    setIsExporting(true);
    try {
      const res = await api.get(`/export/${type}`, {
        params: { from, to },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Sales analytics and performance metrics
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-2">
          {(['orders', 'payments', 'tax-report'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleExportCsv(t)}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {t === 'tax-report' ? 'Tax Report' : t.charAt(0).toUpperCase() + t.slice(1)} CSV
            </button>
          ))}
        </div>
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                preset === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-gray-500">Loading report…</p>
      ) : report ? (
        <>
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={`$${report.totalRevenue.toFixed(2)}`}
              icon={DollarSign}
              color="green"
              sub={`Tax: $${report.totalTax.toFixed(2)}`}
            />
            <StatCard
              label="Total Orders"
              value={report.totalOrders.toLocaleString()}
              icon={ShoppingCart}
              color="blue"
            />
            <StatCard
              label="Avg Order Value"
              value={`$${report.averageOrderValue.toFixed(2)}`}
              icon={TrendingUp}
              color="amber"
            />
            <StatCard
              label="Service Charges"
              value={`$${report.totalServiceCharge.toFixed(2)}`}
              icon={BarChart2}
              color="purple"
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Revenue by day */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                Revenue by Day
              </h2>
              {report.revenueByDay.length > 0 ? (
                <InlineBarChart
                  data={report.revenueByDay.map((d) => ({
                    date: format(new Date(d.date), 'MMM d'),
                    revenue: d.revenue,
                  }))}
                  valueKey="revenue"
                  labelKey="date"
                  color="bg-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-400">No data for this period.</p>
              )}
            </div>

            {/* Top items */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                Top-Selling Items
              </h2>
              {report.topItems.length > 0 ? (
                <InlineBarChart
                  data={report.topItems.slice(0, 8).map((i) => ({
                    name: i.name.length > 18 ? i.name.slice(0, 18) + '…' : i.name,
                    quantity: i.quantity,
                  }))}
                  valueKey="quantity"
                  labelKey="name"
                  color="bg-green-500"
                />
              ) : (
                <p className="text-sm text-gray-400">No data for this period.</p>
              )}
            </div>

            {/* Peak hours */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                Peak Hours
              </h2>
              {report.peakHours.length > 0 ? (
                <InlineBarChart
                  data={report.peakHours.map((h) => ({
                    hour: h.hour < 12 ? `${h.hour}am` : h.hour === 12 ? '12pm' : `${h.hour - 12}pm`,
                    orders: h.orderCount,
                  }))}
                  valueKey="orders"
                  labelKey="hour"
                  color="bg-amber-500"
                />
              ) : (
                <p className="text-sm text-gray-400">No data for this period.</p>
              )}
            </div>

            {/* Payment methods */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                Payment Methods
              </h2>
              {report.paymentMethods.length > 0 ? (
                <InlineBarChart
                  data={report.paymentMethods.map((m) => ({
                    method: m.method.replace('_', ' '),
                    total: m.total,
                  }))}
                  valueKey="total"
                  labelKey="method"
                  color="bg-purple-500"
                />
              ) : (
                <p className="text-sm text-gray-400">No data for this period.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-sm text-gray-500">No report data available.</p>
      )}
    </div>
  );
}
