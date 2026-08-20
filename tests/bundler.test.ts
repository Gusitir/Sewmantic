/**
 * tests/bundler.test.ts
 * Suite de Pruebas Automatizadas para el Empaquetador Comercial de Etsy
 * pattern-ai-core
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createEtsyBundle,
  generateEtsyListingMetadata,
  generateEtsyTitle,
  generateEtsyTags,
  generateEtsyDescription,
  generateEtsySku,
  generateEtsyPrintingGuidePdf,
  formatConceptTitle,
  bundlePatternDirectory,
  generatePatternPipeline,
  PatternDna,
  initCli,
} from '../src/index.js';

const TEST_BUNDLER_DIR = path.resolve('tests/output_bundler_test');

/**
 * Función auxiliar para leer los nombres de entradas del directorio central de un archivo ZIP
 */
function extractZipEntries(zipBuffer: Buffer): string[] {
  const entries: string[] = [];
  let offset = 0;
  while (offset < zipBuffer.length - 4) {
    // Firma del encabezado de archivo en el directorio central: 0x02014b50 ("PK\x01\x02")
    if (zipBuffer.readUInt32LE(offset) === 0x02014b50) {
      const fileNameLen = zipBuffer.readUInt16LE(offset + 28);
      const extraLen = zipBuffer.readUInt16LE(offset + 30);
      const commentLen = zipBuffer.readUInt16LE(offset + 32);
      const fileName = zipBuffer.toString('utf8', offset + 46, offset + 46 + fileNameLen);
      entries.push(fileName);
      offset += 46 + fileNameLen + extraLen + commentLen;
    } else {
      offset++;
    }
  }
  return entries;
}

beforeAll(async () => {
  if (fs.existsSync(TEST_BUNDLER_DIR)) {
    await fs.promises.rm(TEST_BUNDLER_DIR, { recursive: true, force: true });
  }
  await fs.promises.mkdir(TEST_BUNDLER_DIR, { recursive: true });
});

afterAll(async () => {
  if (fs.existsSync(TEST_BUNDLER_DIR)) {
    await fs.promises.rm(TEST_BUNDLER_DIR, { recursive: true, force: true });
  }
});

