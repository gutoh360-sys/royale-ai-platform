import type { CommandCenterResult } from "@/features/dashboard/executive-command-center/types";
import { mockCommandCenter } from "@/features/dashboard/executive-command-center/mocks";

export interface ExecutiveCommandCenterService {
  fetch(): Promise<CommandCenterResult>;
}

export class MockExecutiveCommandCenterService implements ExecutiveCommandCenterService {
  async fetch(): Promise<CommandCenterResult> {
    return {
      data: mockCommandCenter,
      status: mockCommandCenter.attention.length > 0 ? "success" : "empty",
      error: null,
    };
  }
}
