'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Minus, Trash2, ShoppingCart, ChevronLeft } from 'lucide-react';
import { useOrderStore, selectCartTotal, selectCartCount } from '../../../../lib/stores/order.store';
import { useAuthStore } from '../../../../lib/stores/auth.store';
import api from '../../../../lib/api/client';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId?: string;
  isAvailable: boolean;
  tags: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    cartItems, tableId, notes, isSubmitting, error,
    addItem, removeItem, updateQuantity, setNotes, submitOrder, clearCart,
  } = useOrderStore();

  const cartTotal = useOrderStore(selectCartTotal);
  const cartCount = useOrderStore(selectCartCount);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load menu
  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, itemRes] = await Promise.all([
          api.get<MenuCategory[]>('/menu/categories'),
          api.get<MenuItem[]>('/menu/items'),
        ]);
        setCategories(catRes.data.filter((c) => c.isActive));
        setItems(itemRes.data.filter((i) => i.isAvailable));
      } catch {
        // handle silently
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesCategory = !activeCategory || item.categoryId === activeCategory;
    const matchesSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddItem = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      menuItemName: item.name,
      quantity: 1,
      unitPrice: item.price,
    });
  };

  const handleSubmit = async () => {
    if (!user) return;
    const orderId = await submitOrder(user.tenantId, user.branchId ?? 'default-branch');
    if (orderId) {
      router.push(`/dashboard/orders/${orderId}`);
    }
  };

  const getCartQty = (menuItemId: string) =>
    cartItems.find((c) => c.menuItemId === menuItemId)?.quantity ?? 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      {/* Menu panel */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              New Order {tableId && <span className="text-blue-600">— Table {tableId.slice(0, 6)}</span>}
            </h1>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm
                         focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                         dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-200 px-4 py-2 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !activeCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-center text-sm text-gray-500">Loading menu…</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-center text-sm text-gray-500">No items found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => {
                const qty = getCartQty(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col rounded-xl border border-gray-200 bg-gray-50 p-3
                               dark:border-gray-700 dark:bg-gray-800"
                  >
                    <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      ${Number(item.price).toFixed(2)}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add
                        </button>
                      ) : (
                        <div className="flex w-full items-center justify-between">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, qty - 1)}
                            className="rounded-lg bg-gray-200 p-1.5 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, qty + 1)}
                            className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel — desktop always visible, mobile as overlay */}
      <div
        className={`fixed inset-0 z-30 lg:relative lg:inset-auto lg:z-auto lg:flex lg:w-80 lg:shrink-0 ${
          showCart ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Mobile backdrop */}
        <div
          className="absolute inset-0 bg-black/50 lg:hidden"
          onClick={() => setShowCart(false)}
          aria-hidden="true"
        />
        <div className="relative ml-auto flex h-full w-full max-w-xs flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 lg:max-w-none lg:shadow-none">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Order Summary
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cartItems.length === 0 ? (
              <p className="text-center text-sm text-gray-400">Your cart is empty.</p>
            ) : (
              <ul className="space-y-3">
                {cartItems.map((item) => (
                  <li key={item.menuItemId} className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {item.menuItemName}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${item.unitPrice.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.menuItemId)}
                        className="ml-1 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        aria-label={`Remove ${item.menuItemName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Notes */}
            <div className="mt-4">
              <label htmlFor="order-notes" className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Order notes
              </label>
              <textarea
                id="order-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests…"
                className="mt-1 w-full resize-none rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm
                           focus:border-blue-500 focus:outline-none
                           dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-3 flex justify-between text-base font-bold text-gray-900 dark:text-white">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>

            {error && (
              <p className="mb-2 rounded bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white
                         hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : `Place Order · ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="mt-2 w-full rounded-lg py-2 text-sm text-gray-500 hover:text-red-500"
            >
              Clear order
            </button>
          </div>
        </div>
      </div>

      {/* Mobile cart FAB */}
      <button
        type="button"
        onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg lg:hidden"
        aria-label={`View cart — ${cartCount} items`}
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-semibold">{cartCount} · ${cartTotal.toFixed(2)}</span>
      </button>
    </div>
  );
}
