export type PaymentMethod = 'cash' | 'card' | 'digital_wallet' | 'bank_transfer';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  tenantId: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  status: PaymentStatus;
  processedBy?: string;
  processedAt: Date;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  tenantId: string;
  orderId: string;
  invoiceNumber: string;
  pdfUrl?: string;
  emailedTo?: string;
  emailedAt?: Date;
  createdAt: Date;
}

export interface ProcessPaymentRequest {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string;
}