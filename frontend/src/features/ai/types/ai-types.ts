export interface AIProvider {
  generate(prompt: string): Promise<string>;
  chat(messages: { role: string; content: string }[]): Promise<string>;
  embed(text: string): Promise<number[]>;
}

export type AIProviderType = "openai" | "gemini" | "claude";

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
