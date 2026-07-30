import { Clock } from "lucide-react"

export function TimelineHeader() {
  return (
    <div className="flex items-center gap-2">
      <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
      <h2 className="font-heading text-base font-semibold tracking-tight">
        Desde a última análise
      </h2>
    </div>
  )
}
