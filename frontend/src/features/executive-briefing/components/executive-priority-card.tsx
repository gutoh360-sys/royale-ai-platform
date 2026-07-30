import type { ExecutivePriority } from "@/features/executive-prioritization/types"
import { Card, CardContent } from "@/components/ui/card"
import { Target } from "lucide-react"
import { cn } from "@/lib/utils"

const severityBorder: Record<string, string> = {
  critical: "border-destructive/30",
  high: "border-orange-500/30",
  medium: "border-warning/30",
  low: "border-slate-300/30",
  info: "border-primary/30",
}

const severityIconBg: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/10 text-orange-500",
  medium: "bg-warning/10 text-warning",
  low: "bg-slate-400/10 text-slate-500",
  info: "bg-primary/10 text-primary",
}

interface ExecutivePriorityCardProps {
  insight: ExecutivePriority
}

export function ExecutivePriorityCard({ insight }: ExecutivePriorityCardProps) {
  return (
    <Card className={cn("border-2", severityBorder[insight.severity] ?? severityBorder.info)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("flex size-9 items-center justify-center rounded-lg", severityIconBg[insight.severity] ?? severityIconBg.info)}>
            <Target className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prioridade de hoje</p>
            <h3 className="font-heading text-base font-semibold tracking-tight">
              {insight.title}
            </h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {insight.description}
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Por que agora
            </p>
            <p className="text-sm text-muted-foreground">
              {insight.whyNow}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Ação recomendada
            </p>
            <p className="text-sm font-medium">
              {insight.recommendedAction}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
