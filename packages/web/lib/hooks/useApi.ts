'use client';

/**
 * Typed API hooks built on top of TanStack Query + the axios client.
 * Covers the main entity types needed by the web UI.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

// ── Menu ─────────────────────────────────────────────────────

export function useMenuCategories() {
  return useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: () => api.get('/menu/categories').then((r) => r.data),
  });
}

export function useMenuItems(categoryId?: string) {
  return useQuery({
    queryKey: ['menu', 'items', categoryId],
    queryFn: () =>
      api
        .get('/menu/items', { params: categoryId ? { categoryId } : {} })
        .then((r) => r.data),
  });
}

// ── Tables ───────────────────────────────────────────────────

export function useTables(branchId?: string) {
  return useQuery({
    queryKey: ['tables', branchId],
    queryFn: () =>
      api.get('/tables', { params: branchId ? { branchId } : {} }).then((r) => r.data),
    refetchInterval: 15_000, // refresh every 15s
  });
}

export function useUpdateTableStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, status }: { tableId: string; status: string }) =>
      api.patch(`/tables/${tableId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  });
}

// ── Orders ───────────────────────────────────────────────────

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: () =>
      api.get('/orders', { params: status ? { status } : {} }).then((r) => r.data),
    refetchInterval: 10_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post('/orders', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

// ── Kitchen ──────────────────────────────────────────────────

export function useKitchenOrders() {
  return useQuery({
    queryKey: ['kitchen', 'orders'],
    queryFn: () => api.get('/kitchen/orders').then((r) => r.data),
    refetchInterval: 8_000,
  });
}

// ── Reports ──────────────────────────────────────────────────

export function useSalesReport(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'sales', from, to],
    queryFn: () => api.get('/reports/sales', { params: { from, to } }).then((r) => r.data),
    enabled: !!(from && to),
    staleTime: 60_000,
  });
}

// ── Staff ────────────────────────────────────────────────────

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then((r) => r.data),
  });
}

// ── Notifications ────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => api.get('/notifications/preferences').then((r) => r.data),
  });
}

// ── Subscription ────────────────────────────────────────────

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/subscriptions/current').then((r) => r.data),
  });
}
