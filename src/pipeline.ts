/**
 * src/pipeline.ts
 * Pipeline de Generación End-to-End de Patrones Paramétricos
 * pattern-ai-core
 *
 * Orquesta el flujo completo de producción:
 * 1. Obtención de ADN Paramétrico vía IA (AiProviderFactory).
 * 2. Validación estricta Zod (parsePatternDna).
 * 3. Modificación geométrica multi-talla (modifyPatternMultiSize).
 * 4. Generación de Ficha Técnica industrial (TechSheetData).
 * 5. Exportación del set completo de entregables en output/<concept_slug>/:
 *    - <concept>_tiled_a4.pdf (Multi-página A4 con Cuadro 10x10 cm en Pág 1).
 *    - <concept>_tiled_letter.pdf (Multi-página Letter con Cuadro 10x10 cm en Pág 1).
 *    - <concept>_plotter_a0.pdf (PDF continuo A0).
 *    - <concept>_continuous.svg (SVG vectorial continuo).
 *    - <concept>_techpack.pdf (Ficha técnica en PDF estilizado).
 *    - <concept>_techpack.md (Ficha técnica en Markdown).
 *    - <concept>_dna.json (ADN paramétrico en JSON).
 *    - <concept>_techpack.json (Ficha técnica estructurada en JSON).
 */

import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { StandardSize, PatternDna } from './types/pattern.js';
import { parsePatternDna } from './schema/pattern_schema.js';
import { AiProviderFactory } from './ai/factory.js';
import { AiProviderConfig } from './ai/base_provider.js';
import { modifyPatternMultiSize, ModifiedPatternResult } from './engine/modifier.js';
import {
  STANDARD_SIZES,
  BodyMeasurements,
  calculateCustomMeasurements,
} from './engine/base_blocks/measurements.js';
import {
  exportTiledPdf,
  exportContinuousPdf,
  exportContinuousSvg,
  pdfDocToBuffer,
} from './engine/exporter.js';
import {
  CALIBRATION_BOX_PT,
  drawCalibrationBoxPdf,
} from './engine/calibration_box.js';
import { PAGE_FORMATS, PaperFormat } from './utils/tiler.js';
import {
  generateTechSheet,
  generateTechSheetPdf,
  generateTechSheetMarkdown,
  generateTechSheetJson,
  TechSheetData,
} from './engine/tech_sheet.js';
import {
  createEtsyBundle,
  EtsyBundleResult,
  EtsyListingMetadata,
  generateEtsyListingMetadata,
  generateEtsyTitle,
  generateEtsyTags,
  generateEtsyDescription,
  generateEtsySku,
  generateEtsyPrintingGuidePdf,
} from './engine/etsy_bundler.js';

export {
  createEtsyBundle,
  EtsyBundleResult,
  EtsyListingMetadata,
  generateEtsyListingMetadata,
  generateEtsyTitle,
  generateEtsyTags,
  generateEtsyDescription,
  generateEtsySku,
  generateEtsyPrintingGuidePdf,
};

/**
 * Convierte un texto en un slug alfanumérico seguro para nombres de archivos y directorios
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Elimina acentos y diacríticos
      .replace(/[^a-z0-9]+/g, '_') // Reemplaza caracteres no alfanuméricos por guiones bajos
      .replace(/^_+|_+$/g, '') || // Elimina guiones iniciales o finales
      'pattern'
  );
}

/**
 * Parsea el argumento de medidas personalizadas, que puede ser un string JSON directo o la ruta a un archivo .json
 * @param arg Cadena con JSON directo (ej: '{"chest_circumference_mm":1040}') o ruta a archivo '.json'
 * @returns Objeto de medidas corporales parciales tipadas
 */
