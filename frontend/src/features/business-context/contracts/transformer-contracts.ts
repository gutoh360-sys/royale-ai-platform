import type {
  BusinessProduct,
  BusinessOrder,
  BusinessCustomer,
} from "@/features/business-context/entities";

export interface ProductTransformer<T> {
  toBusiness(input: T): Promise<BusinessProduct>;
  fromBusiness(entity: BusinessProduct): Promise<T>;
}

export interface OrderTransformer<T> {
  toBusiness(input: T): Promise<BusinessOrder>;
  fromBusiness(entity: BusinessOrder): Promise<T>;
}

export interface CustomerTransformer<T> {
  toBusiness(input: T): Promise<BusinessCustomer>;
  fromBusiness(entity: BusinessCustomer): Promise<T>;
}
