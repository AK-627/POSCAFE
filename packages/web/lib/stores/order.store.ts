'use client';

/**
 * Order taking store — manages the in-progress order cart.
 */

import { create } from 'zustand';
import api from '../api/client';

export interface CartItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

interface OrderState {
  tableId: string | null;
  cartItems: CartItem[];
  notes: string;
  isSubmitting: boolean;
  error: string | null;

  setTable: (tableId: string | null) => void;
  addItem: (item: Omit<CartItem, 'totalPrice'>) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateInstructions: (menuItemId: string, instructions: string) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  submitOrder: (tenantId: string, branchId: string) => Promise<string | null>;
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  tableId: null,
  cartItems: [],
  notes: '',
  isSubmitting: false,
  error: null,

  setTable: (tableId) => set({ tableId }),

  addItem: (item) => {
    const existing = get().cartItems.find((c) => c.menuItemId === item.menuItemId);
    if (existing) {
      const newQty = existing.quantity + item.quantity;
      set({
        cartItems: get().cartItems.map((c) =>
          c.menuItemId === item.menuItemId
            ? { ...c, quantity: newQty, totalPrice: c.unitPrice * newQty }
            : c,
        ),
      });
    } else {
      set({
        cartItems: [
          ...get().cartItems,
          { ...item, totalPrice: item.unitPrice * item.quantity },
        ],
      });
    }
  },

  removeItem: (menuItemId) =>
    set({ cartItems: get().cartItems.filter((c) => c.menuItemId !== menuItemId) }),

  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(menuItemId);
      return;
    }
    set({
      cartItems: get().cartItems.map((c) =>
        c.menuItemId === menuItemId
          ? { ...c, quantity, totalPrice: c.unitPrice * quantity }
          : c,
      ),
    });
  },

  updateInstructions: (menuItemId, instructions) =>
    set({
      cartItems: get().cartItems.map((c) =>
        c.menuItemId === menuItemId ? { ...c, specialInstructions: instructions } : c,
      ),
    }),

  setNotes: (notes) => set({ notes }),

  clearCart: () => set({ cartItems: [], tableId: null, notes: '', error: null }),

  submitOrder: async (tenantId, branchId) => {
    const { cartItems, tableId, notes } = get();
    if (cartItems.length === 0) return null;

    set({ isSubmitting: true, error: null });
    try {
      const response = await api.post<{ id: string }>('/orders', {
        tenantId,
        branchId,
        tableId,
        notes,
        items: cartItems.map((c) => ({
          menuItemId: c.menuItemId,
          menuItemName: c.menuItemName,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          specialInstructions: c.specialInstructions,
        })),
      });
      set({ isSubmitting: false });
      get().clearCart();
      return response.data.id;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to submit order';
      set({ isSubmitting: false, error: msg });
      return null;
    }
  },
}));

// Derived selectors
export const selectCartTotal = (state: OrderState) =>
  state.cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

export const selectCartCount = (state: OrderState) =>
  state.cartItems.reduce((sum, item) => sum + item.quantity, 0);
