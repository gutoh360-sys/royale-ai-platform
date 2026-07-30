import { Lightbulb, AlertTriangle, Info, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SalesInsight } from "../types"

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: "text-success border-success/20 bg-success/5",
  warning: "text-warning border-warning/20 bg-warning/5",
  danger: "text-destructive border-destructive/20 bg-destructive/5",
  info: "text-primary border-primary/20 bg-primary/5",
}

interface SalesInsightsPanelProps {
  insights: SalesInsight[]
}

export function SalesInsightsPanel({ insights }: SalesInsightsPanelProps) {
  const Icon = Lightbulb
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Insights</p>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const ItemIcon = iconMap[insight.type]
          return (
            <div key={i} className={cn("rounded-md border p-3", colorMap[insight.type])}>
              <div className="flex items-start gap-2">
                <ItemIcon className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{insight.title}</p>
                    {insight.metric && (
                      <span className={cn("text-sm font-semibold shrink-0", insight.type === "success" ? "text-success" : insight.type === "warning" ? "text-warning" : insight.type === "danger" ? "text-destructive" : "text-primary")}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
