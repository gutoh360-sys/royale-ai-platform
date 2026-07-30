import type { ExecutiveNarrativeProvider } from "./executive-narrative-provider"
import type { ExecutiveNarrativeInput } from "./executive-narrative-input"
import type { ExecutiveNarrativeOutput } from "./executive-narrative-output"

export class ExecutiveNarrativeTemplateProvider
  implements ExecutiveNarrativeProvider
{
  async generate(
    input: ExecutiveNarrativeInput,
  ): Promise<ExecutiveNarrativeOutput> {
    const summary = this.buildSummary(input)
    const details = this.buildDetails(input)
    const warnings = this.buildWarnings(input)

    return {
      insightKey: input.insightKey,
      summary,
      details,
      sourceRunId: input.sourceRunId,
      generatedAt: new Date().toISOString(),
      referencedEvidence: this.buildEvidenceReferences(input),
      warnings,
      isComplete: warnings.length === 0,
    }
  }

  private buildSummary(input: ExecutiveNarrativeInput): string {
    const severityLabel = input.severity.toLowerCase()
    const statusLabel = input.status.toLowerCase()
    return (
      `O insight "${input.title}" (módulo ${input.module}) encontra-se ` +
      `com status ${statusLabel} e severidade ${severityLabel}. ` +
      `Foi detectado pela primeira vez em ${input.firstDetectedAt} ` +
      `e possui ${input.occurrenceCount} ocorrência(s) registrada(s). ` +
      `Última detecção: ${input.lastDetectedAt}.`
    )
  }

  private buildDetails(input: ExecutiveNarrativeInput): string {
    const parts: string[] = []

    parts.push(`Categoria: ${input.category}.`)
    parts.push(`Prioridade: ${input.priority}.`)
    parts.push(`Versão do insight: ${input.version}.`)

    if (input.fact) {
      parts.push(`Fato: ${input.fact}.`)
    }

    if (input.context) {
      parts.push(`Contexto: ${input.context}.`)
    }

    if (input.impact) {
      parts.push(`Impacto: ${input.impact}.`)
    }

    if (input.recommendation) {
      parts.push(`Recomendação: ${input.recommendation}.`)
    }

    if (input.resolvedAt) {
      parts.push(`Resolvido em: ${input.resolvedAt}.`)
    }

    if (input.archivedAt) {
      parts.push(`Arquivado em: ${input.archivedAt}.`)
    }

    const eventCount = input.timelineEvents.length
    parts.push(`Total de eventos na timeline: ${eventCount}.`)

    if (eventCount > 0 && input.firstEvent) {
      parts.push(
        `Primeiro evento: ${input.firstEvent.type} em ${String(input.firstEvent.timestamp)}.`,
      )
    }

    if (eventCount > 0 && input.lastEvent) {
      parts.push(
        `Último evento: ${input.lastEvent.type} em ${String(input.lastEvent.timestamp)}.`,
      )
    }

    const eventTypeLabels = Object.entries(input.eventCountByType)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}: ${count}`)

    if (eventTypeLabels.length > 0) {
      parts.push(`Contagem de eventos: ${eventTypeLabels.join(" | ")}.`)
    }

    if (input.activeAlerts.length > 0) {
      const alertLabels = input.activeAlerts.map(
        (a) => `${a.title} (${a.severity.toLowerCase()})`,
      )
      parts.push(`Alertas ativos: ${alertLabels.join("; ")}.`)
    }

    if (input.evidence.source) {
      parts.push(`Fonte da evidência: ${input.evidence.source}.`)
    }

    return parts.join(" ")
  }

  private buildWarnings(input: ExecutiveNarrativeInput): readonly string[] {
    const warnings: string[] = []

    if (!input.title) {
      warnings.push("Insight sem título.")
    }

    if (!input.summary) {
      warnings.push("Insight sem sumário.")
    }

    if (!input.fact) {
      warnings.push("Insight sem fato descrito.")
    }

    return warnings
  }

  private buildEvidenceReferences(
    input: ExecutiveNarrativeInput,
  ): readonly { field: string; value: string }[] {
    const refs: { field: string; value: string }[] = [
      { field: "title", value: input.title },
      { field: "summary", value: input.summary },
      { field: "fact", value: input.fact },
      { field: "module", value: input.module },
      { field: "category", value: input.category },
      { field: "severity", value: input.severity },
      { field: "status", value: input.status },
      { field: "priority", value: String(input.priority) },
      { field: "sourceRunId", value: input.sourceRunId },
      { field: "lastEvaluationRun", value: input.lastEvaluationRun },
      { field: "firstDetectedAt", value: input.firstDetectedAt },
      { field: "lastDetectedAt", value: input.lastDetectedAt },
      { field: "occurrenceCount", value: String(input.occurrenceCount) },
    ]

    if (input.resolvedAt) {
      refs.push({ field: "resolvedAt", value: input.resolvedAt })
    }

    if (input.archivedAt) {
      refs.push({ field: "archivedAt", value: input.archivedAt })
    }

    if (input.context) {
      refs.push({ field: "context", value: input.context })
    }

    if (input.impact) {
      refs.push({ field: "impact", value: input.impact })
    }

    if (input.recommendation) {
      refs.push({ field: "recommendation", value: input.recommendation })
    }

    return refs
  }
}
