"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryChartStockPoint } from "@/features/inventory-executive/mocks/chart-mock";

interface CapitalDistributionChartProps {
  data: InventoryChartStockPoint[];
  "data-testid"?: string;
}

const H = 200;
const W = 400;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);
}

function fmtDate(d: string): string {
  const p = d.split("-");
  return `${parseInt(p[2])}/${parseInt(p[1])}`;
}

function fmtDateFull(d: string): string {
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const p = d.split("-");
  return `${parseInt(p[2])} de ${months[parseInt(p[1]) - 1]} de ${p[0]}`;
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  value: number;
}

export function InventoryCapitalDistributionChart({ data, "data-testid": testId }: CapitalDistributionChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { path, ticksY, ticksX } = useMemo(() => {
    if (data.length === 0) return { path: "", ticksY: [], ticksX: [] };

    const values = data.map((d) => d.immobilizedCapital);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const stepX = IW / (data.length - 1);
    const tickCount = 5;

    const pts = data.map((d, i) => ({
      x: PAD.left + i * stepX,
      y: PAD.top + IH - ((d.immobilizedCapital - min) / range) * IH * 0.9 - IH * 0.05,
      value: d.immobilizedCapital,
      date: d.date,
    }));

    const p = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`).join(" ");

    const tY = Array.from({ length: tickCount }, (_, i) => {
      const v = min + (range * i) / (tickCount - 1);
      const y = PAD.top + IH - ((v - min) / range) * IH * 0.9 - IH * 0.05;
      return { value: v, y };
    });

    const labelCount = 6;
    const labelStep = Math.max(1, Math.floor(data.length / labelCount));
    const tX: { x: number; label: string }[] = [];
    for (let i = 0; i < data.length; i += labelStep) {
      tX.push({ x: pts[i].x, label: fmtDate(data[i].date) });
    }
    const last = data.length - 1;
    if (tX.length === 0 || tX[tX.length - 1].x !== pts[last].x) {
      tX.push({ x: pts[last].x, label: fmtDate(data[last].date) });
    }

    return { path: p, ticksY: tY, ticksX: tX };
  }, [data]);

  const handleMouseEnter = useCallback((pt: TooltipData) => setTooltip(pt), []);
  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">Capital Imobilizado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H + 8}`}
            className="w-full h-auto"
            role="img"
            aria-label="Grafico de capital imobilizado nos ultimos 30 dias"
            style={{ maxHeight: 280 }}
          >
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />
            <line x1={PAD.left} y1={PAD.top + IH} x2={PAD.left + IW} y2={PAD.top + IH} stroke="currentColor" className="text-border" strokeWidth={1} />

            {ticksY.map((t, i) => (
              <g key={i}>
                <line x1={PAD.left} y1={t.y} x2={PAD.left + IW} y2={t.y} stroke="currentColor" className="text-border/40" strokeWidth={0.5} />
                <text x={PAD.left - 8} y={t.y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                  {fmtCurrency(t.value)}
                </text>
              </g>
            ))}

            {ticksX.map((t, i) => (
              <text key={i} x={t.x} y={PAD.top + IH + 16} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
                {t.label}
              </text>
            ))}

            {path && (
              <path d={path} fill="none" className="stroke-warning" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}

            {data.map((d, i) => {
              const stepX2 = IW / (data.length - 1);
              const x = PAD.left + i * stepX2;
              const values = data.map((dd) => dd.immobilizedCapital);
              const max2 = Math.max(...values);
              const min2 = Math.min(...values);
              const range2 = max2 - min2 || 1;
              const y = PAD.top + IH - ((d.immobilizedCapital - min2) / range2) * IH * 0.9 - IH * 0.05;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3}
                  className="fill-warning opacity-0 hover:opacity-100 transition-opacity duration-150"
                  onMouseEnter={() => handleMouseEnter({ x, y, date: d.date, value: d.immobilizedCapital })}
                  onMouseLeave={handleMouseLeave}
                  role="graphics-symbol"
                  aria-label={`${fmtDateFull(d.date)}: ${fmtCurrency(d.immobilizedCapital)}`}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </svg>

          {tooltip && (
            <div
              className="absolute pointer-events-none bg-popover text-popover-foreground text-xs rounded-md border px-3 py-2 shadow-sm z-10 transition-opacity duration-150"
              style={{
                left: Math.min(tooltip.x, W - 160),
                top: Math.max(tooltip.y - 40, 0),
              }}
            >
              <p className="font-medium">{tooltip.date}</p>
              <p className="text-muted-foreground">{fmtCurrency(tooltip.value)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
