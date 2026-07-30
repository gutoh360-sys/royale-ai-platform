import type { ExecutiveInsight } from "@/features/executive-intelligence/types"
import type { Complexity } from "@/features/executive-prioritization/types"

export const mockInsights: ExecutiveInsight[] = [
  {
    id: "urgent-replenishment-needed",
    title: "Produtos críticos aguardando reposição",
    description: "5 produtos em estado crítico necessitam de reposição imediata.",
    category: "inventory",
    severity: "critical",
    priority: 85,
    affectedDomains: ["inventory", "operations"],
    recommendedAction: "Priorizar a compra dos produtos com reposição crítica.",
    estimatedImpact: "high",
    confidence: 0.92,
    reasons: ["5 produtos com prioridade crítica de reposição"],
    createdAt: "2026-07-27T08:00:00.000Z",
  },
  {
    id: "marketplace-growth-stock-pressure",
    title: "Crescimento de vendas com pressão sobre o estoque",
    description: "O marketplace apresenta crescimento enquanto existem produtos com reposição crítica.",
    category: "inventory",
    severity: "high",
    priority: 72,
    affectedDomains: ["inventory", "marketplace"],
    recommendedAction: "Priorizar a análise dos produtos críticos para verificar quais podem limitar o crescimento.",
    estimatedImpact: "medium",
    confidence: 0.78,
    reasons: ["Crescimento do marketplace acima do limite", "Produtos com reposição crítica"],
    createdAt: "2026-07-27T08:00:00.000Z",
  },
  {
    id: "idle-capital-elevated",
    title: "Capital imobilizado em produtos de baixo giro",
    description: "R$ 62.000 imobilizados em 13 produtos com excesso de estoque ou sem giro.",
    category: "inventory",
    severity: "high",
    priority: 68,
    affectedDomains: ["inventory", "financial"],
    recommendedAction: "Avaliar promoções, liquidações ou devoluções para liberar capital parado.",
    estimatedImpact: "high",
    confidence: 0.82,
    reasons: ["13 produtos excedentes ou sem giro", "Valor imobilizado: R$ 62.000"],
    createdAt: "2026-07-27T08:00:00.000Z",
  },
  {
    id: "marketplace-healthy-outlook",
    title: "Saúde do marketplace e estoque equilibrados",
    description: "Marketplace com saúde média de 88% e baixo risco de ruptura.",
    category: "marketplace",
    severity: "info",
    priority: 35,
    affectedDomains: ["marketplace", "inventory"],
    recommendedAction: "Manter as estratégias atuais de reposição e monitoramento.",
    estimatedImpact: "low",
    confidence: 0.85,
    reasons: ["Saúde média do marketplace: 88%", "Rupturas e riscos: 2 produtos"],
    createdAt: "2026-07-27T08:00:00.000Z",
  },
]

export const MOCK_COMPLEXITY: Record<string, Complexity> = {
  "urgent-replenishment-needed": "easy",
  "marketplace-growth-stock-pressure": "medium",
  "idle-capital-elevated": "easy",
  "marketplace-healthy-outlook": "medium",
}

export const MOCK_BLOCKED_BY: Record<string, string[]> = {
  "urgent-replenishment-needed": ["Aprovação financeira"],
  "idle-capital-elevated": [],
  "marketplace-growth-stock-pressure": [],
  "marketplace-healthy-outlook": [],
}

export const MOCK_RELATED: Record<string, string[]> = {
  "urgent-replenishment-needed": ["marketplace-growth-stock-pressure"],
  "marketplace-growth-stock-pressure": ["urgent-replenishment-needed"],
  "idle-capital-elevated": [],
  "marketplace-healthy-outlook": [],
}
