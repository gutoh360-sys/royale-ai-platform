import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface ExecutiveHealthSummaryProps {
  score: number;
  label: string;
  summary: string;
}

function getHealthConfig(score: number) {
  if (score >= 90) return { color: "text-success", barColor: "bg-success", level: "Excelente" };
  if (score >= 70) return { color: "text-info", barColor: "bg-info", level: "Bom" };
  if (score >= 50) return { color: "text-warning", barColor: "bg-warning", level: "Atencao" };
  return { color: "text-destructive", barColor: "bg-destructive", level: "Critico" };
}

export function ExecutiveHealthSummary({ score, label, summary }: ExecutiveHealthSummaryProps) {
  const health = getHealthConfig(score);

  return (
    <section aria-label="Saude geral da operacao">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
        Saude Geral
      </h2>
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-4 shrink-0">
              <div className="relative flex size-16 items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    className={health.barColor}
                    strokeWidth="3"
                    strokeDasharray={`${score * 0.97} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={cn("absolute font-heading text-lg font-semibold tracking-tight", health.color)}>
                  {score}
                </span>
              </div>
              <div>
                <p className={cn("font-heading text-sm font-semibold", health.color)}>{health.level}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed sm:border-l sm:border-border/50 sm:pl-6">
              {summary}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
