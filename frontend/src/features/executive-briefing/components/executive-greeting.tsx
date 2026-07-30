"use client"

import { useMemo } from "react"

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }, [])
}

export function ExecutiveGreeting() {
  const greeting = useGreeting()

  return (
    <div className="space-y-1">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {greeting}.
      </h2>
      <p className="text-sm text-muted-foreground">
        Aqui está o resumo da operação de hoje.
      </p>
    </div>
  )
}
