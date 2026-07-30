import type { InsightData } from "@/features/executive-domain/components/executive-insight-card"
import type { RecommendationData } from "@/features/executive-domain/components/executive-recommendation-card"

interface PurchasingInsightInput {
  categories: {
    name: string
    productsToBuy: number
    totalUnits: number
    estimatedInvestment: number
    formattedInvestment: string
    averageCoverage: number
    priority: string
  }[]
  suppliers: {
    name: string
    share: number
    formattedShare: string
    leadTimeDays: number
    activeOrders: number
    reliability: number
  }[]
  totalCapital: string
  averageCoverage: string
  averageLeadTime: string
  productsToReplenish: number
  totalUnitsToBuy: number
}

export function buildPurchasingInsights(input: PurchasingInsightInput): InsightData[] {
  const insights: InsightData[] = []

  const highPriority = input.categories.filter((c) => c.priority === "alta")
  const totalPriorityProducts = highPriority.reduce((s, c) => s + c.productsToBuy, 0)

  if (totalPriorityProducts > 0) {
    const topCategory = highPriority.sort((a, b) => b.estimatedInvestment - a.estimatedInvestment)[0]
    insights.push({
      fact: `${totalPriorityProducts} produto${totalPriorityProducts > 1 ? "s" : ""} com reposição prioritária em ${highPriority.length} categoria${highPriority.length > 1 ? "s" : ""}.`,
      reason: `${topCategory.name} lidera a necessidade de investimento com ${topCategory.formattedInvestment}, cobertura média de ${topCategory.averageCoverage} dias.`,
      impact: highPriority.length > 1
        ? "Atraso na reposição pode causar ruptura em múltiplas categorias e perda de receita recorrente."
        : "Ruptura pontual na categoria prioritária pode comprometer a disponibilidade dos itens de maior giro.",
      action: "Priorizar a compra dos itens com cobertura crítica e acionar fornecedores com lead time mais curto.",
    })
  }

  const lowCoverageCategories = input.categories.filter((c) => c.averageCoverage < 10)
  const highCoverageCategories = input.categories.filter((c) => c.averageCoverage > 20)

  if (lowCoverageCategories.length > 0) {
    const worst = lowCoverageCategories.sort((a, b) => a.averageCoverage - b.averageCoverage)[0]
    insights.push({
      fact: `Cobertura média de ${input.averageCoverage} no portfólio, com ${worst.name} apresentando a menor cobertura (${worst.averageCoverage} dias).`,
      reason: lowCoverageCategories.length > 1
        ? `${lowCoverageCategories.length} categorias estão com cobertura abaixo de 10 dias, indicando necessidade de reposição imediata.`
        : `${worst.name} requer atenção especial por estar próxima do lead time de reposição.`,
      impact: "Cobertura reduzida eleva o risco de ruptura e perda de vendas, especialmente em produtos de alto giro.",
      action: lowCoverageCategories.length > 1
        ? "Agrupar pedidos das categorias críticas para otimizar frete e reduzir custos de reposição."
        : "Avaliar aumento do estoque de segurança para a categoria com cobertura mais baixa.",
    })
  }

  if (highCoverageCategories.length > 0) {
    const top = highCoverageCategories.sort((a, b) => b.averageCoverage - a.averageCoverage)[0]
    insights.push({
      fact: `${top.name} possui cobertura de ${top.averageCoverage} dias, acima da média do portfólio (${input.averageCoverage}).`,
      reason: `Níveis elevados de cobertura podem indicar excesso de estoque ou redução na demanda.`,
      impact: "Excesso de estoque compromete o capital de giro e aumenta custos de armazenagem.",
      action: "Revisar a previsão de demanda para a categoria e ajustar os parâmetros de reposição.",
    })
  }

  const unreliableSuppliers = input.suppliers.filter((s) => s.reliability < 85)
  if (unreliableSuppliers.length > 0) {
    const worst = unreliableSuppliers.sort((a, b) => a.reliability - b.reliability)[0]
    insights.push({
      fact: `${worst.name} possui confiabilidade de ${worst.reliability}% e lead time de ${worst.leadTimeDays} dias.`,
      reason: `${unreliableSuppliers.length} fornecedor${unreliableSuppliers.length > 1 ? "es" : ""} com confiabilidade abaixo de 85% representam risco para o abastecimento.`,
      impact: "Fornecedores com baixa confiabilidade podem causar atrasos recorrentes e rupturas de estoque.",
      action: unreliableSuppliers.length > 1
        ? "Diversificar a base de fornecedores e buscar alternativas com melhor histórico de entrega."
        : "Avaliar contrato com o fornecedor e definir penalidades para atrasos.",
    })
  }

  return insights
}

export function buildPurchasingRecommendations(input: PurchasingInsightInput): RecommendationData[] {
  const recs: RecommendationData[] = []

  const highPriority = input.categories.filter((c) => c.priority === "alta")
  if (highPriority.length > 0) {
    recs.push({
      action: "Emitir pedidos urgentes para categorias prioritárias",
      reason: `${highPriority.map((c) => c.name).join(", ")} — ${highPriority.reduce((s, c) => s + c.productsToBuy, 0)} produtos com cobertura crítica. Priorizar fornecedores com lead time reduzido.`,
    })
  }

  const lowCoverage = input.categories.filter((c) => c.averageCoverage < 10)
  if (lowCoverage.length > 0) {
    recs.push({
      action: "Aumentar estoque de segurança",
      reason: `${lowCoverage.length} categoria${lowCoverage.length > 1 ? "s" : ""} com cobertura abaixo de 10 dias. Revisar parâmetros de reposição para evitar rupturas.`,
    })
  }

  const highCoverage = input.categories.filter((c) => c.averageCoverage > 25)
  if (highCoverage.length > 0) {
    recs.push({
      action: "Revisar excesso de estoque",
      reason: `${highCoverage.length} categoria${highCoverage.length > 1 ? "s" : ""} com cobertura acima de 25 dias. Avaliar promoções ou devoluções para liberar capital.`,
    })
  }

  const unreliableSuppliers = input.suppliers.filter((s) => s.reliability < 85)
  if (unreliableSuppliers.length > 0) {
    recs.push({
      action: "Avaliar fornecedores com baixa confiabilidade",
      reason: `${unreliableSuppliers.map((s) => s.name).join(", ")} apresentam confiabilidade abaixo de 85%. Buscar alternativas no mercado.`,
    })
  }

  const concentratedSuppliers = input.suppliers.filter((s) => s.share > 30)
  if (concentratedSuppliers.length > 0) {
    recs.push({
      action: "Reduzir dependência de fornecedor único",
      reason: `${concentratedSuppliers[0].name} concentra ${concentratedSuppliers[0].formattedShare} das compras. Diversificar para mitigar risco de desabastecimento.`,
    })
  }

  if (recs.length === 0) {
    recs.push({
      action: "Manter estratégia de abastecimento",
      reason: "Indicadores dentro da normalidade. Continuar monitoramento semanal dos prazos de reposição e níveis de cobertura.",
    })
  }

  return recs
}
