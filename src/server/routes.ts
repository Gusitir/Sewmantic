/**
 * src/server/routes.ts
 * Definición de Enrutamiento y Manejadores de Endpoints REST para pattern-ai-core
 * pattern-ai-core
 */

import fs from 'node:fs';
import path from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';
import {
  generatePatternPipeline,
  bundlePatternDirectory,
  slugify,
  PipelineRequest,
} from '../pipeline.js';
import { STANDARD_SIZES } from '../engine/base_blocks/measurements.js';
import { MOCK_PRESETS } from '../ai/mock_provider.js';
import { PatternDna, StandardSize } from '../types/pattern.js';

export interface RouteContext {
  outputDir: string;
  publicDir: string;
  version: string;
}

export interface PresetSummary {
  id: string;
  name: string;
  concept_name: string;
  description: string;
  base_block: string;
  garment_category?: string;
  default_size?: string;
  target_layers?: string[];
  fabric_type?: string;
  dna: PatternDna;
}

export interface PatternFileMeta {
  fileName: string;
  relativePath: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface PatternSummary {
  concept_name: string;
  concept_slug: string;
  base_block?: string;
  description?: string;
  directory: string;
  createdAt: string;
  modifiedAt: string;
  files: Record<string, PatternFileMeta>;
  hasSvg: boolean;
  hasTechpack: boolean;
  hasBundle: boolean;
  dna?: PatternDna;
}

/**
 * Agrega cabeceras CORS universales a la respuesta
 */
export function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, HEAD'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept'
  );
}

/**
 * Envía una respuesta JSON tipada
 */
export function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
  additionalHeaders: Record<string, string> = {}
): void {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(additionalHeaders)) {
    res.setHeader(k, v);
  }

  // Serializa Map/Set/BigInt de forma segura
  const jsonString = JSON.stringify(data, (_key, value) => {
    if (value instanceof Map) {
      return Object.fromEntries(value.entries());
    }
    if (value instanceof Set) {
      return Array.from(value);
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });

  res.end(jsonString);
}

/**
 * Envía una respuesta de error estandarizada en formato JSON
 */
export function sendError(
  res: ServerResponse,
  statusCode: number,
  message: string,
  details?: unknown
): void {
  sendJson(res, statusCode, {
    success: false,
    error: message,
    status: statusCode,
    ...(details !== undefined ? { details } : {}),
  });
}

/**
 * Parsea el cuerpo de una petición entrante como JSON
 */
