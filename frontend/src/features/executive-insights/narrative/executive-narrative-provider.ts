import type { ExecutiveNarrativeInput } from "./executive-narrative-input"
import type { ExecutiveNarrativeOutput } from "./executive-narrative-output"

export interface ExecutiveNarrativeProvider {
  generate(input: ExecutiveNarrativeInput): Promise<ExecutiveNarrativeOutput>
}
