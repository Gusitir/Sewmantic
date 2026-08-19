/**
 * pattern-ai-core entry point
 * Generador Paramétrico de Patrones IA para FreeSewing y Streetwear/Anime
 */

import path from "node:path";
import fs from "node:fs";
import { Command } from "commander";
import dotenv from "dotenv";

import {
  generatePatternPipeline,
  exportCalibrationPdf,
  inspectPatternDnaFile,
  compileTechpackFromFile,
  parseMeasurementsArg,
  PipelineRequest,
} from "./pipeline.js";
import { StandardSize } from "./types/pattern.js";
import { STANDARD_SIZES } from "./engine/base_blocks/measurements.js";

dotenv.config();

export interface CoreConfig {
  aiProvider?: string;
  outputPath?: string;
  debug?: boolean;
}

// Exportación de tipos y contratos de ADN Paramétrico
export * from "./types/pattern.js";
export type { TrouserLengthType } from "./types/pattern.js";
export * from "./schema/pattern_schema.js";

// Exportación del Motor Geométrico y Bloques Base (Slopers)
export * from "./engine/geometry.js";
export * from "./engine/base_blocks/index.js";
export * from "./engine/modifier.js";
export * from "./engine/calibration_box.js";
export * from "./utils/tiler.js";
export * from "./engine/exporter.js";
export * from "./engine/tech_sheet.js";

// Exportación del Subsistema de Proveedores de IA
export * from "./ai/base_provider.js";
export * from "./ai/prompt_builder.js";
export * from "./ai/agy_cli_provider.js";
export * from "./ai/opencode_cli_provider.js";
export * from "./ai/direct_api_provider.js";
export * from "./ai/mock_provider.js";
export * from "./ai/factory.js";

// Exportación del Pipeline y Automatizaciones
export * from "./pipeline.js";

export function getVersion(): string {
  return "0.1.0";
}

/**
 * Parsea una cadena de tallas separadas por coma o espacio (ej: 'S,M,L' o 'XS S M')
 */
function parseSizesArg(rawSizes?: string): StandardSize[] | undefined {
  if (!rawSizes || typeof rawSizes !== "string" || rawSizes.trim().length === 0) {
    return undefined;
  }

  const tokens = rawSizes
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

  const validSizes: StandardSize[] = [];
  for (const token of tokens) {
    if (STANDARD_SIZES.includes(token as StandardSize)) {
      validSizes.push(token as StandardSize);
    } else {
      console.warn(`[pattern-ai-core] Advertencia: Talla no estándar ignorada: '${token}'. Válidas: ${STANDARD_SIZES.join(', ')}`);
    }
  }

  return validSizes.length > 0 ? validSizes : undefined;
}

/**
 * Formatea el tamaño de bytes a formato legible (KB, MB)
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Inicializa y configura la interfaz de línea de comandos (CLI) con Commander
 */
