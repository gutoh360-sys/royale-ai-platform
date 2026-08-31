export interface Product {
  id: string;
  sku: string;
  bling_id: string;
  ean: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  category_id: string;
  price: number;
  cost: number | null;
  stock_quantity: number;
  active: boolean;
  attributes: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export interface Category {
  id: string;
  bling_id: string;
  name: string;
  parent_id: string | null;
  path: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost: number | null;
  created_at: string;
}

export interface Order {
  id: string;
  external_id: string;
  marketplace: string;
  order_number: string;
  customer_name: string;
  customer_document: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: "pending" | "completed" | "cancelled";
  total_amount: number;
  shipping_amount: number | null;
  discount_amount: number | null;
  payment_method: string | null;
  notes: string | null;
  ordered_at: string;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  items: OrderItem[];
}

export interface SalesByPeriod {
  day: string;
  total_orders: number;
  revenue: number;
}

export interface DashboardAnalytics {
  total_products: number;
  active_products: number;
  products_without_stock: number;
  total_stock: number;
  total_orders: number;
  orders_by_status: Record<string, number>;
  revenue: number;
  average_ticket: number | null;
  sales_by_period: SalesByPeriod[];
}

export interface SyncTriggerResponse {
  entity: string;
  sync_type: string;
  status: string;
  items_processed: number;
  items_created: number;
  items_updated: number;
  items_failed: number;
  items_skipped: number;
  error_message: string | null;
}

export interface ConnectionStatus {
  provider: string;
  status: string;
  connected: boolean;
  last_authenticated_at: string | null;
  scopes: string[] | null;
}
