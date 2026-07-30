import { AlertTriangle, AlertCircle, Info, AlertOctagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AlertData, AlertSeverity } from "@/features/dashboard/alerts-center/types";

interface OperationsAlertItemProps {
  alert: AlertData;
}

const severityConfig: Record<
  AlertSeverity,
  { icon: React.ElementType; label: string; border: string; indicator: string }
> = {
  critical: {
    icon: AlertOctagon,
    label: "Crítico",
    border: "border-destructive/20",
    indicator: "before:bg-destructive",
  },
  high: {
    icon: AlertTriangle,
    label: "Alto",
    border: "border-orange-500/20",
    indicator: "before:bg-orange-500",
  },
  medium: {
    icon: AlertCircle,
    label: "Médio",
    border: "border-warning/20",
    indicator: "before:bg-warning",
  },
  low: {
    icon: Info,
    label: "Baixo",
    border: "border-info/20",
    indicator: "before:bg-info",
  },
};

const categoryLabel: Record<string, string> = {
  sales: "Vendas",
  inventory: "Estoque",
  marketplace: "Marketplace",
  financial: "Financeiro",
  integration: "Integração",
  system: "Sistema",
};

const statusLabel: Record<string, string> = {
  open: "Aberto",
  acknowledged: "Visto",
  resolved: "Resolvido",
};

export function OperationsAlertItem({ alert }: OperationsAlertItemProps) {
  const config = severityConfig[alert.severity];
  const SeverityIcon = config.icon;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border p-4 pl-5 transition-colors before:absolute before:left-0 before:top-3 before:h-8 before:w-0.5 before:rounded-full",
        config.border,
        config.indicator,
      )}
      role="listitem"
      aria-label={`Alerta ${config.label}: ${alert.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <SeverityIcon
            className={cn("mt-0.5 size-4 shrink-0", config.indicator.replace("before:", ""))}
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium leading-snug">{alert.title}</h4>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-auto font-medium",
                  config.indicator.replace("before:", "text-"),
                  config.indicator.replace("before:", "border-"),
                )}
              >
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {alert.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{categoryLabel[alert.category]}</span>
          <span aria-hidden="true">·</span>
          <span>{alert.source}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={alert.timestamp}>
            {new Date(alert.timestamp).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
          {alert.status !== "open" && (
            <>
              <span aria-hidden="true">·</span>
              <span>{statusLabel[alert.status]}</span>
            </>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger className="cursor-default">
            <Button variant="outline" size="sm" disabled>
              Ver detalhes
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Disponível em uma próxima versão.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
