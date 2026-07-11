export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'paid';
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface Order {
  id: string;
  tenantId: string;
  branchId: string;
  tableId?: string;
  customerId?: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  taxAmount: number;
  serviceCharge: number;
  discountAmount: number;
  finalAmount: number;
  notes?: string;
  servedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  servedAt?: Date;
  paidAt?: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
  status: OrderItemStatus;
  preparedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderRequest {
  tableId?: string;
  customerId?: string;
  items: CreateOrderItem[];
  notes?: string;
}

export interface CreateOrderItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface UpdateOrderItemStatusRequest {
  status: OrderItemStatus;
  preparedBy?: string;
}