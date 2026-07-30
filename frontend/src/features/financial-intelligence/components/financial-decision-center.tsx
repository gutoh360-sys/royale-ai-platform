"use client"

import { useFinancialIntelligence } from "@/features/financial-intelligence/hooks/use-financial-intelligence"
import { FinancialOverview } from "./financial-overview"
import { FinancialOpportunityPanel } from "./financial-opportunity-panel"
import { FinancialRiskPanel } from "./financial-risk-panel"
import { FinancialCategoryRanking } from "./financial-category-ranking"

export function FinancialDecisionCenter() {
  const { insights, summary } = useFinancialIntelligence()

  return (
    <section aria-label="Central de inteligência financeira" className="space-y-4">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Inteligência Financeira
      </h2>
      <FinancialOverview summary={summary} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FinancialOpportunityPanel summary={summary} />
        </div>
        <div>
          <FinancialRiskPanel insights={insights} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="font-heading text-sm font-semibold mb-3">Insights financeiros</p>
          <FinancialCategoryRanking insights={insights} />
        </div>
      </div>
    </section>
  )
}
