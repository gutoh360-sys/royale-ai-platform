"use client"

import { useTimeline } from "@/features/executive-timeline/hooks/use-timeline"
import { TimelineHeader } from "./timeline-header"
import { TimelineEventCard } from "./timeline-event-card"
import { TimelineEmptyState } from "./timeline-empty-state"

export function ExecutiveTimeline() {
  const { events, state } = useTimeline()

  return (
    <section aria-label="Linha do tempo executiva" className="space-y-3">
      <TimelineHeader />

      {state === "empty" ? (
        <TimelineEmptyState />
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <TimelineEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}
