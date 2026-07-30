import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveModuleCardProps {
  name: string;
  icon: string;
  href: string;
  kpi: string;
  kpiLabel: string;
  insight: string;
  priority: "alta" | "media" | "baixa" | "critica";
  enabled: boolean;
}

const priorityConfig = {
  critica: { label: "Critica", class: "text-destructive" },
  alta: { label: "Alta", class: "text-destructive" },
  media: { label: "Media", class: "text-warning" },
  baixa: { label: "Baixa", class: "text-muted-foreground" },
};

export function ExecutiveModuleCard({
  name, icon, href, kpi, kpiLabel, insight, priority, enabled,
}: ExecutiveModuleCardProps) {
  const prio = priorityConfig[priority];

  if (!enabled) {
    return (
      <Card className="opacity-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold">{name}</p>
              <p className="text-[11px] text-muted-foreground">Em breve</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl group">
      <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group-hover:border-primary/20 cursor-pointer h-full">
        <CardContent className="p-4 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{name}</p>
                </div>
              </div>
              <span className={cn("text-[10px] font-medium", prio.class)}>{prio.label}</span>
            </div>

            <div className="mb-2">
              <p className="text-xs text-muted-foreground">{kpiLabel}</p>
              <p className="font-heading text-base font-semibold tracking-tight">{kpi}</p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{insight}</p>
          </div>

          <div className="flex items-center gap-1 mt-3 text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Ver detalhes
            <ArrowRight className="size-3" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
