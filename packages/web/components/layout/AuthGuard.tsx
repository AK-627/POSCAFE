'use client';

/**
 * AuthGuard — redirects unauthenticated users to /login.
 * Wraps protected routes.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/auth.store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchProfile } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace('/login');
    } else if (isAuthenticated) {
      // Refresh profile on mount to pick up any server-side changes
      fetchProfile();
    }
  }, [isAuthenticated, isLoading, router, fetchProfile]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-sm text-gray-500">Checking session…</div>
      </div>
    );
  }

  return <>{children}</>;
}
