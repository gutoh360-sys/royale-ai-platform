import type {
  BusinessProduct,
  BusinessOrder,
  BusinessCustomer,
  BusinessInventory,
  BusinessMarketplace,
  BusinessTrend,
} from "@/features/business-context/entities";

export interface ProductAggregator {
  aggregate(productId: string): Promise<BusinessProduct>;
  aggregateMany(productIds: string[]): Promise<BusinessProduct[]>;
}

export interface OrderAggregator {
  aggregate(orderId: string): Promise<BusinessOrder>;
  aggregateByPeriod(start: string, end: string): Promise<BusinessOrder[]>;
}

export interface CustomerAggregator {
  aggregate(customerId: string): Promise<BusinessCustomer>;
  aggregateByDocument(document: string): Promise<BusinessCustomer>;
}

export interface InventoryAggregator {
  aggregate(productId: string): Promise<BusinessInventory>;
  aggregateByWarehouse(warehouse: string): Promise<BusinessInventory[]>;
}

export interface MarketplaceAggregator {
  aggregate(marketplaceId: string): Promise<BusinessMarketplace>;
  listEnabled(): Promise<BusinessMarketplace[]>;
}

export interface TrendAggregator {
  aggregate(keyword: string): Promise<BusinessTrend>;
  aggregateByCategory(category: string): Promise<BusinessTrend[]>;
}
