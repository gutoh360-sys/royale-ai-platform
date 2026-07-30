import type { ProductPerformance, MarketplaceSummary, SalesInput } from "@/features/sales-intelligence/types"
import type { InventoryAnalysis } from "@/features/inventory-intelligence/types"
import type { StockProduct } from "@/features/inventory-intelligence/types"
import { DefaultInventoryIntelligenceService } from "@/features/inventory-intelligence/services/inventory-intelligence-service"

const refDate = new Date("2026-07-27")

const mockProducts: StockProduct[] = [
  { id: "p1", sku: "ELEC-001", name: "Fone Bluetooth Pro", category: "Eletrônicos", currentStock: 200, reservedStock: 30, incomingStock: 0, averageDailySales: 15, salesLast30Days: 450, salesLast90Days: 1300, cost: 45, salePrice: 120, minimumStock: 50, maximumStock: 500, leadTimeDays: 7, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-20", active: true },
  { id: "p2", sku: "ELEC-002", name: "Carregador USB-C 65W", category: "Eletrônicos", currentStock: 500, reservedStock: 20, incomingStock: 0, averageDailySales: 3, salesLast30Days: 90, salesLast90Days: 280, cost: 18, salePrice: 50, minimumStock: 30, maximumStock: 800, leadTimeDays: 5, lastSaleDate: "2026-07-26", lastPurchaseDate: "2026-07-15", active: true },
  { id: "p3", sku: "FASH-001", name: "Camiseta Algodão Premium", category: "Moda", currentStock: 30, reservedStock: 5, incomingStock: 100, averageDailySales: 8, salesLast30Days: 240, salesLast90Days: 700, cost: 15, salePrice: 50, minimumStock: 40, maximumStock: 300, leadTimeDays: 10, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-10", active: true },
  { id: "p4", sku: "FASH-002", name: "Tênis Esportivo Air", category: "Moda", currentStock: 15, reservedStock: 2, incomingStock: 0, averageDailySales: 5, salesLast30Days: 150, salesLast90Days: 420, cost: 80, salePrice: 180, minimumStock: 20, maximumStock: 150, leadTimeDays: 15, lastSaleDate: "2026-07-26", lastPurchaseDate: "2026-07-01", active: true },
  { id: "p5", sku: "HOME-001", name: "Kit Organizador 5 peças", category: "Casa & Jardim", currentStock: 400, reservedStock: 10, incomingStock: 0, averageDailySales: 2, salesLast30Days: 60, salesLast90Days: 200, cost: 12, salePrice: 35, minimumStock: 30, maximumStock: 600, leadTimeDays: 8, lastSaleDate: "2026-07-25", lastPurchaseDate: "2026-07-12", active: true },
  { id: "p6", sku: "HOME-002", name: "Luminária Led Decorativa", category: "Casa & Jardim", currentStock: 8, reservedStock: 1, incomingStock: 0, averageDailySales: 4, salesLast30Days: 120, salesLast90Days: 350, cost: 25, salePrice: 70, minimumStock: 15, maximumStock: 120, leadTimeDays: 12, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-06-28", active: true },
  { id: "p7", sku: "SPRT-001", name: "Garrafa Térmica 1L", category: "Esportes", currentStock: 120, reservedStock: 8, incomingStock: 0, averageDailySales: 6, salesLast30Days: 180, salesLast90Days: 520, cost: 20, salePrice: 55, minimumStock: 25, maximumStock: 200, leadTimeDays: 6, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-18", active: true },
  { id: "p8", sku: "SPRT-002", name: "Tapete Yoga Anti-Derrapante", category: "Esportes", currentStock: 3, reservedStock: 0, incomingStock: 0, averageDailySales: 7, salesLast30Days: 210, salesLast90Days: 600, cost: 30, salePrice: 75, minimumStock: 20, maximumStock: 150, leadTimeDays: 14, lastSaleDate: "2026-07-26", lastPurchaseDate: "2026-06-20", active: true },
  { id: "p9", sku: "BEAU-001", name: "Perfume Importado 50ml", category: "Beleza", currentStock: 10, reservedStock: 2, incomingStock: 0, averageDailySales: 3, salesLast30Days: 90, salesLast90Days: 260, cost: 90, salePrice: 220, minimumStock: 10, maximumStock: 80, leadTimeDays: 20, lastSaleDate: "2026-07-25", lastPurchaseDate: "2026-06-25", active: true },
  { id: "p10", sku: "BEAU-002", name: "Creme Hidratante Facial", category: "Beleza", currentStock: 250, reservedStock: 5, incomingStock: 0, averageDailySales: 1, salesLast30Days: 30, salesLast90Days: 95, cost: 8, salePrice: 25, minimumStock: 20, maximumStock: 400, leadTimeDays: 9, lastSaleDate: "2026-07-20", lastPurchaseDate: "2026-07-05", active: true },
  { id: "p11", sku: "ELEC-003", name: "Webcam HD 1080p", category: "Eletrônicos", currentStock: 45, reservedStock: 3, incomingStock: 0, averageDailySales: 2, salesLast30Days: 60, salesLast90Days: 180, cost: 55, salePrice: 130, minimumStock: 15, maximumStock: 100, leadTimeDays: 10, lastSaleDate: "2026-07-24", lastPurchaseDate: "2026-07-08", active: true },
  { id: "p12", sku: "FASH-003", name: "Jaqueta Corta-Vento", category: "Moda", currentStock: 60, reservedStock: 4, incomingStock: 0, averageDailySales: 1, salesLast30Days: 30, salesLast90Days: 100, cost: 60, salePrice: 150, minimumStock: 15, maximumStock: 100, leadTimeDays: 12, lastSaleDate: "2026-07-22", lastPurchaseDate: "2026-07-02", active: true },
  { id: "p13", sku: "HOME-003", name: "Conjunto Panelas Antiaderentes", category: "Casa & Jardim", currentStock: 5, reservedStock: 1, incomingStock: 0, averageDailySales: 4, salesLast30Days: 120, salesLast90Days: 340, cost: 70, salePrice: 160, minimumStock: 10, maximumStock: 80, leadTimeDays: 18, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-06-30", active: true },
  { id: "p14", sku: "SPRT-003", name: "Bicicleta Ergométrica", category: "Esportes", currentStock: 2, reservedStock: 0, incomingStock: 0, averageDailySales: 2, salesLast30Days: 60, salesLast90Days: 170, cost: 350, salePrice: 700, minimumStock: 5, maximumStock: 30, leadTimeDays: 25, lastSaleDate: "2026-07-23", lastPurchaseDate: "2026-06-15", active: true },
  { id: "p15", sku: "BEAU-003", name: "Kit Maquiagem 12 cores", category: "Beleza", currentStock: 180, reservedStock: 10, incomingStock: 0, averageDailySales: 5, salesLast30Days: 150, salesLast90Days: 430, cost: 22, salePrice: 60, minimumStock: 30, maximumStock: 250, leadTimeDays: 7, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-14", active: true },
  { id: "p16", sku: "ELEC-004", name: "Monitor 27\" 4K", category: "Eletrônicos", currentStock: 7, reservedStock: 1, incomingStock: 5, averageDailySales: 1, salesLast30Days: 30, salesLast90Days: 90, cost: 400, salePrice: 850, minimumStock: 5, maximumStock: 30, leadTimeDays: 20, lastSaleDate: "2026-07-21", lastPurchaseDate: "2026-06-28", active: true },
]

const mockProductPerformances: ProductPerformance[] = [
  { productId: "p1", sku: "ELEC-001", productName: "Fone Bluetooth Pro", category: "Eletrônicos", views: 8500, conversions: 510, orders: 450, revenue: 54000, conversionRate: 0.06, marginPercentage: 62.5 },
  { productId: "p2", sku: "ELEC-002", productName: "Carregador USB-C 65W", category: "Eletrônicos", views: 3200, conversions: 96, orders: 90, revenue: 4500, conversionRate: 0.03, marginPercentage: 64 },
  { productId: "p3", sku: "FASH-001", productName: "Camiseta Algodão Premium", category: "Moda", views: 6200, conversions: 310, orders: 240, revenue: 12000, conversionRate: 0.05, marginPercentage: 70 },
  { productId: "p4", sku: "FASH-002", productName: "Tênis Esportivo Air", category: "Moda", views: 4800, conversions: 120, orders: 150, revenue: 27000, conversionRate: 0.025, marginPercentage: 55.6 },
  { productId: "p5", sku: "HOME-001", productName: "Kit Organizador 5 peças", category: "Casa & Jardim", views: 1500, conversions: 30, orders: 60, revenue: 2100, conversionRate: 0.02, marginPercentage: 65.7 },
  { productId: "p6", sku: "HOME-002", productName: "Luminária Led Decorativa", category: "Casa & Jardim", views: 4200, conversions: 168, orders: 120, revenue: 8400, conversionRate: 0.04, marginPercentage: 64.3 },
  { productId: "p7", sku: "SPRT-001", productName: "Garrafa Térmica 1L", category: "Esportes", views: 5600, conversions: 280, orders: 180, revenue: 9900, conversionRate: 0.05, marginPercentage: 63.6 },
  { productId: "p8", sku: "SPRT-002", productName: "Tapete Yoga Anti-Derrapante", category: "Esportes", views: 7200, conversions: 288, orders: 210, revenue: 15750, conversionRate: 0.04, marginPercentage: 60 },
  { productId: "p9", sku: "BEAU-001", productName: "Perfume Importado 50ml", category: "Beleza", views: 3800, conversions: 76, orders: 90, revenue: 19800, conversionRate: 0.02, marginPercentage: 59.1 },
  { productId: "p10", sku: "BEAU-002", productName: "Creme Hidratante Facial", category: "Beleza", views: 900, conversions: 18, orders: 30, revenue: 750, conversionRate: 0.02, marginPercentage: 68 },
  { productId: "p11", sku: "ELEC-003", productName: "Webcam HD 1080p", category: "Eletrônicos", views: 2100, conversions: 42, orders: 60, revenue: 7800, conversionRate: 0.02, marginPercentage: 57.7 },
  { productId: "p12", sku: "FASH-003", productName: "Jaqueta Corta-Vento", category: "Moda", views: 2800, conversions: 28, orders: 30, revenue: 4500, conversionRate: 0.01, marginPercentage: 60 },
  { productId: "p13", sku: "HOME-003", productName: "Conjunto Panelas Antiaderentes", category: "Casa & Jardim", views: 3400, conversions: 170, orders: 120, revenue: 19200, conversionRate: 0.05, marginPercentage: 56.3 },
  { productId: "p14", sku: "SPRT-003", productName: "Bicicleta Ergométrica", category: "Esportes", views: 1100, conversions: 22, orders: 60, revenue: 42000, conversionRate: 0.02, marginPercentage: 50 },
  { productId: "p15", sku: "BEAU-003", productName: "Kit Maquiagem 12 cores", category: "Beleza", views: 4800, conversions: 240, orders: 150, revenue: 9000, conversionRate: 0.05, marginPercentage: 63.3 },
  { productId: "p16", sku: "ELEC-004", productName: "Monitor 27\" 4K", category: "Eletrônicos", views: 2500, conversions: 38, orders: 30, revenue: 25500, conversionRate: 0.015, marginPercentage: 52.9 },
]

const mockMarketplaceSummary: MarketplaceSummary = {
  averageGrowth: 12,
  health: 82,
  totalRevenue: 278400,
  totalOrders: 2310,
  period: "Últimos 30 dias",
}

const inventoryService = new DefaultInventoryIntelligenceService()
const inventoryAnalyses: InventoryAnalysis[] = inventoryService.analyzeProducts(mockProducts, refDate)

export function buildSalesInput(): SalesInput {
  return {
    market: mockMarketplaceSummary,
    products: mockProductPerformances,
    inventory: inventoryAnalyses,
  }
}
