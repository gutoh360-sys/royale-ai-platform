export interface AIPredictionService {
  predictSales(productId: string, days: number): Promise<number[]>;
  predictDemand(categoryId: string): Promise<number>;
  predictPrice(productId: string): Promise<number>;
}
