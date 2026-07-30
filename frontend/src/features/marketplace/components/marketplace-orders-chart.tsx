"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartDataPoint } from "@/features/marketplace/mocks/chart-mock";

interface OrdersBarChartProps {
  data: ChartDataPoint[];
  "data-testid"?: string;
}

const H = 200;
const W = 400;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

function fmtDate(d: string): string {
  const p = d.split("-");
  return `${parseInt(p[2])}/${parseInt(p[1])}`;
}

function fmtDateFull(d: string): string {
  const p = d.split("-");
  return `${parseInt(p[2])} de ${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][parseInt(p[1]) - 1]} de ${p[0]}`;
}

interface TooltipData {
  x: number;
  date: string;
  value: number;
}

export function OrdersBarChart({ data, "data-testid": testId }: OrdersBarChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { bars, ticksY, ticksX, maxVal } = useMemo(() => {
    if (data.length === 0) return { bars: [], ticksY: [], ticksX: [], maxVal: 0 };

    const values = data.map((d) => d.orders);
    const max = Math.max(...values, 1);
    const tickCount = 4;
    const barWidth = Math.max(3, IW / data.length - 2);
    const stepX = IW / data.length;

    const b = data.map((d, i) => {
      const x = PAD.left + i * stepX + (stepX - barWidth) / 2;
      const h = (d.orders / max) * IH * 0.95;
      return { x, y: PAD.top + IH - h, width: barWidth, height: h, value: d.orders, date: d.date };
    });

    const tY = Array.from({ length: tickCount }, (_, i) => {
      const v = Math.round((max * i) / (tickCount - 1));
      const y = PAD.top + IH - (v / max) * IH * 0.95;
      return { value: v, y };
    });

    const labelCount = 6;
    const labelStep = Math.max(1, Math.floor(data.length / labelCount));
    const tX: { x: number; label: string }[] = [];
    for (let i = 0; i < data.length; i += labelStep) {
      tX.push({ x: PAD.left + i * stepX + stepX / 2, label: fmtDate(data[i].date) });
    }
    const last = data.length - 1;
    if (tX.length === 0 || tX[tX.length - 1].x !== PAD.left + last * stepX + stepX / 2) {
      tX.push({ x: PAD.left + last * stepX + stepX / 2, label: fmtDate(data[last].date) });
    }

    return { bars: b, ticksY: tY, ticksX: tX, maxVal: max };
  }, [data]);

  const handleMouseEnter = useCallback((bar: TooltipData) => setTooltip(bar), []);
  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">Pedidos por Dia</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H + 8}`}
            className="w-full h-auto"
            role="img"
            aria-label="Gráfico de pedidos por dia nos últimos 30 dias"
            style={{ maxHeight: 260 }}
          >
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />
            <line x1={PAD.left} y1={PAD.top + IH} x2={PAD.left + IW} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />

            {ticksY.map((t, i) => (
              <g key={i}>
                <line x1={PAD.left} y1={t.y} x2={PAD.left + IW} y2={t.y} stroke="currentColor" className="text-border/40" strokeWidth={0.5} />
                <text x={PAD.left - 6} y={t.y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                  {t.value}
                </text>
              </g>
            ))}

            {ticksX.map((t, i) => (
              <text key={i} x={t.x} y={PAD.top + IH + 16} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
                {t.label}
              </text>
            ))}

            {bars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                className="fill-primary/60 hover:fill-primary transition-colors duration-150"
                rx={1}
                onMouseEnter={() => handleMouseEnter({ x: bar.x + bar.width / 2, date: bar.date, value: bar.value })}
                onMouseLeave={handleMouseLeave}
                role="graphics-symbol"
                aria-label={`${fmtDateFull(bar.date)}: ${bar.value} pedidos`}
                style={{ cursor: "pointer" }}
              />
            ))}
          </svg>

          {tooltip && (
            <div
              className="absolute pointer-events-none bg-popover text-popover-foreground text-xs rounded-md border px-3 py-2 shadow-sm z-10 transition-opacity duration-150"
              style={{
                left: Math.min(tooltip.x - 40, W - 140),
                top: PAD.top - 8,
              }}
            >
              <p className="font-medium">{tooltip.date}</p>
              <p className="text-muted-foreground">{tooltip.value} pedidos</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
