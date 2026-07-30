import {
  ExecutiveInsightStatus,
  type ExecutiveInsightStatus as Status,
} from "@/features/executive-insights/types"

export type LifecycleTransition =
  | "created"
  | "activated"
  | "resolved"
  | "updated"
  | "ignored"
  | "unchanged"
  | "archived"
  | "reopened"

export interface TransitionResult {
  readonly transition: LifecycleTransition
  readonly newStatus: Status
}

export function computeTransition(
  currentStatus: Status | null,
  isDetected: boolean,
): TransitionResult {
  if (currentStatus === null && isDetected) {
    return { transition: "created", newStatus: ExecutiveInsightStatus.NEW }
  }

  if (currentStatus === ExecutiveInsightStatus.ARCHIVED) {
    return { transition: "ignored", newStatus: ExecutiveInsightStatus.ARCHIVED }
  }

  if (!isDetected) {
    if (
      currentStatus === ExecutiveInsightStatus.ACTIVE
    ) {
      return { transition: "resolved", newStatus: ExecutiveInsightStatus.RESOLVED }
    }
    if (
      currentStatus === ExecutiveInsightStatus.NEW ||
      currentStatus === ExecutiveInsightStatus.RESOLVED
    ) {
      return { transition: "unchanged", newStatus: currentStatus }
    }
  }

  if (isDetected) {
    if (currentStatus === ExecutiveInsightStatus.NEW) {
      return { transition: "activated", newStatus: ExecutiveInsightStatus.ACTIVE }
    }
    if (currentStatus === ExecutiveInsightStatus.ACTIVE) {
      return { transition: "updated", newStatus: ExecutiveInsightStatus.ACTIVE }
    }
    if (currentStatus === ExecutiveInsightStatus.RESOLVED) {
      return { transition: "activated", newStatus: ExecutiveInsightStatus.ACTIVE }
    }
  }

  return { transition: "unchanged", newStatus: currentStatus ?? ExecutiveInsightStatus.NEW }
}
