import type { ExecutiveSnapshot, ExecutiveTimelineEvent } from "@/features/executive-timeline/types"

function diff(value: number, previous: number): { direction: "improved" | "worsened"; change: number } {
  const change = value - previous
  if (change > 0) return { direction: "improved", change }
  if (change < 0) return { direction: "worsened", change }
  return { direction: "improved", change: 0 }
}

export function compareMarketplace(previous: ExecutiveSnapshot, current: ExecutiveSnapshot): ExecutiveTimelineEvent[] {
  const events: ExecutiveTimelineEvent[] = []
  const prev = previous.marketplaceSummary
  const curr = current.marketplaceSummary

  const healthDiff = diff(curr.averageHealth, prev.averageHealth)
  if (healthDiff.change !== 0) {
    events.push({
      id: "tl-marketplace-health",
      category: "marketplace",
      title: "Saúde do marketplace",
      description: `Saúde média variou de ${prev.averageHealth}% para ${curr.averageHealth}%`,
      direction: healthDiff.direction,
      severity: Math.abs(healthDiff.change) >= 10 ? "high" : "medium",
      impact: healthDiff.direction === "improved" ? "Melhor cenário para vendas" : "Atenção à qualidade dos canais",
      priority: Math.min(40 + Math.abs(healthDiff.change) * 2, 100),
      timestamp: current.createdAt,
    })
  }

  const growthDiff = diff(curr.highestGrowth, prev.highestGrowth)
  if (growthDiff.change !== 0) {
    events.push({
      id: "tl-marketplace-growth",
      category: "marketplace",
      title: "Crescimento do marketplace",
      description: `Maior crescimento passou de ${prev.highestGrowth}% para ${curr.highestGrowth}%`,
      direction: growthDiff.direction,
      severity: Math.abs(growthDiff.change) >= 5 ? "high" : "medium",
      impact: growthDiff.direction === "improved" ? "Aumento de receita esperado" : "Possível perda de tração",
      priority: Math.min(30 + Math.abs(growthDiff.change) * 2, 100),
      timestamp: current.createdAt,
    })
  }

  const ordersDiff = diff(curr.totalOrders, prev.totalOrders)
  if (ordersDiff.change !== 0) {
    events.push({
      id: "tl-marketplace-orders",
      category: "marketplace",
      title: "Volume de pedidos",
      description: `Pedidos passaram de ${prev.totalOrders.toLocaleString("pt-BR")} para ${curr.totalOrders.toLocaleString("pt-BR")}`,
      direction: ordersDiff.direction,
      severity: Math.abs(ordersDiff.change) >= 300 ? "high" : "medium",
      impact: ordersDiff.direction === "improved" ? "Crescimento de demanda" : "Redução de demanda",
      priority: Math.min(20 + Math.abs(ordersDiff.change) / 30, 100),
      timestamp: current.createdAt,
    })
  }

  return events
}
