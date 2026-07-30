"use client"

import { useExecutiveOrchestrator } from "@/features/executive-copilot/hooks/use-executive-orchestrator"
import { Separator } from "@/components/ui/separator"
import { ExecutiveCopilotSkeleton } from "./executive-copilot-skeleton"
import { ExecutiveBriefingSection } from "./executive-briefing-section"
import { ExecutiveHighlightsSection } from "./executive-highlights-section"
import { ExecutiveAlertsSection } from "./executive-alerts-section"
import { ExecutivePrioritiesSection } from "./executive-priorities-section"
import { ExecutiveActionsSection } from "./executive-actions-section"
import { ExecutiveSummaryBar } from "./executive-summary-bar"

export function ExecutiveCopilotPage() {
  const { snapshots, state } = useExecutiveOrchestrator()

  if (state === "loading") {
    return <ExecutiveCopilotSkeleton />
  }

  if (state === "error") {
    return (
      <section aria-label="Erro" className="mx-auto max-w-3xl">
        <p className="text-sm text-destructive">Erro ao carregar dados do painel executivo.</p>
      </section>
    )
  }

  if (state === "empty" || !snapshots) {
    return (
      <section aria-label="Sem dados" className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">Nenhum dado disponível no momento.</p>
      </section>
    )
  }

  return (
    <section aria-label="Painel executivo" className="mx-auto max-w-3xl space-y-6">
      <ExecutiveBriefingSection snapshots={snapshots} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ExecutiveHighlightsSection snapshots={snapshots} />
        <ExecutiveAlertsSection snapshots={snapshots} />
      </div>

      <Separator />

      <ExecutivePrioritiesSection priorities={snapshots.priorities} />

      <Separator />

      <ExecutiveActionsSection snapshots={snapshots} />

      <Separator />

      <ExecutiveSummaryBar snapshots={snapshots} />
    </section>
  )
}
