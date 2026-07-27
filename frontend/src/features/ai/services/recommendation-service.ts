export interface AIRecommendationService {
  getProductRecommendations(productId: string): Promise<string[]>;
  getCategoryRecommendations(categoryId: string): Promise<string[]>;
  getPersonalizedRecommendations(userId: string): Promise<string[]>;
}
