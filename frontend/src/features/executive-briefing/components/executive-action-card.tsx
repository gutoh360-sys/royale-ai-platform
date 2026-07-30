import type { ExecutivePriority } from "@/features/executive-prioritization/types"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

interface ExecutiveActionCardProps {
  insights: ExecutivePriority[]
}

export function ExecutiveActionCard({ insights }: ExecutiveActionCardProps) {
  const actions = [...new Set(insights.map((i) => i.recommendedAction))].slice(0, 3)

  if (actions.length === 0) return null

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-heading text-sm font-semibold mb-3">Ações recomendadas</h3>
        <ul className="space-y-2">
          {actions.map((action, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span className="text-sm text-muted-foreground leading-snug">{action}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
