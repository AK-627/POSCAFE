export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface Table {
  id: string;
  tenantId: string;
  branchId: string;
  tableNumber: string;
  tableName?: string;
  capacity: number;
  positionX?: number;
  positionY?: number;
  status: TableStatus;
  currentOrderId?: string;
  createdAt: Date;
}

export interface TableGroup {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  tableIds: string[];
  createdAt: Date;
}

export interface TableStatusUpdate {
  status: TableStatus;
  orderId?: string;
}