export interface Customer {
  id: string;
  tenantId: string;
  phoneNumber?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: Date;
  createdAt: Date;
}

export interface CreateCustomerRequest {
  phoneNumber?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateLoyaltyPointsRequest {
  points: number;
  reason: string;
}