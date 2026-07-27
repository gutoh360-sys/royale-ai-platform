export interface SyncProductsJob {
  execute(): Promise<JobResult>;
}

export interface SyncOrdersJob {
  execute(): Promise<JobResult>;
}

export interface SyncInventoryJob {
  execute(): Promise<JobResult>;
}

export interface SyncTrendsJob {
  execute(): Promise<JobResult>;
}

export interface JobResult {
  success: boolean;
  jobName: string;
  duration: number;
  itemsProcessed: number;
  error?: string;
}
