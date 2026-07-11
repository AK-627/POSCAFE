'use client';

/**
 * AppShell — the main authenticated layout with sidebar navigation.
 * Wraps all dashboard pages.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  LayoutGrid,
  ChefHat,
  BarChart2,
  Users,
  Settings,
  LogOut,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../lib/stores/auth.store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'cashier', 'waiter', 'chef'] },
  { label: 'Orders', href: '/dashboard/orders', icon: ShoppingCart, roles: ['owner', 'manager', 'cashier', 'waiter'] },
  { label: 'Tables', href: '/dashboard/tables', icon: LayoutGrid, roles: ['owner', 'manager', 'cashier', 'waiter'] },
  { label: 'Kitchen', href: '/dashboard/kitchen', icon: ChefHat, roles: ['owner', 'manager', 'chef'] },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart2, roles: ['owner', 'manager'] },
  { label: 'Staff', href: '/dashboard/staff', icon: Users, roles: ['owner', 'manager'] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['owner', 'manager'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode((d) => !d);
    document.documentElement.classList.toggle('dark');
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => !user || item.roles.includes(user.role),
  );

  const Sidebar = () => (
    <nav
      aria-label="Main navigation"
      className="flex h-full flex-col bg-white shadow-sm dark:bg-gray-900"
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">☁</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">Sky Nether</span>
        </Link>
      </div>

      {/* Nav Links */}
      <ul role="list" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* User + Actions */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs capitalize text-gray-500 dark:text-gray-400">
              {user?.role}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700
                     hover:bg-red-50 hover:text-red-600
                     dark:text-gray-300 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-64 z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode
                ? <Sun className="h-5 w-5" aria-hidden="true" />
                : <Moon className="h-5 w-5" aria-hidden="true" />
              }
            </button>

            {/* Notifications bell */}
            <Link
              href="/dashboard/notifications"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
