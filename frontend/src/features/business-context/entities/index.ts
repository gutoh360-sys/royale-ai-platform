export interface BusinessProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  cost: number;
  images: string[];
  attributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessOrder {
  id: string;
  customerId: string;
  items: BusinessOrderItem[];
  total: number;
  status: string;
  marketplace: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessOrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface BusinessCustomer {
  id: string;
  name: string;
  email: string;
  document: string;
  phone: string;
  createdAt: string;
}

export interface BusinessInventory {
  productId: string;
  sku: string;
  quantity: number;
  reserved: number;
  available: number;
  warehouse: string;
  updatedAt: string;
}

export interface BusinessMarketplace {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface BusinessTrend {
  keyword: string;
  productId?: string;
  category?: string;
  score: number;
  period: string;
  source: string;
}
