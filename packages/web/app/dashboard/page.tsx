'use client';

import { useAuthStore } from '../../lib/stores/auth.store';

export default function DashboardHomePage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good morning, {user?.firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s what&apos;s happening at your café today.
        </p>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Open Orders', value: '—', color: 'blue' },
          { label: 'Tables Occupied', value: '—', color: 'amber' },
          { label: "Today's Revenue", value: '—', color: 'green' },
          { label: 'Active Staff', value: '—', color: 'purple' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Take an Order', desc: 'Browse menu and create orders', href: '/dashboard/orders/new', emoji: '🛒' },
          { title: 'Floor Plan', desc: 'View and manage tables', href: '/dashboard/tables', emoji: '🪑' },
          { title: 'Kitchen Display', desc: 'Track order preparation', href: '/dashboard/kitchen', emoji: '👨‍🍳' },
          { title: 'Reports', desc: 'Sales and analytics', href: '/dashboard/reports', emoji: '📊' },
          { title: 'Staff', desc: 'Manage schedules and performance', href: '/dashboard/staff', emoji: '👥' },
          { title: 'Settings', desc: 'Configure your café', href: '/dashboard/settings', emoji: '⚙️' },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm
                       transition-shadow hover:shadow-md
                       dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
          >
            <span className="text-3xl" aria-hidden="true">{card.emoji}</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{card.title}</p>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{card.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
