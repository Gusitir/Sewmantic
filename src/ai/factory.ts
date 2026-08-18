/**
 * src/ai/factory.ts
 * Fábrica para instanciación desacoplada de proveedores de IA
 * pattern-ai-core
 */

import type { IAiProvider, AiProviderConfig } from "./base_provider.js";
import { AgyCliProvider } from "./agy_cli_provider.js";
import { OpenCodeCliProvider } from "./opencode_cli_provider.js";
import { DirectApiProvider } from "./direct_api_provider.js";
import { MockAiProvider } from "./mock_provider.js";

/**
 * Fábrica de proveedores de Inteligencia Artificial
 */
export class AiProviderFactory {
  /**
   * Crea una instancia del proveedor de IA correspondiente
   * @param providerType Tipo de proveedor ('agy', 'opencode', 'api' / 'direct_api', 'mock'). Si no se especifica, usa process.env.AI_PROVIDER o 'agy' por defecto.
   * @param config Configuración opcional para sobreescribir parámetros (modelo, timeout, api key, etc.)
   */
  public static create(
    providerType?: string,
    config?: AiProviderConfig
  ): IAiProvider {
    const rawType = providerType || process.env.AI_PROVIDER || "agy";
    const type = rawType.trim().toLowerCase();

    switch (type) {
      case "agy":
        return new AgyCliProvider(config);

      case "opencode":
        return new OpenCodeCliProvider(config);

      case "api":
      case "direct_api":
      case "openai":
        return new DirectApiProvider(config);

      case "mock":
      case "offline":
        return new MockAiProvider();

      default:
        throw new Error(
          `Unsupported AI provider: "${rawType}". Supported providers are: 'agy', 'opencode', 'api' ('direct_api'), 'mock'.`
        );
    }
  }
}
