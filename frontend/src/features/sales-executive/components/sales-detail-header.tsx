"use client"

import { TrendingUp, ShoppingCart, DollarSign, Users, Package, Percent, ArrowUp, Heart } from "lucide-react"
import type { SalesData } from "../types"

const cards = [
  { key: "revenue", label: "Receita", icon: DollarSign, format: (v: number) => `R$ ${(v / 1000).toFixed(1)}k`, color: "text-primary" },
  { key: "orders", label: "Pedidos", icon: ShoppingCart, format: (v: number) => v.toLocaleString("pt-BR"), color: "text-primary" },
  { key: "averageTicket", label: "Ticket médio", icon: TrendingUp, format: (v: number) => `R$ ${v.toFixed(2)}`, color: "text-primary" },
  { key: "conversionRate", label: "Conversão", icon: Percent, format: (v: number) => `${(v * 100).toFixed(1)}%`, color: "text-primary" },
  { key: "productsSold", label: "Produtos vendidos", icon: Package, format: (v: number) => v.toLocaleString("pt-BR"), color: "text-primary" },
  { key: "customersServed", label: "Clientes", icon: Users, format: (v: number) => v.toLocaleString("pt-BR"), color: "text-primary" },
  { key: "growth", label: "Crescimento", icon: ArrowUp, format: (v: number) => `${v}%`, color: "text-success" },
  { key: "health", label: "Saúde", icon: Heart, format: (v: number) => `${v}%`, color: "text-success" },
] as const

interface SalesDetailHeaderProps {
  data: SalesData
}

export function SalesDetailHeader({ data }: SalesDetailHeaderProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{data.period.label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map((card) => {
          const Icon = card.icon
          const value = data[card.key as keyof SalesData] as number
          return (
            <div key={card.key} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="text-[11px] text-muted-foreground">{card.label}</span>
              </div>
              <p className={`font-heading text-lg font-semibold tracking-tight ${card.color}`}>
                {card.format(value)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
