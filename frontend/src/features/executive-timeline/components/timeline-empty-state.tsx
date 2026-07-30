import { Minus } from "lucide-react"

export function TimelineEmptyState() {
  return (
    <div className="flex items-center gap-2">
      <Minus className="size-4 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        Não houve alterações relevantes desde a última análise.
      </p>
    </div>
  )
}