describe('Etsy Bundler - Generador de Metadatos Comerciales y Reglas de Etsy', () => {
  const mockDna: PatternDna = {
    concept_name: 'straw_pirate_adventurer_vest',
    base_block: 'menswear_torso_oversize',
    description: 'Chaleco de corsario con solapa cruzada y bolsillos de parche',
    ease: {
      chest_ease_mm: 120,
      waist_ease_mm: 100,
      hip_ease_mm: 80,
    },
    modifications: {
      neckline: { type: 'v_neck', depth_mm: 110 },
      sleeves: { type: 'sleeveless' },
      pocket: { type: 'patch_pocket', width_mm: 140, height_mm: 160 },
    },
    sizing: {
      size: 'M',
      target_layers: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    },
    tech_specs: {
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
      fabric_type: 'Heavy Canvas / Raw Denim / Twill (340 GSM)',
      estimated_fabric_meters: 1.65,
    },
  };

  it('formatea correctamente títulos de conceptos', () => {
    expect(formatConceptTitle('straw_pirate_adventurer_vest')).toBe('Straw Pirate Adventurer Vest');
    expect(formatConceptTitle('cyberpunk_cargo_pants')).toBe('Cyberpunk Cargo Pants');
    expect(formatConceptTitle('oversized_hoodie')).toBe('Oversized Hoodie');
  });

  it('genera un título SEO que no excede 140 caracteres y contiene palabras clave', () => {
    const title = generateEtsyTitle('straw_pirate_adventurer_vest', mockDna);
    expect(title.length).toBeLessThanOrEqual(140);
    expect(title.length).toBeGreaterThan(20);
    expect(title).toContain('PDF Sewing Pattern');
    expect(title).toContain('XS-3XL');
    expect(title).toContain('Instant Download');
  });

  it('genera títulos seguros incluso con nombres de concepto extremadamente largos', () => {
    const longConcept = 'very_long_custom_anime_cosplay_cyberpunk_samurai_streetwear_extended_edition_tactical_parka_jacket';
    const title = generateEtsyTitle(longConcept, mockDna);
    expect(title.length).toBeLessThanOrEqual(140);
    expect(title.length).toBeGreaterThan(10);
    expect(title).toContain('PDF Sewing Pattern');
  });

  it('genera exactamente 13 tags de búsqueda para Etsy, cada uno con máx 20 caracteres', () => {
    const tags = generateEtsyTags('straw_pirate_adventurer_vest', mockDna);
    expect(tags.length).toBe(13);

    // Verificar que no haya duplicados
    const uniqueTags = new Set(tags);
    expect(uniqueTags.size).toBe(13);

    // Verificar límite de 20 caracteres por tag de Etsy
    for (const tag of tags) {
      expect(tag.length).toBeLessThanOrEqual(20);
      expect(tag.length).toBeGreaterThan(0);
      expect(tag).toBe(tag.toLowerCase());
    }
  });

  it('adapta los tags inteligentemente según el bloque base', () => {
    const trouserDna: PatternDna = {
      concept_name: 'techwear_cargo_pants',
      base_block: 'trousers_sloper',
      ease: { chest_ease_mm: 40, waist_ease_mm: 50, hip_ease_mm: 60 },
      modifications: {},
    };
    const trouserTags = generateEtsyTags('techwear_cargo_pants', trouserDna);
    expect(trouserTags.length).toBe(13);
    expect(trouserTags.some((t) => t.includes('pant') || t.includes('trouser'))).toBe(true);

    const hoodieDna: PatternDna = {
      concept_name: 'cyber_ninja_hoodie',
      base_block: 'menswear_torso_oversize',
      ease: { chest_ease_mm: 160 },
      modifications: { hood: { type: 'crossover_hood' } },
    };
    const hoodieTags = generateEtsyTags('cyber_ninja_hoodie', hoodieDna);
    expect(hoodieTags.length).toBe(13);
    expect(hoodieTags.some((t) => t.includes('hoodie'))).toBe(true);
  });

  it('genera SKU válido con prefijo estándar', () => {
    const sku1 = generateEtsySku('straw_pirate_adventurer_vest', 'menswear_torso_oversize');
    expect(sku1).toMatch(/^PAT-AI-[A-Z]{3}-[A-Z0-9-]+$/);

    const sku2 = generateEtsySku('tactical_cargo_pants', 'trousers_sloper');
    expect(sku2).toMatch(/^PAT-AI-PNT-[A-Z0-9-]+$/);
  });

  it('genera una descripción comercial estructurada en las 6 secciones requeridas', () => {
    const desc = generateEtsyDescription('straw_pirate_adventurer_vest', mockDna);

    expect(desc).toContain('OVERVIEW');
    expect(desc).toContain("WHAT'S INCLUDED");
    expect(desc).toContain('SIZING GUIDE XS-3XL');
    expect(desc).toContain('FABRIC REQUIREMENTS & YARDAGE');
    expect(desc).toContain('PRINTING INSTRUCTIONS');
    expect(desc).toContain('TERMS OF USE');

    // Comprobaciones de contenido específico
    expect(desc).toContain('XS:   84 cm');
    expect(desc).toContain('3XL: 132 cm');
    expect(desc).toContain('10 mm (3/8")');
    expect(desc).toContain('25 mm (1")');
    expect(desc).toContain('Actual Size');
    expect(desc).toContain('DIGITAL DOWNLOAD');
  });

  it('genera el objeto de metadatos completo y conforme al esquema Etsy', () => {
    const meta = generateEtsyListingMetadata('straw_pirate_adventurer_vest', mockDna);

    expect(meta.title.length).toBeLessThanOrEqual(140);
    expect(meta.tags.length).toBe(13);
    meta.tags.forEach((t) => expect(t.length).toBeLessThanOrEqual(20));
    expect(meta.suggested_price_usd).toBeGreaterThan(0);
    expect(typeof meta.suggested_price_usd).toBe('number');
    expect(meta.sku).toBeTruthy();
    expect(meta.category).toContain('Patterns');
    expect(meta.materials.length).toBeGreaterThan(0);
    expect(meta.attributes?.is_digital).toBe(true);
  });
});

describe('Etsy Customer Printing Guide PDF', () => {
  it('genera un buffer PDF válido para la guía de impresión y ensamble', async () => {
    const buffer = await generateEtsyPrintingGuidePdf(undefined, 'straw_pirate_vest');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(2000);

    const header = buffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });
});

