"use client"

import { usePurchaseIntelligence } from "@/features/purchase-intelligence/hooks/use-purchase-intelligence"
import { PurchaseOverview } from "./purchase-overview"
import { PurchaseRecommendationList } from "./purchase-recommendation-list"
import { PurchaseRiskPanel } from "./purchase-risk-panel"
import { InvestmentSummary } from "./investment-summary"

export function PurchaseDecisionCenter() {
  const { recommendations, summary } = usePurchaseIntelligence()

  return (
    <section aria-label="Central de decisão de compras" className="space-y-4">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Inteligência de Compras
      </h2>
      <PurchaseOverview summary={summary} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InvestmentSummary summary={summary} />
        </div>
        <div>
          <PurchaseRiskPanel recommendations={recommendations} />
        </div>
      </div>
      <div>
        <p className="font-heading text-sm font-semibold mb-3">Recomendações</p>
        <PurchaseRecommendationList recommendations={recommendations} />
      </div>
    </section>
  )
}
