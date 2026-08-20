/**
 * src/engine/etsy_bundler.ts
 * Empaquetador Comercial Automatizado para Tiendas Etsy (ZIP Bundler & Digital Assets)
 * pattern-ai-core
 *
 * Automatiza la preparación comercial completa de patrones digitales:
 * 1. Empaqueta el ZIP organizado con carpetas numeradas estándar para clientes.
 * 2. Genera la Guía de Impresión y Calibración PDF (README_Etsy_Printing_Instructions.pdf).
 * 3. Genera los metadatos de publicación optimizados para SEO de Etsy (<concept>_etsy_listing_metadata.json):
 *    - Título SEO (<= 140 caracteres con palabras clave clave).
 *    - 13 Tags exactos (<= 20 caracteres cada uno, alta conversión).
 *    - Descripción comercial estructurada en 6 secciones obligatorias.
 *    - Precio sugerido en USD y código SKU industrial.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import PDFDocument from 'pdfkit';
import { PatternDna } from '../types/pattern.js';
import { parsePatternDna } from '../schema/pattern_schema.js';
import { drawCalibrationBoxPdf, CALIBRATION_BOX_PT } from './calibration_box.js';
import { pdfDocToBuffer } from './exporter.js';

/**
 * Convierte un texto en un slug alfanumérico seguro para nombres de archivos
 */
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'pattern'
  );
}

/**
 * Formatea un slug o nombre de concepto a título legible con mayúsculas iniciales
 */
