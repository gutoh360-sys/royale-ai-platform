import type { ExecutiveSnapshot, ExecutiveTimelineEvent } from "@/features/executive-timeline/types"

function diff(value: number, previous: number): { direction: "improved" | "worsened"; change: number } {
  const change = value - previous
  if (change > 0) return { direction: "worsened", change }
  if (change < 0) return { direction: "improved", change: Math.abs(change) }
  return { direction: "improved", change: 0 }
}

export function compareInventory(previous: ExecutiveSnapshot, current: ExecutiveSnapshot): ExecutiveTimelineEvent[] {
  const events: ExecutiveTimelineEvent[] = []
  const prev = previous.inventorySummary
  const curr = current.inventorySummary

  const stockoutDiff = diff(curr.outOfStockCount, prev.outOfStockCount)
  if (stockoutDiff.change !== 0) {
    events.push({
      id: "tl-inventory-stockout",
      category: "inventory",
      title: "Produtos em ruptura",
      description: `Ruptura passou de ${prev.outOfStockCount} para ${curr.outOfStockCount} produto${curr.outOfStockCount !== 1 ? "s" : ""}`,
      direction: stockoutDiff.direction,
      severity: stockoutDiff.direction === "worsened" && curr.outOfStockCount >= 5 ? "critical" : "high",
      impact: stockoutDiff.direction === "improved" ? "Redução de perda de vendas" : "Aumento de perda de vendas",
      priority: Math.min(50 + curr.outOfStockCount * 5, 100),
      timestamp: current.createdAt,
    })
  }

  const idleDiff = diff(curr.idleCapitalValue, prev.idleCapitalValue)
  if (idleDiff.change !== 0) {
    events.push({
      id: "tl-inventory-idle-capital",
      category: "inventory",
      title: "Capital parado",
      description: `Capital imobilizado variou de R$ ${prev.idleCapitalValue.toLocaleString("pt-BR")} para R$ ${curr.idleCapitalValue.toLocaleString("pt-BR")}`,
      direction: idleDiff.direction,
      severity: curr.idleCapitalValue >= 50000 ? "critical" : curr.idleCapitalValue >= 20000 ? "high" : "medium",
      impact: idleDiff.direction === "improved" ? "Liberação de capital de giro" : "Aumento de capital imobilizado",
      priority: Math.min(40 + Math.min(curr.idleCapitalValue / 2000, 40), 100),
      timestamp: current.createdAt,
    })
  }

  const criticalDiff = diff(curr.criticalReplenishmentCount, prev.criticalReplenishmentCount)
  if (criticalDiff.change !== 0) {
    events.push({
      id: "tl-inventory-critical",
      category: "inventory",
      title: "Reposições críticas",
      description: `Produtos com reposição crítica passaram de ${prev.criticalReplenishmentCount} para ${curr.criticalReplenishmentCount}`,
      direction: criticalDiff.direction,
      severity: curr.criticalReplenishmentCount >= 5 ? "critical" : "high",
      impact: criticalDiff.direction === "improved" ? "Redução de risco de ruptura" : "Aumento de risco de ruptura",
      priority: Math.min(45 + curr.criticalReplenishmentCount * 5, 100),
      timestamp: current.createdAt,
    })
  }

  const coverageDiff = prev.averageCoverageDays !== null && curr.averageCoverageDays !== null
    ? diff(curr.averageCoverageDays, prev.averageCoverageDays) : null
  if (coverageDiff && coverageDiff.change !== 0) {
    events.push({
      id: "tl-inventory-coverage",
      category: "inventory",
      title: "Cobertura de estoque",
      description: `Cobertura média passou de ${prev.averageCoverageDays} para ${curr.averageCoverageDays} dias`,
      direction: coverageDiff.direction,
      severity: "medium",
      impact: coverageDiff.direction === "improved" ? "Maior segurança de estoque" : "Redução da segurança de estoque",
      priority: Math.min(20 + coverageDiff.change, 100),
      timestamp: current.createdAt,
    })
  }

  return events
}
