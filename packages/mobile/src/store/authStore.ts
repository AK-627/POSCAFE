import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '@skynether/shared/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

// Mock user data for development
const mockUsers: Record<string, User> = {
  'owner@cafe.com': {
    id: '1',
    tenantId: 'tenant-1',
    email: 'owner@cafe.com',
    firstName: 'Alex',
    lastName: 'Johnson',
    role: 'owner' as UserRole,
    isActive: true,
    passwordHash: 'mock-hash',
    lastLoginAt: new Date(),
    createdAt: new Date()
  },
  'manager@cafe.com': {
    id: '2',
    tenantId: 'tenant-1',
    email: 'manager@cafe.com',
    firstName: 'Sarah',
    lastName: 'Miller',
    role: 'manager' as UserRole,
    isActive: true,
    passwordHash: 'mock-hash',
    lastLoginAt: new Date(),
    createdAt: new Date()
  },
  'cashier@cafe.com': {
    id: '3',
    tenantId: 'tenant-1',
    email: 'cashier@cafe.com',
    firstName: 'Mike',
    lastName: 'Wilson',
    role: 'cashier' as UserRole,
    isActive: true,
    passwordHash: 'mock-hash',
    lastLoginAt: new Date(),
    createdAt: new Date()
  },
  'waiter@cafe.com': {
    id: '4',
    tenantId: 'tenant-1',
    email: 'waiter@cafe.com',
    firstName: 'Emma',
    lastName: 'Davis',
    role: 'waiter' as UserRole,
    isActive: true,
    passwordHash: 'mock-hash',
    lastLoginAt: new Date(),
    createdAt: new Date()
  },
  'chef@cafe.com': {
    id: '5',
    tenantId: 'tenant-1',
    email: 'chef@cafe.com',
    firstName: 'David',
    lastName: 'Brown',
    role: 'chef' as UserRole,
    isActive: true,
    passwordHash: 'mock-hash',
    lastLoginAt: new Date(),
    createdAt: new Date()
  }
};

const API_BASE_URL = 'http://10.0.2.2:4000';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            throw new Error('Authentication failed');
          }

          const data = await response.json();
          const user = data.user as User;

          set({
            user,
            token: data.access_token,
            isAuthenticated: true,
          });
          return;
        } catch (error) {
          const user = mockUsers[email];
          if (user && password === 'password123') {
            set({
              user,
              token: 'mock-jwt-token-' + Date.now(),
              isAuthenticated: true,
            });
            return;
          }
          throw new Error('Invalid credentials. Please try again.');
        }
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
      
      setUser: (user: User) => {
        set({ user });
      },
      
      setToken: (token: string) => {
        set({ token });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
