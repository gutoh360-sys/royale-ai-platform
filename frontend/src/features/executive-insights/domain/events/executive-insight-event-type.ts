export const ExecutiveInsightEventType = {
  CREATED: "CREATED",
  ACTIVATED: "ACTIVATED",
  UPDATED: "UPDATED",
  RESOLVED: "RESOLVED",
  ARCHIVED: "ARCHIVED",
  REOPENED: "REOPENED",
} as const

export type ExecutiveInsightEventType =
  (typeof ExecutiveInsightEventType)[keyof typeof ExecutiveInsightEventType]