export function formatConceptTitle(conceptName: string): string {
  return conceptName
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Estructura de Metadatos Comerciales para Publicación en Etsy
 */
export interface EtsyListingMetadata {
  /** Título optimizado para SEO en Etsy (máximo 140 caracteres) */
  title: string;
  /** Exactamente 13 tags de búsqueda (máximo 20 caracteres cada uno) */
  tags: string[];
  /** Descripción comercial completa en inglés estructurada en secciones */
  description: string;
  /** Precio sugerido de venta en USD (ej: 14.99 o 16.99) */
  suggested_price_usd: number;
  /** Código de referencia SKU único para control de inventario */
  sku: string;
  /** Categoría comercial sugerida en Etsy */
  category: string;
  /** Lista de materiales o insumos recomendados */
  materials: string[];
  /** Atributos técnicos adicionales */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Resultado retornado por el empaquetador comercial de Etsy
 */
export interface EtsyBundleResult {
  /** Slug del concepto empaquetado */
  conceptSlug: string;
  /** Ruta absoluta al archivo ZIP generado */
  zipPath: string;
  /** Ruta absoluta al archivo JSON de metadatos de Etsy */
  metadataPath: string;
  /** Ruta absoluta a la guía de impresión PDF generada */
  printingGuidePath: string;
  /** Metadatos estructurados de Etsy */
  metadata: EtsyListingMetadata;
  /** Tamaño del archivo ZIP en bytes */
  zipSize: number;
  /** Lista de rutas internas incluidas dentro del ZIP */
  bundledFiles: string[];
}

/**
 * Genera el código SKU industrial para el producto
 */
export function generateEtsySku(conceptName: string, baseBlock?: string): string {
  const prefix = 'PAT-AI';
  let categoryCode = 'STR';

  const block = (baseBlock || conceptName).toLowerCase();
  if (block.includes('trouser') || block.includes('pant')) {
    categoryCode = 'PNT';
  } else if (block.includes('hoodie') || block.includes('menswear_torso_oversize')) {
    categoryCode = 'HOD';
  } else if (block.includes('tshirt') || block.includes('tee') || block.includes('t_shirt')) {
    categoryCode = 'TEE';
  } else if (block.includes('dress')) {
    categoryCode = 'DRS';
  } else if (block.includes('vest')) {
    categoryCode = 'VST';
  } else if (block.includes('jacket')) {
    categoryCode = 'JKT';
  }

  const slug = slugify(conceptName);
  const words = slug.split('_').filter(Boolean);
  let idPart = '001';
  if (words.length >= 2) {
    idPart = words
      .map((w) => w[0].toUpperCase())
      .slice(0, 3)
      .join('') + '-001';
  } else if (words.length === 1 && words[0].length >= 3) {
    idPart = words[0].slice(0, 3).toUpperCase() + '-001';
  }

  return `${prefix}-${categoryCode}-${idPart}`;
}

/**
 * Genera el título optimizado para SEO de Etsy (máx 140 caracteres)
 */
export function generateEtsyTitle(conceptName: string, dna?: PatternDna): string {
  const formatted = formatConceptTitle(conceptName);
  const block = (dna?.base_block || '').toLowerCase();

  let descriptor = 'Streetwear';
  if (block.includes('trouser') || block.includes('pant')) {
    descriptor = 'Streetwear Cargo Pants';
  } else if (block.includes('dress')) {
    descriptor = 'Anime Cosplay Dress';
  } else if (block.includes('hoodie') || block.includes('menswear')) {
    descriptor = 'Oversized Streetwear Hoodie';
  } else if (block.includes('tshirt') || block.includes('tee')) {
    descriptor = 'Boxy Streetwear Tee';
  }

  // Candidato 1: Rico y completo
  const candidate1 = `${formatted} PDF Sewing Pattern | ${descriptor} | Mens & Womens Sizes XS-3XL | Instant Download A4 Letter A0 Plotter`;
  if (candidate1.length <= 140) {
    return candidate1;
  }

  // Candidato 2: Intermedio
  const candidate2 = `${formatted} PDF Sewing Pattern | ${descriptor} XS-3XL | Instant Download Tiled A4 Letter A0`;
  if (candidate2.length <= 140) {
    return candidate2;
  }

  // Candidato 3: Compacto
  const candidate3 = `${formatted} PDF Sewing Pattern | Streetwear XS-3XL | Instant Download A4 Letter A0`;
  if (candidate3.length <= 140) {
    return candidate3;
  }

  // Candidato 4: Truncado seguro
  const suffix = ' PDF Sewing Pattern | XS-3XL | Instant Download';
  const availableLen = 140 - suffix.length;
  return `${formatted.slice(0, availableLen).trim()}${suffix}`;
}

/**
 * Genera exactamente 13 tags de búsqueda para Etsy (cada tag <= 20 caracteres)
 */
export function generateEtsyTags(conceptName: string, dna?: PatternDna): string[] {
  const rawTags: string[] = [];

  const conceptLower = conceptName.toLowerCase();
  const blockLower = (dna?.base_block || '').toLowerCase();
  const hasHood = Boolean(dna?.modifications?.hood) || conceptLower.includes('hoodie') || blockLower.includes('hoodie');
  const isTrouser = conceptLower.includes('trouser') || conceptLower.includes('pant') || blockLower.includes('trouser') || blockLower.includes('pant');
  const isTshirt = conceptLower.includes('tshirt') || conceptLower.includes('tee') || blockLower.includes('tshirt');
  const isDress = conceptLower.includes('dress') || blockLower.includes('dress');
  const isVest = conceptLower.includes('vest') || blockLower.includes('vest');

  if (isTrouser) {
    rawTags.push('cargo pants pattern', 'pants pattern pdf', 'trouser pattern pdf');
  } else if (hasHood) {
    rawTags.push('hoodie pattern', 'oversize hoodie pdf', 'hoodie tech pack');
  } else if (isTshirt) {
    rawTags.push('tshirt pattern pdf', 'boxy tee pattern', 'oversized tshirt');
  } else if (isDress) {
    rawTags.push('dress pattern pdf', 'anime dress pattern', 'cosplay pattern pdf');
  } else if (isVest) {
    rawTags.push('vest pattern pdf', 'cosplay vest pattern', 'adventurer vest');
  }

  // Tags estándar de alto volumen en Etsy (todos <= 20 caracteres)
  const coreTags = [
    'pdf sewing pattern', // 18 chars
    'streetwear pattern',  // 18 chars
    'instant download',    // 16 chars
    'size xs to 3xl',      // 14 chars
    'digital pattern',     // 15 chars
    'sewing tech pack',    // 16 chars
    'a4 letter a0 pdf',    // 16 chars
    'mens sewing pattern', // 19 chars
    'womens sewing pdf',   // 17 chars
    'diy clothing',        // 12 chars
    'cosplay pattern',     // 15 chars
    'beginner sewing',     // 15 chars
    'printable pattern',   // 17 chars
    'clothing patterns',   // 17 chars
    'sewing template',     // 15 chars
    'unisex sewing',       // 13 chars
    'easy sewing pattern', // 19 chars
  ];

  for (const tag of coreTags) {
    rawTags.push(tag);
  }

  // Filtrar duplicados, asegurar longitud <= 20 chars y tomar exactamente 13 tags
  const cleanTags: string[] = [];
  for (const t of rawTags) {
    const norm = t.trim().toLowerCase().slice(0, 20);
    if (norm.length > 0 && !cleanTags.includes(norm)) {
      cleanTags.push(norm);
    }
    if (cleanTags.length === 13) break;
  }

  // Relleno de seguridad si aún faltan tags
  const fallbacks = [
    'diy fashion',
    'pattern cutting',
    'garment sewing',
    'pdf pattern download',
  ];
  for (const fb of fallbacks) {
    if (cleanTags.length >= 13) break;
    const norm = fb.toLowerCase().slice(0, 20);
    if (!cleanTags.includes(norm)) {
      cleanTags.push(norm);
    }
  }

  return cleanTags.slice(0, 13);
}

/**
 * Genera la descripción comercial en inglés estructurada en 6 secciones requeridas
 */
export function generateEtsyDescription(conceptName: string, dna?: PatternDna): string {
  const title = formatConceptTitle(conceptName);
  const fabric = dna?.tech_specs?.fabric_type || 'French Terry, Heavy Jersey, Denim, or Twill (240-420 GSM)';
  const seamAllowance = dna?.tech_specs?.seam_allowance_mm ?? 10;
  const hemAllowance = dna?.tech_specs?.hem_allowance_mm ?? 25;
  const estMeters = dna?.tech_specs?.estimated_fabric_meters || dna?.estimated_fabric_meters || 1.85;

  return `=====================================================
${title.toUpperCase()} — DIGITAL PDF SEWING PATTERN
=====================================================

### OVERVIEW
Level: Intermediate / Confident Beginner
Included Sizes: Multi-size graded layers from XS through 3XL
Seam Allowance: ${seamAllowance} mm (3/8") included on all construction seams | Hem Allowance: ${hemAllowance} mm (1") included on hems

Create your own high-end streetwear and cosplay garment with this precision parametric sewing pattern! Engineered with CAD mathematical curves, exact grainlines, assembly notches, and balanced ease for a comfortable, contemporary streetwear silhouette.

---

### WHAT'S INCLUDED
Your instant digital download includes an organized ZIP archive containing:
1. 01_Print_At_Home_A4: Multi-page tiled PDF formatted for standard A4 home printers (Includes 10x10 cm calibration square on Page 1).
2. 02_Print_At_Home_US_Letter: Multi-page tiled PDF formatted for US Letter paper (8.5" x 11").
3. 03_Copy_Shop_Plotter_A0: Single-sheet continuous A0 wide-format PDF for commercial copy shops & plotters (no taping required).
4. 04_Vector_Layers_SVG: Multi-size layered SVG vector file for Adobe Illustrator, CLO3D, Blender, or laser cutting.
5. 05_Sewing_Guide_And_TechPack: Complete industrial Tech Pack (PDF, Markdown & JSON) with step-by-step assembly order, Bill of Materials (BOM), and finished garment measurements.
6. 06_Dna_Parameters: Full parametric DNA specification in JSON format.
7. 07_3D_Interactive_Model: 3D interactive model (.GLB / glTF 2.0) with PBR textile textures for real-time 3D viewing, AR, gaming, and metaverse avatar fitting.
8. README_Etsy_Printing_Instructions.pdf: Visual step-by-step customer printing, tiling, and scale calibration guide.

---

### SIZING GUIDE XS-3XL
Standard Unisex Body Measurements (Chest Circumference):
• XS:   84 cm / 33.1 in
• S:    92 cm / 36.2 in
• M:   100 cm / 39.4 in
• L:   108 cm / 42.5 in
• XL:  116 cm / 45.7 in
• 2XL: 124 cm / 48.8 in
• 3XL: 132 cm / 52.0 in

*Detailed finished garment measurements (Point of Measure - POM) per size are included in the Sewing Guide & Tech Pack.

---

### FABRIC REQUIREMENTS & YARDAGE
• Recommended Fabrics: ${fabric}
• Estimated Fabric Yardage (150 cm / 59" bolt width): ~${Number(estMeters).toFixed(2)} meters (~${(Number(estMeters) * 1.09361).toFixed(2)} yards)
• Essential Notions & Supplies: High-strength polyester thread, ballpoint/stretch or universal needle (size 80/12 - 90/14), fusible interfacing (if required), matching ribbing or drawstrings.

---

### PRINTING INSTRUCTIONS
1. Scale Verification: Always open the PDF files in Adobe Acrobat Reader or your default PDF viewer and select "Actual Size" or "Scale: 100%". DO NOT select "Fit to Page" or "Shrink oversized pages".
2. Calibration Test: Always print Page 1 first. Measure the 10x10 cm (100 mm / 3.94") test square with a physical ruler before printing remaining pages.
3. Sheet Assembly: Trim margins along the right and bottom border lines. Match registration marks (e.g., A1, A2, B1, B2) and tape pages securely with clear tape.

---

### TERMS OF USE
• This is a DIGITAL DOWNLOAD product. No physical garment or printed paper pattern will be shipped.
• Personal & Small Business Commercial Use: You are welcome to sell finished handmade garments created with this pattern in limited batches.
• Resale, sharing, copying, redistribution, or uploading of the digital pattern files, tech packs, or derivative digital assets is strictly prohibited.
• Due to the instant access nature of digital downloads, all sales are final and non-refundable.

Thank you for choosing independent parametric pattern design! If you have any questions or feedback, please contact pattern-ai-core.`;
}

/**
 * Genera la estructura completa de metadatos de Etsy
 */
export function generateEtsyListingMetadata(conceptName: string, dna?: PatternDna): EtsyListingMetadata {
  const block = (dna?.base_block || '').toLowerCase();
  const isComplex = block.includes('trouser') || block.includes('hoodie') || block.includes('menswear') || block.includes('jacket');
  const suggestedPrice = isComplex ? 16.99 : 14.99;

  const sku = generateEtsySku(conceptName, dna?.base_block);
  const title = generateEtsyTitle(conceptName, dna);
  const tags = generateEtsyTags(conceptName, dna);
  const description = generateEtsyDescription(conceptName, dna);

  return {
    title,
    tags,
    description,
    suggested_price_usd: suggestedPrice,
    sku,
    category: 'Craft Supplies & Tools > Patterns & How To > Patterns & Blueprints',
    materials: [
      dna?.tech_specs?.fabric_type || 'Cotton / Fleece / Twill',
      'PDF Pattern',
      'Instant Download',
      'Tech Pack',
      'SVG Vector',
    ],
    attributes: {
      is_digital: true,
      file_type: 'ZIP',
      sizes_included: 'XS, S, M, L, XL, 2XL, 3XL',
      seam_allowance_included: true,
      has_calibration_square: true,
    },
  };
}

/**
 * Genera la Guía de Impresión y Calibración para clientes de Etsy en formato PDF
 */
export async function generateEtsyPrintingGuidePdf(dna?: PatternDna, conceptSlug = 'pattern'): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: true,
    info: {
      Title: 'Etsy Customer Printing & Assembly Guide',
      Author: 'pattern-ai-core',
      Subject: 'Step-by-step PDF Pattern Printing & Calibration Instructions',
    },
  });

  const bufferPromise = pdfDocToBuffer(doc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentW = pageWidth - margin * 2;

  // ==========================================
  // PÁGINA 1: Calibración y Reglas de Escala 100%
  // ==========================================
  // 1. Header banner
  doc.save();
  doc.rect(margin, margin, contentW, 46).fillAndStroke('#1e3a8a', '#1e3a8a');
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text('ETSY CUSTOMER PRINTING & ASSEMBLY GUIDE', margin + 12, margin + 10, {
      width: contentW - 24,
    });
  doc
    .fontSize(8.5)
    .font('Helvetica')
    .fillColor('#bfdbfe')
    .text(
      `PATTERN: ${formatConceptTitle(conceptSlug).toUpperCase()}  |  SIZES: XS - 3XL  |  SCALE 100% 1:1`,
      margin + 12,
      margin + 28
    );
  doc.restore();

  // 2. Banner de instrucción crítica
  const ruleY = margin + 56;
  doc.save();
  doc.rect(margin, ruleY, contentW, 44).fillAndStroke('#fef2f2', '#dc2626');
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#dc2626')
    .text('CRITICAL PRINTING RULE: DO NOT SCALE / ACTUAL SIZE (100%)', margin + 12, ruleY + 8, {
      width: contentW - 24,
    });
  doc
    .fontSize(7.5)
    .font('Helvetica')
    .fillColor('#374151')
    .text(
      'Always open your PDF files in Adobe Acrobat Reader and select "Actual Size" or "Scale 100%". NEVER select "Fit to Page" or "Shrink oversized pages".',
      margin + 12,
      ruleY + 23,
      { width: contentW - 24 }
    );
  doc.restore();

  // 3. Cuadro de Calibración 10x10 cm centrado
  const calibX = (pageWidth - CALIBRATION_BOX_PT) / 2;
  const calibY = ruleY + 54;
  drawCalibrationBoxPdf(doc, calibX, calibY, {
    showWarning: true,
    showSubdivisions: true,
    showCenterCross: true,
    showFourInchFrame: true,
  });

  // 4. Tarjeta de pasos de verificación rápida
  const stepsY = calibY + CALIBRATION_BOX_PT + 25;
  const stepsH = 175;
  doc.save();
  doc.rect(margin, stepsY, contentW, stepsH).fillAndStroke('#f8fafc', '#cbd5e1');
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text('HOW TO PRINT & ASSEMBLE YOUR PATTERN (STEP-BY-STEP):', margin + 14, stepsY + 12);

  const guideSteps = [
    '1. TEST PRINT: Print Page 1 only. Measure the black square above with a physical ruler (must be exactly 10.0 cm / 100 mm).',
    '2. IMPERIAL CHECK: The blue dashed frame must measure exactly 4.0 inches (101.6 mm). If correct, proceed to print all pages.',
    '3. PAPER FORMAT: Use A4 files for standard international A4 paper or US Letter files for North American printers.',
    '4. TRIMMING: Cut away the white margin on the RIGHT and BOTTOM borders of each printed sheet along the marked lines.',
    '5. TILING & TAPING: Align the circular registration marks and grid numbers (A1 to A2, B1 to B2), then tape pages firmly.',
    '6. CUTTING FABRIC: Cut your chosen size outline. All seam allowances (10 mm / 3/8") and hem allowances (25 mm) are included.',
    '7. A0 COPY SHOP OPTION: Take the 03_Copy_Shop_Plotter_A0 file to any print shop to print on a single continuous wide-format sheet.',
  ];

  doc.fontSize(7.5).font('Helvetica').fillColor('#334155');
  let currentY = stepsY + 28;
  for (const step of guideSteps) {
    doc.text(step, margin + 14, currentY, { width: contentW - 28 });
    currentY += 19;
  }
  doc.restore();

  // 5. Pie de página
  doc.save();
  const footerY = pageHeight - margin - 18;
  doc
    .fontSize(7)
    .font('Helvetica-Bold')
    .fillColor('#64748b')
    .text('pattern-ai-core — Professional Parametric Pattern Engine — Instant Digital Download Support', margin, footerY, {
      width: contentW,
      align: 'center',
    });
  doc.restore();

  doc.end();
  return bufferPromise;
}

