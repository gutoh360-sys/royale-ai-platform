import type { ExecutiveTimelineEvent } from "@/features/executive-timeline/types"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

const directionIcon = {
  improved: TrendingUp,
  worsened: TrendingDown,
  unchanged: Minus,
}

const directionLabel: Record<string, string> = {
  improved: "Melhorou",
  worsened: "Piorou",
  unchanged: "Sem alteração",
}

const severityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-orange-500",
  medium: "text-warning",
  low: "text-slate-500",
  info: "text-primary",
}

interface TimelineEventCardProps {
  event: ExecutiveTimelineEvent
}

export function TimelineEventCard({ event }: TimelineEventCardProps) {
  const Icon = directionIcon[event.direction]
  const isUnchanged = event.direction === "unchanged"

  return (
    <Card className="border-border/50">
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            event.direction === "improved" && "bg-success/10",
            event.direction === "worsened" && "bg-destructive/10",
            isUnchanged && "bg-muted",
          )}
        >
          <Icon
            className={cn(
              "size-4",
              event.direction === "improved" && "text-success",
              event.direction === "worsened" && "text-destructive",
              isUnchanged && "text-muted-foreground",
            )}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold leading-snug">{event.title}</h3>
            <span className={cn("text-[11px] font-medium", severityColor[event.severity])}>
              {directionLabel[event.direction]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {event.description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
