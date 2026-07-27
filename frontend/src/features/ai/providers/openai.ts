import { BaseAIProvider } from "./types";

export class OpenAIProvider extends BaseAIProvider {
  async generate(prompt: string): Promise<string> {
    void prompt;
    throw new Error("OpenAI provider not implemented");
  }

  async chat(messages: { role: string; content: string }[]): Promise<string> {
    void messages;
    throw new Error("OpenAI provider not implemented");
  }

  async embed(text: string): Promise<number[]> {
    void text;
    throw new Error("OpenAI provider not implemented");
  }
}
