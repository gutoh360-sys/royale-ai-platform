import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, AlertTriangle, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionOrigin = "executive" | "marketplace" | "financial";

export interface ActionItem {
  id: string;
  description: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  origin: ActionOrigin;
  onClick?: () => void;
}

interface ExecutiveActionListProps {
  actions: ActionItem[];
}

const originConfig: Record<ActionOrigin, { label: string; icon: typeof AlertTriangle }> = {
  executive: { label: "Central Executiva", icon: AlertTriangle },
  marketplace: { label: "Marketplace", icon: TrendingDown },
  financial: { label: "Financeiro", icon: TrendingUp },
};

const priorityStyle: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-transparent",
};

export function ExecutiveActionList({ actions }: ExecutiveActionListProps) {
  if (actions.length === 0) {
    return (
      <section aria-label="Acoes recomendadas">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
          Acoes Recomendadas
        </h2>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex size-10 items-center justify-center rounded-full bg-muted mb-3">
              <Lightbulb className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma acao recomendada no momento.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-label="Acoes recomendadas">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
        Acoes Recomendadas
      </h2>
      <div className="space-y-2">
        {actions.map((action) => {
          const origin = originConfig[action.origin];
          const Icon = origin.icon;

          return (
            <Card
              key={action.id}
              className={cn(
                "transition-colors hover:border-border/80 cursor-pointer",
                (action.priority === "high" || action.priority === "critical") && "border-l-[3px] border-l-destructive",
                action.priority === "medium" && "border-l-[3px] border-l-warning",
              )}
              onClick={action.onClick}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border", priorityStyle[action.priority])}>
                      <Icon className="size-3" aria-hidden="true" />
                      {origin.label}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{action.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                  </div>

                  <div className="shrink-0 self-center text-muted-foreground">
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
