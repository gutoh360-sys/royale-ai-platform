import type { OrderEntry } from "../types"

interface OrderTrendChartProps {
  data: OrderEntry[]
}

export function OrderTrendChart({ data }: OrderTrendChartProps) {
  const max = Math.max(...data.map((d) => d.value))
  const min = Math.min(...data.map((d) => d.value))
  const range = max - min || 1
  const barW = 28

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Tendência de pedidos
      </p>
      <div className="flex items-end gap-2 h-48">
        {data.map((d, i) => {
          const h = ((d.value - min) / range) * 160 + 4
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] text-muted-foreground">{d.value}</span>
              <div
                className="w-full rounded-t-sm bg-primary/60 hover:bg-primary transition-colors"
                style={{ height: `${h}px`, minHeight: "4px" }}
              />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
