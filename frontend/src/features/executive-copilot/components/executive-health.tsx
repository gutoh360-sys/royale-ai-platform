import type { CopilotHealth } from "@/features/executive-copilot/types"
import { cn } from "@/lib/utils"

const healthConfig: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  healthy: { label: "Operação saudável", dot: "bg-green-500", text: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30" },
  attention: { label: "Atenção necessária", dot: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  critical: { label: "Ação imediata", dot: "bg-red-500", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
}

interface ExecutiveHealthProps {
  health: CopilotHealth
}

export function ExecutiveHealth({ health }: ExecutiveHealthProps) {
  const config = healthConfig[health.status] ?? healthConfig.attention

  return (
    <div className={cn("mt-4 rounded-xl px-5 py-4", config.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn("size-2.5 rounded-full shrink-0", config.dot)} aria-hidden="true" />
          <div>
            <p className={cn("font-heading text-base font-semibold tracking-tight", config.text)}>
              {config.label}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Score: <span className="tabular">{health.score}</span>/100
            </p>
          </div>
        </div>
        <span className={cn("font-heading text-2xl font-bold tabular", config.text)}>
          {health.score}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground border-t border-foreground/5 pt-2">{health.message}</p>
    </div>
  )
}
