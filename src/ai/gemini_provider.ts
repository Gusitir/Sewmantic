/**
 * src/ai/gemini_provider.ts
 * Proveedor de Inteligencia Artificial mediante Google Gen AI SDK (Gemini)
 * Gemini Enterprise Agent Platform (ex Vertex AI) con API key de un proyecto Google Cloud
 * pattern-ai-core
 */

import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentConfig } from "@google/genai";
import type { IAiProvider, AiProviderConfig } from "./base_provider.js";
import type { PatternDna } from "../types/pattern.js";
import { PromptBuilder } from "./prompt_builder.js";
import { sanitizeAndParseLlmJson } from "../schema/pattern_schema.js";

export type GeminiThinkingLevel = "low" | "medium" | "high";

/**
 * Proveedor Gemini nativo multimodal (texto + imagen en 1 solo paso).
 * Lee la configuración de variables de entorno de Google Cloud:
 * GOOGLE_API_KEY / GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION,
 * GOOGLE_GENAI_USE_ENTERPRISE, GEMINI_MODEL, GEMINI_THINKING_LEVEL y AI_TIMEOUT_MS.
 */
export class GeminiProvider implements IAiProvider {
  public readonly apiKey: string;
  public readonly model: string;
  public readonly thinkingLevel: GeminiThinkingLevel;
  public readonly timeoutMs: number;
  public readonly useEnterprise: boolean;
  public readonly project: string | undefined;
  public readonly location: string;
  public readonly baseUrl: string | undefined;

  private readonly client: GoogleGenAI;

  constructor(config?: AiProviderConfig) {
    this.apiKey =
      config?.apiKey ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.AI_API_KEY ||
      "";

    this.model = config?.model || process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const level = (process.env.GEMINI_THINKING_LEVEL || "HIGH").toLowerCase();
    this.thinkingLevel =
      level === "low" || level === "medium" ? level : "high";

    this.timeoutMs =
      config?.timeoutMs ||
      (process.env.AI_TIMEOUT_MS ? Number(process.env.AI_TIMEOUT_MS) : 90000);

    this.useEnterprise =
      (process.env.GOOGLE_GENAI_USE_ENTERPRISE ?? "true").toLowerCase() !==
      "false";
    this.project = process.env.GOOGLE_CLOUD_PROJECT || undefined;
    this.location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    this.baseUrl = config?.baseUrl || process.env.GEMINI_BASE_URL || undefined;

    this.client = new GoogleGenAI({
      apiKey: this.apiKey || undefined,
      ...(this.useEnterprise
        ? { vertexai: true, project: this.project, location: this.location }
        : {}),
      httpOptions: {
        timeout: this.timeoutMs,
        ...(this.baseUrl ? { baseUrl: this.baseUrl } : {}),
      },
    });
  }

  public getProviderName(): string {
    return "gemini";
  }

  /**
   * Convierte una ruta de imagen local o un Data URL a mimeType + base64 para inlineData
   */
  private resolveImageData(imagePath: string): { mimeType: string; data: string } {
    if (imagePath.startsWith("data:image/")) {
      const match = /^data:(image\/[a-z0-9+.-]+);base64,(.+)$/s.exec(imagePath);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
      throw new Error(`[GeminiProvider] Data URL de imagen inválido: ${imagePath.slice(0, 40)}...`);
    }

    try {
      const resolvedPath = path.resolve(imagePath);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Image file not found: ${resolvedPath}`);
      }

      const fileBuffer = fs.readFileSync(resolvedPath);
      let mimeType = "image/png";
      if (
        fileBuffer.length >= 3 &&
        fileBuffer[0] === 0xff &&
        fileBuffer[1] === 0xd8 &&
        fileBuffer[2] === 0xff
      ) {
        mimeType = "image/jpeg";
      } else if (
        fileBuffer.length >= 8 &&
        fileBuffer[0] === 0x89 &&
        fileBuffer[1] === 0x50 &&
        fileBuffer[2] === 0x4e &&
        fileBuffer[3] === 0x47
      ) {
        mimeType = "image/png";
      } else if (
        fileBuffer.length >= 12 &&
        fileBuffer.toString("utf-8", 0, 4) === "RIFF" &&
        fileBuffer.toString("utf-8", 8, 12) === "WEBP"
      ) {
        mimeType = "image/webp";
      } else {
        const ext = path.extname(resolvedPath).toLowerCase().replace(".", "");
        mimeType =
          ext === "png"
            ? "image/png"
            : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "webp"
            ? "image/webp"
            : "image/png";
      }

      return { mimeType, data: fileBuffer.toString("base64") };
    } catch (err) {
      throw new Error(
        `Failed to read image file '${imagePath}': ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * Genera el ADN Paramétrico con Gemini 3.8 Flash (nivel de razonamiento HIGH)
   * en una sola llamada multimodal nativa con salida JSON estructurada.
   */
  public async generatePatternDna(
    prompt: string,
    imagePath?: string,
    blueprint?: string
  ): Promise<PatternDna> {
    if (this.useEnterprise && !this.project) {
      throw new Error(
        "[GeminiProvider] GOOGLE_GENAI_USE_ENTERPRISE está activo pero falta GOOGLE_CLOUD_PROJECT. " +
          "Añade el ID de tu proyecto Google Cloud en el archivo .env."
      );
    }

    if (!this.useEnterprise && (!this.apiKey || this.apiKey.trim().length === 0)) {
      throw new Error(
        "[GeminiProvider] No se encontró GOOGLE_API_KEY ni GEMINI_API_KEY configurada. " +
          "Por favor añade GOOGLE_API_KEY=tu_clave en el archivo .env o usa el proveedor 'mock'."
      );
    }

    const defaultImagePrompt =
      "Generar patrón paramétrico preciso a partir del diseño y silueta de la imagen";
    let effectivePrompt =
      prompt && prompt.trim().length > 0
        ? prompt.trim()
        : imagePath && imagePath.trim().length > 0
        ? defaultImagePrompt
        : "";

    if (!effectivePrompt && !imagePath) {
      throw new Error(
        "[GeminiProvider] Se requiere un prompt descriptivo o una imagen de referencia."
      );
    }

    const systemPrompt = PromptBuilder.buildSystemPrompt();
    const userPrompt = PromptBuilder.buildUserPrompt(effectivePrompt, undefined, blueprint);

    const parts: Array<Record<string, unknown>> = [{ text: userPrompt }];
    if (imagePath && imagePath.trim().length > 0) {
      const image = this.resolveImageData(imagePath.trim());
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }

    console.log(
      `[Gemini AI] Conectando con modelo ${this.model} (thinkingLevel: ${this.thinkingLevel}, ` +
        `enterprise: ${this.useEnterprise}, auth: ${this.apiKey ? "API key" : "ADC/OAuth"}, ` +
        `timeout: ${this.timeoutMs}ms)...`
    );

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.15,
          maxOutputTokens: 6000,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: this.thinkingLevel.toUpperCase() },
        } as unknown as GenerateContentConfig,
      });

      const content = response.text;
      if (!content || content.trim().length === 0) {
        throw new Error("No content returned in Gemini generateContent response");
      }

      return sanitizeAndParseLlmJson(content);
    } catch (err: unknown) {
      throw new Error(
        `[GeminiProvider] API request failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
