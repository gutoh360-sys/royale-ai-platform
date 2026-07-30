"use client"

import { useSalesIntelligence } from "@/features/sales-intelligence/hooks/use-sales-intelligence"
import { SalesOverview } from "./sales-overview"
import { TopOpportunities } from "./top-opportunities"
import { SalesRecommendationList } from "./sales-recommendation-list"
import { SalesRiskPanel } from "./sales-risk-panel"

export function SalesDecisionCenter() {
  const { opportunities, summary } = useSalesIntelligence()

  return (
    <section aria-label="Central de inteligência de vendas" className="space-y-4">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Inteligência de Vendas
      </h2>
      <SalesOverview summary={summary} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopOpportunities summary={summary} />
        </div>
        <div>
          <SalesRiskPanel opportunities={opportunities} />
        </div>
      </div>
      <div>
        <p className="font-heading text-sm font-semibold mb-3">Oportunidades</p>
        <SalesRecommendationList opportunities={opportunities} />
      </div>
    </section>
  )
}
