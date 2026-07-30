import type { CopilotRecommendedAction } from "@/features/executive-copilot/types"
import { cn } from "@/lib/utils"

const priorityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-orange-500",
  medium: "text-warning",
  low: "text-muted-foreground",
}

interface ExecutiveRecommendedActionsProps {
  actions: CopilotRecommendedAction[]
}

export function ExecutiveRecommendedActions({ actions }: ExecutiveRecommendedActionsProps) {
  if (actions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma ação recomendada no momento.</p>
  }

  return (
    <div className="space-y-2">
      {actions.map((a, i) => (
        <div key={i} className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{a.action}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{a.reason}</p>
          </div>
          <span className={cn("shrink-0 text-xs font-medium", priorityColor[a.priority])}>
            {a.priority === "critical" ? "Urgente" : a.priority === "high" ? "Alta" : "Média"}
          </span>
        </div>
      ))}
    </div>
  )
}
