import type { BusinessProduct } from "@/features/business-context/entities";

export interface BusinessContextBuilder {
  buildProductContext(productId: string): Promise<BusinessProduct>;
  buildDashboardContext(): Promise<unknown>;
  buildAIContext(productId: string): Promise<unknown>;
}

export interface BusinessContextProvider {
  getProduct(productId: string): Promise<BusinessProduct>;
  getContext(entityType: string, id: string): Promise<unknown>;
}

export interface BusinessContextService {
  builder: BusinessContextBuilder;
  provider: BusinessContextProvider;
}
