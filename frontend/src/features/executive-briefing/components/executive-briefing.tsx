"use client"

import { useBriefing } from "@/features/executive-briefing/hooks/use-briefing"
import { ExecutiveGreeting } from "./executive-greeting"
import { ExecutiveHighlights } from "./executive-highlights"
import { ExecutivePriorityCard } from "./executive-priority-card"
import { ExecutiveActionCard } from "./executive-action-card"

export function ExecutiveBriefing() {
  const { priorities, state } = useBriefing()

  if (state === "empty") {
    return (
      <section aria-label="Briefing executivo">
        <ExecutiveGreeting />
        <p className="text-sm text-muted-foreground mt-4">
          Não existem ações prioritárias no momento.
        </p>
      </section>
    )
  }

  const top = priorities.slice(0, 3)
  const priority = priorities[0]

  return (
    <section aria-label="Briefing executivo" className="space-y-6">
      <ExecutiveGreeting />
      <ExecutiveHighlights insights={top} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExecutivePriorityCard insight={priority} />
        </div>
        <div>
          <ExecutiveActionCard insights={priorities} />
        </div>
      </div>
    </section>
  )
}
