import type { CopilotFinancialSnapshot } from "@/features/executive-copilot/types"

interface ExecutiveFinancialSnapshotProps {
  snapshot: CopilotFinancialSnapshot
}

export function ExecutiveFinancialSnapshot({ snapshot }: ExecutiveFinancialSnapshotProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Financeiro</p>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Receita</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">
            R$ {snapshot.revenue.toLocaleString("pt-BR")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Lucro</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">
            R$ {snapshot.profit.toLocaleString("pt-BR")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Capital parado</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular text-destructive">
            R$ {snapshot.idleCapital.toLocaleString("pt-BR")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ROI médio</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">{snapshot.averageROI}%</p>
        </div>
      </div>
    </div>
  )
}
