import type { CopilotTopPriority } from "@/features/executive-copilot/types"
import { cn } from "@/lib/utils"

const severityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-orange-500",
  medium: "text-warning",
  low: "text-muted-foreground",
}

interface ExecutiveTopPrioritiesProps {
  priorities: CopilotTopPriority[]
}

export function ExecutiveTopPriorities({ priorities }: ExecutiveTopPrioritiesProps) {
  if (priorities.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma prioridade no momento.</p>
  }

  return (
    <div className="space-y-2">
      {priorities.map((p, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className={cn("mt-0.5 text-xs font-bold shrink-0", severityColor[p.severity])}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{p.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
