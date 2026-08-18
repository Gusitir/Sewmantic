/**
 * pattern-ai-core entry point
 * Generador Paramétrico de Patrones IA para FreeSewing y Streetwear/Anime
 */

import { Command } from "commander";
import dotenv from "dotenv";

dotenv.config();

export interface CoreConfig {
  aiProvider?: string;
  outputPath?: string;
  debug?: boolean;
}

// Exportación de tipos y contratos de ADN Paramétrico
export * from "./types/pattern.js";
export * from "./schema/pattern_schema.js";

// Exportación del Subsistema de Proveedores de IA
export * from "./ai/base_provider.js";
export * from "./ai/prompt_builder.js";
export * from "./ai/agy_cli_provider.js";
export * from "./ai/opencode_cli_provider.js";
export * from "./ai/direct_api_provider.js";
export * from "./ai/mock_provider.js";
export * from "./ai/factory.js";

export function getVersion(): string {
  return "0.1.0";
}

export function initCli(): Command {
  const program = new Command();

  program
    .name("pattern-ai-core")
    .description("Generador Paramétrico de Patrones IA con FreeSewing v3")
    .version(getVersion());

  program
    .command("status")
    .description("Muestra el estado del entorno y dependencias")
    .action(() => {
      console.log(`[pattern-ai-core] v${getVersion()} - Ready`);
      console.log(`AI_PROVIDER: ${process.env.AI_PROVIDER || "not configured"}`);
    });

  return program;
}

// If executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("index.js")) {
  const program = initCli();
  program.parse(process.argv);
}