describe('Etsy Bundle Creation & Internal ZIP Structure', () => {
  const conceptSlug = 'straw_pirate_adventurer_vest';
  const conceptDir = path.join(TEST_BUNDLER_DIR, conceptSlug);

  beforeAll(async () => {
    await fs.promises.mkdir(conceptDir, { recursive: true });

    // Crear archivos simulados para representar los entregables del pipeline
    await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_tiled_a4.pdf`), '%PDF-1.4 Mock A4');
    await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_tiled_letter.pdf`), '%PDF-1.4 Mock Letter');
    await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_plotter_a0.pdf`), '%PDF-1.4 Mock A0');
    await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_continuous.svg`), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_techpack.pdf`), '%PDF-1.4 Mock Techpack');
    await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_techpack.md`), '# Techpack Mock');
    await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_techpack.json`), '{"techpack": true}');
    await fs.promises.writeFile(
      path.join(conceptDir, `${conceptSlug}_dna.json`),
      JSON.stringify({
        concept_name: conceptSlug,
        base_block: 'menswear_torso_oversize',
        ease: { chest_ease_mm: 120 },
        modifications: {},
      })
    );
    await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}.glb`), 'glTF 2.0 Mock Binary');
  });

  it('crea exitosamente el archivo ZIP y el JSON de metadatos de Etsy', async () => {
    const result = await createEtsyBundle(conceptDir, conceptSlug);

    expect(result.conceptSlug).toBe(conceptSlug);
    expect(fs.existsSync(result.zipPath)).toBe(true);
    expect(fs.existsSync(result.metadataPath)).toBe(true);
    expect(fs.existsSync(result.printingGuidePath)).toBe(true);
    expect(result.zipSize).toBeGreaterThan(0);

    // Validar archivo de metadatos en disco
    const metaOnDisk = JSON.parse(await fs.promises.readFile(result.metadataPath, 'utf-8'));
    expect(metaOnDisk.title.length).toBeLessThanOrEqual(140);
    expect(metaOnDisk.tags.length).toBe(13);
    expect(metaOnDisk.sku).toBe(result.metadata.sku);
    expect(metaOnDisk.suggested_price_usd).toBe(result.metadata.suggested_price_usd);
    expect(metaOnDisk.description).toContain('07_3D_Interactive_Model');
  });

  it('organiza el contenido interno del ZIP con la estructura exacta requerida de 7 carpetas', async () => {
    const result = await createEtsyBundle(conceptDir, conceptSlug);
    const zipBuf = await fs.promises.readFile(result.zipPath);
    const entries = extractZipEntries(zipBuf);

    // Verificar las carpetas numeradas y el archivo README
    expect(entries).toContain(`01_Print_At_Home_A4/${conceptSlug}_tiled_a4.pdf`);
    expect(entries).toContain(`02_Print_At_Home_US_Letter/${conceptSlug}_tiled_letter.pdf`);
    expect(entries).toContain(`03_Copy_Shop_Plotter_A0/${conceptSlug}_plotter_a0.pdf`);
    expect(entries).toContain(`04_Vector_Layers_SVG/${conceptSlug}_continuous.svg`);
    expect(entries).toContain(`05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.pdf`);
    expect(entries).toContain(`05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.md`);
    expect(entries).toContain(`05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.json`);
    expect(entries).toContain(`06_Dna_Parameters/${conceptSlug}_dna.json`);
    expect(entries).toContain(`07_3D_Interactive_Model/${conceptSlug}.glb`);
    expect(entries).toContain('README_Etsy_Printing_Instructions.pdf');

    // Total de 10 archivos dentro del ZIP
    expect(entries.length).toBe(10);
  });

  it('bundlePatternDirectory empaqueta correctamente indicando la ruta del directorio', async () => {
    const bundleRes = await bundlePatternDirectory(conceptDir);
    expect(bundleRes.conceptSlug).toBe(conceptSlug);
    expect(fs.existsSync(bundleRes.zipPath)).toBe(true);
    expect(bundleRes.bundledFiles.length).toBe(10);
  });

  it('bundlePatternDirectory lanza un error si el directorio no existe', async () => {
    await expect(bundlePatternDirectory('non_existent_folder_xyz_123')).rejects.toThrow(
      /No se encontró el directorio/
    );
  });
});

