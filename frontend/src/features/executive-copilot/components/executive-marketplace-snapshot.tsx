import type { CopilotMarketplaceSnapshot } from "@/features/executive-copilot/types"

interface ExecutiveMarketplaceSnapshotProps {
  snapshot: CopilotMarketplaceSnapshot
}

export function ExecutiveMarketplaceSnapshot({ snapshot }: ExecutiveMarketplaceSnapshotProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Marketplace</p>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Receita</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">{snapshot.totalRevenue}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pedidos</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">{snapshot.totalOrders}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ticket médio</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">{snapshot.averageTicket}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Saúde</p>
          <p className="font-heading text-lg font-semibold tracking-tight tabular">{snapshot.averageHealth}/100</p>
        </div>
      </div>
    </div>
  )
}