export async function parseJsonBody<T = Record<string, any>>(
  req: IncomingMessage,
  maxSizeBytes = 50 * 1024 * 1024
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > maxSizeBytes) {
        reject(
          new Error(
            `Cuerpo de petición excede el tamaño máximo permitido (${maxSizeBytes} bytes)`
          )
        );
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (!raw) {
        resolve({} as T);
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        reject(
          new Error(
            `JSON inválido en el cuerpo de la petición: ${
              err instanceof Error ? err.message : String(err)
            }`
          )
        );
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Localiza la carpeta de un concepto de moldería dentro de outputDir
 */
export async function findConceptDirectory(
  baseOutputDir: string,
  concept: string
): Promise<string | null> {
  const resolvedBase = path.resolve(baseOutputDir);
  if (!fs.existsSync(resolvedBase)) {
    return null;
  }

  const cleanConcept = decodeURIComponent(concept).trim();
  const slug = slugify(cleanConcept);

  // 1. Coincidencia directa exacta
  const exactPath = path.join(resolvedBase, cleanConcept);
  if (fs.existsSync(exactPath) && (await fs.promises.stat(exactPath)).isDirectory()) {
    return exactPath;
  }

  // 2. Coincidencia directa por slug
  const slugPath = path.join(resolvedBase, slug);
  if (fs.existsSync(slugPath) && (await fs.promises.stat(slugPath)).isDirectory()) {
    return slugPath;
  }

  // 3. Búsqueda iterativa entre los subdirectorios
  try {
    const entries = await fs.promises.readdir(resolvedBase, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirName = entry.name;
        const dirSlug = slugify(dirName);
        if (
          dirName.toLowerCase() === cleanConcept.toLowerCase() ||
          dirSlug === slug ||
          dirSlug.includes(slug) ||
          slug.includes(dirSlug)
        ) {
          return path.join(resolvedBase, dirName);
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Mapea los archivos clave presentes en la carpeta de un concepto
 */
export async function scanConceptFiles(
  conceptDir: string
): Promise<{
  dnaFile?: string;
  techpackJsonFile?: string;
  techpackPdfFile?: string;
  techpackMdFile?: string;
  svgFile?: string;
  bundleZipFile?: string;
  tiledA4PdfFile?: string;
  tiledLetterPdfFile?: string;
  plotterA0PdfFile?: string;
  allFiles: Record<string, PatternFileMeta>;
}> {
  const allFiles: Record<string, PatternFileMeta> = {};
  let dnaFile: string | undefined;
  let techpackJsonFile: string | undefined;
  let techpackPdfFile: string | undefined;
  let techpackMdFile: string | undefined;
  let svgFile: string | undefined;
  let bundleZipFile: string | undefined;
  let tiledA4PdfFile: string | undefined;
  let tiledLetterPdfFile: string | undefined;
  let plotterA0PdfFile: string | undefined;

  try {
    const fileNames = await fs.promises.readdir(conceptDir);
    for (const file of fileNames) {
      const fullPath = path.join(conceptDir, file);
      const stat = await fs.promises.stat(fullPath);
      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        const meta: PatternFileMeta = {
          fileName: file,
          relativePath: path.relative(process.cwd(), fullPath),
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        };

        if (file.endsWith('_dna.json')) {
          dnaFile = fullPath;
          allFiles.dnaJson = meta;
        } else if (file.endsWith('_techpack.json')) {
          techpackJsonFile = fullPath;
          allFiles.techpackJson = meta;
        } else if (file.endsWith('_techpack.pdf')) {
          techpackPdfFile = fullPath;
          allFiles.techpackPdf = meta;
        } else if (file.endsWith('_techpack.md')) {
          techpackMdFile = fullPath;
          allFiles.techpackMd = meta;
        } else if (file.endsWith('_continuous.svg') || ext === '.svg') {
          svgFile = svgFile || fullPath;
          allFiles.continuousSvg = meta;
        } else if (ext === '.zip') {
          bundleZipFile = bundleZipFile || fullPath;
          allFiles.etsyBundleZip = meta;
        } else if (file.endsWith('_tiled_a4.pdf')) {
          tiledA4PdfFile = fullPath;
          allFiles.tiledA4Pdf = meta;
        } else if (file.endsWith('_tiled_letter.pdf')) {
          tiledLetterPdfFile = fullPath;
          allFiles.tiledLetterPdf = meta;
        } else if (file.endsWith('_plotter_a0.pdf')) {
          plotterA0PdfFile = fullPath;
          allFiles.plotterA0Pdf = meta;
        } else {
          allFiles[file] = meta;
        }
      }
    }
  } catch {
    // Retorna lo recopilado hasta ahora
  }

  return {
    dnaFile,
    techpackJsonFile,
    techpackPdfFile,
    techpackMdFile,
    svgFile,
    bundleZipFile,
    tiledA4PdfFile,
    tiledLetterPdfFile,
    plotterA0PdfFile,
    allFiles,
  };
}

/**
 * 1. GET /api/status
 * Devuelve información de versión, proveedor de IA activo, tallas soportadas y estado del motor
 */
export async function handleGetStatus(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const statusData = {
    status: 'ok',
    version: ctx.version,
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    activeProvider:
      process.env.AI_PROVIDER ||
      (process.env.FIREWORKS_API_KEY || process.env.AI_API_KEY ? 'api' : 'mock'),
    supportedProviders: ['api', 'mock'],
    standardSizes: STANDARD_SIZES,
    supportedBlocks: [
      'menswear_torso_oversize',
      'menswear_torso',
      'womenswear_torso_fitted',
      'womenswear_torso',
      'unisex_torso',
      'tshirt_sloper',
      'hoodie_sloper',
      'dress_sloper',
      'pants_sloper',
      'skirt_sloper',
    ],
    engine: 'FreeSewing v3 Parametric Slopers',
    outputDirectory: ctx.outputDir,
    timestamp: new Date().toISOString(),
  };

  sendJson(res, 200, statusData);
}

const PIRATE_SHORTS_PRESET: PatternDna = {
  concept_name: 'straw_pirate_denim_shorts',
  description: 'Anime pirate captain denim bermuda shorts with rolled cuffs and knee length',
  base_block: 'pants_sloper',
  garment_category: 'bottom',
  ease: {
    chest_ease_mm: 0,
    waist_ease_mm: 25,
    hip_ease_mm: 45,
    crotch_ease_mm: 20,
    knee_ease_mm: 60,
  },
  modifications: {
    trouser_legs: {
      type: 'straight',
      length_type: 'shorts',
    },
    trouser_hem: {
      type: 'cuffed',
      cuff_height_mm: 35,
    },
    waistband: {
      type: 'fitted',
      height_mm: 40,
    },
  },
  sizing: {
    size: 'M',
    waist_circ_mm: 820,
    hip_circ_mm: 980,
    target_layers: ['S', 'M', 'L', 'XL', '2XL'],
  },
  tech_specs: {
    notions: ['1x botón metálico jeans 17mm', '1x cremallera metálica 15cm', 'hilo torzal contrastante'],
    estimated_fabric_meters: 1.1,
    seam_allowance_mm: 10,
    hem_allowance_mm: 25,
    fabric_type: 'denim_12oz_blue',
    fabric_width_mm: 1500,
  },
  notions: ['1x botón metálico jeans 17mm', '1x cremallera metálica 15cm', 'hilo torzal contrastante'],
  estimated_fabric_meters: 1.1,
};

/**
 * 2. GET /api/presets
 * Devuelve la lista de presets disponibles con descripción y bloque base
 */
export async function handleGetPresets(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const allPresets: Record<string, PatternDna> = {
    ...MOCK_PRESETS,
    pirate_shorts: PIRATE_SHORTS_PRESET,
  };

  const presetList: PresetSummary[] = Object.entries(allPresets).map(
    ([key, dna]) => {
      let displayName = dna.concept_name
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      if (key === 'hoodie') displayName = 'Streetwear Oversize Hoodie';
      if (key === 'tshirt') displayName = 'Classic Crew Tee';
      if (key === 'dress') displayName = 'Priestess Fantasy Dress / Robe';
      if (key === 'vest') displayName = 'Cyberpunk Shinobi Tactical Vest';
      if (key === 'pirate_vest') displayName = 'Straw Pirate Adventurer Vest';
      if (key === 'pirate_shorts') displayName = 'Straw Pirate Denim Shorts';
      if (key === 'straw_pirate_full_set') displayName = 'Straw Pirate Full Cosplay Set (Vest + Bermuda)';

      return {
        id: key,
        name: displayName,
        concept_name: dna.concept_name,
        description: dna.description || '',
        base_block: dna.base_block,
        garment_category: dna.garment_category || (key === 'pirate_shorts' ? 'bottom' : 'top'),
        default_size: dna.sizing?.size || 'M',
        target_layers: dna.sizing?.target_layers || ['S', 'M', 'L', 'XL', '2XL'],
        fabric_type: dna.tech_specs?.fabric_type,
        dna,
      };
    }
  );

  sendJson(res, 200, {
    count: presetList.length,
    presets: presetList,
  });
}

/**
 * 3. GET /api/patterns
 * Lista todos los patrones generados en output/ con metadatos de archivos
 */
export async function handleGetPatterns(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const resolvedBase = path.resolve(ctx.outputDir);
  if (!fs.existsSync(resolvedBase)) {
    sendJson(res, 200, { count: 0, patterns: [] });
    return;
  }

  const patterns: PatternSummary[] = [];

  try {
    const entries = await fs.promises.readdir(resolvedBase, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const conceptDir = path.join(resolvedBase, entry.name);
        const stat = await fs.promises.stat(conceptDir);
        const scanned = await scanConceptFiles(conceptDir);

        let parsedDna: PatternDna | undefined;
        let conceptName = entry.name;
        let baseBlock: string | undefined;
        let description: string | undefined;

        if (scanned.dnaFile && fs.existsSync(scanned.dnaFile)) {
          try {
            const raw = await fs.promises.readFile(scanned.dnaFile, 'utf-8');
            parsedDna = JSON.parse(raw);
            if (parsedDna) {
              conceptName = parsedDna.concept_name || entry.name;
              baseBlock = parsedDna.base_block;
              description = parsedDna.description;
            }
          } catch {
            // Ignorar error al leer JSON individual
          }
        }

        patterns.push({
          concept_name: conceptName,
          concept_slug: slugify(entry.name),
          base_block: baseBlock,
          description,
          directory: conceptDir,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
          files: scanned.allFiles,
          hasSvg: Boolean(scanned.svgFile),
          hasTechpack: Boolean(scanned.techpackJsonFile),
          hasBundle: Boolean(scanned.bundleZipFile),
          dna: parsedDna,
        });
      }
    }

    // Ordenar de más reciente a más antiguo
    patterns.sort(
      (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );

    sendJson(res, 200, {
      count: patterns.length,
      outputDirectory: resolvedBase,
      patterns,
    });
  } catch (err) {
    sendError(
      res,
      500,
      'Error al leer el directorio de patrones',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * 4. GET /api/patterns/:concept/svg
 * Devuelve el archivo SVG vectorial continuo con Content-Type: image/svg+xml
 */
export async function handleGetPatternSvg(
  concept: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const conceptDir = await findConceptDirectory(ctx.outputDir, concept);
  if (!conceptDir) {
    sendError(res, 404, `No se encontró el patrón para el concepto '${concept}'`);
    return;
  }

  const scanned = await scanConceptFiles(conceptDir);
  if (!scanned.svgFile || !fs.existsSync(scanned.svgFile)) {
    sendError(
      res,
      404,
      `Archivo SVG continuo no encontrado para el concepto '${concept}'`
    );
    return;
  }

  try {
    const svgContent = await fs.promises.readFile(scanned.svgFile, 'utf-8');
    setCorsHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(svgContent);
  } catch (err) {
    sendError(
      res,
      500,
      `Error al leer el archivo SVG`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * 5. GET /api/patterns/:concept/techpack
 * Devuelve la ficha técnica estructurada en JSON
 */
export async function handleGetPatternTechpack(
  concept: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const conceptDir = await findConceptDirectory(ctx.outputDir, concept);
  if (!conceptDir) {
    sendError(res, 404, `No se encontró el patrón para el concepto '${concept}'`);
    return;
  }

  const scanned = await scanConceptFiles(conceptDir);
  if (!scanned.techpackJsonFile || !fs.existsSync(scanned.techpackJsonFile)) {
    sendError(
      res,
      404,
      `Ficha técnica JSON no encontrada para el concepto '${concept}'`
    );
    return;
  }

  try {
    const rawContent = await fs.promises.readFile(scanned.techpackJsonFile, 'utf-8');
    const parsed = JSON.parse(rawContent);
    sendJson(res, 200, parsed);
  } catch (err) {
    sendError(
      res,
      500,
      `Error al leer la ficha técnica`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * 6. GET /api/patterns/:concept/bundle
 * Descarga el archivo ZIP comercial empaquetado para Etsy
 */
export async function handleGetPatternBundle(
  concept: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const conceptDir = await findConceptDirectory(ctx.outputDir, concept);
  if (!conceptDir) {
    sendError(res, 404, `No se encontró el patrón para el concepto '${concept}'`);
    return;
  }

  const scanned = await scanConceptFiles(conceptDir);
  if (!scanned.bundleZipFile || !fs.existsSync(scanned.bundleZipFile)) {
    sendError(
      res,
      404,
      `Archivo ZIP de bundle no encontrado para el concepto '${concept}'. Ejecute POST /api/bundle primero.`
    );
    return;
  }

  try {
    const stat = await fs.promises.stat(scanned.bundleZipFile);
    const fileName = path.basename(scanned.bundleZipFile);

    setCorsHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(scanned.bundleZipFile);
    stream.pipe(res);
  } catch (err) {
    sendError(
      res,
      500,
      `Error al servir el bundle ZIP`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * 6b. GET /api/patterns/:concept/download/:fileType
 * Descarga directamente un archivo generado específico (a4, letter, a0, svg, techpack-pdf, techpack-json, bundle, etc.)
 */
export async function handleGetPatternFile(
  concept: string,
  fileType: string,
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const conceptDir = await findConceptDirectory(ctx.outputDir, concept);
  if (!conceptDir) {
    sendError(res, 404, `No se encontró el patrón para el concepto '${concept}'`);
    return;
  }

  const scanned = await scanConceptFiles(conceptDir);
  const normalizedType = (fileType || '').toLowerCase().replace(/[-_]/g, '');

  let targetFilePath: string | undefined;
  let contentType = 'application/octet-stream';

  if (
    normalizedType === 'a4' ||
    normalizedType === 'tileda4' ||
    normalizedType === 'tileda4pdf' ||
    normalizedType === 'pdfa4'
  ) {
    targetFilePath = scanned.tiledA4PdfFile;
    contentType = 'application/pdf';
  } else if (
    normalizedType === 'letter' ||
    normalizedType === 'tiledletter' ||
    normalizedType === 'tiledletterpdf' ||
    normalizedType === 'usletter' ||
    normalizedType === 'pdfletter'
  ) {
    targetFilePath = scanned.tiledLetterPdfFile;
    contentType = 'application/pdf';
  } else if (
    normalizedType === 'a0' ||
    normalizedType === 'plotter' ||
    normalizedType === 'plottera0' ||
    normalizedType === 'plotterpdf' ||
    normalizedType === 'pdfa0'
  ) {
    targetFilePath = scanned.plotterA0PdfFile;
    contentType = 'application/pdf';
  } else if (
    normalizedType === 'svg' ||
    normalizedType === 'continuoussvg' ||
    normalizedType === 'vector'
  ) {
    targetFilePath = scanned.svgFile;
    contentType = 'image/svg+xml; charset=utf-8';
  } else if (
    normalizedType === 'techpackpdf' ||
    normalizedType === 'techpack' ||
    normalizedType === 'pdftechpack'
  ) {
    targetFilePath = scanned.techpackPdfFile;
    contentType = 'application/pdf';
  } else if (
    normalizedType === 'techpackjson' ||
    normalizedType === 'jsontechpack'
  ) {
    targetFilePath = scanned.techpackJsonFile;
    contentType = 'application/json; charset=utf-8';
  } else if (
    normalizedType === 'techpackmd' ||
    normalizedType === 'md'
  ) {
    targetFilePath = scanned.techpackMdFile;
    contentType = 'text/markdown; charset=utf-8';
  } else if (
    normalizedType === 'bundle' ||
    normalizedType === 'zip' ||
    normalizedType === 'etsy'
  ) {
    targetFilePath = scanned.bundleZipFile;
    contentType = 'application/zip';
  } else if (
    normalizedType === 'dna' ||
    normalizedType === 'dnajson'
  ) {
    targetFilePath = scanned.dnaFile;
    contentType = 'application/json; charset=utf-8';
  }

  if (!targetFilePath || !fs.existsSync(targetFilePath)) {
    sendError(
      res,
      404,
      `Archivo de tipo '${fileType}' no encontrado para el concepto '${concept}'`
    );
    return;
  }

  try {
    const stat = await fs.promises.stat(targetFilePath);
    const fileName = path.basename(targetFilePath);

    setCorsHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(targetFilePath);
    stream.pipe(res);
  } catch (err) {
    sendError(
      res,
      500,
      `Error al servir el archivo '${fileType}'`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * 7. POST /api/generate
 * Recibe { prompt, provider, measurements, target_layers, sizes, bundle, imagePath, wasteFactor }
 * y orquesta generatePatternPipeline()
 */
export async function handlePostGenerate(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  let body: any;
  try {
    body = await parseJsonBody(req);
  } catch (err) {
    sendError(
      res,
      400,
      'Cuerpo de petición JSON inválido',
      err instanceof Error ? err.message : String(err)
    );
    return;
  }

  if (!body || typeof body !== 'object') {
    sendError(res, 400, 'El cuerpo de la petición debe ser un objeto JSON');
    return;
  }

  const {
    prompt,
    provider,
    measurements,
    customMeasurements,
    target_layers,
    sizes,
    bundle = true,
    imagePath,
    wasteFactor,
    fabricWidth_mm,
    directDna,
  } = body;

  const rawImagePath = imagePath || body.image || body.imageData;
  const defaultImagePrompt =
    'Generar patrón paramétrico preciso a partir del diseño y silueta de la imagen';

  const effectivePrompt =
    prompt && prompt.trim().length > 0
      ? prompt.trim()
      : rawImagePath
      ? defaultImagePrompt
      : '';

  if (!effectivePrompt && !directDna) {
    sendError(
      res,
      400,
      "Se requiere el campo 'prompt' en lenguaje natural, una imagen de referencia o 'directDna'"
    );
    return;
  }

  const requestedSizes: StandardSize[] | undefined =
    Array.isArray(sizes) && sizes.length > 0
      ? (sizes as StandardSize[])
      : Array.isArray(target_layers) && target_layers.length > 0
      ? (target_layers as StandardSize[])
      : undefined;

  const inputMeasurements = measurements || customMeasurements;

  let finalDirectDna = directDna;
  if (!finalDirectDna && (!provider || provider === 'mock')) {
    const q = effectivePrompt.toLowerCase();
    if (
      q.includes('short') ||
      q.includes('bermuda') ||
      q.includes('pantalon corto') ||
      q.includes('pantalón corto') ||
      q.includes('pirate shorts') ||
      q.includes('pirate_shorts') ||
      q.includes('denim shorts')
    ) {
      finalDirectDna = PIRATE_SHORTS_PRESET;
    }
  }

  const hasAttachedImage = Boolean(imagePath || body.image || body.imageData);
  const effectiveProvider =
    provider || process.env.AI_PROVIDER || (process.env.FIREWORKS_API_KEY ? 'api' : 'mock');
  const sizesDisplay =
    requestedSizes && requestedSizes.length > 0
      ? requestedSizes.join(', ')
      : 'Todas (XS-3XL)';

  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] [API INCOMING /generate] Prompt: ${effectivePrompt || (finalDirectDna ? '(directDna)' : '')} | Provider: ${effectiveProvider} | Imagen adjunta: ${hasAttachedImage ? 'SÍ' : 'NO'} | Tallas: ${sizesDisplay}`
  );

  try {
    const pipelineReq: PipelineRequest = {
      prompt: effectivePrompt,
      provider: effectiveProvider,
      outputDir: body.outputDir || ctx.outputDir,
      sizes: requestedSizes,
      customMeasurements: inputMeasurements,
      bundle: Boolean(bundle),
      imagePath: imagePath || body.image || body.imageData,
      wasteFactor: wasteFactor ? Number(wasteFactor) : undefined,
      fabricWidth_mm: fabricWidth_mm ? Number(fabricWidth_mm) : undefined,
      directDna: finalDirectDna,
    };

    console.log(`[AI CALL] Invocando proveedor ${pipelineReq.provider}...`);
    const result = await generatePatternPipeline(pipelineReq);
    console.log(
      `[PIPELINE SUCCESS] Concepto generado: ${result.conceptName} | Archivos generados: ${Object.keys(result.files).length}`
    );

    sendJson(res, 200, {
      success: true,
      conceptName: result.conceptName,
      conceptSlug: result.conceptSlug,
      outputDirectory: result.outputDirectory,
      dna: result.dna,
      sizes: result.sizes,
      files: result.files,
      stats: result.stats,
      bundle: result.bundle,
      techSheet: result.techSheet,
    });
  } catch (err) {
    console.error('[API /generate ERROR]', err);
    sendJson(res, 500, {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      details: err instanceof Error && err.stack ? err.stack : undefined,
    });
  }
}

/**
 * 8. POST /api/bundle
 * Recibe { concept_name } (o concept_slug o targetDir) y empaqueta el ZIP de Etsy
 */
export async function handlePostBundle(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  let body: any;
  try {
    body = await parseJsonBody(req);
  } catch (err) {
    sendError(
      res,
      400,
      'Cuerpo de petición JSON inválido',
      err instanceof Error ? err.message : String(err)
    );
    return;
  }

  const conceptTarget =
    body?.concept_name || body?.concept || body?.concept_slug || body?.targetDir;

  if (!conceptTarget || typeof conceptTarget !== 'string') {
    sendError(
      res,
      400,
      "Se requiere el campo 'concept_name' o 'targetDir' para empaquetar el bundle"
    );
    return;
  }

  try {
    const bundleRes = await bundlePatternDirectory(conceptTarget, {
      outputDir: body.outputDir || ctx.outputDir,
    });

    sendJson(res, 200, {
      success: true,
      bundle: bundleRes,
    });
  } catch (err) {
    sendError(
      res,
      500,
      `Error al empaquetar el bundle para '${conceptTarget}'`,
      err instanceof Error ? err.message : String(err)
    );
  }
}
