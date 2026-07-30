import { HIGH_GROWTH_THRESHOLD, HIGH_CONVERSION_THRESHOLD, LOW_CONVERSION_THRESHOLD } from "@/features/sales-intelligence/constants"
import { MARKETPLACE_HEALTH_THRESHOLD } from "@/features/executive-intelligence/constants"
import type { SalesInsight, SalesRecommendation, SalesData } from "../types"

export function buildSalesInsights(data: SalesData): SalesInsight[] {
  const insights: SalesInsight[] = []

  if (data.health >= MARKETPLACE_HEALTH_THRESHOLD) {
    insights.push({
      type: "success",
      title: "Saúde comercial excelente",
      description: `Indicador de saúde em ${data.formattedHealth}. Marketplace saudável conforme critérios da plataforma.`,
      metric: data.formattedHealth,
    })
  } else {
    insights.push({
      type: "info",
      title: "Saúde do marketplace",
      description: `Indicador de saúde em ${data.formattedHealth}.`,
      metric: data.formattedHealth,
    })
  }

  if (data.growth >= HIGH_GROWTH_THRESHOLD) {
    insights.push({
      type: "success",
      title: "Crescimento acelerado",
      description: `Crescimento de ${data.formattedGrowth} no período, classificado como alto pelo motor de inteligência.`,
      metric: data.formattedGrowth,
    })
  } else {
    insights.push({
      type: "info",
      title: "Crescimento",
      description: `Crescimento de ${data.formattedGrowth} no período.`,
      metric: data.formattedGrowth,
    })
  }

  if (data.conversionRate >= HIGH_CONVERSION_THRESHOLD) {
    insights.push({
      type: "success",
      title: "Conversão saudável",
      description: `Taxa de conversão de ${data.formattedConversionRate} classificada como alta pelo motor de inteligência.`,
      metric: data.formattedConversionRate,
    })
  } else if (data.conversionRate <= LOW_CONVERSION_THRESHOLD) {
    insights.push({
      type: "danger",
      title: "Conversão muito baixa",
      description: `Taxa de conversão de ${data.formattedConversionRate} classificada como baixa pelo motor de inteligência.`,
      metric: data.formattedConversionRate,
    })
  } else {
    insights.push({
      type: "info",
      title: "Conversão",
      description: `Taxa de conversão de ${data.formattedConversionRate}.`,
      metric: data.formattedConversionRate,
    })
  }

  return insights
}

export function buildSalesRecommendations(data: SalesData): SalesRecommendation[] {
  const recommendations: SalesRecommendation[] = []

  if (data.conversionRate <= LOW_CONVERSION_THRESHOLD) {
    recommendations.push({
      id: "sales-rec-conv",
      title: "Revisar produtos com baixa conversão",
      description: `Taxa de conversão em ${data.formattedConversionRate} classificada como baixa. Revisar funil de vendas e identificar produtos críticos no Centro de Decisões.`,
      impact: "high",
      effort: "medium",
      category: "Vendas",
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "sales-rec-keep",
      title: "Manter estratégia atual",
      description: "Indicadores dentro do esperado. Continuar monitoramento no Centro de Decisões para identificar oportunidades.",
      impact: "medium",
      effort: "low",
      category: "Gestão",
    })
  }

  return recommendations
}
