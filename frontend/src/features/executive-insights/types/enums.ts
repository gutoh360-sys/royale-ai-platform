export const ExecutiveInsightStatus = {
  NEW: "NEW",
  ACTIVE: "ACTIVE",
  RESOLVED: "RESOLVED",
  ARCHIVED: "ARCHIVED",
} as const

export type ExecutiveInsightStatus = (typeof ExecutiveInsightStatus)[keyof typeof ExecutiveInsightStatus]

export const ExecutiveInsightSeverity = {
  INFO: "INFO",
  POSITIVE: "POSITIVE",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const

export type ExecutiveInsightSeverity = (typeof ExecutiveInsightSeverity)[keyof typeof ExecutiveInsightSeverity]

export const ExecutiveInsightCategory = {
  MARKETPLACE: "MARKETPLACE",
  FINANCIAL: "FINANCIAL",
  INVENTORY: "INVENTORY",
  SALES: "SALES",
  PRODUCTS: "PRODUCTS",
  PURCHASING: "PURCHASING",
  GLOBAL: "GLOBAL",
} as const

export type ExecutiveInsightCategory = (typeof ExecutiveInsightCategory)[keyof typeof ExecutiveInsightCategory]
