import { BaseAIProvider } from "./types";

export class ClaudeProvider extends BaseAIProvider {
  async generate(prompt: string): Promise<string> {
    void prompt;
    throw new Error("Claude provider not implemented");
  }

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    void messages;
    throw new Error("Claude provider not implemented");
  }

  async embed(text: string): Promise<number[]> {
    void text;
    throw new Error("Claude provider not implemented");
  }
}
