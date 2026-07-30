"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function ExecutiveCopilotSkeleton() {
  return (
    <section aria-label="Carregando painel executivo" className="mx-auto max-w-3xl">
      <Skeleton className="mb-8 h-32 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="mb-4 h-24 w-full rounded-lg" />
      ))}
    </section>
  )
}