export function parseMeasurementsArg(
  arg?: string
): Partial<BodyMeasurements> | undefined {
  if (!arg || typeof arg !== 'string' || arg.trim().length === 0) {
    return undefined;
  }
  const trimmed = arg.trim();
  let jsonString = trimmed;

  // Si no empieza con '{' o '[', asumimos que es una ruta a un archivo .json
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    const resolvedPath = path.resolve(trimmed);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `No se encontró el archivo de medidas personalizadas en: '${trimmed}'`
      );
    }
    jsonString = fs.readFileSync(resolvedPath, 'utf-8');
  }

  try {
    let toParse = jsonString;
    if (toParse.includes("'") && !toParse.includes('"')) {
      toParse = toParse.replace(/'/g, '"');
    }
    const parsed = JSON.parse(toParse);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(
        'El contenido de medidas debe ser un objeto JSON válido con claves numéricas'
      );
    }
    return parsed as Partial<BodyMeasurements>;
  } catch (err) {
    throw new Error(
      `Error al procesar medidas personalizadas: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Solicitud de entrada para el pipeline de generación
 */
export interface PipelineRequest {
  /** Prompt en lenguaje natural describiendo la prenda o diseño */
  prompt: string;
  /** Ruta opcional a una imagen de referencia o boceto */
  imagePath?: string;
  /** Proveedor de IA ('mock', 'agy', 'opencode', 'api' / 'direct_api'). Por defecto AI_PROVIDER o 'agy' */
  provider?: string;
  /** Configuración técnica opcional del proveedor de IA */
  providerConfig?: AiProviderConfig;
  /** Directorio base de salida (por defecto 'output') */
  outputDir?: string;
  /** Lista de tallas a procesar (por defecto las indicadas en ADN o XS-3XL) */
  sizes?: StandardSize[];
  /** Factor de merma textil para la ficha técnica (mínimo 0.10, default 0.15) */
  wasteFactor?: number;
  /** Ancho de tela estándar en milímetros (default 1500 mm) */
  fabricWidth_mm?: number;
  /** Inyección directa de ADN paramétrico (útil para pruebas o pre-generados) */
  directDna?: PatternDna;
  /** Medidas antropométricas personalizadas del cliente */
  customMeasurements?: Partial<BodyMeasurements>;
  /** Empaqueta automáticamente el ZIP comercial para Etsy con metadatos */
  bundle?: boolean;
}

/**
 * Rutas absolutas a los archivos entregables generados
 */
export interface PipelineFiles {
  tiledA4Pdf: string;
  tiledLetterPdf: string;
  plotterA0Pdf: string;
  continuousSvg: string;
  techpackPdf: string;
  techpackMd: string;
  dnaJson: string;
  techpackJson: string;
  etsyBundleZip?: string;
  etsyListingMetadata?: string;
  etsyPrintingGuide?: string;
}

/**
 * Resultado completo y detallado del Pipeline de Generación
 */
export interface PipelineResult {
  success: boolean;
  conceptName: string;
  conceptSlug: string;
  outputDirectory: string;
  dna: PatternDna;
  sizes: StandardSize[];
  sizeMap: Map<StandardSize, ModifiedPatternResult>;
  files: PipelineFiles;
  techSheet: TechSheetData;
  bundle?: EtsyBundleResult;
  stats: {
    totalParts: number;
    averageFabricMeters: number;
    generatedFilesCount: number;
  };
}

/**
 * Ejecuta el Pipeline End-to-End de generación de moldería textil paramétrica
 *
 * @param request Parámetros de la solicitud
 * @returns PipelineResult con entregables exportados y estadísticas
 */
export async function generatePatternPipeline(
  request: PipelineRequest
): Promise<PipelineResult> {
  const {
    prompt,
    imagePath,
    provider: providerName,
    providerConfig,
    outputDir = 'output',
    wasteFactor,
    fabricWidth_mm,
    directDna,
    customMeasurements: inputCustomMeasurements,
  } = request;

  // ==========================================
  // 1. OBTENCIÓN DE ADN PARAMÉTRICO
  // ==========================================
  let rawDna: unknown;

  if (directDna) {
    rawDna = directDna;
  } else {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Pipeline request requires a non-empty prompt');
    }
    const aiProvider = AiProviderFactory.create(providerName, providerConfig);
    rawDna = await aiProvider.generatePatternDna(prompt, imagePath);
  }

  // ==========================================
  // 2. VALIDACIÓN CON ESQUEMA ZOD
  // ==========================================
  const dna: PatternDna = parsePatternDna(rawDna);

  // ==========================================
  // 3. MOTOR GEOMÉTRICO MULTI-TALLA
  // ==========================================
  const requestedSizes =
    request.sizes && request.sizes.length > 0
      ? request.sizes
      : dna.sizing?.target_layers && dna.sizing.target_layers.length > 0
      ? dna.sizing.target_layers
      : STANDARD_SIZES;

  // Asegurar que la talla primaria esté presente
  const primarySize: StandardSize =
    dna.sizing?.size && STANDARD_SIZES.includes(dna.sizing.size)
      ? dna.sizing.size
      : requestedSizes.includes('M')
      ? 'M'
      : requestedSizes[0] || 'M';

  // Procesar e inyectar medidas antropométricas personalizadas si están presentes
  const rawCustomMeasurements: Partial<BodyMeasurements> = {
    ...(dna.custom_measurements || {}),
    ...(dna.sizing?.custom_measurements || {}),
    ...(inputCustomMeasurements || {}),
  };

  if (Object.keys(rawCustomMeasurements).length > 0) {
    const calculated = calculateCustomMeasurements(
      rawCustomMeasurements,
      primarySize
    );
    dna.custom_measurements = rawCustomMeasurements;
    dna.sizing = {
      ...dna.sizing,
      size: primarySize,
      custom_measurements: rawCustomMeasurements,
      chest_circ_mm: calculated.chest_circumference_mm,
      waist_circ_mm: calculated.waist_circumference_mm,
      hip_circ_mm: calculated.hip_circumference_mm,
    };
  }

  const finalSizes: StandardSize[] = Array.from(
    new Set([...requestedSizes, primarySize])
  );

  const sizeMap = modifyPatternMultiSize(dna, finalSizes);
  const basePatternResult =
    sizeMap.get(primarySize) || Array.from(sizeMap.values())[0];

  if (!basePatternResult) {
    throw new Error(
      `No se pudo generar geometría para la talla primaria '${primarySize}'.`
    );
  }

  // ==========================================
  // 4. GENERACIÓN DE FICHA TÉCNICA
  // ==========================================
  const techSheetData = generateTechSheet(dna, sizeMap, {
    wasteFactor,
    fabricWidth_mm,
    targetSizes: finalSizes,
  });

  // ==========================================
  // 5. PREPARACIÓN DE DIRECTORIO DE SALIDA
  // ==========================================
  const conceptSlug = slugify(dna.concept_name);
  const conceptOutputDir = path.resolve(outputDir, conceptSlug);

  await fs.promises.mkdir(conceptOutputDir, { recursive: true });

  // ==========================================
  // 6. EXPORTACIÓN DEL SET DE ENTREGABLES
  // ==========================================
  // 1. Tiled A4 PDF (Multi-página con Cuadro 10x10 cm en Pág 1)
  const a4PdfBuffer = await exportTiledPdf(basePatternResult, { format: 'A4' });
  const a4PdfPath = path.join(conceptOutputDir, `${conceptSlug}_tiled_a4.pdf`);
  await fs.promises.writeFile(a4PdfPath, a4PdfBuffer);

  // 2. Tiled Letter PDF (Multi-página con Cuadro 10x10 cm en Pág 1)
  const letterPdfBuffer = await exportTiledPdf(basePatternResult, {
    format: 'letter',
  });
  const letterPdfPath = path.join(
    conceptOutputDir,
    `${conceptSlug}_tiled_letter.pdf`
  );
  await fs.promises.writeFile(letterPdfPath, letterPdfBuffer);

  // 3. Plotter A0 PDF (PDF continuo)
  const a0PdfBuffer = await exportContinuousPdf(basePatternResult, {
    paperFormat: 'A0',
  });
  const a0PdfPath = path.join(conceptOutputDir, `${conceptSlug}_plotter_a0.pdf`);
  await fs.promises.writeFile(a0PdfPath, a0PdfBuffer);

  // 4. SVG Vectorial Continuo
  const continuousSvgContent = exportContinuousSvg(basePatternResult, {
    sizeLayers: sizeMap,
  });
  const continuousSvgPath = path.join(
    conceptOutputDir,
    `${conceptSlug}_continuous.svg`
  );
  await fs.promises.writeFile(continuousSvgPath, continuousSvgContent, 'utf-8');

  // 5. Ficha Técnica PDF Estilizado
  const techpackPdfBuffer = await generateTechSheetPdf(techSheetData);
  const techpackPdfPath = path.join(
    conceptOutputDir,
    `${conceptSlug}_techpack.pdf`
  );
  await fs.promises.writeFile(techpackPdfPath, techpackPdfBuffer);

  // 6. Ficha Técnica Markdown
  const techpackMdContent = generateTechSheetMarkdown(techSheetData);
  const techpackMdPath = path.join(
    conceptOutputDir,
    `${conceptSlug}_techpack.md`
  );
  await fs.promises.writeFile(techpackMdPath, techpackMdContent, 'utf-8');

  // 7. ADN Paramétrico en JSON
  const dnaJsonContent = JSON.stringify(dna, null, 2);
  const dnaJsonPath = path.join(conceptOutputDir, `${conceptSlug}_dna.json`);
  await fs.promises.writeFile(dnaJsonPath, dnaJsonContent, 'utf-8');

  // 8. Ficha Técnica Estructurada en JSON
  const techpackJsonContent = generateTechSheetJson(techSheetData);
  const techpackJsonPath = path.join(
    conceptOutputDir,
    `${conceptSlug}_techpack.json`
  );
  await fs.promises.writeFile(techpackJsonPath, techpackJsonContent, 'utf-8');

  // ==========================================
  // 9. EMPAQUETADO COMERCIAL ETSY (OPCIONAL)
  // ==========================================
  let bundleResult: EtsyBundleResult | undefined;
  if (request.bundle) {
    bundleResult = await createEtsyBundle(conceptOutputDir, conceptSlug, dna);
  }

  // ==========================================
  // 10. RETORNO DE RESULTADOS
  // ==========================================
  const files: PipelineFiles = {
    tiledA4Pdf: a4PdfPath,
    tiledLetterPdf: letterPdfPath,
    plotterA0Pdf: a0PdfPath,
    continuousSvg: continuousSvgPath,
    techpackPdf: techpackPdfPath,
    techpackMd: techpackMdPath,
    dnaJson: dnaJsonPath,
    techpackJson: techpackJsonPath,
    ...(bundleResult
      ? {
          etsyBundleZip: bundleResult.zipPath,
          etsyListingMetadata: bundleResult.metadataPath,
          etsyPrintingGuide: bundleResult.printingGuidePath,
        }
      : {}),
  };

  const totalParts = Object.keys(basePatternResult.parts).length;
  const averageFabricMeters =
    techSheetData.fabricConsumption.averageLinearMeters;

  return {
    success: true,
    conceptName: dna.concept_name,
    conceptSlug,
    outputDirectory: conceptOutputDir,
    dna,
    sizes: finalSizes,
    sizeMap,
    files,
    techSheet: techSheetData,
    bundle: bundleResult,
    stats: {
      totalParts,
      averageFabricMeters,
      generatedFilesCount: bundleResult ? 11 : 8,
    },
  };
}

/**
 * Genera una hoja de prueba y calibración vectorial de 1 página con recuadro de 100x100 mm
 *
 * @param format Formato de papel ('A4' o 'letter')
 * @returns Buffer del documento PDF generado
 */
export async function generateCalibrationSheetPdf(
  format: 'A4' | 'letter' | 'Letter' | 'a4' = 'A4'
): Promise<Buffer> {
  const normFormat = format.toLowerCase() === 'letter' ? 'letter' : 'A4';
  const paper = PAGE_FORMATS[normFormat];

  const doc = new PDFDocument({
    size: [paper.width_pt, paper.height_pt],
    margin: 0,
    autoFirstPage: true,
    info: {
      Title: 'Hoja de Calibración Textil 10x10 cm',
      Author: 'pattern-ai-core',
      Subject: 'Patronaje y Moldería - Invariante Vectorial 100%',
    },
  });

  const bufferPromise = pdfDocToBuffer(doc);
  const margin_pt = 36; // 0.5 pulgada
  const contentW = paper.width_pt - 2 * margin_pt;

  // 1. Encabezado
  doc.save();
  doc
    .rect(margin_pt, margin_pt, contentW, 44)
    .fillAndStroke('#1e3a8a', '#1e3a8a');

  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text(
      'HOJA DE CALIBRACIÓN TEXTIL — VERIFICACIÓN ESCALA 100%',
      margin_pt + 12,
      margin_pt + 10,
      { width: contentW - 24 }
    );

  doc
    .fontSize(8.5)
    .font('Helvetica')
    .fillColor('#bfdbfe')
    .text(
      `FORMATO: ${paper.name.toUpperCase()}  |  INVARIANTE VECTORIAL 1:1  |  pattern-ai-core`,
      margin_pt + 12,
      margin_pt + 27
    );
  doc.restore();

  // 2. Cuadro de Calibración 10x10 cm (283.465 pt) centrado horizontalmente
  const calibX = (paper.width_pt - CALIBRATION_BOX_PT) / 2;
  const calibY = margin_pt + 60;

  drawCalibrationBoxPdf(doc, calibX, calibY, {
    showWarning: true,
    showSubdivisions: true,
    showCenterCross: true,
    showFourInchFrame: true,
  });

  // 3. Tarjeta de Instrucciones de Verificación Física
  const notesY = calibY + CALIBRATION_BOX_PT + 35;
  const notesH = 150;

  doc.save();
  doc
    .rect(margin_pt, notesY, contentW, notesH)
    .fillAndStroke('#f8fafc', '#cbd5e1');

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text('INSTRUCCIONES DE VERIFICACIÓN FÍSICA Y CONTROL DE ESCALA:', margin_pt + 14, notesY + 12);

  doc.fontSize(8).font('Helvetica').fillColor('#334155');
  let lineY = notesY + 28;

  const instructions = [
    '1. Imprima esta hoja al 100% de escala (Opción "Tamaño real", "Escala 100%" o "Do not scale").',
    '2. NUNCA seleccione "Ajustar a página" (Fit to page) ni "Reducir páginas excesivas" en el diálogo de impresión.',
    '3. Mida el marco exterior negro con una regla física: debe medir EXACTAMENTE 100 mm (10.0 cm).',
    '4. El marco punteado interior azul debe medir EXACTAMENTE 4.0 pulgadas (101.6 mm / 288 pt).',
    '5. Compruebe que las marcas milimétricas de 1 a 9 cm coincidan exactamente con la graduación de su regla.',
    '6. Si el recuadro mide menos o más de 100 mm, ajuste la configuración de su software de impresión antes de cortar tela.',
  ];

  instructions.forEach((inst) => {
    doc.text(inst, margin_pt + 14, lineY, { width: contentW - 28 });
    lineY += 16;
  });
  doc.restore();

  // 4. Advertencia inferior
  doc.save();
  const footerY = paper.height_pt - margin_pt - 16;
  doc
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .fillColor('#dc2626')
    .text(
      'ESCALA 1:1 OBLIGATORIA — LA EXACTITUD DIMENSIONAL ES CRÍTICA PARA EL CALCE DE LA PRENDA',
      margin_pt,
      footerY,
      { width: contentW, align: 'center' }
    );
  doc.restore();

  doc.end();
  return bufferPromise;
}

/**
 * Genera y guarda en disco la hoja de calibración PDF
 *
 * @param outputPath Ruta de archivo de salida (por defecto 'output/calibration_10x10.pdf')
 * @param format Formato de papel ('A4' o 'letter')
 */
export async function exportCalibrationPdf(
  outputPath = 'output/calibration_10x10.pdf',
  format: 'A4' | 'letter' | 'Letter' | 'a4' = 'A4'
): Promise<{ buffer: Buffer; filePath: string }> {
  const buffer = await generateCalibrationSheetPdf(format);
  const resolvedPath = path.resolve(outputPath);
  const parentDir = path.dirname(resolvedPath);

  await fs.promises.mkdir(parentDir, { recursive: true });
  await fs.promises.writeFile(resolvedPath, buffer);

  return { buffer, filePath: resolvedPath };
}

/**
 * Lee un archivo de ADN Paramétrico, lo valida y retorna el objeto tipado
 *
 * @param filePath Ruta al archivo JSON
 */
export async function inspectPatternDnaFile(filePath: string): Promise<PatternDna> {
  const resolvedPath = path.resolve(filePath);
  const content = await fs.promises.readFile(resolvedPath, 'utf-8');
  const parsed = JSON.parse(content);
  return parsePatternDna(parsed);
}

/**
 * Compila y exporta la Ficha Técnica a partir de un archivo JSON de ADN Paramétrico
 *
 * @param dnaFilePath Ruta al archivo ADN JSON
 * @param options Opciones de salida y tallaje
 */
export async function compileTechpackFromFile(
  dnaFilePath: string,
  options: {
    outputDir?: string;
    wasteFactor?: number;
    fabricWidth_mm?: number;
    sizes?: StandardSize[];
    customMeasurements?: Partial<BodyMeasurements>;
  } = {}
): Promise<{
  pdfPath: string;
  mdPath: string;
  jsonPath: string;
  techSheet: TechSheetData;
}> {
  const dna = await inspectPatternDnaFile(dnaFilePath);
  const outDir = options.outputDir || path.dirname(path.resolve(dnaFilePath));
  const conceptSlug = slugify(dna.concept_name);

  const targetSizes =
    options.sizes && options.sizes.length > 0
      ? options.sizes
      : dna.sizing?.target_layers && dna.sizing.target_layers.length > 0
      ? dna.sizing.target_layers
      : STANDARD_SIZES;

  const primarySize: StandardSize =
    dna.sizing?.size && STANDARD_SIZES.includes(dna.sizing.size)
      ? dna.sizing.size
      : targetSizes.includes('M')
      ? 'M'
      : targetSizes[0] || 'M';

  if (options.customMeasurements && Object.keys(options.customMeasurements).length > 0) {
    const calculated = calculateCustomMeasurements(options.customMeasurements, primarySize);
    dna.custom_measurements = {
      ...(dna.custom_measurements || {}),
      ...options.customMeasurements,
    };
    dna.sizing = {
      ...dna.sizing,
      size: primarySize,
      custom_measurements: dna.custom_measurements,
      chest_circ_mm: calculated.chest_circumference_mm,
      waist_circ_mm: calculated.waist_circumference_mm,
      hip_circ_mm: calculated.hip_circumference_mm,
    };
  }

  const sizeMap = modifyPatternMultiSize(dna, targetSizes);
  const techSheet = generateTechSheet(dna, sizeMap, {
    wasteFactor: options.wasteFactor,
    fabricWidth_mm: options.fabricWidth_mm,
    targetSizes,
  });

  await fs.promises.mkdir(outDir, { recursive: true });

  const pdfPath = path.join(outDir, `${conceptSlug}_techpack.pdf`);
  const mdPath = path.join(outDir, `${conceptSlug}_techpack.md`);
  const jsonPath = path.join(outDir, `${conceptSlug}_techpack.json`);

  const [pdfBuf, mdStr, jsonStr] = await Promise.all([
    generateTechSheetPdf(techSheet),
    Promise.resolve(generateTechSheetMarkdown(techSheet)),
    Promise.resolve(generateTechSheetJson(techSheet)),
  ]);

  await Promise.all([
    fs.promises.writeFile(pdfPath, pdfBuf),
    fs.promises.writeFile(mdPath, mdStr, 'utf-8'),
    fs.promises.writeFile(jsonPath, jsonStr, 'utf-8'),
  ]);

  return { pdfPath, mdPath, jsonPath, techSheet };
}

/**
 * Empaqueta un directorio de entregables o un concepto existente en un archivo ZIP para Etsy y metadatos
 *
 * @param targetDirOrConcept Ruta a directorio existente o nombre de concepto
 * @param options Opciones de directorio de salida
 */
export async function bundlePatternDirectory(
  targetDirOrConcept: string,
  options: { outputDir?: string } = {}
): Promise<EtsyBundleResult> {
  const resolved = path.resolve(targetDirOrConcept);
  let targetDir = resolved;

  if (!fs.existsSync(resolved)) {
    const baseOut = options.outputDir || 'output';
    const altPath = path.resolve(baseOut, targetDirOrConcept);
    if (fs.existsSync(altPath)) {
      targetDir = altPath;
    } else {
      throw new Error(
        `No se encontró el directorio o concepto '${targetDirOrConcept}' en '${resolved}' ni en '${altPath}'.`
      );
    }
  }

  const conceptSlug = slugify(path.basename(targetDir));
  return createEtsyBundle(targetDir, conceptSlug);
}
