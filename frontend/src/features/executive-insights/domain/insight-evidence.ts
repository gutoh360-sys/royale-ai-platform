export interface InsightEvidence {
  source: string
  metric?: string
  value?: number | string
  previousValue?: number | string
  period?: string
  entityId?: string
  classification?: string
  generatedAt?: string
}
