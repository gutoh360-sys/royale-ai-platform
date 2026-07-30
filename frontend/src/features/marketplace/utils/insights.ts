/*
  Geração de insights executivos a partir de dados existentes do marketplace.
  NÃO cria nova inteligência — apenas formata dados existentes em estrutura Fato-Motivo-Impacto-Ação.
*/

import type { InsightData } from "@/features/marketplace/components/marketplace-executive-insight";
import type { RecommendationData } from "@/features/marketplace/components/marketplace-recommendation";
import { getHealthConfig } from "./health";

interface MarketplaceFields {
  name: string;
  formattedRevenue: string;
  formattedOrders: string;
  formattedAverageTicket: string;
  formattedMarketShare: string;
  marketShare: number;
  growth: number;
  health: number;
  revenue: number;
  orders: number;
}

export function buildInsights(mp: MarketplaceFields): InsightData[] {
  const insights: InsightData[] = [];
  const healthLabel = getHealthConfig(mp.health).label.toLowerCase();
  const growthDir = mp.growth >= 0 ? "aumento" : "queda";
  const growthAbs = Math.abs(mp.growth);

  insights.push({
    fact: `Receita de ${mp.formattedRevenue} no período.`,
    reason:
      mp.growth >= 0
        ? `O crescimento de ${mp.growth}% foi impulsionado pelo desempenho consistente do canal, que registrou ${mp.formattedOrders} pedidos com ticket médio de ${mp.formattedAverageTicket}.`
        : `A queda de ${growthAbs}% reflete a redução no volume de pedidos, que totalizaram ${mp.formattedOrders} no período.`,
    impact: `${mp.name} representa ${mp.formattedMarketShare} do faturamento total da operação.`,
    action:
      mp.growth >= 0
        ? "Manter o ritmo de reposição e avaliar ampliação do catálogo nos produtos de maior giro."
        : "Revisar precificação e condições de entrega para recuperar competitividade no canal.",
  });

  insights.push({
    fact: `Crescimento de ${growthAbs}% em relação ao período anterior.`,
    reason:
      mp.health >= 70
        ? `O canal operou com saúde de ${mp.health}/100, classificada como ${healthLabel}, indicando estabilidade operacional.`
        : `A saúde operacional de ${mp.health}/100, classificada como ${healthLabel}, sugere necessidade de ajustes nos processos.`,
    impact:
      growthAbs > 10
        ? `Variação expressiva que impacta diretamente o planejamento de estoque e a projeção de receita.`
        : `Variação dentro do esperado para o período, sem impacto significativo no planejamento.`,
    action:
      mp.health >= 70
        ? "Monitorar indicadores semanais para sustentar a trajetória atual."
        : "Identificar gargalos operacionais e implementar plano de ação corretiva.",
  });

  insights.push({
    fact: `${mp.name} detém ${mp.formattedMarketShare} de participação no faturamento total.`,
    reason:
      mp.marketShare > 20
        ? `O canal consolidou sua posição como um dos principais da operação, impulsionado pelo volume de ${mp.formattedOrders} pedidos no período.`
        : `O canal ainda representa uma parcela menor do faturamento, com potencial de crescimento.`,
    impact:
      mp.marketShare > 20
        ? "Qualquer oscilação neste canal afeta significativamente o resultado consolidado."
        : "A baixa participação atual limita o impacto no resultado consolidado, mas representa oportunidade.",
    action:
      mp.marketShare > 20
        ? "Priorizar a saúde operacional e a experiência do cliente neste canal."
        : "Avaliar estratégias de crescimento para aumentar a participação no canal.",
  });

  return insights;
}

export function buildRecommendations(mp: MarketplaceFields): RecommendationData[] {
  const recs: RecommendationData[] = [];

  if (mp.health < 70) {
    recs.push({
      action: `Revisar operação no ${mp.name}`,
      reason: `Saúde operacional em ${mp.health}/100. Identificar gargalos nos processos de logística, atendimento ou precificação.`,
    });
  }

  if (mp.growth > 15) {
    recs.push({
      action: `Acelerar investimento no ${mp.name}`,
      reason: `Crescimento de ${mp.growth}% indica potencial para ampliar variedade de produtos e aumentar estoque dos itens de maior giro.`,
    });
  }

  if (mp.growth < -5) {
    recs.push({
      action: `Analisar concorrência no ${mp.name}`,
      reason: `Queda de ${Math.abs(mp.growth)}% nas vendas. Avaliar posicionamento dos anúncios, preço e condições de frete.`,
    });
  }

  if (mp.marketShare < 10) {
    recs.push({
      action: `Explorar crescimento no ${mp.name}`,
      reason: `Participação atual de ${mp.formattedMarketShare}. Canal com potencial subexplorado que pode diversificar a receita.`,
    });
  }

  if (recs.length === 0) {
    recs.push({
      action: `Manter estratégia atual no ${mp.name}`,
      reason: `Indicadores dentro da normalidade. Continuar monitoramento semanal para detectar mudanças precocemente.`,
    });
  }

  return recs;
}

export type InsightPriority = "alta" | "media" | "baixa";

export function getInsightPriority(mp: MarketplaceFields): InsightPriority[] {
  return [
    mp.health < 70 ? "alta" : mp.growth < 0 ? "media" : "baixa",
    mp.health < 70 || mp.growth < -5 ? "alta" : mp.growth < 5 ? "media" : "baixa",
    mp.marketShare > 30 && mp.health < 80 ? "alta" : mp.marketShare > 10 ? "media" : "baixa",
  ];
}

export interface NextAction {
  action: string;
}

export function buildNextActions(mp: MarketplaceFields): NextAction[] {
  const actions: NextAction[] = [];

  if (mp.health < 80) {
    actions.push({ action: `Melhorar saúde operacional no ${mp.name}` });
  } else {
    actions.push({ action: `Reforçar atendimento e reputação no ${mp.name}` });
  }

  if (mp.growth > 15) {
    actions.push({ action: "Reforçar estoque dos produtos de maior giro." });
  } else if (mp.growth < 0) {
    actions.push({ action: "Revisar anúncios com menor conversão e ajustar precificação." });
  } else {
    actions.push({ action: "Monitorar crescimento do canal semanalmente." });
  }

  if (mp.marketShare < 15) {
    actions.push({ action: "Avaliar estratégias para aumentar participação no canal." });
  } else if (mp.marketShare > 30) {
    actions.push({ action: "Proteger participação monitorando concorrência ativamente." });
  } else {
    actions.push({ action: "Avaliar expansão do catálogo para novos segmentos." });
  }

  if (mp.health >= 90 && mp.growth > 10) {
    actions.push({ action: "Estudar abertura de novos canais de venda." });
  }

  if (mp.growth < -10) {
    actions.push({ action: "Realizar análise de concorrência detalhada para o canal." });
  }

  return actions.slice(0, 5);
}
