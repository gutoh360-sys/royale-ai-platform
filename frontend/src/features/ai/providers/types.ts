import type { AIProvider, AIProviderConfig } from "@/features/ai/types/ai-types";

export abstract class BaseAIProvider implements AIProvider {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract generate(prompt: string): Promise<string>;
  abstract chat(messages: { role: string; content: string }[]): Promise<string>;
  abstract embed(text: string): Promise<number[]>;
}
