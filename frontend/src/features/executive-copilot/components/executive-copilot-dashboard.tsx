"use client"

import { useExecutiveCopilot } from "@/features/executive-copilot/hooks/use-executive-copilot"
import { Separator } from "@/components/ui/separator"
import { ExecutiveWelcome } from "./executive-welcome"
import { ExecutiveHealth } from "./executive-health"
import { ExecutiveTopPriorities } from "./executive-top-priorities"
import { ExecutiveOpportunities } from "./executive-opportunities"
import { ExecutiveFinancialSnapshot } from "./executive-financial-snapshot"
import { ExecutiveInventorySnapshot } from "./executive-inventory-snapshot"
import { ExecutiveMarketplaceSnapshot } from "./executive-marketplace-snapshot"
import { ExecutiveRecommendedActions } from "./executive-recommended-actions"
import { ExecutiveFooter } from "./executive-footer"

export function ExecutiveCopilotDashboard() {
  const data = useExecutiveCopilot()

  return (
    <section aria-label="Painel executivo" className="mx-auto max-w-3xl">
      <ExecutiveWelcome health={data.health} />
      <ExecutiveHealth health={data.health} />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Prioridades</h2>
          <ExecutiveTopPriorities priorities={data.topPriorities} />
        </div>
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Oportunidades</h2>
          <ExecutiveOpportunities count={data.opportunities} />
        </div>
      </div>

      <Separator className="my-8" />

      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Indicadores</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <ExecutiveFinancialSnapshot snapshot={data.financialSnapshot} />
        <ExecutiveInventorySnapshot snapshot={data.inventorySnapshot} />
        <ExecutiveMarketplaceSnapshot snapshot={data.marketplaceSnapshot} />
      </div>

      <Separator className="my-8" />

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ações recomendadas</h2>
        <ExecutiveRecommendedActions actions={data.recommendedActions} />
      </div>

      <ExecutiveFooter timestamp={data.timestamp} />
    </section>
  )
}
