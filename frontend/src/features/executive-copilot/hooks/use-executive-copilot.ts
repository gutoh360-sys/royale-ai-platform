"use client"

import { useMemo } from "react"
import { buildCopilotData } from "@/features/executive-copilot/services/copilot-orchestrator"

export function useExecutiveCopilot() {
  return useMemo(() => buildCopilotData(), [])
}
