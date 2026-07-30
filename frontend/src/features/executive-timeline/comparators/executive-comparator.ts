import type { ExecutiveSnapshot, ExecutiveTimelineEvent } from "@/features/executive-timeline/types"

export function compareExecutive(previous: ExecutiveSnapshot, current: ExecutiveSnapshot): ExecutiveTimelineEvent[] {
  const events: ExecutiveTimelineEvent[] = []
  const prevCount = previous.executiveSummary.length
  const currCount = current.executiveSummary.length

  if (currCount !== prevCount) {
    const direction = currCount < prevCount ? "improved" : "worsened"
    const change = Math.abs(currCount - prevCount)

    events.push({
      id: "tl-executive-insights",
      category: "executive",
      title: "Total de insights executivos",
      description: `Insights passaram de ${prevCount} para ${currCount}`,
      direction,
      severity: change >= 3 ? "high" : "medium",
      impact: direction === "improved" ? "Redução de alertas" : "Aumento de alertas ativos",
      priority: Math.min(30 + change * 8, 100),
      timestamp: current.createdAt,
    })
  }

  const prevCritical = previous.executiveSummary.filter((i) => i.severity === "critical").length
  const currCritical = current.executiveSummary.filter((i) => i.severity === "critical").length

  if (currCritical !== prevCritical) {
    const direction = currCritical < prevCritical ? "improved" : "worsened"
    const change = Math.abs(currCritical - prevCritical)
    events.push({
      id: "tl-executive-critical",
      category: "executive",
      title: "Insights críticos",
      description: `Insights críticos passaram de ${prevCritical} para ${currCritical}`,
      direction,
      severity: "critical",
      impact: direction === "improved" ? "Redução de prioridades críticas" : "Aumento de situações críticas",
      priority: Math.min(60 + change * 10, 100),
      timestamp: current.createdAt,
    })
  }

  const prevSeverities = previous.executiveSummary.map((i) => i.severity)
  const currSeverities = current.executiveSummary.map((i) => i.severity)
  const sevOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }
  const prevScore = prevSeverities.reduce((s, sev) => s + (sevOrder[sev] ?? 0), 0)
  const currScore = currSeverities.reduce((s, sev) => s + (sevOrder[sev] ?? 0), 0)

  if (currScore !== prevScore && currCritical === prevCritical && currCount === prevCount) {
    const direction = currScore < prevScore ? "improved" : "worsened"
    events.push({
      id: "tl-executive-severity-shift",
      category: "executive",
      title: "Gravidade dos insights",
      description: "A distribuição de severidade dos insights mudou, com predomínio de alertas mais críticos.",
      direction,
      severity: "medium",
      impact: direction === "improved" ? "Redução de gravidade geral" : "Agravamento do cenário",
      priority: 35,
      timestamp: current.createdAt,
    })
  }

  return events
}
