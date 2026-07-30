"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PurchaseDemandChartProps {
  data: { name: string; productsToBuy: number; estimatedInvestment: number; averageCoverage: number; priority: string }[]
}

const W = 500
const H = 260
const PAD = { top: 20, right: 20, bottom: 40, left: 100 }
const IW = W - PAD.left - PAD.right
const IH = H - PAD.top - PAD.bottom

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v)
}

export function PurchaseDemandChart({ data }: PurchaseDemandChartProps) {
  const { bars, ticksX } = useMemo(() => {
    if (data.length === 0) return { bars: [], ticksX: [], maxInvestment: 0 }

    const sorted = [...data].sort((a, b) => b.estimatedInvestment - a.estimatedInvestment)
    const max = Math.max(...sorted.map((d) => d.estimatedInvestment), 1)
    const tickCount = 4
    const barH = Math.max(8, IH / sorted.length - 4)

    const b = sorted.map((d, i) => {
      const w = (d.estimatedInvestment / max) * IW
      return {
        x: PAD.left,
        y: PAD.top + i * (barH + 4),
        width: w,
        height: barH,
        label: d.name,
        investment: d.estimatedInvestment,
        formattedInvestment: fmtCurrency(d.estimatedInvestment),
        coverage: d.averageCoverage,
        products: d.productsToBuy,
        isHigh: d.priority === "alta",
      }
    })

    const tX = Array.from({ length: tickCount }, (_, i) => {
      const v = Math.round((max * i) / (tickCount - 1))
      return { value: v, x: PAD.left + (v / max) * IW }
    })

    return { bars: b, ticksX: tX }
  }, [data])

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">Demanda de Reposição por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Gráfico de demanda de reposição por categoria"
          style={{ maxHeight: 300 }}
        >
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />
          <line x1={PAD.left} y1={PAD.top + IH} x2={PAD.left + IW} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />

          {ticksX.map((t, i) => (
            <g key={i}>
              <line x1={t.x} y1={PAD.top} x2={t.x} y2={PAD.top + IH} stroke="currentColor" className="text-border/30" strokeWidth={0.5} />
              <text x={t.x} y={PAD.top + IH + 14} textAnchor="middle" className="fill-muted-foreground" fontSize={8}>
                {fmtCurrency(t.value)}
              </text>
            </g>
          ))}

          {bars.map((bar, i) => (
            <g key={i}>
              <text x={PAD.left - 6} y={bar.y + bar.height / 2 + 3} textAnchor="end" className="fill-muted-foreground" fontSize={8}>
                {bar.label}
              </text>
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                className={cn("transition-opacity duration-150 hover:opacity-80", bar.isHigh ? "fill-destructive/70" : "fill-primary/60")}
                rx={2}
                role="graphics-symbol"
                aria-label={`${bar.label}: ${bar.formattedInvestment} em ${bar.products} produtos, ${bar.coverage}d de cobertura`}
                style={{ cursor: "pointer" }}
              />
              <text x={bar.x + bar.width - 4} y={bar.y + bar.height / 2 + 3} textAnchor="end" className="fill-white/90" fontSize={8} fontWeight={600}>
                {bar.formattedInvestment}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}
