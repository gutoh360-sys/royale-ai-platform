import { api } from "@/lib/api";
import type { AnalyticsPeriodDays, DashboardAnalytics } from "@/types/api";
import type { CommandCenterData, CommandCenterResult } from "@/features/dashboard/executive-command-center/types";

export async function fetchCommandCenterData(days: AnalyticsPeriodDays = 7): Promise<CommandCenterResult> {
  try {
    const analytics = await api.get<DashboardAnalytics>(`/analytics/dashboard?days=${days}`);

    const completed = analytics.orders_by_status?.completed ?? 0;
    const pending = analytics.orders_by_status?.pending ?? 0;
    const total = analytics.total_orders;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const healthScore = Math.min(100, Math.round(
      (completionRate * 0.4) +
      (analytics.active_products > 0 ? 30 : 0) +
      (analytics.total_stock > 0 ? 30 : 0),
    ));

    const recommendations: CommandCenterData["recommendations"] = [];

    if (analytics.products_without_stock > 0) {
      recommendations.push({
        id: "restock",
        action: `Repor estoque de ${analytics.products_without_stock} produtos`,
        reason: "Produtos sem estoque disponível",
        impact: "Manter disponibilidade para vendas",
        priority: "high",
      });
    }

    if (pending > 0) {
      recommendations.push({
        id: "process-orders",
        action: `Processar ${pending} pedidos pendentes`,
        reason: "Pedidos aguardando processamento",
        impact: "Melhorar tempo de entrega",
        priority: "medium",
      });
    }

    if (analytics.revenue > 0 && analytics.average_ticket) {
      recommendations.push({
        id: "boost-ticket",
        action: "Aumentar ticket médio com combos",
        reason: `Ticket médio atual: R$ ${analytics.average_ticket.toFixed(2)}`,
        impact: "Crescer receita sem aumentar tráfego",
        priority: "low",
      });
    }

    const data: CommandCenterData = {
      status: {
        healthScore,
        label: healthScore >= 70 ? "Saudável" : healthScore >= 40 ? "Atenção" : "Crítico",
        summary: `${total} pedidos, ${analytics.active_products} produtos ativos, ${analytics.total_stock} em estoque`,
      },
      attention: [],
      opportunities: [],
      recommendations,
    };

    return { data, status: "success", error: null };
  } catch (e) {
    return {
      data: {
        status: { healthScore: 0, label: "Erro", summary: "Não foi possível carregar dados" },
        attention: [],
        opportunities: [],
        recommendations: [],
      },
      status: "error",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
