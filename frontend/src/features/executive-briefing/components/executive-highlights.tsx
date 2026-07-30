import type { ExecutivePriority } from "@/features/executive-prioritization/types"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const severityConfig: Record<string, { label: string; dot: string }> = {
  critical: { label: "Crítica", dot: "bg-destructive" },
  high: { label: "Alta", dot: "bg-orange-500" },
  medium: { label: "Média", dot: "bg-warning" },
  low: { label: "Baixa", dot: "bg-slate-400" },
  info: { label: "Info", dot: "bg-primary" },
}

const categoryLabels: Record<string, string> = {
  inventory: "Estoque",
  marketplace: "Marketplace",
  financial: "Financeiro",
  operations: "Operações",
  sales: "Vendas",
  service: "Serviço",
  strategic: "Estratégico",
}

interface ExecutiveHighlightsProps {
  insights: ExecutivePriority[]
}

export function ExecutiveHighlights({ insights }: ExecutiveHighlightsProps) {
  if (insights.length === 0) return null

  const top = insights.slice(0, 3)

  return (
    <section aria-label="Destaques executivos">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {top.map((insight) => {
          const severity = severityConfig[insight.severity] ?? severityConfig.info
          const category = categoryLabels[insight.category] ?? insight.category

          return (
            <Card key={insight.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("inline-block size-2 rounded-full", severity.dot)} aria-hidden="true" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {category}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">·</span>
                  <span className="text-[11px] text-muted-foreground">{severity.label}</span>
                </div>
                <h3 className="text-sm font-semibold leading-snug mb-1">
                  {insight.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {insight.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
