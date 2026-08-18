/**
 * src/ai/direct_api_provider.ts
 * Proveedor de Inteligencia Artificial mediante HTTP / REST API Directa (OpenAI / Anthropic compatible)
 * pattern-ai-core
 */

import type { IAiProvider, AiProviderConfig } from "./base_provider.js";
import type { PatternDna } from "../types/pattern.js";
import { PromptBuilder } from "./prompt_builder.js";
import { sanitizeAndParseLlmJson } from "../schema/pattern_schema.js";

export class DirectApiProvider implements IAiProvider {
  public readonly apiKey: string;
  public readonly baseUrl: string;
  public readonly model: string;
  public readonly timeoutMs: number;

  constructor(config?: AiProviderConfig) {
    this.apiKey =
      config?.apiKey ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";
    this.baseUrl =
      config?.baseUrl ||
      process.env.AI_API_BASE_URL ||
      "https://api.openai.com/v1";
    this.model = config?.model || process.env.AI_MODEL || "gpt-4o";
    this.timeoutMs =
      config?.timeoutMs ||
      (process.env.AI_TIMEOUT_MS ? Number(process.env.AI_TIMEOUT_MS) : 60000);
  }

  public getProviderName(): string {
    return "direct_api";
  }

  /**
   * Realiza una petición HTTP POST a un endpoint compatible con OpenAI Chat Completions
   */
  public async generatePatternDna(prompt: string, imagePath?: string): Promise<PatternDna> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new Error(
        "[DirectApiProvider] AI_API_KEY or OPENAI_API_KEY is required for DirectApiProvider."
      );
    }

    const systemPrompt = PromptBuilder.buildSystemPrompt();
    const userPrompt = PromptBuilder.buildUserPrompt(prompt, imagePath);

    const endpoint = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `HTTP ${response.status} ${response.statusText}: ${errorText}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error("No content returned in API completion choices");
      }

      return sanitizeAndParseLlmJson(content);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") {
        throw new Error(
          `[DirectApiProvider] Request timed out after ${this.timeoutMs}ms`
        );
      }

      throw new Error(
        `[DirectApiProvider] API request failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
