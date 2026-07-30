import type { FinancialInput } from "@/features/financial-intelligence/types"
import type { SalesOpportunity } from "@/features/sales-intelligence/types"
import type { PurchaseSummary } from "@/features/purchase-intelligence/types"
import type { StockProduct, InventoryAnalysis } from "@/features/inventory-intelligence/types"
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
  { id: "p17", sku: "FASH-004", name: "Bolsa Couro Premium", category: "Moda", currentStock: 8, reservedStock: 1, incomingStock: 0, averageDailySales: 1, salesLast30Days: 30, salesLast90Days: 85, cost: 120, salePrice: 280, minimumStock: 5, maximumStock: 30, leadTimeDays: 20, lastSaleDate: "2026-07-20", lastPurchaseDate: "2026-06-10", active: true },
  { id: "p18", sku: "HOME-004", name: "Sofá 3 Lugares", category: "Casa & Jardim", currentStock: 3, reservedStock: 0, incomingStock: 0, averageDailySales: 1, salesLast30Days: 15, salesLast90Days: 50, cost: 800, salePrice: 1800, minimumStock: 2, maximumStock: 10, leadTimeDays: 30, lastSaleDate: "2026-07-15", lastPurchaseDate: "2026-06-01", active: true },
  { id: "p19", sku: "SPRT-004", name: "Kit Pesos 10kg", category: "Esportes", currentStock: 35, reservedStock: 2, incomingStock: 0, averageDailySales: 3, salesLast30Days: 90, salesLast90Days: 260, cost: 40, salePrice: 90, minimumStock: 10, maximumStock: 60, leadTimeDays: 8, lastSaleDate: "2026-07-25", lastPurchaseDate: "2026-07-10", active: true },
  { id: "p20", sku: "BEAU-004", name: "Esmalte Secagem Rápida", category: "Beleza", currentStock: 600, reservedStock: 15, incomingStock: 0, averageDailySales: 2, salesLast30Days: 60, salesLast90Days: 180, cost: 3, salePrice: 10, minimumStock: 50, maximumStock: 800, leadTimeDays: 5, lastSaleDate: "2026-07-22", lastPurchaseDate: "2026-07-08", active: true },
  { id: "p21", sku: "ELEC-005", name: "Cabo HDMI 2m", category: "Eletrônicos", currentStock: 800, reservedStock: 10, incomingStock: 0, averageDailySales: 8, salesLast30Days: 240, salesLast90Days: 700, cost: 11, salePrice: 12, minimumStock: 50, maximumStock: 1000, leadTimeDays: 4, lastSaleDate: "2026-07-27", lastPurchaseDate: "2026-07-20", active: true },
]

const mockSalesOpportunities: SalesOpportunity[] = [
  { id: "sales-opp-p1", sku: "ELEC-001", productName: "Fone Bluetooth Pro", category: "Eletrônicos", currentRevenue: 54000, currentOrders: 450, conversionRate: 0.06, views: 8500, availableStock: 170, coverageDays: 11, priority: "high", opportunityType: "increase_ads", estimatedRevenueGain: 4860, estimatedMarginGain: 1822, recommendedAction: "Aumentar investimento em anúncios", reason: "Produto de alta margem (62.5%) com boa conversão (6.0%) e estoque disponível.", confidence: 0.9 },
  { id: "sales-opp-p2", sku: "ELEC-002", productName: "Carregador USB-C 65W", category: "Eletrônicos", currentRevenue: 4500, currentOrders: 90, conversionRate: 0.03, views: 3200, availableStock: 480, coverageDays: 160, priority: "medium", opportunityType: "review_price", estimatedRevenueGain: 405, estimatedMarginGain: 155, recommendedAction: "Revisar preço", reason: "Estoque elevado (480 unidades) com baixa conversão (3.0%). Avaliar redução de preço.", confidence: 0.6 },
  { id: "sales-opp-p3", sku: "FASH-001", productName: "Camiseta Algodão Premium", category: "Moda", currentRevenue: 12000, currentOrders: 240, conversionRate: 0.05, views: 6200, availableStock: 25, coverageDays: 3, priority: "critical", opportunityType: "replenish_stock", estimatedRevenueGain: 1080, estimatedMarginGain: 453, recommendedAction: "Reabastecer estoque", reason: "Alta conversão (5.0%) com estoque baixo (25 unidades). Risco de ruptura.", confidence: 0.9 },
  { id: "sales-opp-p10", sku: "BEAU-002", productName: "Creme Hidratante Facial", category: "Beleza", currentRevenue: 750, currentOrders: 30, conversionRate: 0.02, views: 900, availableStock: 245, coverageDays: 245, priority: "low", opportunityType: "monitor", estimatedRevenueGain: 67, estimatedMarginGain: 27, recommendedAction: "Monitorar desempenho", reason: "Desempenho estável. Nenhuma ação urgente necessária.", confidence: 0.5 },
  { id: "sales-opp-p5", sku: "HOME-001", productName: "Kit Organizador 5 peças", category: "Casa & Jardim", currentRevenue: 2100, currentOrders: 60, conversionRate: 0.02, views: 1500, availableStock: 390, coverageDays: 195, priority: "medium", opportunityType: "review_price", estimatedRevenueGain: 189, estimatedMarginGain: 74, recommendedAction: "Revisar preço", reason: "Estoque elevado (390 unidades) com baixa conversão (2.0%).", confidence: 0.6 },
  { id: "sales-opp-p15", sku: "BEAU-003", productName: "Kit Maquiagem 12 cores", category: "Beleza", currentRevenue: 9000, currentOrders: 150, conversionRate: 0.05, views: 4800, availableStock: 170, coverageDays: 34, priority: "high", opportunityType: "increase_ads", estimatedRevenueGain: 810, estimatedMarginGain: 307, recommendedAction: "Aumentar investimento em anúncios", reason: "Produto de alta margem (63.3%) com boa conversão (5.0%) e estoque disponível.", confidence: 0.85 },
]

const mockPurchaseSummary: PurchaseSummary = {
  totalProducts: 8,
  criticalProducts: 3,
  recommendedInvestment: 45000,
  estimatedProtectedRevenue: 120000,
  estimatedProtectedMargin: 48000,
  averageCoverage: 18.5,
  highestRisk: "critical",
}

const inventoryService = new DefaultInventoryIntelligenceService()

export let cachedInventory: InventoryAnalysis[] = []

export function buildFinancialInput(): FinancialInput {
  cachedInventory = inventoryService.analyzeProducts(mockProducts, refDate)
  return {
    inventory: cachedInventory,
    salesOpportunities: mockSalesOpportunities,
    purchaseSummary: mockPurchaseSummary,
    marketplace: { averageGrowth: 12, health: 82, totalRevenue: 278400, totalOrders: 2310, period: "Últimos 30 dias" },
  }
}
