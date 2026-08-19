/**
 * tests/two_piece_set.test.ts
 * Suite de pruebas exhaustivas para el Generador de Conjuntos de 2 Piezas (Top + Bottom / Set Pirata)
 * pattern-ai-core - Motor Geométrico FreeSewing v3
 */

import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  STANDARD_SIZES,
  getStandardMeasurements,
  modifyPattern,
  modifyPatternMultiSize,
  generateTechSheet,
  generateTechSheetMarkdown,
  generateTechSheetPdf,
  generateTechSheetJson,
  generatePatternPipeline,
  MOCK_PRESETS,
  MockAiProvider,
  parsePatternDna,
} from '../src/index.js';
import { PatternDna, StandardSize } from '../src/types/pattern.js';
import { isSetGarment } from '../src/engine/modifier.js';

describe('Two-Piece Coordinated Set Generator (Top + Bottom / Set Pirata)', () => {
  const testOutputDir = path.resolve('output/test_two_piece_set');

  afterAll(async () => {
    if (fs.existsSync(testOutputDir)) {
      await fs.promises.rm(testOutputDir, { recursive: true, force: true });
    }
  });

  const pirateSetDna: PatternDna = MOCK_PRESETS.straw_pirate_full_set;

  // =========================================================================
  // 1. Validación de Esquema y Detección de Conjunto
  // =========================================================================
  describe('Schema Validation & Set Detection', () => {
    it('should validate straw_pirate_full_set preset with Zod schema', () => {
      const validated = parsePatternDna(pirateSetDna);
      expect(validated.garment_category).toBe('set');
      expect(validated.base_block).toBe('two_piece_set');
      expect(validated.fabric_details?.main_fabric).toBeDefined();
      expect(validated.fabric_details?.secondary_fabric).toBeDefined();
      expect(validated.sub_garments?.top).toBeDefined();
      expect(validated.sub_garments?.bottom).toBeDefined();
    });

    it('should detect set garment correctly with isSetGarment helper', () => {
      expect(isSetGarment(pirateSetDna)).toBe(true);

      const hoodieDna = MOCK_PRESETS.hoodie;
      expect(isSetGarment(hoodieDna)).toBe(false);

      const customSetDna: PatternDna = {
        concept_name: 'custom_linen_denim_set',
        base_block: 'two_piece_set',
        ease: { chest_ease_mm: 50, waist_ease_mm: 30 },
        modifications: {},
      };
      expect(isSetGarment(customSetDna)).toBe(true);
    });

    it('should support sub_garments with top and bottom specifications', () => {
      const topSpec = pirateSetDna.sub_garments?.top;
      const bottomSpec = pirateSetDna.sub_garments?.bottom;

      expect(topSpec?.concept_name).toBe('straw_pirate_adventurer_vest');
      expect(topSpec?.garment_category).toBe('top');
      expect(topSpec?.base_block).toBe('menswear_torso_fitted');

      expect(bottomSpec?.concept_name).toBe('straw_pirate_denim_shorts');
      expect(bottomSpec?.garment_category).toBe('bottom');
      expect(bottomSpec?.base_block).toBe('pants_sloper');
    });

    it('should support fabric_details with main and secondary fabric specs', () => {
      const mainFabric = pirateSetDna.fabric_details?.main_fabric;
      const secFabric = pirateSetDna.fabric_details?.secondary_fabric;

      expect(mainFabric?.name).toContain('Lino Rústico Rojo');
      expect(mainFabric?.width_mm).toBe(1500);
      expect(mainFabric?.weight_gsm).toBe(260);

      expect(secFabric?.name).toContain('Denim Azul Índigo');
      expect(secFabric?.width_mm).toBe(1500);
      expect(secFabric?.weight_gsm).toBe(380);
    });
  });

  // =========================================================================
  // 2. Modificación Geométrica Multi-Talla (XS a 3XL)
  // =========================================================================
  describe('Geometric Modification Across All Standard Sizes (XS to 3XL)', () => {
    it.each(STANDARD_SIZES)('should generate complete set pieces for size %s', (size) => {
      const result = modifyPattern(pirateSetDna, size);

      expect(result.size).toBe(size);
      expect(result.parts).toBeDefined();

      // Debe incluir piezas superiores (front_torso, back_torso)
      expect(result.parts.front_torso).toBeDefined();
      expect(result.parts.back_torso).toBeDefined();

      // Debe incluir piezas inferiores (front_leg, back_leg, waistband, pocket)
      expect(result.parts.front_leg).toBeDefined();
      expect(result.parts.back_leg).toBeDefined();
      expect(result.parts.waistband).toBeDefined();
      expect(result.parts.pocket).toBeDefined();

      // Verificar que el conjunto total de piezas sea >= 6
      expect(Object.keys(result.parts).length).toBeGreaterThanOrEqual(6);
    });

    it.each(STANDARD_SIZES)('should guarantee closed polygons and positive area for all parts in size %s', (size) => {
      const result = modifyPattern(pirateSetDna, size);

      for (const [partKey, part] of Object.entries(result.parts)) {
        // Outline cerrado con al menos 4 puntos
        expect(part.outline.length).toBeGreaterThanOrEqual(4);

        // Path SVG cerrado con M y Z
        expect(part.pathD).toMatch(/^M\s/);
        expect(part.pathD).toMatch(/Z$/);

        // Dimensiones físicas positivas
        expect(part.width_mm).toBeGreaterThan(0);
        expect(part.height_mm).toBeGreaterThan(0);
        expect(part.area_mm2).toBeGreaterThan(1000); // Mínimo 10 cm2

        // Bounds coherentes
        expect(part.bounds.width).toBeGreaterThan(0);
        expect(part.bounds.height).toBeGreaterThan(0);
        expect(Number.isFinite(part.bounds.minX)).toBe(true);
        expect(Number.isFinite(part.bounds.minY)).toBe(true);

        // Grainline obligatorio en el 100% de las piezas
        expect(part.grainline).toBeDefined();
        expect(part.grainline?.label).toBeDefined();
        expect(Number.isFinite(part.grainline?.start.x)).toBe(true);
        expect(Number.isFinite(part.grainline?.start.y)).toBe(true);
        expect(Number.isFinite(part.grainline?.end.x)).toBe(true);
        expect(Number.isFinite(part.grainline?.end.y)).toBe(true);

        // Piquetes presentes
        expect(part.notches).toBeDefined();
        expect(Array.isArray(part.notches)).toBe(true);
      }
    });

    it('should scale dimensions monotonically from XS to 3XL for all pieces', () => {
      const multiSizeResults = modifyPatternMultiSize(pirateSetDna, STANDARD_SIZES);

      for (let i = 0; i < STANDARD_SIZES.length - 1; i++) {
        const currentSize = STANDARD_SIZES[i];
        const nextSize = STANDARD_SIZES[i + 1];

        const resCurrent = multiSizeResults.get(currentSize)!;
        const resNext = multiSizeResults.get(nextSize)!;

        // Torso delantero: ancho y área crecen
        expect(resNext.parts.front_torso.width_mm).toBeGreaterThan(resCurrent.parts.front_torso.width_mm);
        expect(resNext.parts.front_torso.area_mm2).toBeGreaterThan(resCurrent.parts.front_torso.area_mm2);

        // Pierna delantera: ancho y área crecen
        expect(resNext.parts.front_leg.width_mm).toBeGreaterThan(resCurrent.parts.front_leg.width_mm);
        expect(resNext.parts.front_leg.area_mm2).toBeGreaterThan(resCurrent.parts.front_leg.area_mm2);

        // Pretina: ancho crece
        expect(resNext.parts.waistband.width_mm).toBeGreaterThan(resCurrent.parts.waistband.width_mm);
      }
    });
  });

  // =========================================================================
  // 3. Continuidad y Armonización Geométrica
  // =========================================================================
  describe('Geometric Continuity & Seam Harmonization', () => {
    it('should maintain armhole and crotch tolerances on set pieces', () => {
      const result = modifyPattern(pirateSetDna, 'M');

      const frontTorso = result.parts.front_torso;
      const backTorso = result.parts.back_torso;

      // Continuidad de hombros del chaleco
      const frontShoulderW = Math.abs(frontTorso.points.shoulder_tip.x - frontTorso.points.neck_shoulder.x);
      const backShoulderW = Math.abs(backTorso.points.shoulder_tip.x - backTorso.points.neck_shoulder.x);
      expect(Math.abs(frontShoulderW - backShoulderW)).toBeLessThanOrEqual(5.0);

      // Continuidad de entrepierna de la bermuda
      const frontLeg = result.parts.front_leg;
      const backLeg = result.parts.back_leg;

      const frontInseam = Math.abs(frontLeg.points.hem_in.y - frontLeg.points.crotch_tip.y);
      const backInseam = Math.abs(backLeg.points.hem_in.y - backLeg.points.crotch_tip.y);
      expect(Math.abs(frontInseam - backInseam)).toBeLessThanOrEqual(25.0); // Tolerancia admisible en moldería denim
    });


    it('should assign correct seam allowances and hem allowances to top and bottom parts', () => {
      const result = modifyPattern(pirateSetDna, 'L');

      expect(result.parts.front_torso.seamAllowance_mm).toBe(10);
      expect(result.parts.front_leg.seamAllowance_mm).toBe(12);
      expect(result.parts.waistband.seamAllowance_mm).toBe(12);
    });

  });

  // =========================================================================
  // 4. Ficha Técnica Unificada con Desglose Multi-Tela y BOM Consolidado
  // =========================================================================
  describe('Unified Tech Pack, Fabric Breakdown & Consolidated BOM', () => {
    it('should generate tech sheet with 2 fabric consumptions (Lino Rojo + Denim Azul)', () => {
      const sizeMap = modifyPatternMultiSize(pirateSetDna, STANDARD_SIZES);
      const techSheet = generateTechSheet(pirateSetDna, sizeMap, {
        wasteFactor: 0.15,
        fabricWidth_mm: 1500,
      });

      expect(techSheet.fabricConsumption).toBeDefined();
      expect(techSheet.fabricConsumption.breakdown_by_fabric).toBeDefined();

      const breakdown = techSheet.fabricConsumption.breakdown_by_fabric!;
      expect(breakdown.main_fabric).toBeDefined();
      expect(breakdown.secondary_fabric).toBeDefined();

      // Tela 1: Lino Rojo (Chaleco)
      expect(breakdown.main_fabric.fabricName).toContain('Lino Rústico Rojo');
      expect(breakdown.main_fabric.averageLinearMeters).toBeGreaterThan(0.4);
      expect(breakdown.main_fabric.averageLinearMeters).toBeLessThan(1.5);
      expect(breakdown.main_fabric.pieces.length).toBeGreaterThanOrEqual(2);

      // Tela 2: Denim Azul (Bermuda)
      expect(breakdown.secondary_fabric.fabricName).toContain('Denim Azul Índigo');
      expect(breakdown.secondary_fabric.averageLinearMeters).toBeGreaterThan(0.6);
      expect(breakdown.secondary_fabric.averageLinearMeters).toBeLessThan(2.0);
      expect(breakdown.secondary_fabric.pieces.length).toBeGreaterThanOrEqual(4);

      // Consumo total combinado
      expect(techSheet.fabricConsumption.averageLinearMeters).toBeGreaterThan(1.0);
      expect(techSheet.fabricConsumption.totalLinearMetersAllSizes).toBeGreaterThan(7.0);
    });

    it('should consolidate BOM notions for both top and bottom garments', () => {
      const sizeMap = modifyPatternMultiSize(pirateSetDna, ['M']);
      const techSheet = generateTechSheet(pirateSetDna, sizeMap);

      const notions = techSheet.notions;
      expect(notions.length).toBeGreaterThanOrEqual(5);

      // Hilos para ambas telas
      const redThread = notions.find((n) => n.name.toLowerCase().includes('rojo'));
      const denimThread = notions.find((n) => n.name.toLowerCase().includes('denim') || n.name.toLowerCase().includes('azul'));
      const goldThread = notions.find((n) => n.name.toLowerCase().includes('torzal') || n.name.toLowerCase().includes('dorado'));
      expect(redThread).toBeDefined();
      expect(denimThread).toBeDefined();
      expect(goldThread).toBeDefined();

      // Botones chaleco
      const vestButtons = notions.find((n) => n.name.toLowerCase().includes('chaleco') || n.name.toLowerCase().includes('botones frontales'));
      expect(vestButtons).toBeDefined();
      expect(vestButtons?.quantity).toContain('3');

      // Botón jeans y cremallera bermuda
      const jeansButton = notions.find((n) => n.name.toLowerCase().includes('jeans') || n.name.toLowerCase().includes('remaches'));
      const zipper = notions.find((n) => n.name.toLowerCase().includes('cremallera') || n.name.toLowerCase().includes('bragueta'));
      expect(jeansButton).toBeDefined();
      expect(zipper).toBeDefined();
    });

    it('should include 9 detailed assembly steps for 2-piece set construction', () => {
      const sizeMap = modifyPatternMultiSize(pirateSetDna, ['M']);
      const techSheet = generateTechSheet(pirateSetDna, sizeMap);

      expect(techSheet.assemblySequence.length).toBe(9);
      expect(techSheet.assemblySequence[0].title).toContain('Preparación');
      expect(techSheet.assemblySequence[1].title).toContain('Bolsillos Traseros');
      expect(techSheet.assemblySequence[2].title).toContain('Chaleco');
      expect(techSheet.assemblySequence[4].title).toContain('Bermuda');
      expect(techSheet.assemblySequence[7].title).toContain('Flecos Pirata');
      expect(techSheet.assemblySequence[8].title).toContain('Ojales');
    });

    it('should produce 10 Finished Garment Measurement (POM) rows covering Top and Bottom', () => {
      const sizeMap = modifyPatternMultiSize(pirateSetDna, STANDARD_SIZES);
      const techSheet = generateTechSheet(pirateSetDna, sizeMap);

      expect(techSheet.finishedMeasurements.length).toBe(10);

      const codes = techSheet.finishedMeasurements.map((r) => r.code);
      expect(codes).toContain('POM-01'); // Pecho Chaleco
      expect(codes).toContain('POM-02'); // Largo Delantero Chaleco
      expect(codes).toContain('POM-06'); // Cintura Bermuda
      expect(codes).toContain('POM-07'); // Cadera Bermuda
      expect(codes).toContain('POM-08'); // Largo Lateral Bermuda
      expect(codes).toContain('POM-09'); // Inseam Bermuda
      expect(codes).toContain('POM-10'); // Ruedo Pierna Bermuda

      // Verificar que los valores en talla M sean realistas
      const pomChest = techSheet.finishedMeasurements.find((r) => r.code === 'POM-01')!;
      expect(pomChest.values.M).toBeGreaterThan(950);

      const pomWaist = techSheet.finishedMeasurements.find((r) => r.code === 'POM-06')!;
      expect(pomWaist.values.M).toBeGreaterThan(800);
    });

    it('should export techpack to Markdown, JSON and PDF format', async () => {
      const sizeMap = modifyPatternMultiSize(pirateSetDna, STANDARD_SIZES);
      const techSheet = generateTechSheet(pirateSetDna, sizeMap);

      const mdContent = generateTechSheetMarkdown(techSheet);
      expect(mdContent).toContain('FICHA TÉCNICA DE CONFECCIÓN Y CONSUMO');
      expect(mdContent).toContain('Lino Rústico Rojo');
      expect(mdContent).toContain('Denim Azul Índigo');
      expect(mdContent).toContain('POM-01');
      expect(mdContent).toContain('POM-10');

      const jsonContent = generateTechSheetJson(techSheet);
      const parsedJson = JSON.parse(jsonContent);
      expect(parsedJson.conceptName).toBe('straw_pirate_full_set');
      expect(parsedJson.fabricConsumption.breakdown_by_fabric).toBeDefined();

      const pdfBuffer = await generateTechSheetPdf(techSheet);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(5000);
    });
  });

  // =========================================================================
  // 5. Mock AI Provider Preset Matching
  // =========================================================================
  describe('Mock AI Provider Set Matching', () => {
    it('should match straw_pirate_full_set on set-related prompts', async () => {
      const provider = new MockAiProvider();

      const queries = [
        'straw_pirate_full_set',
        'conjunto pirata de luffy chaleco y bermuda',
        'two piece set cosplay luffy',
        'set completo pirata sombrero de paja',
        '2 piezas chaleco + bermuda denim',
      ];

      for (const q of queries) {
        const dna = await provider.generatePatternDna(q);
        expect(dna.garment_category).toBe('set');
        expect(dna.concept_name).toBe('straw_pirate_full_set');
      }
    });
  });

  // =========================================================================
  // 6. Pipeline End-to-End y Empaquetado Comercial Etsy
  // =========================================================================
  describe('End-to-End Pipeline & Etsy Commercial Bundling', () => {
    it('should execute end-to-end pipeline and generate all 11 deliverables for two-piece set', async () => {
      const pipelineResult = await generatePatternPipeline({
        prompt: 'straw_pirate_full_set',
        provider: 'mock',
        outputDir: testOutputDir,
        sizes: ['S', 'M', 'L', 'XL'],
        wasteFactor: 0.15,
        bundle: true,
      });

      expect(pipelineResult.success).toBe(true);
      expect(pipelineResult.conceptName).toBe('straw_pirate_full_set');
      expect(pipelineResult.stats.totalParts).toBeGreaterThanOrEqual(6);
      expect(pipelineResult.stats.averageFabricMeters).toBeGreaterThan(1.0);
      expect(pipelineResult.stats.generatedFilesCount).toBe(11);

      // Verificar existencia física de los 11 archivos generados
      const f = pipelineResult.files;
      expect(fs.existsSync(f.tiledA4Pdf)).toBe(true);
      expect(fs.existsSync(f.tiledLetterPdf)).toBe(true);
      expect(fs.existsSync(f.plotterA0Pdf)).toBe(true);
      expect(fs.existsSync(f.continuousSvg)).toBe(true);
      expect(fs.existsSync(f.techpackPdf)).toBe(true);
      expect(fs.existsSync(f.techpackMd)).toBe(true);
      expect(fs.existsSync(f.dnaJson)).toBe(true);
      expect(fs.existsSync(f.techpackJson)).toBe(true);
      expect(fs.existsSync(f.etsyBundleZip!)).toBe(true);
      expect(fs.existsSync(f.etsyListingMetadata!)).toBe(true);
      expect(fs.existsSync(f.etsyPrintingGuide!)).toBe(true);

      // Verificar que el SVG contenga todas las piezas del conjunto
      const svgContent = fs.readFileSync(f.continuousSvg, 'utf-8');
      expect(svgContent).toContain('front_torso');
      expect(svgContent).toContain('back_torso');
      expect(svgContent).toContain('front_leg');
      expect(svgContent).toContain('back_leg');
      expect(svgContent).toContain('waistband');

      // Verificar metadatos de Etsy
      const metadataContent = JSON.parse(fs.readFileSync(f.etsyListingMetadata!, 'utf-8'));
      expect(metadataContent.title).toBeDefined();
      expect(metadataContent.tags.length).toBeLessThanOrEqual(13);
      expect(metadataContent.materials).toBeDefined();
    });
  });
});
