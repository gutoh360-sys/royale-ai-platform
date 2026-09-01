import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MarketplaceMetric } from "./marketplace-metric";
import { getHealthConfig } from "@/features/marketplace/utils/health";
import type { MarketplaceData } from "@/features/marketplace/types";

interface MarketplaceCardProps {
  marketplace: MarketplaceData;
}

export function MarketplaceCard({ marketplace }: MarketplaceCardProps) {
  const health = getHealthConfig(marketplace.health);

  return (
    <Link
      href={`/marketplace/${marketplace.slug}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl group"
      aria-label={`Ver detalhes do ${marketplace.name}`}
    >
      <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group-hover:border-primary/20 cursor-pointer" role="article" aria-label={`${marketplace.name}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {marketplace.logo}
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold">{marketplace.name}</h3>
              <p className="text-[11px] text-muted-foreground">
                {marketplace.channelCount > 1
                  ? `${marketplace.channelCount} conexões`
                  : marketplace.status === "connected"
                    ? "Conectado"
                    : marketplace.status}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <MarketplaceMetric label="Receita" value={marketplace.formattedRevenue} />
          <MarketplaceMetric label="Pedidos" value={marketplace.formattedOrders} />
          <MarketplaceMetric label="Ticket médio" value={marketplace.formattedAverageTicket} />
          <MarketplaceMetric label="Participação" value={marketplace.formattedMarketShare} />
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {marketplace.health === 100 ? "Conectado" : marketplace.health === 0 ? "Pausado" : health.label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(marketplace.lastUpdate).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
