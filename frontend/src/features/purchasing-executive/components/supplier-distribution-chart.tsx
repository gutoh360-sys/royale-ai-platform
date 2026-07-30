"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SupplierDistributionChartProps {
  data: { name: string; share: number; formattedShare: string; reliability: number }[]
}

const W = 300
const H = 300
const CX = W / 2
const CY = H / 2
const R = 110
const IR = 65

const COLORS = ["hsl(220, 70%, 55%)", "hsl(180, 60%, 45%)", "hsl(30, 80%, 55%)", "hsl(280, 50%, 50%)", "hsl(80, 55%, 45%)"]

export function SupplierDistributionChart({ data }: SupplierDistributionChartProps) {
  const { arcs } = useMemo(() => {
    if (data.length === 0) return { arcs: [], total: 0 }
    const t = data.reduce((s, d) => s + d.share, 0)
    let currentAngle = -Math.PI / 2

    const a = data.map((d, i) => {
      const angle = (d.share / t) * 2 * Math.PI
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle

      const x1 = CX + R * Math.cos(startAngle)
      const y1 = CY + R * Math.sin(startAngle)
      const x2 = CX + R * Math.cos(endAngle)
      const y2 = CY + R * Math.sin(endAngle)
      const largeArc = angle > Math.PI ? 1 : 0

      const midAngle = startAngle + angle / 2
      const labelR = (R + IR) / 2
      const lx = CX + labelR * Math.cos(midAngle)
      const ly = CY + labelR * Math.sin(midAngle)

      return {
        path: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        labelX: lx,
        labelY: ly,
        label: d.share > 8 ? `${d.formattedShare}` : "",
        name: d.name.length > 14 ? d.name.slice(0, 12) + "..." : d.name,
        color: COLORS[i % COLORS.length],
        share: d.share,
        reliability: d.reliability,
      }
    })

    return { arcs: a }
  }, [data])

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">Distribuição por Fornecedor</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H + 60}`}
          className="w-full h-auto"
          role="img"
          aria-label="Gráfico de distribuição por fornecedor"
          style={{ maxHeight: 320 }}
        >
          {arcs.map((arc, i) => (
            <g key={i}>
              <path d={arc.path} fill={arc.color} className="transition-opacity duration-150 hover:opacity-80" stroke="white" strokeWidth={2} style={{ cursor: "pointer" }} />
              {arc.label && (
                <text x={arc.labelX} y={arc.labelY} textAnchor="middle" dominantBaseline="middle" className="fill-white/90" fontSize={10} fontWeight={600}>
                  {arc.label}
                </text>
              )}
            </g>
          ))}

          <circle cx={CX} cy={CY} r={IR} fill="white" className="dark:fill-zinc-900" />
          <text x={CX} y={CY - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
            Fornecedores
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" className="fill-foreground" fontSize={16} fontWeight={700}>
            {data.length}
          </text>

          {arcs.map((arc, i) => (
            <g key={`leg-${i}`}>
              <rect x={10} y={H + 8 + i * 16} width={10} height={10} rx={2} fill={arc.color} />
              <text x={24} y={H + 16 + i * 16} className="fill-muted-foreground" fontSize={9}>
                {arc.name}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}
