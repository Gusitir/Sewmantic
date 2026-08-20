/**
 * scripts/test_fireworks_e2e_image.js
 * Prueba End-to-End en Vivo de Generación por Imagen & Auditoría
 * pattern-ai-core — Fireworks AI (Qwen 3.7 Plus) & FreeSewing Engine
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePatternPipeline } from "../dist/pipeline.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function runE2EImageTest() {
  console.log("===============================================================================");
  console.log("pattern-ai-core — [T-20] Verificación E2E en Vivo con Imagen & Fireworks AI");
  console.log("===============================================================================\n");

  const apiKey = (process.env.FIREWORKS_API_KEY || "").trim();
  const model = (process.env.FIREWORKS_MODEL || "accounts/fireworks/models/qwen3p7-plus").trim();
  const baseUrl = (process.env.FIREWORKS_BASE_URL || "https://api.fireworks.ai/inference/v1").trim();

  console.log("[1/5] Verificación de Entorno y Configuración de Fireworks AI:");
  console.log(`  • Base URL: ${baseUrl}`);
  console.log(`  • Modelo:   ${model}`);
  console.log(`  • API Key:  ${apiKey ? apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4) : "(NO CONFIGURADA)"}`);

  if (!apiKey || apiKey === "tu_fireworks_api_key_aqui") {
    console.error("\n[ERROR CRÍTICO] FIREWORKS_API_KEY no está configurada en .env.");
    process.exit(1);
  }

  // 1. Localizar o preparar imagen de prueba
  console.log("\n[2/5] Comprobando imagen de referencia de entrada:");
  const candidateImages = [
    path.join(projectRoot, "IMAGENES", "luficosplai.png"),
    path.join(projectRoot, "IMAGENES", "vest.png"),
    path.join(projectRoot, "IMAGENES", "sample.png"),
  ];

  let testImagePath = candidateImages.find((p) => fs.existsSync(p));

  if (!testImagePath) {
    console.log("  • No se encontró imagen en IMAGENES/. Creando PNG de prueba temporal...");
    const tempImgDir = path.join(projectRoot, "output", "temp_test_assets");
    fs.mkdirSync(tempImgDir, { recursive: true });
    testImagePath = path.join(tempImgDir, "test_vest_input.png");
    // Minimal 1x1 valid PNG buffer
    const minimalPngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    fs.writeFileSync(testImagePath, minimalPngBuffer);
    console.log(`  • PNG temporal creado: ${testImagePath}`);
  } else {
    const stat = fs.statSync(testImagePath);
    console.log(`  • Imagen encontrada: ${testImagePath} (${formatBytes(stat.size)})`);
  }

  // 2. Limpieza del directorio de prueba para aislamiento
  const outputBaseDir = path.join(projectRoot, "output", "e2e_fireworks_image_test");
  if (fs.existsSync(outputBaseDir)) {
    console.log(`\n[3/5] Limpiando carpeta de salida previa: ${outputBaseDir}`);
    fs.rmSync(outputBaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputBaseDir, { recursive: true });

  const promptText = "Chaleco sastre streetwear con escote en V y botones frontales";

  console.log("\n[4/5] Ejecutando generatePatternPipeline...");
  console.log(`  • Prompt:     "${promptText}"`);
  console.log(`  • Imagen:     ${testImagePath}`);
  console.log(`  • Provider:   api (Fireworks AI Qwen 3.7 Plus)`);
  console.log(`  • Bundle:     true (Etsy ZIP + SEO Metadata + Printing Guide)`);
  console.log(`  • Output Dir: ${outputBaseDir}\n`);

  const startTime = performance.now();

  let pipelineResult;
  try {
    pipelineResult = await generatePatternPipeline({
      prompt: promptText,
      imagePath: testImagePath,
      provider: "api",
      bundle: true,
      outputDir: outputBaseDir,
    });
  } catch (pipelineErr) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.error(`\n[FALLO CRÍTICO EN PIPELINE] tras ${elapsed} s:`);
    console.error(pipelineErr instanceof Error ? pipelineErr.stack || pipelineErr.message : String(pipelineErr));
    process.exit(1);
  }

  const endTime = performance.now();
  const totalDurationSec = ((endTime - startTime) / 1000).toFixed(2);

  console.log("-------------------------------------------------------------------------------");
  console.log(`[ÉXITO] Pipeline completado en ${totalDurationSec} segundos`);
  console.log("-------------------------------------------------------------------------------");
  console.log(`• Concept Name IA: "${pipelineResult.conceptName}"`);
  console.log(`• Concept Slug:    "${pipelineResult.conceptSlug}"`);
  console.log(`• Base Block:      "${pipelineResult.dna.base_block}"`);
  console.log(`• Directorio:      ${pipelineResult.outputDirectory}`);
  console.log(`• Tallas:          ${pipelineResult.sizes.join(", ")}`);
  console.log(`• Piezas/Talla:    ${pipelineResult.stats.totalParts}`);
  console.log(`• Consumo Medio:   ${pipelineResult.stats.averageFabricMeters.toFixed(2)} m de tela`);

  // 3. Auditoría y Verificación de los 11 Entregables Físicos
  console.log("\n[5/5] Auditoría Estricta de los 11 Entregables Físicos:");
  const conceptSlug = pipelineResult.conceptSlug;
  const targetDir = pipelineResult.outputDirectory;

  const expectedDeliverables = [
    {
      id: 1,
      name: `${conceptSlug}_continuous.svg`,
      description: "SVG Vectorial Continuo Multi-Talla",
      validate: (filePath, stat) => stat.size > 0,
    },
    {
      id: 2,
      name: `${conceptSlug}_tiled_a4.pdf`,
      description: "PDF Paginado Formato A4 (Cuadro 10x10 cm en Pág 1)",
      validate: (filePath, stat) => stat.size > 0,
    },
    {
      id: 3,
      name: `${conceptSlug}_tiled_letter.pdf`,
      description: "PDF Paginado Formato US Letter (Cuadro 10x10 cm en Pág 1)",
      validate: (filePath, stat) => stat.size > 0,
    },
    {
      id: 4,
      name: `${conceptSlug}_plotter_a0.pdf`,
      description: "PDF Continuo Gran Formato Plotter A0",
      validate: (filePath, stat) => stat.size > 0,
    },
    {
      id: 5,
      name: `${conceptSlug}_techpack.pdf`,
      description: "Ficha Técnica Industrial en PDF",
      validate: (filePath, stat) => stat.size > 0,
    },
    {
      id: 6,
      name: `${conceptSlug}_techpack.md`,
      description: "Ficha Técnica en Markdown",
      validate: (filePath, stat) => stat.size > 0,
    },
    {
      id: 7,
      name: `${conceptSlug}_techpack.json`,
      description: "Ficha Técnica Estructurada en JSON",
      validate: (filePath, stat) => {
        if (stat.size <= 0) return false;
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        return Boolean(parsed.conceptName && parsed.fabricConsumption);
      },
    },
    {
      id: 8,
      name: `${conceptSlug}_dna.json`,
      description: "ADN Paramétrico Validado Zod en JSON",
      validate: (filePath, stat) => {
        if (stat.size <= 0) return false;
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        return Boolean(parsed.concept_name && parsed.base_block && parsed.ease);
      },
    },
    {
      id: 9,
      name: `${conceptSlug}_etsy_bundle.zip`,
      description: "Paquete Comercial ZIP para Etsy con carpetas estándar",
      validate: (filePath, stat) => stat.size > 0,
    },
    {
      id: 10,
      name: `${conceptSlug}_etsy_listing_metadata.json`,
      description: "Metadatos Comerciales SEO para Etsy (13 tags)",
      validate: (filePath, stat) => {
        if (stat.size <= 0) return false;
        const meta = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const validTitle = typeof meta.title === "string" && meta.title.length > 0 && meta.title.length <= 140;
        const validTags = Array.isArray(meta.tags) && meta.tags.length === 13;
        const validSku = typeof meta.sku === "string" && meta.sku.length > 0;
        const validPrice = typeof meta.suggested_price_usd === "number" && meta.suggested_price_usd > 0;
        return validTitle && validTags && validSku && validPrice;
      },
    },
    {
      id: 11,
      name: "README_Etsy_Printing_Instructions.pdf",
      description: "Guía de Impresión y Calibración para Clientes Etsy",
      validate: (filePath, stat) => stat.size > 0,
    },
  ];

  let passedCount = 0;
  let failedCount = 0;

  console.log("\n#  | Archivo                                          | Tamaño     | Estado | Descripción");
  console.log("---|--------------------------------------------------|------------|--------|----------------------------------------------------");

  for (const item of expectedDeliverables) {
    const fullPath = path.join(targetDir, item.name);
    const exists = fs.existsSync(fullPath);

    if (!exists) {
      console.log(`${String(item.id).padStart(2)} | ${item.name.padEnd(48)} | ${"NO EXISTE".padEnd(10)} | FAIL   | ${item.description}`);
      failedCount++;
      continue;
    }

    const stat = fs.statSync(fullPath);
    let valid = false;
    try {
      valid = item.validate(fullPath, stat);
    } catch {
      valid = false;
    }

    if (valid) {
      console.log(`${String(item.id).padStart(2)} | ${item.name.padEnd(48)} | ${formatBytes(stat.size).padEnd(10)} | OK     | ${item.description}`);
      passedCount++;
    } else {
      console.log(`${String(item.id).padStart(2)} | ${item.name.padEnd(48)} | ${formatBytes(stat.size).padEnd(10)} | FAIL   | ${item.description} (Validación interna falló)`);
      failedCount++;
    }
  }

  // Validaciones adicionales de Metadatos Etsy
  const metadataPath = path.join(targetDir, `${conceptSlug}_etsy_listing_metadata.json`);
  let metadataObj = null;
  if (fs.existsSync(metadataPath)) {
    try {
      metadataObj = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    } catch {
      // Ignorar
    }
  }

  console.log("\n-------------------------------------------------------------------------------");
  console.log("RESUMEN DE METADATOS COMERCIALES ETSY GENERADOS:");
  console.log("-------------------------------------------------------------------------------");
  if (metadataObj) {
    console.log(`• Título SEO (${metadataObj.title.length}/140 chars): "${metadataObj.title}"`);
    console.log(`• Código SKU:       ${metadataObj.sku}`);
    console.log(`• Precio Sugerido:  $${metadataObj.suggested_price_usd.toFixed(2)} USD`);
    console.log(`• Categoría Etsy:   ${metadataObj.category}`);
    console.log(`• Total Tags (13):  ${metadataObj.tags.join(" | ")}`);
  } else {
    console.log("• Metadatos no disponibles para lectura.");
  }

  // Validación del ZIP
  const zipPath = path.join(targetDir, `${conceptSlug}_etsy_bundle.zip`);
  if (fs.existsSync(zipPath)) {
    const zipStat = fs.statSync(zipPath);
    console.log(`• Archivo ZIP:      ${path.basename(zipPath)} (${formatBytes(zipStat.size)})`);
  }

  console.log("-------------------------------------------------------------------------------");
  console.log(`RESULTADO DE LA AUDITORÍA: ${passedCount}/11 Entregables Verificados Exitosamente.`);
  console.log("-------------------------------------------------------------------------------");

  if (failedCount === 0 && passedCount === 11) {
    console.log("\n===============================================================================");
    console.log("VERIFICACIÓN E2E EN VIVO: [PASS] (11/11 ENTREGABLES GENERADOS Y VALIDADOS)");
    console.log("===============================================================================\n");
    process.exit(0);
  } else {
    console.error("\n===============================================================================");
    console.error(`VERIFICACIÓN E2E EN VIVO: [FAIL] (${failedCount} fallas detectadas)`);
    console.error("===============================================================================\n");
    process.exit(1);
  }
}

runE2EImageTest().catch((err) => {
  console.error("[ERROR NO CONTROLADO]:", err);
  process.exit(1);
});
