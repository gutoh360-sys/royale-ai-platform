"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface InsightData {
  fact: string
  reason: string
  impact: string
  action: string
}

export type InsightPriority = "alta" | "media" | "baixa"

interface ExecutiveInsightCardProps {
  insight: InsightData
  index: number
  priority?: InsightPriority
}

const priorityConfig: Record<InsightPriority, { label: string; class: string }> = {
  alta: { label: "Alta", class: "bg-destructive/10 text-destructive border-destructive/20" },
  media: { label: "Média", class: "bg-warning/10 text-warning border-warning/20" },
  baixa: { label: "Baixa", class: "bg-info/10 text-info border-info/20" },
}

export function ExecutiveInsightCard({ insight, index, priority = "baixa" }: ExecutiveInsightCardProps) {
  const pConfig = priorityConfig[priority]

  return (
    <Card className="transition-shadow duration-150 hover:shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Fato
              </p>
              <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", pConfig.class)}>
                {pConfig.label}
              </span>
            </div>
            <p className="text-sm font-semibold mt-0.5">{insight.fact}</p>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Motivo</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{insight.reason}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Impacto</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{insight.impact}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ação</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed font-medium text-foreground/80">{insight.action}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