/**
 * Empaqueta un directorio de entregables de moldería textil en un archivo ZIP estructurado para Etsy
 * y genera el archivo de metadatos de publicación comercial.
 *
 * @param outputDir Directorio donde residen los entregables (o directorio raíz de salida)
 * @param conceptName Nombre o slug del concepto (ej: 'straw_pirate_adventurer_vest')
 * @param dna Objeto opcional de ADN Paramétrico
 * @returns Promesa con el resultado del empaquetado EtsyBundleResult
 */
export async function createEtsyBundle(
  outputDir: string,
  conceptName: string,
  dna?: PatternDna
): Promise<EtsyBundleResult> {
  const conceptSlug = slugify(conceptName);

  // Determinar la ubicación real de los archivos
  let targetDir = path.resolve(outputDir);
  const nestedDir = path.join(targetDir, conceptSlug);

  // Si existe el subdirectorio anidado con archivos, usar el subdirectorio
  if (fs.existsSync(nestedDir) && fs.statSync(nestedDir).isDirectory()) {
    const testA4 = path.join(nestedDir, `${conceptSlug}_tiled_a4.pdf`);
    const testDna = path.join(nestedDir, `${conceptSlug}_dna.json`);
    if (fs.existsSync(testA4) || fs.existsSync(testDna)) {
      targetDir = nestedDir;
    }
  }

  if (!fs.existsSync(targetDir)) {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }

  // Intentar cargar ADN si no fue provisto
  let loadedDna = dna;
  if (!loadedDna) {
    const directDnaPath = path.join(targetDir, `${conceptSlug}_dna.json`);
    if (fs.existsSync(directDnaPath)) {
      try {
        const raw = JSON.parse(await fs.promises.readFile(directDnaPath, 'utf-8'));
        loadedDna = parsePatternDna(raw);
      } catch {
        // Ignorar si falla lectura
      }
    } else {
      // Buscar cualquier archivo *_dna.json en el directorio
      try {
        const entries = await fs.promises.readdir(targetDir);
        const dnaFile = entries.find((e) => e.endsWith('_dna.json'));
        if (dnaFile) {
          const raw = JSON.parse(await fs.promises.readFile(path.join(targetDir, dnaFile), 'utf-8'));
          loadedDna = parsePatternDna(raw);
        }
      } catch {
        // Ignorar
      }
    }
  }

  // 1. Generar la Guía de Impresión PDF para clientes
  const printingGuideBuffer = await generateEtsyPrintingGuidePdf(loadedDna, conceptSlug);
  const printingGuidePath = path.join(targetDir, 'README_Etsy_Printing_Instructions.pdf');
  await fs.promises.writeFile(printingGuidePath, printingGuideBuffer);

  // 2. Generar y escribir los metadatos comerciales de Etsy
  const metadata = generateEtsyListingMetadata(loadedDna?.concept_name || conceptName, loadedDna);
  const metadataPath = path.join(targetDir, `${conceptSlug}_etsy_listing_metadata.json`);
  await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  // 3. Resolver rutas de archivos de entregables en disco
  const findFile = (patterns: string[]): string | undefined => {
    for (const p of patterns) {
      const fullPath = path.join(targetDir, p);
      if (fs.existsSync(fullPath)) return fullPath;
    }
    // Búsqueda por terminación de nombre si no coincide exacto
    try {
      const files = fs.readdirSync(targetDir);
      for (const p of patterns) {
        const matched = files.find((f) => f.toLowerCase() === p.toLowerCase() || f.endsWith(p));
        if (matched) return path.join(targetDir, matched);
      }
    } catch {
      // Ignorar
    }
    return undefined;
  };

  const a4Path = findFile([`${conceptSlug}_tiled_a4.pdf`, 'tiled_a4.pdf']);
  const letterPath = findFile([`${conceptSlug}_tiled_letter.pdf`, 'tiled_letter.pdf']);
  const a0Path = findFile([`${conceptSlug}_plotter_a0.pdf`, 'plotter_a0.pdf']);
  const svgPath = findFile([`${conceptSlug}_continuous.svg`, 'continuous.svg']);
  const techpackPdfPath = findFile([`${conceptSlug}_techpack.pdf`, 'techpack.pdf']);
  const techpackMdPath = findFile([`${conceptSlug}_techpack.md`, 'techpack.md']);
  const techpackJsonPath = findFile([`${conceptSlug}_techpack.json`, 'techpack.json']);
  const dnaJsonPath = findFile([`${conceptSlug}_dna.json`, 'dna.json']);
  const glbPath = findFile([`${conceptSlug}.glb`, 'model.glb', `${conceptSlug}_model.glb`]);

  // 4. Crear el archivo ZIP empaquetado con archiver
  const zipFileName = `${conceptSlug}_etsy_bundle.zip`;
  const zipPath = path.join(targetDir, zipFileName);

  const bundledFiles: string[] = [];
  const output = fs.createWriteStream(zipPath);
  const archive = new ZipArchive({
    zlib: { level: 9 },
  });

  const zipPromise = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    output.on('finish', () => resolve());
    archive.on('error', (err: Error) => reject(err));
  });

  archive.pipe(output);

  // 01_Print_At_Home_A4
  if (a4Path && fs.existsSync(a4Path)) {
    const internal = `01_Print_At_Home_A4/${conceptSlug}_tiled_a4.pdf`;
    archive.file(a4Path, { name: internal });
    bundledFiles.push(internal);
  }

  // 02_Print_At_Home_US_Letter
  if (letterPath && fs.existsSync(letterPath)) {
    const internal = `02_Print_At_Home_US_Letter/${conceptSlug}_tiled_letter.pdf`;
    archive.file(letterPath, { name: internal });
    bundledFiles.push(internal);
  }

  // 03_Copy_Shop_Plotter_A0
  if (a0Path && fs.existsSync(a0Path)) {
    const internal = `03_Copy_Shop_Plotter_A0/${conceptSlug}_plotter_a0.pdf`;
    archive.file(a0Path, { name: internal });
    bundledFiles.push(internal);
  }

  // 04_Vector_Layers_SVG
  if (svgPath && fs.existsSync(svgPath)) {
    const internal = `04_Vector_Layers_SVG/${conceptSlug}_continuous.svg`;
    archive.file(svgPath, { name: internal });
    bundledFiles.push(internal);
  }

  // 05_Sewing_Guide_And_TechPack
  if (techpackPdfPath && fs.existsSync(techpackPdfPath)) {
    const internal = `05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.pdf`;
    archive.file(techpackPdfPath, { name: internal });
    bundledFiles.push(internal);
  }
  if (techpackMdPath && fs.existsSync(techpackMdPath)) {
    const internal = `05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.md`;
    archive.file(techpackMdPath, { name: internal });
    bundledFiles.push(internal);
  }
  if (techpackJsonPath && fs.existsSync(techpackJsonPath)) {
    const internal = `05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.json`;
    archive.file(techpackJsonPath, { name: internal });
    bundledFiles.push(internal);
  }

  // 06_Dna_Parameters
  if (dnaJsonPath && fs.existsSync(dnaJsonPath)) {
    const internal = `06_Dna_Parameters/${conceptSlug}_dna.json`;
    archive.file(dnaJsonPath, { name: internal });
    bundledFiles.push(internal);
  }

  // 07_3D_Interactive_Model
  if (glbPath && fs.existsSync(glbPath)) {
    const internal = `07_3D_Interactive_Model/${conceptSlug}.glb`;
    archive.file(glbPath, { name: internal });
    bundledFiles.push(internal);
  }

  // README_Etsy_Printing_Instructions.pdf en la raíz del ZIP
  archive.append(printingGuideBuffer, { name: 'README_Etsy_Printing_Instructions.pdf' });
  bundledFiles.push('README_Etsy_Printing_Instructions.pdf');

  await archive.finalize();
  await zipPromise;

  const stat = fs.statSync(zipPath);

  return {
    conceptSlug,
    zipPath,
    metadataPath,
    printingGuidePath,
    metadata,
    zipSize: stat.size,
    bundledFiles,
  };
}
