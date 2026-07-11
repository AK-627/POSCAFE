'use client';

/**
 * Zustand auth store — manages the current user session.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { setTokens, clearTokens } from '../api/client';

export interface AuthUser {
  id: string;
  tenantId: string;
  branchId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'manager' | 'cashier' | 'waiter' | 'chef';
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<{
            access_token: string;
            refresh_token: string;
            user: AuthUser;
          }>('/auth/login', { email, password });

          const { access_token, refresh_token, user } = response.data;
          setTokens(access_token, refresh_token);

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Login failed. Please check your credentials.';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        clearTokens();
        set({ user: null, isAuthenticated: false, error: null });
      },

      fetchProfile: async () => {
        if (!get().isAuthenticated) return;
        try {
          const response = await api.get<AuthUser>('/auth/profile');
          set({ user: response.data });
        } catch {
          // Token expired / invalid — force logout
          clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sky-nether-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
