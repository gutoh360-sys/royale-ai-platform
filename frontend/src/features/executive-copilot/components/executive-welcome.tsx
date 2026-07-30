import type { CopilotHealth } from "@/features/executive-copilot/types"

interface ExecutiveWelcomeProps {
  health: CopilotHealth
}

export function ExecutiveWelcome({ health }: ExecutiveWelcomeProps) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  return (
    <div className="space-y-1">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{greeting}.</h1>
      <p className="text-sm text-muted-foreground">{health.message}</p>
    </div>
  )
}
