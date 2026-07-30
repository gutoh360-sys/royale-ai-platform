export type OperationHealth = "healthy" | "attention" | "critical"

export interface CopilotHealth {
  status: OperationHealth
  score: number
  message: string
}

export interface CopilotFinancialSnapshot {
  revenue: number
  profit: number
  idleCapital: number
  averageROI: number
  healthScore: number
}

export interface CopilotInventorySnapshot {
  totalProducts: number
  outOfStock: number
  stockoutRisk: number
  overstock: number
  idleCapital: number
  averageCoverage: number | null
}

export interface CopilotMarketplaceSnapshot {
  totalRevenue: string
  totalOrders: number
  averageHealth: number
  averageTicket: string
}

export interface CopilotRecommendedAction {
  type: string
  action: string
  reason: string
  priority: string
}

export interface CopilotTopPriority {
  title: string
  description: string
  domain: string
  severity: string
}

export interface ExecutiveCopilotData {
  timestamp: string
  health: CopilotHealth
  topPriorities: CopilotTopPriority[]
  opportunities: number
  financialSnapshot: CopilotFinancialSnapshot
  inventorySnapshot: CopilotInventorySnapshot
  marketplaceSnapshot: CopilotMarketplaceSnapshot
  recommendedActions: CopilotRecommendedAction[]
}
