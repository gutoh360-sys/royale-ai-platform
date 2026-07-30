import type { InsightData } from "@/features/marketplace/components/marketplace-executive-insight";
import type { RecommendationData } from "@/features/marketplace/components/marketplace-recommendation";

interface FinancialFields {
  name: string;
  formattedRevenue: string;
  formattedProfit: string;
  formattedMargin: string;
  formattedCashFlow: string;
  formattedWorkingCapital: string;
  formattedCapitalEmployed: string;
  growth: number;
  health: number;
  margin: number;
}

function getHealthLabel(score: number): string {
  if (score >= 90) return "excelente";
  if (score >= 70) return "boa";
  if (score >= 50) return "atencao";
  return "critica";
}

export function buildFinancialInsights(mp: FinancialFields): InsightData[] {
  const healthLabel = getHealthLabel(mp.health);
  const growthAbs = Math.abs(mp.growth);

  return [
    {
      fact: `Receita total de ${mp.formattedRevenue} no período.`,
      reason: mp.growth >= 0
        ? `O crescimento de ${mp.growth}% foi impulsionado pelo desempenho dos canais de venda, gerando ${mp.formattedProfit} de lucro estimado.`
        : `A queda de ${growthAbs}% reflete a redução no volume de vendas, impactando o resultado financeiro.`,
      impact: `Margem media de ${mp.formattedMargin}. ${mp.name} requer monitoramento constante da rentabilidade.`,
      action: mp.growth >= 0
        ? "Manter a estrutura de custos e reinvestir o lucro em operacao."
        : "Revisar despesas operacionais e identificar canais com margem negativa.",
    },
    {
      fact: `Margem media de ${mp.formattedMargin} no período.`,
      reason: mp.margin >= 15
        ? `A margem dentro do esperado indica equilibrio entre precificacao e custos operacionais.`
        : `Margem abaixo do ideal sugere necessidade de revisao de precos ou reducao de custos.`,
      impact: mp.margin >= 15
        ? `Margem saudavel permite investir em crescimento sem comprometer o fluxo de caixa.`
        : `Margem reduzida limita a capacidade de investimento e expansao.`,
      action: mp.margin >= 15
        ? "Monitorar custos para manter a margem atual."
        : "Implementar programa de eficiencia operacional para recuperar margem.",
    },
    {
      fact: `Fluxo de caixa de ${mp.formattedCashFlow} no período.`,
      reason: mp.health >= 70
        ? `A saude financeira de ${mp.health}/100, classificada como ${healthLabel}, reflete boa gestao do capital de giro de ${mp.formattedWorkingCapital}.`
        : `A saude financeira de ${mp.health}/100, classificada como ${healthLabel}, sugere necessidade de maior controle sobre o capital de giro.`,
      impact: `Capital empregado de ${mp.formattedCapitalEmployed}. O fluxo de caixa cobre as obrigacoes de curto prazo.`,
      action: mp.health >= 70
        ? "Manter a disciplina financeira e otimizar o ciclo de caixa."
        : "Revisar prazos de pagamento e recebimento para melhorar o fluxo de caixa.",
    },
  ];
}

export function buildFinancialRecommendations(mp: FinancialFields): RecommendationData[] {
  const recs: RecommendationData[] = [];

  if (mp.health < 70) {
    recs.push({
      action: "Revisar estrutura de custos",
      reason: `Saude financeira em ${mp.health}/100. Identificar despesas nao essenciais e renegociar contratos com fornecedores.`,
    });
  }

  if (mp.margin < 15) {
    recs.push({
      action: "Recuperar margem de contribuição",
      reason: `Margem atual de ${mp.formattedMargin}. Avaliar precificacao dos produtos e reduzir custos operacionais.`,
    });
  }

  if (mp.growth > 15) {
    recs.push({
      action: "Reinvestir lucro em operacao",
      reason: `Crescimento de ${mp.growth}% indica potencial para expandir o capital de giro e aumentar estoque dos itens de maior giro.`,
    });
  }

  if (mp.growth < -5) {
    recs.push({
      action: "Conter despesas operacionais",
      reason: `Queda de ${Math.abs(mp.growth)}% na receita. Reduzir custos variaveis e proteger o fluxo de caixa.`,
    });
  }

  if (recs.length === 0) {
    recs.push({
      action: "Manter estratégia financeira",
      reason: "Indicadores dentro da normalidade. Continuar monitoramento semanal dos principais indices financeiros.",
    });
  }

  return recs;
}
