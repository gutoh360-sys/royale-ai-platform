export const PRIORITY_WEIGHT = 0.30
export const SEVERITY_WEIGHT = 0.25
export const IMPACT_WEIGHT = 0.20
export const COMPLEXITY_WEIGHT = 0.15
export const DEPENDENCY_WEIGHT = 0.10

export const SEVERITY_BONUS: Record<string, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  info: 0,
}

export const IMPACT_BONUS: Record<string, number> = {
  high: 100,
  medium: 60,
  low: 30,
}

export const COMPLEXITY_PENALTY: Record<string, number> = {
  easy: 0,
  medium: 15,
  complex: 30,
}

export const DEPENDENCY_BONUS = 10

export const URGENCY_THRESHOLD = {
  immediate: 80,
  today: 60,
  this_week: 40,
}

export const WHY_NOW_TEMPLATES: Record<string, string> = {
  immediate: "Esta ação evita risco operacional imediato.",
  today: "Esta decisão deve ser tomada hoje para evitar impacto no curto prazo.",
  this_week: "Esta ação pode ser planejada nos próximos dias.",
  monitor: "Apenas monitorar. Nenhuma ação necessária no momento.",
}
