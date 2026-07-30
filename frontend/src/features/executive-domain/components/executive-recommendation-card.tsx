"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

export interface RecommendationData {
  action: string
  reason: string
}

interface ExecutiveRecommendationCardProps {
  recommendation: RecommendationData
}

export function ExecutiveRecommendationCard({ recommendation }: ExecutiveRecommendationCardProps) {
  return (
    <Card className="transition-shadow duration-150 hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
            <ArrowRight className="size-3 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{recommendation.action}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{recommendation.reason}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
