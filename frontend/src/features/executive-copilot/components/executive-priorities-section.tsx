"use client"

import type { ExecutivePriority, Urgency } from "@/features/executive-prioritization/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Props {
  priorities: ExecutivePriority[]
}

const urgencyColor = (u: Urgency) => {
  switch (u) {
    case "immediate":
      return "destructive" as const
    case "today":
      return "default" as const
    case "this_week":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

const urgencyLabel = (u: Urgency) => {
  switch (u) {
    case "immediate":
      return "Imediata"
    case "today":
      return "Hoje"
    case "this_week":
      return "Esta semana"
    case "monitor":
      return "Monitorar"
  }
}

export function ExecutivePrioritiesSection({ priorities }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Prioridades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {priorities.length > 0 ? (
          <ul className="space-y-3">
            {priorities.map((p) => (
              <li key={p.id} className="flex items-start gap-3 text-sm">
                <Badge variant={urgencyColor(p.urgency)} className="mt-0.5 shrink-0 text-[10px] uppercase leading-none">
                  {urgencyLabel(p.urgency)}
                </Badge>
                <div>
                  <p className="font-medium">{p.title}</p>
                  {p.description && (
                    <p className="mt-0.5 text-muted-foreground">{p.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma prioridade definida.</p>
        )}
      </CardContent>
    </Card>
  )
}
