import type { StockProduct, InventoryAnalysis } from "@/features/inventory-intelligence/types"
import type { ProductPurchaseData } from "@/features/purchase-intelligence/types"
import { DefaultInventoryIntelligenceService } from "@/features/inventory-intelligence/services/inventory-intelligence-service"

const refDate = new Date("2026-07-27")

const mockProducts: StockProduct[] = [
  { id: "p1", sku: "BT-2001", name: "Fone Bluetooth Pro", category: "Eletrônicos", currentStock: 5, reservedStock: 2, incomingStock: 0, averageDailySales: 3.2, salesLast30Days: 96, salesLast90Days: 280, cost: 82, salePrice: 199, minimumStock: 15, maximumStock: 120, leadTimeDays: 7, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-10", active: true },
  { id: "p2", sku: "RW-3001", name: "Relógio Esportivo", category: "Eletrônicos", currentStock: 0, reservedStock: 0, incomingStock: 20, averageDailySales: 1.5, salesLast30Days: 45, salesLast90Days: 130, cost: 120, salePrice: 299, minimumStock: 10, maximumStock: 80, leadTimeDays: 5, lastSaleDate: "2026-07-26", lastPurchaseDate: "2026-07-15", active: true },
  { id: "p3", sku: "AC-100", name: "AquaClean Filtro", category: "Casa", currentStock: 100, reservedStock: 5, incomingStock: 0, averageDailySales: 2.8, salesLast30Days: 84, salesLast90Days: 250, cost: 12, salePrice: 35, minimumStock: 20, maximumStock: 200, leadTimeDays: 10, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-20", active: true },
  { id: "p4", sku: "SB-X1", name: "SmartBand X", category: "Eletrônicos", currentStock: 45, reservedStock: 3, incomingStock: 0, averageDailySales: 0.4, salesLast30Days: 12, salesLast90Days: 35, cost: 55, salePrice: 149, minimumStock: 5, maximumStock: 60, leadTimeDays: 14, lastSaleDate: "2026-07-25", lastPurchaseDate: "2026-06-15", active: true },
  { id: "p5", sku: "CE-200", name: "Cadeira Ergonômica Y", category: "Móveis", currentStock: 200, reservedStock: 10, incomingStock: 0, averageDailySales: 0.8, salesLast30Days: 24, salesLast90Days: 70, cost: 320, salePrice: 799, minimumStock: 10, maximumStock: 50, leadTimeDays: 12, lastSaleDate: "2026-07-26", lastPurchaseDate: "2026-06-30", active: true },
  { id: "p6", sku: "MO-400", name: "Mouse Óptico Slim", category: "Eletrônicos", currentStock: 8, reservedStock: 1, incomingStock: 30, averageDailySales: 0, salesLast30Days: 0, salesLast90Days: 2, cost: 25, salePrice: 79, minimumStock: 5, maximumStock: 100, leadTimeDays: 6, lastSaleDate: "2026-05-15", lastPurchaseDate: "2026-03-10", active: true },
  { id: "p7", sku: "TV-5501", name: "TV 55 Polegadas 4K", category: "Eletrônicos", currentStock: 5, reservedStock: 1, incomingStock: 0, averageDailySales: 1.1, salesLast30Days: 33, salesLast90Days: 95, cost: 1800, salePrice: 3499, minimumStock: 3, maximumStock: 20, leadTimeDays: 15, lastSaleDate: "2026-07-26", lastPurchaseDate: "2026-07-01", active: true },
  { id: "p8", sku: "TA-700", name: "Tablet 10\" Tela HD", category: "Eletrônicos", currentStock: 30, reservedStock: 2, incomingStock: 0, averageDailySales: 0.6, salesLast30Days: 18, salesLast90Days: 50, cost: 350, salePrice: 899, minimumStock: 5, maximumStock: 30, leadTimeDays: 10, lastSaleDate: "2026-07-24", lastPurchaseDate: "2026-06-20", active: true },
  { id: "p9", sku: "CA-050", name: "Carregador Universal", category: "Eletrônicos", currentStock: 340, reservedStock: 20, incomingStock: 0, averageDailySales: 5.1, salesLast30Days: 153, salesLast90Days: 450, cost: 8, salePrice: 29, minimumStock: 50, maximumStock: 150, leadTimeDays: 5, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-05", active: true },
  { id: "p10", sku: "KP-001", name: "Kit de Panelas Antiaderentes", category: "Casa", currentStock: 0, reservedStock: 0, incomingStock: 0, averageDailySales: 0, salesLast30Days: 0, salesLast90Days: 0, cost: 90, salePrice: 249, minimumStock: 5, maximumStock: 30, leadTimeDays: 10, lastSaleDate: "2026-04-01", lastPurchaseDate: "2026-03-15", active: true },
  { id: "p11", sku: "ML-050", name: "Mochila Laptop 15\"", category: "Moda", currentStock: 10, reservedStock: 1, incomingStock: 0, averageDailySales: 2.1, salesLast30Days: 63, salesLast90Days: 180, cost: 42, salePrice: 129, minimumStock: 10, maximumStock: 60, leadTimeDays: 6, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-18", active: true },
  { id: "p12", sku: "LA-300", name: "Lâmpada Inteligente RGB", category: "Casa", currentStock: 50, reservedStock: 0, incomingStock: 0, averageDailySales: 0.7, salesLast30Days: 21, salesLast90Days: 60, cost: 22, salePrice: 69, minimumStock: 10, maximumStock: 80, leadTimeDays: 5, lastSaleDate: "2026-07-26", lastPurchaseDate: "2026-07-05", active: true },
]

export function buildMockAnalyses(): { analyses: InventoryAnalysis[]; productData: Record<string, ProductPurchaseData> } {
  const service = new DefaultInventoryIntelligenceService()
  const analyses = service.analyzeProducts(mockProducts, refDate)
  const productData: Record<string, ProductPurchaseData> = {}
  for (const p of mockProducts) {
    productData[p.id] = { averageDailySales: p.averageDailySales, leadTimeDays: p.leadTimeDays, salePrice: p.salePrice, cost: p.cost }
  }
  return { analyses, productData }
}
