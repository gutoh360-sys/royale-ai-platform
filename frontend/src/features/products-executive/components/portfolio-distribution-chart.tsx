"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PortfolioDistributionChartProps {
  data: { name: string; revenue: number; margin: number; growth: number }[]
}

const W = 500
const H = 260
const PAD = { top: 20, right: 20, bottom: 40, left: 80 }
const IW = W - PAD.left - PAD.right
const IH = H - PAD.top - PAD.bottom

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v)
}

export function PortfolioDistributionChart({ data }: PortfolioDistributionChartProps) {
  const { bars, ticksY } = useMemo(() => {
    if (data.length === 0) return { bars: [], ticksY: [], maxVal: 0 }

    const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
    const values = sorted.map((d) => d.revenue)
    const max = Math.max(...values, 1)
    const tickCount = 4
    const barHeight = Math.max(8, IH / sorted.length - 4)

    const b = sorted.map((d, i) => {
      const w = (d.revenue / max) * IW
      return {
        x: PAD.left,
        y: PAD.top + i * (barHeight + 4),
        width: w,
        height: barHeight,
        label: d.name.length > 18 ? d.name.slice(0, 16) + "..." : d.name,
        value: d.revenue,
        formattedValue: fmtCurrency(d.revenue),
        margin: d.margin,
      }
    })

    const tY = Array.from({ length: tickCount }, (_, i) => {
      const v = (max * i) / (tickCount - 1)
      const x = PAD.left + (v / max) * IW
      return { value: v, x }
    })

    return { bars: b, ticksY: tY }
  }, [data])

  if (data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">Distribuição da Receita por Produto</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Gráfico de distribuição da receita por produto"
          style={{ maxHeight: 300 }}
        >
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />
          <line x1={PAD.left} y1={PAD.top + IH} x2={PAD.left + IW} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />

          {ticksY.map((t, i) => (
            <g key={i}>
              <line x1={t.x} y1={PAD.top} x2={t.x} y2={PAD.top + IH} stroke="currentColor" className="text-border/30" strokeWidth={0.5} />
              <text x={t.x} y={PAD.top + IH + 14} textAnchor="middle" className="fill-muted-foreground" fontSize={8}>
                {fmtCurrency(t.value)}
              </text>
            </g>
          ))}

          {bars.map((bar, i) => {
            const hue = 220 + (i / bars.length) * 40
            return (
              <g key={i}>
                <text x={PAD.left - 6} y={bar.y + bar.height / 2 + 3} textAnchor="end" className="fill-muted-foreground" fontSize={8}>
                  {bar.label}
                </text>
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={`hsl(${hue}, 65%, ${60 - (i / bars.length) * 15}%)`}
                  rx={2}
                  className="transition-opacity duration-150 hover:opacity-80"
                  role="graphics-symbol"
                  aria-label={`${bar.label}: ${bar.formattedValue}`}
                  style={{ cursor: "pointer" }}
                />
                <text x={bar.x + bar.width - 4} y={bar.y + bar.height / 2 + 3} textAnchor="end" className="fill-white/90" fontSize={8} fontWeight={600}>
                  {bar.formattedValue}
                </text>
              </g>
            )
          })}
        </svg>
      </CardContent>
    </Card>
  )
}
