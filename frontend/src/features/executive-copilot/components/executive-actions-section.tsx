"use client"

import type { ModuleSnapshots } from "@/features/executive-copilot/types/briefing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  snapshots: ModuleSnapshots
}

export function ExecutiveActionsSection({ snapshots }: Props) {
  const { priorities } = snapshots

  const actions: { text: string; source: string }[] = []

  if (priorities.length > 0) {
    priorities
      .filter((p) => p.recommendedAction)
      .forEach((p) =>
        actions.push({ text: p.recommendedAction, source: "Prioridades" })
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Ações Recomendadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length > 0 ? (
          <ul className="space-y-3">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="font-medium">{a.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Origem: {a.source}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma ação recomendada disponível.</p>
        )}
      </CardContent>
    </Card>
  )
}