describe('Pipeline Integration con flag --bundle', () => {
  const e2eConceptDir = path.join(TEST_BUNDLER_DIR, 'e2e_hoodie_bundle');

  it('ejecuta generatePatternPipeline con bundle: true y genera los 11 entregables incluyendo el ZIP', async () => {
    const result = await generatePatternPipeline({
      prompt: 'Oversized Hoodie Streetwear con bolsillo canguro',
      provider: 'mock',
      outputDir: e2eConceptDir,
      sizes: ['S', 'M', 'L'],
      wasteFactor: 0.15,
      bundle: true,
    });

    expect(result.success).toBe(true);
    expect(result.bundle).toBeDefined();
    expect(result.bundle?.zipPath).toBeTruthy();
    expect(fs.existsSync(result.bundle!.zipPath)).toBe(true);
    expect(fs.existsSync(result.bundle!.metadataPath)).toBe(true);

    // Verificar que files incluya etsyBundleZip y etsyListingMetadata
    expect(result.files.etsyBundleZip).toBe(result.bundle!.zipPath);
    expect(result.files.etsyListingMetadata).toBe(result.bundle!.metadataPath);
    expect(result.files.etsyPrintingGuide).toBe(result.bundle!.printingGuidePath);
    expect(result.files.glb).toBeDefined();
    expect(fs.existsSync(result.files.glb!)).toBe(true);
    expect(result.stats.generatedFilesCount).toBe(11);

    // Verificar contenido del ZIP generado por el pipeline
    const zipBuf = await fs.promises.readFile(result.bundle!.zipPath);
    const zipEntries = extractZipEntries(zipBuf);
    expect(zipEntries).toContain(`01_Print_At_Home_A4/${result.conceptSlug}_tiled_a4.pdf`);
    expect(zipEntries).toContain(`02_Print_At_Home_US_Letter/${result.conceptSlug}_tiled_letter.pdf`);
    expect(zipEntries).toContain(`03_Copy_Shop_Plotter_A0/${result.conceptSlug}_plotter_a0.pdf`);
    expect(zipEntries).toContain(`04_Vector_Layers_SVG/${result.conceptSlug}_continuous.svg`);
    expect(zipEntries).toContain(`05_Sewing_Guide_And_TechPack/${result.conceptSlug}_techpack.pdf`);
    expect(zipEntries).toContain(`05_Sewing_Guide_And_TechPack/${result.conceptSlug}_techpack.md`);
    expect(zipEntries).toContain(`05_Sewing_Guide_And_TechPack/${result.conceptSlug}_techpack.json`);
    expect(zipEntries).toContain(`06_Dna_Parameters/${result.conceptSlug}_dna.json`);
    expect(zipEntries).toContain(`07_3D_Interactive_Model/${result.conceptSlug}.glb`);
    expect(zipEntries).toContain('README_Etsy_Printing_Instructions.pdf');
  });

  it('inicializa correctamente los comandos del CLI con bundle y opciones', () => {
    const program = initCli();
    const commands = program.commands.map((c) => c.name());

    expect(commands).toContain('generate');
    expect(commands).toContain('calibrate');
    expect(commands).toContain('inspect');
    expect(commands).toContain('techpack');
    expect(commands).toContain('bundle');
    expect(commands).toContain('status');

    const generateCmd = program.commands.find((c) => c.name() === 'generate');
    const bundleOpt = generateCmd?.options.find((o) => o.name() === 'bundle');
    expect(bundleOpt).toBeDefined();

    const bundleCmd = program.commands.find((c) => c.name() === 'bundle');
    expect(bundleCmd).toBeDefined();
  });

  it('genera metadatos apropiados para vestidos y camisetas', () => {
    const dressDna: PatternDna = {
      concept_name: 'anime_gothic_lolita_dress',
      base_block: 'dress_sloper',
      ease: { chest_ease_mm: 50, waist_ease_mm: 40, hip_ease_mm: 100 },
      modifications: { neckline: { type: 'square_neck' } },
      tech_specs: { fabric_type: 'Cotton Sateen & Tulle' },
    };

    const dressMeta = generateEtsyListingMetadata('anime_gothic_lolita_dress', dressDna);
    expect(dressMeta.title.length).toBeLessThanOrEqual(140);
    expect(dressMeta.tags.length).toBe(13);
    expect(dressMeta.tags.some((t) => t.includes('dress'))).toBe(true);
    expect(dressMeta.sku).toContain('DRS');
    expect(dressMeta.suggested_price_usd).toBe(14.99);

    const teeDna: PatternDna = {
      concept_name: 'oversized_boxy_tee',
      base_block: 'tshirt_sloper',
      ease: { chest_ease_mm: 150 },
      modifications: { sleeves: { type: 'drop_shoulder' } },
    };

    const teeMeta = generateEtsyListingMetadata('oversized_boxy_tee', teeDna);
    expect(teeMeta.sku).toContain('TEE');
    expect(teeMeta.tags.some((t) => t.includes('tshirt') || t.includes('tee'))).toBe(true);
  });

  it('maneja empaquetado cuando solo existen algunos archivos parciales', async () => {
    const partialDir = path.join(TEST_BUNDLER_DIR, 'partial_concept');
    await fs.promises.mkdir(partialDir, { recursive: true });
    await fs.promises.writeFile(path.join(partialDir, 'partial_concept_tiled_a4.pdf'), '%PDF-1.4 Mock');
    await fs.promises.writeFile(path.join(partialDir, 'partial_concept_continuous.svg'), '<svg></svg>');

    const partialBundle = await createEtsyBundle(partialDir, 'partial_concept');
    expect(partialBundle.bundledFiles).toContain('01_Print_At_Home_A4/partial_concept_tiled_a4.pdf');
    expect(partialBundle.bundledFiles).toContain('04_Vector_Layers_SVG/partial_concept_continuous.svg');
    expect(partialBundle.bundledFiles).toContain('README_Etsy_Printing_Instructions.pdf');
    expect(fs.existsSync(partialBundle.zipPath)).toBe(true);
  });
});
