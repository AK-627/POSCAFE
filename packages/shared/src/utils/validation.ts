import { z } from 'zod';
import type { UserRole } from '../types/user';
import type { TableStatus } from '../types/table';
import type { OrderStatus } from '../types/order';
import type { PaymentMethod } from '../types/payment';

// Common validation schemas
export const emailSchema = z.string().email().min(1).max(255);
export const passwordSchema = z.string().min(8).max(100);
export const uuidSchema = z.string().uuid();
export const positiveNumberSchema = z.number().positive();
export const nonNegativeNumberSchema = z.number().nonnegative();

// Tenant validation
export const tenantSubdomainSchema = z.string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens');

// User validation
export const userRoleSchema = z.enum(['owner', 'manager', 'cashier', 'waiter', 'chef']);

// Table validation
export const tableStatusSchema = z.enum(['available', 'occupied', 'reserved', 'cleaning']);

// Order validation
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled', 'paid']);

// Payment validation
export const paymentMethodSchema = z.enum(['cash', 'card', 'digital_wallet', 'bank_transfer']);

// Validation helpers
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function validateUuid(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

export function validateSubdomain(subdomain: string): boolean {
  return tenantSubdomainSchema.safeParse(subdomain).success;
}

// Type guards
export function isValidUserRole(role: string): role is UserRole {
  return userRoleSchema.safeParse(role).success;
}

export function isValidTableStatus(status: string): status is TableStatus {
  return tableStatusSchema.safeParse(status).success;
}

export function isValidOrderStatus(status: string): status is OrderStatus {
  return orderStatusSchema.safeParse(status).success;
}

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return paymentMethodSchema.safeParse(method).success;
}