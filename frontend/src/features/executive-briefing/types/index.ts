import type { ExecutivePriority } from "@/features/executive-prioritization/types"

export type BriefingState = "success" | "empty"

export interface BriefingData {
  priorities: ExecutivePriority[]
  state: BriefingState
}
