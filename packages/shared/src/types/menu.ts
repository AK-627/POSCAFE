export interface MenuCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  preparationTime?: number; // in minutes
  isAvailable: boolean;
  displayOrder: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemAvailabilityUpdate {
  isAvailable: boolean;
}

export interface MenuItemPriceUpdate {
  price: number;
  effectiveFrom: Date;
}