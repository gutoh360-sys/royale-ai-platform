export interface FlowDefinition {
  name: string;
  steps: string[];
  dependsOn?: string[];
}

export interface PipelineDefinition {
  name: string;
  steps: string[];
  parallel?: boolean;
}

export interface JobDefinition {
  name: string;
  cron?: string;
  timeout?: number;
  retries?: number;
}
