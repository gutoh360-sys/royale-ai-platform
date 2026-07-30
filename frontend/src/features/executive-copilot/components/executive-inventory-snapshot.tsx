import type { CopilotInventorySnapshot } from "@/features/executive-copilot/types"

interface ExecutiveInventorySnapshotProps {
  snapshot: CopilotInventorySnapshot
}

export function ExecutiveInventorySnapshot({ snapshot }: ExecutiveInventorySnapshotProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Estoque</p>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Produtos ativos</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">{snapshot.totalProducts}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Risco de ruptura</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular text-orange-500">{snapshot.stockoutRisk}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Excesso de estoque</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular text-yellow-600 dark:text-yellow-400">{snapshot.overstock}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Cobertura média</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">
            {snapshot.averageCoverage !== null ? `${snapshot.averageCoverage}d` : "N/A"}
          </p>
        </div>
      </div>
    </div>
  )
}
