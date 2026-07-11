'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      // error handled in store
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-900">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            ☁ Sky Nether
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Café Management System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                         text-gray-900 placeholder-gray-400 shadow-sm
                         focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                         dark:border-gray-600 dark:bg-gray-800 dark:text-white
                         dark:placeholder-gray-500 dark:focus:border-blue-400"
              placeholder="you@cafe.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                         text-gray-900 placeholder-gray-400 shadow-sm
                         focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                         dark:border-gray-600 dark:bg-gray-800 dark:text-white
                         dark:placeholder-gray-500 dark:focus:border-blue-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold
                       text-white shadow-sm transition-colors
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:cursor-not-allowed disabled:opacity-60
                       dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
