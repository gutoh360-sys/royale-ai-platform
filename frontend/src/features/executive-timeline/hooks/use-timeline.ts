"use client"

import { useMemo } from "react"
import { DefaultExecutiveTimelineService } from "@/features/executive-timeline/services/executive-timeline-service"
import { snapshotPrevious, snapshotCurrent } from "@/features/executive-timeline/mocks"
import type { ExecutiveTimelineResult } from "@/features/executive-timeline/types"

export function useTimeline(): ExecutiveTimelineResult {
  return useMemo(() => {
    const service = new DefaultExecutiveTimelineService()
    return service.compareSnapshots(snapshotPrevious, snapshotCurrent)
  }, [])
}
