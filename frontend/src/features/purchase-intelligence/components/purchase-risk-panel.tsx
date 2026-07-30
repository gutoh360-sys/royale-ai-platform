import type { PurchaseRecommendation } from "@/features/purchase-intelligence/types"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const riskConfig: Record<string, { label: string; color: string }> = {
  critical: { label: "Crítico", color: "text-destructive" },
  high: { label: "Alto", color: "text-orange-500" },
  medium: { label: "Médio", color: "text-warning" },
  low: { label: "Baixo", color: "text-muted-foreground" },
}

interface PurchaseRiskPanelProps {
  recommendations: PurchaseRecommendation[]
}

export function PurchaseRiskPanel({ recommendations }: PurchaseRiskPanelProps) {
  const groups = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>
  for (const r of recommendations) groups[r.riskLevel]++

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Distribuição de risco
        </p>
        <div className="space-y-2">
          {Object.entries(groups).map(([level, count]) => (
            <div key={level} className="flex items-center gap-3">
              <span className={cn("w-16 text-xs font-medium", riskConfig[level]?.color)}>
                {riskConfig[level]?.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    level === "critical" && "bg-destructive",
                    level === "high" && "bg-orange-500",
                    level === "medium" && "bg-warning",
                    level === "low" && "bg-muted-foreground/30",
                  )}
                  style={{ width: `${recommendations.length > 0 ? (count / recommendations.length) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-xs text-right text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
