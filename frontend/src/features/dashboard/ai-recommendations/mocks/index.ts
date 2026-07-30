import type { AIRecommendationData } from "@/features/dashboard/ai-recommendations/types";

export const mockRecommendations: AIRecommendationData[] = [
  {
    id: "rec-1",
    title: "Estoque crítico detectado",
    summary:
      "O SKU ítem #1023 está com 12 unidades e apresenta aceleração nas vendas. O ritmo atual indica ruptura em 3 dias.",
    priority: "high",
    category: "inventory",
    actionLabel: "Revisar estoque",
    confidence: 92,
    generatedAt: "2026-07-27T08:15:00",
  },
  {
    id: "rec-2",
    title: "Oportunidade de precificação",
    summary:
      "Produtos da categoria 'Fones Bluetooth' estão 8% abaixo da média do mercado. Recomendamos reajuste seletivo para aumentar margem.",
    priority: "medium",
    category: "sales",
    actionLabel: "Ver produto",
    confidence: 78,
    generatedAt: "2026-07-27T07:30:00",
  },
  {
    id: "rec-3",
    title: "Canal com baixo desempenho",
    summary:
      "As vendas no Shopee apresentaram queda de 15% nos últimos 7 dias. Sugerimos revisar anúncios e comparar concorrentes.",
    priority: "high",
    category: "marketplace",
    actionLabel: "Analisar canal",
    confidence: 85,
    generatedAt: "2026-07-27T06:45:00",
  },
  {
    id: "rec-4",
    title: "Tendência em alta",
    summary:
      "O termo 'smartwatch esportivo' subiu 34% nas buscas nos últimos 30 dias. Avalie incluir produtos relacionados no catálogo.",
    priority: "low",
    category: "trend",
    actionLabel: "Ver tendência",
    confidence: 71,
    generatedAt: "2026-07-27T06:00:00",
  },
];

export const mockEmptyRecommendations: AIRecommendationData[] = [];
