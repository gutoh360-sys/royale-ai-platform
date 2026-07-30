import type { ExecutiveNarrativeProvider } from "./executive-narrative-provider"
import type { ExecutiveNarrativeInput } from "./executive-narrative-input"
import type { ExecutiveNarrativeOutput } from "./executive-narrative-output"
import { ExecutiveNarrativeTemplateProvider } from "./executive-narrative-template-provider"
import { ExecutiveNarrativeFactualityGuard } from "./executive-narrative-factuality-guard"

export class ExecutiveNarrativeEngine {
  private readonly guard: ExecutiveNarrativeFactualityGuard
  private readonly fallbackProvider: ExecutiveNarrativeTemplateProvider

  constructor(
    private readonly provider?: ExecutiveNarrativeProvider,
    guard?: ExecutiveNarrativeFactualityGuard,
  ) {
    this.guard = guard ?? new ExecutiveNarrativeFactualityGuard()
    this.fallbackProvider = new ExecutiveNarrativeTemplateProvider()
  }

  async generate(input: ExecutiveNarrativeInput): Promise<ExecutiveNarrativeOutput> {
    this.assertInputImmutable(input)

    const activeProvider = this.provider ?? this.fallbackProvider

    let output: ExecutiveNarrativeOutput

    try {
      output = await activeProvider.generate(input)
    } catch {
      output = await this.fallbackProvider.generate(input)
    }

    if (!output || !output.summary) {
      output = await this.fallbackProvider.generate(input)
    }

    const violations = this.guard.validate(input, output)

    if (violations.length > 0 && this.isUsingExternalProvider()) {
      output = await this.fallbackProvider.generate(input)
    }

    return {
      ...output,
      warnings: [...output.warnings, ...violations],
    }
  }

  private isUsingExternalProvider(): boolean {
    return this.provider !== undefined && this.provider !== null
  }

  private assertInputImmutable(input: ExecutiveNarrativeInput): void {
    Object.freeze(input)
    if (input.timelineEvents) {
      Object.freeze(input.timelineEvents)
    }
    if (input.activeAlerts) {
      Object.freeze(input.activeAlerts)
    }
  }
}
