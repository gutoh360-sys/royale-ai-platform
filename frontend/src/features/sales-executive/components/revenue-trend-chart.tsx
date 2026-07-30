import type { RevenueEntry } from "../types"

interface RevenueTrendChartProps {
  data: RevenueEntry[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const max = Math.max(...data.map((d) => d.value))
  const min = Math.min(...data.map((d) => d.value))
  const range = max - min || 1
  const w = 600
  const h = 200
  const pad = { top: 20, right: 16, bottom: 24, left: 48 }
  const gw = w - pad.left - pad.right
  const gh = h - pad.top - pad.bottom

  const xScale = (i: number) => pad.left + (i / (data.length - 1)) * gw
  const yScale = (v: number) => pad.top + gh - ((v - min) / range) * gh

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d.value).toFixed(1)}`)
    .join("")

  const areaPath = `${linePath}L${xScale(data.length - 1).toFixed(1)},${pad.top + gh}L${xScale(0).toFixed(1)},${pad.top + gh}Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * range)

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Tendência de receita
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Gráfico de tendência de receita">
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              y1={yScale(tick)}
              x2={w - pad.right}
              y2={yScale(tick)}
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
            <text x={pad.left - 6} y={yScale(tick) + 3} textAnchor="end" className="fill-muted-foreground" fontSize="10">
              R$ {tick.toFixed(0)}
            </text>
          </g>
        ))}
        <path d={areaPath} fill="hsl(var(--primary) / 0.1)" />
        <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map((d, i) => {
          const idx = data.indexOf(d)
          return (
            <g key={i}>
              <circle cx={xScale(idx)} cy={yScale(d.value)} r="3" fill="hsl(var(--primary))" />
              <text x={xScale(idx)} y={pad.top + gh + 16} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
