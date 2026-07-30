import type { CommandCenterData } from "@/features/dashboard/executive-command-center/types";

export const mockCommandCenter: CommandCenterData = {
  status: {
    healthScore: 87,
    label: "Operação Saudável",
    summary:
      "A operação está estável. Existem alguns pontos que exigem atenção, mas nenhum risco crítico no momento.",
  },
  attention: [
    {
      id: "att-1",
      priority: "critical",
      category: "inventory",
      description: "Estoque crítico em 12 produtos. Ruptura prevista em até 3 dias.",
    },
    {
      id: "att-2",
      priority: "high",
      category: "marketplace",
      description: "Mercado Livre apresentou queda de 9% nas vendas nas últimas 24h.",
    },
    {
      id: "att-3",
      priority: "high",
      category: "financial",
      description: "2 pagamentos a fornecedores vencem hoje. Total de R$ 48.300,00.",
    },
    {
      id: "att-4",
      priority: "high",
      category: "integration",
      description: "4 ordens de serviço atrasadas no ERP. Pendência de 48h.",
    },
    {
      id: "att-5",
      priority: "medium",
      category: "inventory",
      description: "Produto Fone Bluetooth Pro com ruptura prevista em 6 dias.",
    },
    {
      id: "att-6",
      priority: "medium",
      category: "marketplace",
      description: "Shopee com 15% dos anúncios sem estoque vinculado.",
    },
  ],
  opportunities: [
    {
      id: "opp-1",
      description: "Produto AquaClean vendeu 32% acima da média. Avaliar reposição acelerada.",
    },
    {
      id: "opp-2",
      description: "Amazon cresceu 18% este mês. Oportunidade de ampliar catálogo no canal.",
    },
    {
      id: "opp-3",
      description: "Existe margem para aumentar estoque do Produto SmartBand X sem comprometer capital de giro.",
    },
    {
      id: "opp-4",
      description: "Produto Cadeira Ergonômica Y possui alta procura e baixa concorrência no Mercado Livre.",
    },
    {
      id: "opp-5",
      description: "TikTok Shop apresentou crescimento de 67%. Canal com potencial subexplorado.",
    },
  ],
  recommendations: [
    {
      id: "rec-exec-1",
      action: "Comprar mais filtros AquaClean",
      reason: "Estoque para apenas 6 dias. Ritmo de vendas acelerou 32%.",
      impact: "Evita perda estimada de R$ 28.400,00 em vendas no período.",
      priority: "high",
    },
    {
      id: "rec-exec-2",
      action: "Ajustar preço do Fone Bluetooth Pro",
      reason: "Produto está 8% abaixo da média de mercado com margem reduzida.",
      impact: "Potencial de aumento de R$ 4.200,00 na margem mensal.",
      priority: "medium",
    },
    {
      id: "rec-exec-3",
      action: "Revisar anúncios no Mercado Livre",
      reason: "Queda de 9% nas vendas. Concorrentes ganharam destaque no feed.",
      impact: "Recuperação estimada de 15% das vendas no canal.",
      priority: "high",
    },
    {
      id: "rec-exec-4",
      action: "Avaliar catálogo para TikTok Shop",
      reason: "Canal cresceu 67% e representa apenas 3,5% do total. Subexplorado.",
      impact: "Potencial de R$ 18.000,00 adicionais por mês.",
      priority: "low",
    },
  ],
};

export const mockEmptyCommandCenter: CommandCenterData = {
  status: { healthScore: 100, label: "Operação Saudável", summary: "Tudo dentro da normalidade." },
  attention: [],
  opportunities: [],
  recommendations: [],
};
