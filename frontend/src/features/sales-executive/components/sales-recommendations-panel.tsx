import { Sparkles, ArrowUpRight, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SalesRecommendation } from "../types"

const impactColor = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
}

interface SalesRecommendationsPanelProps {
  recommendations: SalesRecommendation[]
}

export function SalesRecommendationsPanel({ recommendations }: SalesRecommendationsPanelProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recomendações</p>
      </div>
      <div className="space-y-2">
        {recommendations.map((rec) => (
          <div key={rec.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-medium">{rec.title}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <ArrowUpRight className="size-3" aria-hidden="true" />
                Impacto:{" "}
                <span className={cn("font-medium", impactColor[rec.impact])}>
                  {rec.impact === "high" ? "Alto" : rec.impact === "medium" ? "Médio" : "Baixo"}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Timer className="size-3" aria-hidden="true" />
                Esforço:{" "}
                <span className="font-medium">
                  {rec.effort === "high" ? "Alto" : rec.effort === "medium" ? "Médio" : "Baixo"}
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground ml-auto">{rec.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
