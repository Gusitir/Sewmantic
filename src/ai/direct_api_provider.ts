/**
 * src/ai/direct_api_provider.ts
 * Proveedor de Inteligencia Artificial mediante Direct API (Fireworks AI / DeepSeek / OpenAI compatible)
 * pattern-ai-core
 */

import fs from "node:fs";
import path from "node:path";
import type { IAiProvider, AiProviderConfig } from "./base_provider.js";
import type { PatternDna } from "../types/pattern.js";
import { PromptBuilder } from "./prompt_builder.js";
import { sanitizeAndParseLlmJson } from "../schema/pattern_schema.js";

export class DirectApiProvider implements IAiProvider {
  public readonly apiKey: string;
  public readonly baseUrl: string;
  public readonly model: string;
  public readonly visionModel: string;
  public readonly timeoutMs: number;

  constructor(config?: AiProviderConfig) {
    this.apiKey =
      config?.apiKey ||
      process.env.FIREWORKS_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    this.baseUrl =
      config?.baseUrl ||
      process.env.FIREWORKS_BASE_URL ||
      process.env.AI_API_BASE_URL ||
      "https://api.fireworks.ai/inference/v1";

    this.model =
      config?.model ||
      process.env.FIREWORKS_MODEL ||
      process.env.AI_MODEL ||
      "accounts/fireworks/models/qwen3p7-plus";

    this.visionModel =
      process.env.FIREWORKS_VISION_MODEL ||
      "accounts/fireworks/models/llama-v3p2-11b-vision-instruct";

    this.timeoutMs =
      config?.timeoutMs ||
      (process.env.AI_TIMEOUT_MS ? Number(process.env.AI_TIMEOUT_MS) : 90000);
  }

  public getProviderName(): string {
    return "api";
  }

  /**
   * Convierte una ruta de imagen local o un buffer a un Data URL Base64
   */
  private resolveImageDataUrl(imagePath: string): string {
    if (imagePath.startsWith("data:image/")) {
      return imagePath;
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

      return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    } catch (err) {
      throw new Error(
        `Failed to read image file '${imagePath}': ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  /**
   * Determina si el modelo configurado es de visión nativa
   */
  private isNativeVisionModel(modelName: string): boolean {
    const lower = modelName.toLowerCase();
    return (
      lower.includes("qwen") ||
      lower.includes("vision") ||
      lower.includes("-vl") ||
      lower.includes("vl2") ||
      lower.includes("gpt-4o") ||
      lower.includes("gemini") ||
      lower.includes("claude")
    );
  }

  /**
   * Analiza una imagen de prenda con el modelo de visión de Fireworks para extraer especificaciones técnicas
   */
  private async analyzeImageWithVision(
    imageDataUrl: string,
    userPrompt: string
  ): Promise<string> {
    const endpoint = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const visionSystemPrompt =
      "You are an expert technical fashion designer and master pattern maker. " +
      "Analyze this garment image/sketch and provide a precise, structured breakdown of: " +
      "1. Garment category (top, bottom, dress, vest, or coordinated 2-piece set). " +
      "2. Neckline depth and silhouette (v-neck, crew, scoop, hoodie). " +
      "3. Shoulder and armhole fit (set-in, drop-shoulder, raglan, sleeveless). " +
      "4. Torso/leg ease (fitted, regular, oversized, baggy). " +
      "5. Hem finishing (straight, curved tail, double triangular points, cuff). " +
      "6. Pockets, plackets, closures (buttons count, zipper, waistband). " +
      "7. Fabric texture, drape and colors.";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      console.log(
        `[Fireworks AI Vision] Conectando a ${endpoint} con modelo de visión ${this.visionModel}...`
      );

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.visionModel,
          temperature: 0.1,
          max_tokens: 1000,
          messages: [
            { role: "system", content: visionSystemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt
                    ? `Context from user: "${userPrompt}". Analyze the design details of this garment for pattern making:`
                    : "Analyze the design details of this garment for pattern making:",
                },
                {
                  type: "image_url",
                  image_url: { url: imageDataUrl },
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        throw new Error(
          `[Fireworks AI Vision HTTP ${res.status} ${res.statusText}]: ${errorBody}`
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string }; text?: string }>;
      };
      const choice = data.choices?.[0];
      return choice?.message?.content?.trim() || choice?.text?.trim() || "";
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Genera el ADN Paramétrico a partir de un prompt descriptivo y una imagen opcional
   */
  public async generatePatternDna(
    prompt: string,
    imagePath?: string
  ): Promise<PatternDna> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new Error(
        "[DirectApiProvider] No se encontró FIREWORKS_API_KEY ni AI_API_KEY configurada. " +
          "Por favor añade FIREWORKS_API_KEY=tu_clave en el archivo .env o usa el proveedor 'mock'."
      );
    }

    let imageDataUrl: string | undefined;
    if (imagePath && imagePath.trim().length > 0) {
      imageDataUrl = this.resolveImageDataUrl(imagePath.trim());
    }

    const defaultImagePrompt =
      "Generar patrón paramétrico preciso a partir del diseño y silueta de la imagen";
    let effectivePrompt =
      prompt && prompt.trim().length > 0
        ? prompt.trim()
        : imageDataUrl
        ? defaultImagePrompt
        : "";

    if (!effectivePrompt && !imageDataUrl) {
      throw new Error(
        "[DirectApiProvider] Se requiere un prompt descriptivo o una imagen de referencia."
      );
    }

    if (imageDataUrl) {
      // Si el modelo principal no es de visión nativa, realizamos pre-análisis de visión
      if (!this.isNativeVisionModel(this.model)) {
        try {
          const visualAnalysis = await this.analyzeImageWithVision(
            imageDataUrl,
            effectivePrompt
          );
          if (visualAnalysis) {
            effectivePrompt = `${effectivePrompt}\n\n[ANÁLISIS TÉCNICO DE IMAGEN DE REFERENCIA]:\n${visualAnalysis}`;
          }
        } catch (visionErr) {
          console.warn(
            `[DirectApiProvider] Advertencia: El análisis de visión falló (${visionErr}). Continuando con prompt de texto.`
          );
        }
      }
    }

    const systemPrompt = PromptBuilder.buildSystemPrompt();
    const userPrompt = PromptBuilder.buildUserPrompt(effectivePrompt, undefined);

    const isCompletionsMode = this.baseUrl.endsWith("/completions");
    const endpoint = isCompletionsMode
      ? this.baseUrl
      : `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let requestBody: Record<string, any>;

      if (isCompletionsMode) {
        requestBody = {
          model: this.model,
          temperature: 0.15,
          max_tokens: 4000,
          top_k: 40,
          presence_penalty: 0,
          frequency_penalty: 0,
          prompt: `System: ${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant (JSON only):`,
          ...(imageDataUrl ? { images: [imageDataUrl] } : {}),
        };
      } else {
        let userMessageContent: any = userPrompt;
        if (imageDataUrl) {
          userMessageContent = [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ];
        }

        requestBody = {
          model: this.model,
          temperature: 0.15,
          max_tokens: 4000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessageContent },
          ],
        };
      }

      console.log(
        `[Fireworks AI] Conectando a ${endpoint} con modelo ${this.model} (max_tokens: ${requestBody.max_tokens})...`
      );

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `[Fireworks AI HTTP ${response.status} ${response.statusText}]: ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
          text?: string;
        }>;
      };

      const choice = data.choices?.[0];
      const content = choice?.message?.content || choice?.text;
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
