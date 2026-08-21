/**
 * src/ai/agy_cli_provider.ts
 * Proveedor de Inteligencia Artificial que ejecuta el CLI Agy (Gemini)
 * pattern-ai-core
 */

import {
  type IAiProvider,
  type AiProviderConfig,
  type ProcessResult,
  executeCliProcess,
} from "./base_provider.js";
import type { PatternDna } from "../types/pattern.js";
import { PromptBuilder } from "./prompt_builder.js";
import { sanitizeAndParseLlmJson } from "../schema/pattern_schema.js";

export class AgyCliProvider implements IAiProvider {
  public readonly model: string;
  public readonly executablePath: string;
  public readonly timeoutMs: number;

  constructor(config?: AiProviderConfig) {
    this.model = config?.model || process.env.AI_MODEL || "gemini-3.7-flash";
    this.executablePath = config?.executablePath || process.env.AGY_PATH || "agy";
    this.timeoutMs =
      config?.timeoutMs ||
      (process.env.AI_TIMEOUT_MS ? Number(process.env.AI_TIMEOUT_MS) : 60000);
  }

  public getProviderName(): string {
    return "agy";
  }

  /**
   * Ejecuta el CLI agy con el prompt construido y extrae el PatternDna del resultado
   */
  public async generatePatternDna(
    prompt: string,
    imagePath?: string,
    blueprint?: string
  ): Promise<PatternDna> {
    const fullPrompt = PromptBuilder.buildFullPrompt(prompt, imagePath, blueprint);
    const args = ["--print", "--model", this.model];

    try {
      const { stdout } = await this.executeProcess(
        this.executablePath,
        args,
        fullPrompt,
        this.timeoutMs
      );

      if (!stdout || stdout.trim().length === 0) {
        throw new Error("Empty output received from agy CLI.");
      }

      return sanitizeAndParseLlmJson(stdout);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("timed out")) {
        throw new Error(
          `[AgyCliProvider] Execution timed out after ${this.timeoutMs}ms`
        );
      }
      throw new Error(`[AgyCliProvider] CLI execution failed: ${message}`);
    }
  }

  /**
   * Wrapper protegido para facilitar pruebas unitarias
   */
  protected executeProcess(
    executable: string,
    args: string[],
    stdinInput?: string,
    timeoutMs?: number
  ): Promise<ProcessResult> {
    return executeCliProcess(executable, args, stdinInput, timeoutMs);
  }
}
