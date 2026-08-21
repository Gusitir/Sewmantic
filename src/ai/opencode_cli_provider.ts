/**
 * src/ai/opencode_cli_provider.ts
 * Proveedor de Inteligencia Artificial que ejecuta OpenCode CLI / ChatGPT
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

export class OpenCodeCliProvider implements IAiProvider {
  public readonly model: string;
  public readonly executablePath: string;
  public readonly timeoutMs: number;

  constructor(config?: AiProviderConfig) {
    this.model = config?.model || process.env.AI_MODEL || "gpt-4o";
    this.executablePath = config?.executablePath || process.env.OPENCODE_PATH || "opencode";
    this.timeoutMs =
      config?.timeoutMs ||
      (process.env.AI_TIMEOUT_MS ? Number(process.env.AI_TIMEOUT_MS) : 60000);
  }

  public getProviderName(): string {
    return "opencode";
  }

  /**
   * Ejecuta el CLI opencode con el prompt consolidado y extrae el PatternDna
   */
  public async generatePatternDna(
    prompt: string,
    imagePath?: string,
    blueprint?: string
  ): Promise<PatternDna> {
    const fullPrompt = PromptBuilder.buildFullPrompt(prompt, imagePath, blueprint);
    const args = ["run", "--model", this.model];

    try {
      const { stdout } = await this.executeProcess(
        this.executablePath,
        args,
        fullPrompt,
        this.timeoutMs
      );

      if (!stdout || stdout.trim().length === 0) {
        throw new Error("Empty output received from opencode CLI.");
      }

      return sanitizeAndParseLlmJson(stdout);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("timed out")) {
        throw new Error(
          `[OpenCodeCliProvider] Execution timed out after ${this.timeoutMs}ms`
        );
      }
      throw new Error(`[OpenCodeCliProvider] CLI execution failed: ${message}`);
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
