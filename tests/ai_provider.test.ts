/**
 * tests/ai_provider.test.ts
 * Suite de pruebas unitarias para el subsistema de proveedores de Inteligencia Artificial (Fireworks AI / DeepSeek / Direct API / Mock)
 * pattern-ai-core
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PromptBuilder,
  MockAiProvider,
  DirectApiProvider,
  AiProviderFactory,
  parsePatternDna,
} from "../src/index.js";

describe("AI Provider Subsystem & Factory (Fireworks AI & Direct API)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    PromptBuilder.clearCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("1. PromptBuilder", () => {
    it("debe cargar reglas textiles y devolver una cadena con contenido válido", () => {
      const rules = PromptBuilder.loadRules();
      expect(typeof rules).toBe("string");
      expect(rules.length).toBeGreaterThan(50);
      expect(rules).toContain("Reglas");
    });

    it("debe construir el System Prompt con restricciones de esquema, bloques base y reglas de confección", () => {
      const systemPrompt = PromptBuilder.buildSystemPrompt();

      // Directiva para modelos de razonamiento
      expect(systemPrompt).toContain("Be direct and concise in your technical reasoning");

      // Reglas de formato y restricciones
      expect(systemPrompt).toContain("PatternDna");
      expect(systemPrompt).toContain("ONLY a valid, single JSON object");
      expect(systemPrompt).toContain("NO FREE-FORM VECTOR SVG");
      expect(systemPrompt).toContain("millimeters (mm)");
      expect(systemPrompt).toContain("concept_name");

      // Bloques base reconocidos
      expect(systemPrompt).toContain("menswear_torso_oversize");
      expect(systemPrompt).toContain("tshirt_sloper");
      expect(systemPrompt).toContain("dress_sloper");
      expect(systemPrompt).toContain("hoodie_sloper");

      // Reglas de holgura
      expect(systemPrompt).toContain("chest_ease_mm");
    });

    it("debe construir el User Prompt sin imagen de referencia si no se proporciona", () => {
      const userPrompt = PromptBuilder.buildUserPrompt("Hoodie boxy estilo cyberpunk");
      expect(userPrompt).toContain("Hoodie boxy estilo cyberpunk");
      expect(userPrompt).not.toContain("[Visual Image Reference:");
    });

    it("debe inyectar la referencia de imagen en el User Prompt cuando se proporcione imagePath", () => {
      const userPrompt = PromptBuilder.buildUserPrompt(
        "Vestido ceremonial anime",
        "/assets/references/priestess_dress.png"
      );
      expect(userPrompt).toContain("Vestido ceremonial anime");
      expect(userPrompt).toContain("[Visual Image Reference: /assets/references/priestess_dress.png]");
      expect(userPrompt).toContain("Analyze the garment silhouette");
    });

    it("debe generar un Full Prompt consolidado combinando sistema y usuario", () => {
      const fullPrompt = PromptBuilder.buildFullPrompt("Camiseta oversize con cuello mock");
      expect(fullPrompt).toContain("Master Patternmaking");
      expect(fullPrompt).toContain("USER REQUEST:");
      expect(fullPrompt).toContain("Camiseta oversize con cuello mock");
    });
  });

  describe("2. MockAiProvider (Determinista Offline)", () => {
    const mockProvider = new MockAiProvider();

    it("debe retornar el nombre identificador 'mock'", () => {
      expect(mockProvider.getProviderName()).toBe("mock");
    });

    it("debe generar un hoodie oversize streetwear al detectar palabras clave de sudadera/capucha", async () => {
      const dna = await mockProvider.generatePatternDna("Quiero una sudadera hoodie oversize con capucha cruzada");
      expect(dna.concept_name).toBe("streetwear_oversize_hoodie");
      expect(dna.base_block).toBe("menswear_torso_oversize");
      expect(dna.ease.chest_ease_mm).toBe(150);
      expect(dna.modifications.hood?.type).toBe("crossover");
      expect(dna.modifications.pocket?.type).toBe("kangaroo");

      // Verificación estricta con el validador Zod
      expect(() => parsePatternDna(dna)).not.toThrow();
    });

    it("debe generar una camiseta clásica al detectar palabras clave de t-shirt / remera", async () => {
      const dna = await mockProvider.generatePatternDna("Diseñar una camiseta regular fit crew neck");
      expect(dna.concept_name).toBe("classic_crew_tee");
      expect(dna.base_block).toBe("tshirt_sloper");
      expect(dna.ease.chest_ease_mm).toBe(35);
      expect(dna.modifications.neckline?.type).toBe("crew");

      expect(() => parsePatternDna(dna)).not.toThrow();
    });

    it("debe generar un vestido anime al detectar palabras clave de vestido / kimono / robe", async () => {
      const dna = await mockProvider.generatePatternDna("Vestido kimono estilo sacerdotisa cosplay");
      expect(dna.concept_name).toBe("priestess_crossover_robe_dress");
      expect(dna.base_block).toBe("dress_sloper");
      expect(dna.modifications.sleeves?.type).toBe("kimono");

      expect(() => parsePatternDna(dna)).not.toThrow();
    });

    it("debe generar un chaleco táctico futurista como fallback predeterminado", async () => {
      const dna = await mockProvider.generatePatternDna("Chaleco táctico con bolsillos cargo");
      expect(dna.concept_name).toBe("cyberpunk_shinobi_tactical_vest");
      expect(dna.modifications.sleeves?.type).toBe("sleeveless");
      expect(dna.modifications.pocket?.type).toBe("cargo");

      expect(() => parsePatternDna(dna)).not.toThrow();
    });

    it("debe retornar copias independientes y no mutar los presets internos", async () => {
      const dna1 = await mockProvider.generatePatternDna("hoodie");
      dna1.ease.chest_ease_mm = 999;

      const dna2 = await mockProvider.generatePatternDna("hoodie");
      expect(dna2.ease.chest_ease_mm).toBe(150);
    });
  });

  describe("3. AiProviderFactory", () => {
    it("debe instanciar DirectApiProvider cuando se solicita 'api', 'fireworks', 'deepseek' o 'direct_api'", () => {
      const p1 = AiProviderFactory.create("api", { apiKey: "fw-test-key" });
      expect(p1.getProviderName()).toBe("api");
      expect(p1).toBeInstanceOf(DirectApiProvider);

      const p2 = AiProviderFactory.create("fireworks", { apiKey: "fw-test-key" });
      expect(p2.getProviderName()).toBe("api");
      expect(p2).toBeInstanceOf(DirectApiProvider);

      const p3 = AiProviderFactory.create("deepseek", { apiKey: "fw-test-key" });
      expect(p3.getProviderName()).toBe("api");
      expect(p3).toBeInstanceOf(DirectApiProvider);
    });

    it("debe instanciar MockAiProvider cuando se solicita 'mock' u 'offline'", () => {
      const p1 = AiProviderFactory.create("mock");
      expect(p1.getProviderName()).toBe("mock");
      expect(p1).toBeInstanceOf(MockAiProvider);

      const p2 = AiProviderFactory.create("offline");
      expect(p2.getProviderName()).toBe("mock");
      expect(p2).toBeInstanceOf(MockAiProvider);
    });

    it("debe respetar la variable de entorno AI_PROVIDER cuando no se pasa argumento", () => {
      process.env.AI_PROVIDER = "mock";
      const provider = AiProviderFactory.create();
      expect(provider.getProviderName()).toBe("mock");
      expect(provider).toBeInstanceOf(MockAiProvider);
    });

    it("debe usar DirectApiProvider por defecto si FIREWORKS_API_KEY está configurada", () => {
      delete process.env.AI_PROVIDER;
      process.env.FIREWORKS_API_KEY = "fw_secret_123";
      const provider = AiProviderFactory.create();
      expect(provider.getProviderName()).toBe("api");
      expect(provider).toBeInstanceOf(DirectApiProvider);
    });

    it("debe lanzar un error descriptivo si el proveedor no está soportado", () => {
      expect(() => AiProviderFactory.create("unsupported_claude_v9")).toThrow(
        /Unsupported AI provider: "unsupported_claude_v9"/
      );
    });
  });

  describe("4. DirectApiProvider (Fireworks AI & DeepSeek)", () => {
    it("debe leer FIREWORKS_API_KEY y configurar endpoint de Fireworks por defecto", () => {
      delete process.env.AI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      process.env.FIREWORKS_API_KEY = "fw-key-999";
      delete process.env.FIREWORKS_MODEL;

      const provider = new DirectApiProvider();
      expect(provider.apiKey).toBe("fw-key-999");
      expect(provider.baseUrl).toBe("https://api.fireworks.ai/inference/v1");
      expect(provider.model).toBe("accounts/fireworks/models/qwen3p8-max");
      expect(provider.getProviderName()).toBe("api");
    });

    it("debe lanzar un error claro si no se proporciona API key de Fireworks", async () => {
      delete process.env.FIREWORKS_API_KEY;
      delete process.env.AI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const provider = new DirectApiProvider({ apiKey: "" });

      await expect(provider.generatePatternDna("Test")).rejects.toThrow(
        /No se encontró FIREWORKS_API_KEY/
      );
    });

    it("debe realizar una llamada HTTP POST exitosa con DeepSeek-V3 y retornar el PatternDna", async () => {
      const provider = new DirectApiProvider({
        apiKey: "fw-test-secret-key",
        baseUrl: "https://api.fireworks.ai/inference/v1",
        model: "accounts/fireworks/models/deepseek-v3",
      });

      const mockResponseData = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                concept_name: "minimal_crew_tshirt",
                base_block: "tshirt_sloper",
                ease: { chest_ease_mm: 30 },
                modifications: {
                  neckline: { type: "crew" },
                },
              }),
            },
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponseData,
      } as Response);

      const result = await provider.generatePatternDna("Camiseta minimalista");
      expect(result.concept_name).toBe("minimal_crew_tshirt");
      expect(result.base_block).toBe("tshirt_sloper");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.fireworks.ai/inference/v1/chat/completions");
      expect((options?.headers as Record<string, string>)?.Authorization).toBe("Bearer fw-test-secret-key");
    });

    it("debe orquestar el flujo de visión cuando se proporciona una imagen con DeepSeek (modelo de texto)", async () => {
      const provider = new DirectApiProvider({
        apiKey: "fw-test-secret-key",
        baseUrl: "https://api.fireworks.ai/inference/v1",
        model: "accounts/fireworks/models/deepseek-v3",
        visionModel: "accounts/fireworks/models/llama-v3p2-11b-vision-instruct",
      });

      // 1. Mock de la llamada de visión
      const mockVisionResponse = {
        choices: [
          {
            message: {
              content: "Prenda superior sin mangas tipo chaleco, escote en V profundo, bajo con picos dobles triangulares.",
            },
          },
        ],
      };

      // 2. Mock de la llamada de DeepSeek
      const mockDeepSeekResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                concept_name: "pirate_adventurer_vest",
                base_block: "menswear_torso",
                ease: { chest_ease_mm: 40 },
                modifications: {
                  sleeves: { type: "sleeveless" },
                  neckline: { type: "v_neck", depth_mm: 80 },
                },
              }),
            },
          },
        ],
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVisionResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeepSeekResponse,
        } as Response);

      const result = await provider.generatePatternDna(
        "Chaleco pirata de anime",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      );

      expect(result.concept_name).toBe("pirate_adventurer_vest");
      expect(result.modifications.sleeves?.type).toBe("sleeveless");
      expect(fetchSpy).toHaveBeenCalledTimes(2); // 1. Visión + 2. DeepSeek
    });

    it("debe desinfectar tags de pensamiento <think>...</think> de DeepSeek R1", async () => {
      const provider = new DirectApiProvider({
        apiKey: "fw-test-secret-key",
        model: "accounts/fireworks/models/deepseek-r1",
      });

      const mockResponseWithThinking = {
        choices: [
          {
            message: {
              content: `<think>
El usuario quiere un hoodie boxy. Necesito calcular chest_ease_mm = 140mm y shoulder drop = 40mm.
Bloque base: menswear_torso_oversize.
</think>
\`\`\`json
{
  "concept_name": "cyberpunk_boxy_hoodie",
  "base_block": "menswear_torso_oversize",
  "ease": {
    "chest_ease_mm": 140
  },
  "modifications": {
    "hood": { "type": "crossover" }
  }
}
\`\`\``,
            },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponseWithThinking,
      } as Response);

      const result = await provider.generatePatternDna("Hoodie cyberpunk");
      expect(result.concept_name).toBe("cyberpunk_boxy_hoodie");
      expect(result.ease.chest_ease_mm).toBe(140);
      expect(result.modifications.hood?.type).toBe("crossover");
    });

    it("debe realizar llamada directa multimodal de 1 solo paso con Qwen 3.8 Max al detectar soporte nativo de visión", async () => {
      const provider = new DirectApiProvider({
        apiKey: "fw-test-secret-key",
        baseUrl: "https://api.fireworks.ai/inference/v1",
        model: "accounts/fireworks/models/qwen3p8-max",
      });

      const mockResponseData = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                concept_name: "streetwear_boxy_crop",
                base_block: "tshirt_sloper",
                ease: { chest_ease_mm: 80 },
                modifications: {
                  neckline: { type: "crew" },
                  hem: { type: "cropped" },
                },
              }),
              reasoning_content: "Analizando imagen y deduciendo proporciones de crop top boxy...",
            },
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponseData,
      } as Response);

      const sampleDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const result = await provider.generatePatternDna(
        "Crop top boxy streetwear",
        sampleDataUrl
      );

      expect(result.concept_name).toBe("streetwear_boxy_crop");
      expect(result.modifications.hem?.type).toBe("cropped");
      // Al ser modelo de visión nativo (Qwen), solo debe ejecutar 1 request directo
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.fireworks.ai/inference/v1/chat/completions");
      const requestBody = JSON.parse(options?.body as string);
      expect(requestBody.model).toBe("accounts/fireworks/models/qwen3p8-max");
      expect(requestBody.max_tokens).toBe(6000);
      expect(requestBody.top_k).toBe(40);
      expect(requestBody.presence_penalty).toBe(0);
      expect(requestBody.frequency_penalty).toBe(0);
      expect(Array.isArray(requestBody.messages[1].content)).toBe(true);
      expect(requestBody.messages[1].content[0].type).toBe("text");
      expect(requestBody.messages[1].content[1].type).toBe("image_url");
      expect(requestBody.messages[1].content[1].image_url.url).toBe(sampleDataUrl);

      // Verificación de solidez de esquema Zod
      expect(() => parsePatternDna(result)).not.toThrow();
    });

    it("debe resolver una ruta local de disco a Data URL Base64 y estructurar el payload multimodal para Qwen 3.8 Max", async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pac-ai-test-"));
      const tempImagePath = path.join(tempDir, "sample_garment.png");
      const dummyPngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      fs.writeFileSync(tempImagePath, dummyPngBuffer);

      try {
        const provider = new DirectApiProvider({
          apiKey: "fw-test-secret-key",
          baseUrl: "https://api.fireworks.ai/inference/v1",
          model: "accounts/fireworks/models/qwen3p8-max",
        });

        const mockResponseData = {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  concept_name: "custom_anime_kimono_dress",
                  base_block: "dress_sloper",
                  ease: { chest_ease_mm: 50 },
                  modifications: {
                    sleeves: { type: "kimono" },
                  },
                }),
              },
            },
          ],
        };

        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
          ok: true,
          json: async () => mockResponseData,
        } as Response);

        const result = await provider.generatePatternDna(
          "Vestido ceremonial japonés",
          tempImagePath
        );

        expect(result.concept_name).toBe("custom_anime_kimono_dress");
        expect(result.base_block).toBe("dress_sloper");
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const [, options] = fetchSpy.mock.calls[0];
        const requestBody = JSON.parse(options?.body as string);
        expect(requestBody.model).toBe("accounts/fireworks/models/qwen3p8-max");
        expect(requestBody.max_tokens).toBe(6000);
        expect(requestBody.top_k).toBe(40);
        expect(requestBody.presence_penalty).toBe(0);
        expect(requestBody.frequency_penalty).toBe(0);

        const expectedDataUrlPrefix = "data:image/png;base64,";
        expect(requestBody.messages[1].content[1].type).toBe("image_url");
        expect(
          requestBody.messages[1].content[1].image_url.url.startsWith(
            expectedDataUrlPrefix
          )
        ).toBe(true);

        // Validación estricta con Zod
        expect(() => parsePatternDna(result)).not.toThrow();
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("debe usar el prompt por defecto cuando solo se proporciona una imagen sin prompt de texto", async () => {
      const provider = new DirectApiProvider({
        apiKey: "fw-test-secret-key",
        baseUrl: "https://api.fireworks.ai/inference/v1",
        model: "accounts/fireworks/models/qwen3p8-max",
      });

      const mockResponseData = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                concept_name: "image_derived_vest",
                base_block: "menswear_torso",
                ease: { chest_ease_mm: 40 },
                modifications: {
                  sleeves: { type: "sleeveless" },
                },
              }),
            },
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponseData,
      } as Response);

      const sampleDataUrl =
        "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

      const result = await provider.generatePatternDna("", sampleDataUrl);

      expect(result.concept_name).toBe("image_derived_vest");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [, options] = fetchSpy.mock.calls[0];
      const requestBody = JSON.parse(options?.body as string);
      const userTextContent = requestBody.messages[1].content[0].text;
      expect(userTextContent).toContain(
        "Generar patrón paramétrico preciso a partir del diseño y silueta de la imagen"
      );
      expect(requestBody.messages[1].content[1].image_url.url).toBe(sampleDataUrl);

      expect(() => parsePatternDna(result)).not.toThrow();
    });

    it("debe extraer y parsear el JSON desde reasoning_content si content viene vacío", async () => {
      const provider = new DirectApiProvider({
        apiKey: "fw-test-secret-key",
        baseUrl: "https://api.fireworks.ai/inference/v1",
        model: "accounts/fireworks/models/qwen3p8-max",
      });

      const mockResponseWithEmptyContentButReasoning = {
        choices: [
          {
            message: {
              content: "",
              reasoning_content: `Thinking Process:
1. Analyzing garment request for oversized hoodie.
2. Selecting base_block menswear_torso_oversize with 160mm chest ease.
3. Adding crossover hood.

\`\`\`json
{
  "concept_name": "reasoning_extracted_hoodie",
  "base_block": "menswear_torso_oversize",
  "ease": { "chest_ease_mm": 160 },
  "modifications": {
    "hood": { "type": "crossover" }
  }
}
\`\`\``,
            },
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockResponseWithEmptyContentButReasoning,
      } as Response);

      const result = await provider.generatePatternDna("Hoodie oversize razonado");
      expect(result.concept_name).toBe("reasoning_extracted_hoodie");
      expect(result.base_block).toBe("menswear_torso_oversize");
      expect(result.ease.chest_ease_mm).toBe(160);
      expect(result.modifications.hood?.type).toBe("crossover");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [, options] = fetchSpy.mock.calls[0];
      const requestBody = JSON.parse(options?.body as string);
      expect(requestBody.max_tokens).toBe(6000);

      expect(() => parsePatternDna(result)).not.toThrow();
    });

    it("debe lanzar un error descriptivo si tanto content como reasoning_content están vacíos", async () => {
      const provider = new DirectApiProvider({
        apiKey: "fw-test-secret-key",
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "",
                reasoning_content: "",
              },
            },
          ],
        }),
      } as Response);

      await expect(provider.generatePatternDna("Test")).rejects.toThrow(
        /No content returned in API completion choices/
      );
    });

    it("debe lanzar un error claro cuando la API responde con un código de error HTTP", async () => {
      const provider = new DirectApiProvider({
        apiKey: "fw-invalid-key",
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => JSON.stringify({ error: { message: "Invalid API key" } }),
      } as Response);

      await expect(provider.generatePatternDna("Test")).rejects.toThrow(
        /HTTP 401 Unauthorized/
      );
    });
  });
});
