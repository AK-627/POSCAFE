import { v4 as uuidv4, validate as validateUuid } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function generateOrderNumber(tenantId: string, sequence: number): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const tenantPrefix = tenantId.slice(0, 3).toUpperCase();
  const sequenceStr = sequence.toString().padStart(4, '0');
  
  return `${tenantPrefix}-${year}${month}${day}-${sequenceStr}`;
}

export function generateInvoiceNumber(tenantId: string, sequence: number): string {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const tenantPrefix = tenantId.slice(0, 3).toUpperCase();
  const sequenceStr = sequence.toString().padStart(5, '0');
  
  return `INV-${tenantPrefix}-${year}${month}-${sequenceStr}`;
}

export function generateCustomerId(tenantId: string, phoneNumber?: string, email?: string): string {
  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    return `CUST-${tenantId.slice(0, 3)}-PH${cleanPhone}`;
  } else if (email) {
    const emailPrefix = email.split('@')[0].slice(0, 8);
    return `CUST-${tenantId.slice(0, 3)}-EM${emailPrefix}`;
  } else {
    return `CUST-${tenantId.slice(0, 3)}-${Date.now().toString().slice(-6)}`;
  }
}

export function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `DEV-${timestamp}-${random}`.toUpperCase();
}

export function generateTableNumber(branchId: string, sequence: number): string {
  const branchPrefix = branchId.slice(0, 2).toUpperCase();
  return `${branchPrefix}-${sequence.toString().padStart(3, '0')}`;
}

export function isValidId(id: string): boolean {
  return validateUuid(id);
}

export function normalizeId(id: string): string {
  return id.toLowerCase().replace(/\s+/g, '-');
}

export function shortId(id: string, length: number = 8): string {
  return id.slice(0, length);
}