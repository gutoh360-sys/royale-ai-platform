import { BaseAIProvider } from "./types";

export class GeminiProvider extends BaseAIProvider {
  async generate(prompt: string): Promise<string> {
    void prompt;
    throw new Error("Gemini provider not implemented");
  }

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    void messages;
    throw new Error("Gemini provider not implemented");
  }

  async embed(text: string): Promise<number[]> {
    void text;
    throw new Error("Gemini provider not implemented");
  }
}
