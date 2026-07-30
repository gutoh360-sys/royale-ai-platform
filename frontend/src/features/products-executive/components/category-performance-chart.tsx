"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CategoryPerformanceChartProps {
  data: { name: string; revenue: number; growth: number }[]
}

const W = 400
const H = 240
const PAD = { top: 20, right: 20, bottom: 40, left: 80 }
const IW = W - PAD.left - PAD.right
const IH = H - PAD.top - PAD.bottom

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v)
}

export function CategoryPerformanceChart({ data }: CategoryPerformanceChartProps) {
  const { groups, maxGrowth, minGrowth } = useMemo(() => {
    if (data.length === 0) return { groups: [], maxGrowth: 0, minGrowth: 0, range: 1 }

    const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
    const maxG = Math.max(...data.map((d) => d.growth), 1)
    const minG = Math.min(...data.map((d) => d.growth), 0)
    const barW = Math.max(20, IW / sorted.length - 16)

    const g = sorted.map((d, i) => {
      const x = PAD.left + i * (barW + 16) + 8
      const h = (d.growth / maxG) * IH * 0.8
      const y = d.growth >= 0
        ? PAD.top + IH - h
        : PAD.top + IH

      return {
        x,
        y,
        width: barW,
        height: Math.max(2, Math.abs(d.growth) / maxG * IH * 0.8),
        label: d.name.length > 12 ? d.name.slice(0, 10) + "..." : d.name,
        revenue: d.revenue,
        growth: d.growth,
        formattedRevenue: fmtCurrency(d.revenue),
        isPositive: d.growth >= 0,
      }
    })

    return { groups: g, maxGrowth: maxG, minGrowth: minG }
  }, [data])

  if (data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">Performance por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Gráfico de performance por categoria"
          style={{ maxHeight: 280 }}
        >
          <line x1={PAD.left} y1={PAD.top + IH / 2} x2={PAD.left + IW} y2={PAD.top + IH / 2} stroke="currentColor" className="text-border/50" strokeWidth={1} />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />

          <text x={PAD.left - 6} y={PAD.top + IH / 2 - 4} textAnchor="end" className="fill-muted-foreground" fontSize={8}>
            {maxGrowth}%
          </text>
          <text x={PAD.left - 6} y={PAD.top + IH / 2 + 12} textAnchor="end" className="fill-muted-foreground" fontSize={8}>
            {minGrowth}%
          </text>

          {groups.map((g, i) => (
            <g key={i}>
              <text
                x={g.x + g.width / 2}
                y={PAD.top + IH + 14}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={8}
              >
                {g.label}
              </text>
              <rect
                x={g.x}
                y={g.y}
                width={g.width}
                height={g.height}
                className={cn("transition-opacity duration-150 hover:opacity-80", g.isPositive ? "fill-success/70" : "fill-destructive/70")}
                rx={2}
                role="graphics-symbol"
                aria-label={`${g.label}: ${g.growth}% de crescimento, ${g.formattedRevenue}`}
                style={{ cursor: "pointer" }}
              />
              <text
                x={g.x + g.width / 2}
                y={g.isPositive ? g.y - 4 : g.y + g.height + 12}
                textAnchor="middle"
                className={cn("fill-current", g.isPositive ? "text-success" : "text-destructive")}
                fontSize={9}
                fontWeight={600}
              >
                {g.growth >= 0 ? "+" : ""}{g.growth}%
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}
