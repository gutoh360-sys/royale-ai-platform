export interface Pipeline<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

export interface PipelineStep<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
  rollback?(input: TInput): Promise<void>;
}

export interface PipelineContext {
  pipelineName: string;
  startedAt: string;
  steps: string[];
  errors: string[];
}

export interface PipelineResult {
  success: boolean;
  pipelineName: string;
  duration: number;
  error?: string;
}