export function initCli(): Command {
  const program = new Command();

  program
    .name("pattern-ai-core")
    .description("Generador Paramétrico de Patrones IA con FreeSewing v3 y Fichas Técnicas Industriales")
    .version(getVersion());

  // ==========================================
  // COMANDO 1: generate <prompt>
  // ==========================================
  program
    .command("generate <prompt>")
    .description("Genera el set completo de entregables de moldería textil a partir de un prompt en lenguaje natural")
    .option("-i, --image <path>", "Ruta a boceto o imagen de referencia")
    .option("-f, --format <format>", "Formato de papel ('a4', 'letter', 'a0', 'all')", "all")
    .option("-s, --sizes <sizes>", "Tallas a graduar separadas por coma (ej: 'S,M,L' o 'XS,S,M,L,XL,2XL,3XL')")
    .option("-p, --provider <provider>", "Proveedor de IA ('mock', 'agy', 'opencode', 'api')", process.env.AI_PROVIDER || "agy")
    .option("-o, --output <dir>", "Directorio base de salida", "output")
    .option("-w, --waste <number>", "Factor de merma textil (mínimo 0.10, default 0.15)", "0.15")
    .option("-m, --measurements <path_or_json>", "Medidas personalizadas exactas en JSON o ruta a archivo .json (ej: '{\"chest_circumference_mm\":1040}')")
    .action(async (prompt: string, options: { image?: string; format?: string; sizes?: string; provider?: string; output?: string; waste?: string; measurements?: string }) => {
      try {
        console.log(`\n=============================================================`);
        console.log(`[pattern-ai-core] Generando patrón paramétrico...`);
        console.log(`Prompt: "${prompt}"`);
        console.log(`Proveedor IA: ${options.provider}`);
        console.log(`Directorio salida: ${options.output}`);
        console.log(`=============================================================\n`);

        const sizes = parseSizesArg(options.sizes);
        const wasteFactor = options.waste ? parseFloat(options.waste) : undefined;
        const customMeasurements = parseMeasurementsArg(options.measurements);

        if (customMeasurements) {
          console.log(`Medidas personalizadas: ${Object.keys(customMeasurements).length} cotas exactas aplicadas.`);
        }

        const req: PipelineRequest = {
          prompt,
          imagePath: options.image,
          provider: options.provider,
          outputDir: options.output,
          sizes,
          wasteFactor,
          customMeasurements,
        };

        const result = await generatePatternPipeline(req);

        console.log(`\n[ÉXITO] Moldería textil generada exitosamente en:`);
        console.log(`  -> ${result.outputDirectory}\n`);

        console.log(`Concepto: ${result.conceptName} (${result.dna.base_block})`);
        console.log(`Tallas generadas: ${result.sizes.join(", ")}`);
        console.log(`Piezas de moldería: ${result.stats.totalParts} piezas por talla`);
        console.log(`Consumo promedio estimado: ${result.stats.averageFabricMeters.toFixed(2)} m de tela (Merma: ${result.techSheet.fabricConsumption.wastePercentage}%)\n`);

        console.log(`Entregables generados:`);
        for (const [key, filePath] of Object.entries(result.files)) {
          let sizeStr = "";
          try {
            const stat = fs.statSync(filePath);
            sizeStr = ` (${formatFileSize(stat.size)})`;
          } catch {
            // Ignorar si no se puede leer tamaño
          }
          console.log(`  • [${key}] ${path.basename(filePath)}${sizeStr}`);
        }

        console.log(`\nVerificación requerida: Imprima la Página 1 de los PDFs paginados para calibrar con regla el cuadro de 10x10 cm.`);
      } catch (err) {
        console.error(`\n[ERROR] Falló la generación del patrón:`, err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  // ==========================================
  // COMANDO 2: calibrate
  // ==========================================
  program
    .command("calibrate")
    .description("Genera una hoja de prueba y calibración vectorial de 1 página con el Cuadro Invariante de 10x10 cm")
    .option("-f, --format <format>", "Formato de papel ('A4' o 'Letter')", "A4")
    .option("-o, --output <path>", "Ruta del archivo PDF de salida", "output/calibration_10x10.pdf")
    .action(async (options: { format?: string; output?: string }) => {
      try {
        const format = (options.format?.toLowerCase() === "letter" ? "letter" : "A4") as "A4" | "letter";
        const outputPath = options.output || "output/calibration_10x10.pdf";

        console.log(`[pattern-ai-core] Generando hoja de calibración 10x10 cm (${format.toUpperCase()})...`);
        const { filePath, buffer } = await exportCalibrationPdf(outputPath, format);

        console.log(`[ÉXITO] Hoja de calibración generada:`);
        console.log(`  -> ${filePath} (${formatFileSize(buffer.length)})`);
        console.log(`\nInstrucciones: Imprima al 100% de escala (sin auto-ajuste) y mida con regla física el recuadro exterior (10.0 cm x 10.0 cm).`);
      } catch (err) {
        console.error(`[ERROR] Falló la generación de calibración:`, err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  // ==========================================
  // COMANDO 3: inspect <file>
  // ==========================================
  program
    .command("inspect <file>")
    .description("Lee, valida con esquema Zod y muestra el resumen técnico del ADN Paramétrico en formato JSON")
    .action(async (file: string) => {
      try {
        console.log(`[pattern-ai-core] Inspeccionando archivo de ADN: ${file}`);
        const dna = await inspectPatternDnaFile(file);

        console.log(`\n-------------------------------------------------------------`);
        console.log(`ADN PARAMÉTRICO VÁLIDO: ${dna.concept_name.toUpperCase()}`);
        console.log(`-------------------------------------------------------------`);
        console.log(`• Bloque Base: ${dna.base_block}`);
        console.log(`• Descripción: ${dna.description || "Sin descripción"}`);
        console.log(`• Holguras (Ease):`);
        console.log(`    Pecho: ${dna.ease.chest_ease_mm} mm`);
        if (dna.ease.waist_ease_mm) console.log(`    Cintura: ${dna.ease.waist_ease_mm} mm`);
        if (dna.ease.hip_ease_mm) console.log(`    Cadera: ${dna.ease.hip_ease_mm} mm`);
        if (dna.ease.bicep_ease_mm) console.log(`    Bíceps: ${dna.ease.bicep_ease_mm} mm`);
        if (dna.ease.shoulder_ease_mm) console.log(`    Hombro: ${dna.ease.shoulder_ease_mm} mm`);

        console.log(`• Modificaciones configuradas:`);
        if (dna.modifications.neckline) {
          console.log(`    Escote: ${dna.modifications.neckline.type} (prof: ${dna.modifications.neckline.depth_mm ?? "auto"}mm)`);
        }
        if (dna.modifications.sleeves) {
          console.log(`    Mangas: ${dna.modifications.sleeves.type} (caída: ${dna.modifications.sleeves.drop_mm ?? 0}mm, largo: ${dna.modifications.sleeves.length_type ?? "std"})`);
        }
        if (dna.modifications.hem) {
          console.log(`    Bajo/Ruedo: ${dna.modifications.hem.type} (caída: ${dna.modifications.hem.drop_mm ?? 0}mm)`);
        }
        if (dna.modifications.pocket) {
          console.log(`    Bolsillo: ${dna.modifications.pocket.type} (${dna.modifications.pocket.width_mm ?? 0}x${dna.modifications.pocket.height_mm ?? 0}mm)`);
        }
        if (dna.modifications.hood) {
          console.log(`    Capucha: ${dna.modifications.hood.type} (alto: ${dna.modifications.hood.height_mm ?? 0}mm, prof: ${dna.modifications.hood.depth_mm ?? 0}mm)`);
        }

        console.log(`• Tallaje y Capas:`);
        console.log(`    Talla base: ${dna.sizing?.size || "M"}`);
        if (dna.sizing?.target_layers) {
          console.log(`    Tallas objetivo: ${dna.sizing.target_layers.join(", ")}`);
        }

        console.log(`• Especificaciones Técnicas:`);
        console.log(`    Margen de costura: ${dna.tech_specs?.seam_allowance_mm ?? 10} mm`);
        console.log(`    Margen de dobladillo: ${dna.tech_specs?.hem_allowance_mm ?? 25} mm`);
        console.log(`    Tela sugerida: ${dna.tech_specs?.fabric_type || "No especificada"}`);
        console.log(`    Consumo estimado: ${dna.tech_specs?.estimated_fabric_meters ?? dna.estimated_fabric_meters ?? "N/A"} m`);
        console.log(`-------------------------------------------------------------\n`);
      } catch (err) {
        console.error(`[ERROR] Inspección fallida:`, err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  // ==========================================
  // COMANDO 4: techpack <file>
  // ==========================================
  program
    .command("techpack <file>")
    .description("Compila y exporta la Ficha Técnica (PDF, MD, JSON) a partir de un archivo ADN JSON")
    .option("-o, --output <dir>", "Directorio de salida", "output")
    .option("-s, --sizes <sizes>", "Tallas a incluir (ej: 'S,M,L')")
    .option("-w, --waste <number>", "Factor de merma textil (default: 0.15)", "0.15")
    .option("-m, --measurements <path_or_json>", "Medidas personalizadas en JSON o ruta a archivo .json")
    .action(async (file: string, options: { output?: string; sizes?: string; waste?: string; measurements?: string }) => {
      try {
        console.log(`[pattern-ai-core] Compilando Ficha Técnica desde: ${file}`);
        const sizes = parseSizesArg(options.sizes);
        const wasteFactor = options.waste ? parseFloat(options.waste) : 0.15;
        const customMeasurements = parseMeasurementsArg(options.measurements);

        const res = await compileTechpackFromFile(file, {
          outputDir: options.output,
          sizes,
          wasteFactor,
          customMeasurements,
        });

        console.log(`\n[ÉXITO] Ficha técnica compilada exitosamente:`);
        console.log(`  • PDF:  ${res.pdfPath}`);
        console.log(`  • MD:   ${res.mdPath}`);
        console.log(`  • JSON: ${res.jsonPath}`);
        console.log(`\nConsumo promedio: ${res.techSheet.fabricConsumption.averageLinearMeters.toFixed(2)} m (Merma: ${res.techSheet.fabricConsumption.wastePercentage}%)`);
      } catch (err) {
        console.error(`[ERROR] Compilación de ficha técnica fallida:`, err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  // ==========================================
  // COMANDO 5: status
  // ==========================================
  program
    .command("status")
    .description("Muestra el estado del entorno, proveedores de IA y capacidades geométricas")
    .action(() => {
      console.log(`=============================================================`);
      console.log(`pattern-ai-core v${getVersion()}`);
      console.log(`=============================================================`);
      console.log(`• Entorno Node.js: ${process.version} (${process.platform} ${process.arch})`);
      console.log(`• Proveedor IA Activo: ${process.env.AI_PROVIDER || "agy (default)"}`);
      console.log(`• Proveedores soportados: agy (CLI), opencode (CLI), api (Direct API), mock (Offline/CI)`);
      console.log(`• Motor Geométrico: FreeSewing v3 Parametric Slopers`);
      console.log(`• Slopers Base Disponibles:`);
      console.log(`    - menswear_torso_oversize (Streetwear Hoodie / Crewneck / Jacket)`);
      console.log(`    - tshirt_sloper (Camisetas Regular / Slim / Boxy)`);
      console.log(`    - dress_sloper (Vestidos / Túnicas Anime & Cosplay)`);
      console.log(`• Tallas Estándar Soportadas: ${STANDARD_SIZES.join(", ")}`);
      console.log(`• Invariante de Calibración: Cuadro de 100x100 mm (283.465 pt) + Marco 4"x4" (288 pt) en Página 1`);
      console.log(`• Formatos de Exportación: PDF Paginado (A4/Letter), PDF Continuo (A0), SVG Vectorial, Ficha Técnica PDF/MD/JSON`);
      console.log(`=============================================================`);
    });

  return program;
}

// Si se ejecuta directamente desde CLI
if (
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] && (process.argv[1].endsWith("index.js") || process.argv[1].endsWith("index.ts")))
) {
  const program = initCli();
  program.parse(process.argv);
}
