import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { z } from "zod";

export interface LLMProvider {
  generateJson<T>(prompt: string, zodSchema: z.ZodType<T>): Promise<T>;
}

function parseAndValidate<T>(text: string, zodSchema: z.ZodType<T>): T {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("LLM returned non-JSON output");
  }
  return zodSchema.parse(json);
}

class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    this.client = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  }

  async generateJson<T>(prompt: string, zodSchema: z.ZodType<T>): Promise<T> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0 },
    });
    return parseAndValidate(res.text ?? "", zodSchema);
  }
}

class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
    this.client = new OpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" });
    this.model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
  }

  async generateJson<T>(prompt: string, zodSchema: z.ZodType<T>): Promise<T> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You output only valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
    });
    return parseAndValidate(res.choices[0]?.message?.content ?? "", zodSchema);
  }
}

export class FallbackProvider implements LLMProvider {
  constructor(private providers: LLMProvider[]) {}

  async generateJson<T>(prompt: string, zodSchema: z.ZodType<T>): Promise<T> {
    let lastErr: unknown;
    for (const provider of this.providers) {
      try {
        return await provider.generateJson(prompt, zodSchema);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("All LLM providers failed");
  }
}

function buildProvider(name: string): LLMProvider | null {
  if (name === "openrouter") return process.env.OPENROUTER_API_KEY ? new OpenRouterProvider() : null;
  if (name === "gemini") return process.env.GEMINI_API_KEY ? new GeminiProvider() : null;
  return null;
}

let singleton: LLMProvider | null = null;
export function getLLM(): LLMProvider {
  if (!singleton) {
    const primary = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase() === "openrouter" ? "openrouter" : "gemini";
    const secondary = primary === "gemini" ? "openrouter" : "gemini";
    const providers = [buildProvider(primary), buildProvider(secondary)].filter(
      (p): p is LLMProvider => p !== null,
    );
    if (providers.length === 0) {
      throw new Error("No LLM provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.");
    }
    singleton = providers.length === 1 ? providers[0] : new FallbackProvider(providers);
  }
  return singleton;
}
