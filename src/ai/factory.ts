/**
 * src/ai/factory.ts
 * Fábrica para instanciación desacoplada de proveedores de IA
 * pattern-ai-core
 */

import type { IAiProvider, AiProviderConfig } from "./base_provider.js";
import { DirectApiProvider } from "./direct_api_provider.js";
import { MockAiProvider } from "./mock_provider.js";

/**
 * Fábrica de proveedores de Inteligencia Artificial
 */
export class AiProviderFactory {
  /**
   * Crea una instancia del proveedor de IA correspondiente
   * @param providerType Tipo de proveedor ('api' / 'fireworks', 'mock' / 'offline').
   * @param config Configuración opcional para sobreescribir parámetros (modelo, timeout, api key, etc.)
   */
  public static create(
    providerType?: string,
    config?: AiProviderConfig
  ): IAiProvider {
    const rawType =
      providerType ||
      process.env.AI_PROVIDER ||
      (process.env.FIREWORKS_API_KEY || process.env.AI_API_KEY ? "api" : "mock");
    const type = rawType.trim().toLowerCase();

    switch (type) {
      case "api":
      case "direct_api":
      case "fireworks":
      case "deepseek":
      case "openai":
        return new DirectApiProvider(config);

      case "mock":
      case "offline":
      case "local":
        return new MockAiProvider();

      // Compatibilidad con aliases anteriores
      case "agy":
      case "opencode":
        // Si no hay CLI o se prefiere API, usar DirectApiProvider si hay API Key o fallback a Mock
        if (process.env.FIREWORKS_API_KEY || process.env.AI_API_KEY || config?.apiKey) {
          return new DirectApiProvider(config);
        }
        return new MockAiProvider();

      default:
        throw new Error(
          `Unsupported AI provider: "${rawType}". Supported providers are: 'api' (Fireworks AI / DeepSeek) and 'mock' (Offline).`
        );
    }
  }
}
