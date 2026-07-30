import type { InsightData } from "@/features/marketplace/components/marketplace-executive-insight";
import type { RecommendationData } from "@/features/marketplace/components/marketplace-recommendation";
import type { InventoryIntelligenceSummary } from "@/features/inventory-intelligence/types";
import { CRITICAL_REPLENISHMENT_MINIMUM } from "@/features/executive-intelligence/constants";

interface InventoryInsightInput {
  summary: InventoryIntelligenceSummary;
  formattedImmobilizedCapital: string;
  formattedAverageCoverage: string;
  formattedAverageTurnover: string;
}

export function buildInventoryInsights(input: InventoryInsightInput): InsightData[] {
  const { summary, formattedImmobilizedCapital, formattedAverageCoverage, formattedAverageTurnover } = input;

  return [
    {
      fact: `Capital imobilizado de ${formattedImmobilizedCapital} em estoque.`,
      reason: summary.idleCapitalProductCount > 0
        ? `Foram identificados ${summary.idleCapitalProductCount} itens sem giro ou com excesso de estoque, contribuindo para o capital parado.`
        : "Nenhum item com capital imobilizado identificado no momento.",
      impact: summary.idleCapitalValue > 0
        ? "Capital elevado compromete o fluxo de caixa e reduz a capacidade de investimento."
        : "Impacto controlado no fluxo de caixa e na capacidade de reinvestimento.",
      action: summary.idleCapitalProductCount > 0
        ? "Revisar itens de baixo giro e avaliar promocoes para liberar capital."
        : "Manter o monitoramento do nivel de capital imobilizado.",
    },
    {
      fact: `Cobertura media de ${formattedAverageCoverage} e giro de ${formattedAverageTurnover}.`,
      reason: summary.averageCoverageDays !== null && summary.averageCoverageDays > 0
        ? "A cobertura calculada indica o tempo medio que o estoque atual sustenta as vendas."
        : "Cobertura nao calculada devido a produtos sem venda ou estoque zerado.",
      impact: summary.totalProducts > 0
        ? `${summary.healthyCount} de ${summary.activeProducts} produtos ativos estao com estoque saudavel.`
        : "Giro reduzido sugere excesso de produtos parados ou baixa demanda.",
      action: summary.averageCoverageDays !== null
        ? "Manter a politica de reposicao atual e monitorar sazonalidades."
        : "Ajustar parametros de reposicao para aumentar a cobertura dos itens criticos.",
    },
    {
      fact: `${summary.criticalReplenishmentCount} itens com prioridade de reposicao.`,
      reason: summary.criticalReplenishmentCount > 0
        ? `Produtos com reposicao critica requerem acao para evitar ruptura e perda de vendas.`
        : "Nenhum item com reposicao critica identificado no momento.",
      impact: summary.criticalReplenishmentCount >= CRITICAL_REPLENISHMENT_MINIMUM
        ? "Risco elevado de ruptura que pode impactar a receita recorrente."
        : "Risco de ruptura controlado, sem impacto significativo na receita.",
      action: summary.criticalReplenishmentCount > 0
        ? "Priorizar a reposicao dos itens criticos e revisar lead times com fornecedores."
        : "Manter o monitoramento preventivo dos niveis de estoque.",
    },
  ];
}

export function buildInventoryRecommendations(input: InventoryInsightInput): RecommendationData[] {
  const { summary, formattedImmobilizedCapital, formattedAverageCoverage } = input;
  const recs: RecommendationData[] = [];

  if (summary.idleCapitalProductCount > 0) {
    recs.push({
      action: "Liberar capital imobilizado",
      reason: `${formattedImmobilizedCapital} parados em ${summary.idleCapitalProductCount} produto${summary.idleCapitalProductCount > 1 ? "s" : ""}. Identificar itens com baixo giro e avaliar liquidacao ou promocao para recuperacao de caixa.`,
    });
  }

  if (summary.criticalReplenishmentCount > 0) {
    recs.push({
      action: "Repor itens com prioridade critica",
      reason: `${summary.criticalReplenishmentCount} ite${summary.criticalReplenishmentCount > 1 ? "ns" : "m"} em risco de ruptura. Acionar fornecedores e priorizar o recebimento desses produtos.`,
    });
  }

  if (summary.averageCoverageDays !== null && summary.averageCoverageDays < 7) {
    recs.push({
      action: "Aumentar cobertura de estoque",
      reason: `Cobertura media de ${formattedAverageCoverage}. Revisar parametros de reposicao para evitar rupturas e perda de vendas.`,
    });
  }

  if (summary.slowMovingCount > 0) {
    recs.push({
      action: "Revisar produtos sem giro",
      reason: `${summary.slowMovingCount} produto${summary.slowMovingCount > 1 ? "s" : ""} sem vendas ha mais de 60 dias. Avaliar promocao, liquidacao ou descontinuacao.`,
    });
  }

  if (summary.overstockCount > 0) {
    recs.push({
      action: "Reduzir excesso de estoque",
      reason: `${summary.overstockCount} produto${summary.overstockCount > 1 ? "s" : ""} com estoque acima do maximo recomendado. Avaliar estrategias para normalizar os niveis.`,
    });
  }

  if (recs.length === 0) {
    recs.push({
      action: "Manter estrategia de estoque",
      reason: "Indicadores dentro da normalidade. Continuar monitoramento semanal dos niveis de estoque e prazos de reposicao.",
    });
  }

  return recs;
}
