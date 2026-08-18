/**
 * tests/ai_provider.test.ts
 * Suite de pruebas unitarias para el subsistema de proveedores de Inteligencia Artificial y Fábrica
 * pattern-ai-core
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PromptBuilder,
  MockAiProvider,
  AgyCliProvider,
  OpenCodeCliProvider,
  DirectApiProvider,
  AiProviderFactory,
  parsePatternDna,
} from "../src/index.js";

describe("AI Provider Subsystem & Factory", () => {
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
    it("debe instanciar AgyCliProvider por defecto o cuando se especifica 'agy'", () => {
      delete process.env.AI_PROVIDER;
      const defaultProvider = AiProviderFactory.create();
      expect(defaultProvider.getProviderName()).toBe("agy");
      expect(defaultProvider).toBeInstanceOf(AgyCliProvider);

      const agyProvider = AiProviderFactory.create("agy");
      expect(agyProvider.getProviderName()).toBe("agy");
      expect(agyProvider).toBeInstanceOf(AgyCliProvider);
    });

    it("debe instanciar OpenCodeCliProvider cuando se solicita 'opencode'", () => {
      const provider = AiProviderFactory.create("opencode");
      expect(provider.getProviderName()).toBe("opencode");
      expect(provider).toBeInstanceOf(OpenCodeCliProvider);
    });

    it("debe instanciar DirectApiProvider cuando se solicita 'api', 'direct_api' o 'openai'", () => {
      const p1 = AiProviderFactory.create("api", { apiKey: "test-key" });
      expect(p1.getProviderName()).toBe("direct_api");
      expect(p1).toBeInstanceOf(DirectApiProvider);

      const p2 = AiProviderFactory.create("direct_api", { apiKey: "test-key" });
      expect(p2.getProviderName()).toBe("direct_api");
      expect(p2).toBeInstanceOf(DirectApiProvider);

      const p3 = AiProviderFactory.create("openai", { apiKey: "test-key" });
      expect(p3.getProviderName()).toBe("direct_api");
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

    it("debe lanzar un error descriptivo si el proveedor no está soportado", () => {
      expect(() => AiProviderFactory.create("unsupported_claude_v9")).toThrow(
        /Unsupported AI provider: "unsupported_claude_v9"/
      );
    });
  });

  describe("4. AgyCliProvider", () => {
    it("debe configurar el modelo por defecto 'gemini-3.7-flash' y respetar opciones", () => {
      delete process.env.AI_MODEL;
      const provider = new AgyCliProvider();
      expect(provider.model).toBe("gemini-3.7-flash");
      expect(provider.getProviderName()).toBe("agy");

      const customProvider = new AgyCliProvider({
        model: "gemini-1.5-pro",
        executablePath: "custom-agy.exe",
        timeoutMs: 15000,
      });
      expect(customProvider.model).toBe("gemini-1.5-pro");
      expect(customProvider.executablePath).toBe("custom-agy.exe");
      expect(customProvider.timeoutMs).toBe(15000);
    });

    it("debe procesar y desinfectar la salida markdown retornada por el CLI", async () => {
      const provider = new AgyCliProvider();
      const mockRawOutput = `
Analizando requerimientos de moldería:
\`\`\`json
{
  "concept_name": "streetwear_oversize_hoodie",
  "base_block": "menswear_torso_oversize",
  "ease": {
    "chest_ease_mm": 140
  },
  "modifications": {
    "sleeves": {
      "type": "drop_shoulder",
      "drop_mm": 50
    }
  },
  "estimated_fabric_meters": 2.0
}
\`\`\`
¡Patrón listo!
`;

      vi.spyOn(provider as unknown as { executeProcess: () => Promise<{ stdout: string; stderr: string }> }, "executeProcess").mockResolvedValue({
        stdout: mockRawOutput,
        stderr: "",
      });

      const result = await provider.generatePatternDna("Hoodie oversize");
      expect(result.concept_name).toBe("streetwear_oversize_hoodie");
      expect(result.ease.chest_ease_mm).toBe(140);
      expect(result.modifications.sleeves?.type).toBe("drop_shoulder");
    });

    it("debe capturar errores de timeout y lanzar un mensaje claro", async () => {
      const provider = new AgyCliProvider({ timeoutMs: 2000 });

      vi.spyOn(provider as unknown as { executeProcess: () => Promise<{ stdout: string; stderr: string }> }, "executeProcess").mockRejectedValue(
        new Error("Execution timed out after 2000ms")
      );

      await expect(provider.generatePatternDna("Test")).rejects.toThrow(
        /\[AgyCliProvider\] Execution timed out after 2000ms/
      );
    });

    it("debe capturar errores de ejecución con salida vacía o código de fallo", async () => {
      const provider = new AgyCliProvider();

      vi.spyOn(provider as unknown as { executeProcess: () => Promise<{ stdout: string; stderr: string }> }, "executeProcess").mockRejectedValue(
        new Error("Binary not found: agy")
      );

      await expect(provider.generatePatternDna("Test")).rejects.toThrow(
        /\[AgyCliProvider\] CLI execution failed/
      );
    });
  });

  describe("5. OpenCodeCliProvider", () => {
    it("debe configurar el modelo por defecto 'gpt-4o' y retornar 'opencode'", () => {
      const provider = new OpenCodeCliProvider();
      expect(provider.model).toBe("gpt-4o");
      expect(provider.getProviderName()).toBe("opencode");
    });

    it("debe ejecutar opencode y parsear el ADN retornado", async () => {
      const provider = new OpenCodeCliProvider();
      const mockJson = JSON.stringify({
        concept_name: "anime_cosplay_dress",
        base_block: "dress_sloper",
        ease: { chest_ease_mm: 60 },
        modifications: {
          sleeves: { type: "kimono" },
        },
      });

      vi.spyOn(provider as unknown as { executeProcess: () => Promise<{ stdout: string; stderr: string }> }, "executeProcess").mockResolvedValue({
        stdout: `\`\`\`json\n${mockJson}\n\`\`\``,
        stderr: "",
      });

      const result = await provider.generatePatternDna("Vestido kimono");
      expect(result.concept_name).toBe("anime_cosplay_dress");
      expect(result.modifications.sleeves?.type).toBe("kimono");
    });

    it("debe manejar timeout en OpenCode CLI", async () => {
      const provider = new OpenCodeCliProvider({ timeoutMs: 3000 });

      vi.spyOn(provider as unknown as { executeProcess: () => Promise<{ stdout: string; stderr: string }> }, "executeProcess").mockRejectedValue(
        new Error("Execution timed out after 3000ms")
      );

      await expect(provider.generatePatternDna("Test")).rejects.toThrow(
        /\[OpenCodeCliProvider\] Execution timed out after 3000ms/
      );
    });
  });

  describe("6. DirectApiProvider", () => {
    it("debe lanzar un error si no se proporciona API key", async () => {
      delete process.env.AI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const provider = new DirectApiProvider({ apiKey: "" });

      await expect(provider.generatePatternDna("Test")).rejects.toThrow(
        /AI_API_KEY or OPENAI_API_KEY is required/
      );
    });

    it("debe realizar una llamada HTTP POST exitosa y retornar el PatternDna", async () => {
      const provider = new DirectApiProvider({
        apiKey: "sk-test-secret-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o",
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
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect((options?.headers as Record<string, string>)?.Authorization).toBe("Bearer sk-test-secret-key");
    });

    it("debe lanzar un error claro cuando la API responde con un código de error HTTP", async () => {
      const provider = new DirectApiProvider({
        apiKey: "sk-invalid-key",
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

    it("debe lanzar un error cuando la respuesta de la API no contiene choices o contenido", async () => {
      const provider = new DirectApiProvider({
        apiKey: "sk-valid-key",
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
      } as Response);

      await expect(provider.generatePatternDna("Test")).rejects.toThrow(
        /No content returned in API completion choices/
      );
    });
  });
});
