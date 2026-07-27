import type { FlowResult } from "@/features/orchestration/flows/flow-contracts";
import type { JobResult } from "@/features/orchestration/jobs/job-contracts";

export interface FlowExecutor {
  execute(flowName: string): Promise<FlowResult>;
  getRegisteredFlows(): string[];
}

export interface PipelineExecutor {
  execute<TInput, TOutput>(
    pipelineName: string,
    input: TInput,
  ): Promise<TOutput>;
}

export interface JobExecutor {
  execute(jobName: string): Promise<JobResult>;
  schedule(jobName: string, cron: string): Promise<void>;
}

export interface OrchestrationEngine {
  flows: FlowExecutor;
  pipelines: PipelineExecutor;
  jobs: JobExecutor;
}
