/**
 * tests/dresses.test.ts
 * Suite de pruebas unitarias para Modificador de Vestidos, Kimonos Anime/Haori y Faldas en ADN
 * pattern-ai-core - Motor Geométrico FreeSewing v3
 */

import { describe, it, expect } from 'vitest';
import {
  STANDARD_SIZES,
  STANDARD_MEASUREMENTS,
  getStandardMeasurements,
  modifyPattern,
  modifyPatternMultiSize,
  isDressGarment,
  isKimonoGarment,
  isSkirtGarment,
  modifyDressPattern,
  modifyKimonoPattern,
  modifySkirtPattern,
  parsePatternDna,
  PatternDnaSchema,
  GarmentCategorySchema,
  DressDetailsSchema,
  KimonoDetailsSchema,
  MOCK_PRESETS,
  MockAiProvider,
  distance,
  generatePatternPipeline,
} from '../src/index.js';
import { PatternDna, StandardSize } from '../src/types/pattern.js';
import path from 'node:path';
import fs from 'node:fs';

describe('Dresses, Anime Kimonos/Haoris & Skirts Parametric ADN Engine (T-22)', () => {
  // =========================================================================
  // 1. Esquemas Zod y Tipos TypeScript
  // =========================================================================
  describe('1. Zod Schemas & TypeScript Types', () => {
    it('should validate GarmentCategorySchema with all supported categories', () => {
      const validCategories = ['top', 'bottom', 'dress', 'set', 'kimono', 'haori'];
      for (const cat of validCategories) {
        expect(GarmentCategorySchema.parse(cat)).toBe(cat);
      }
      expect(() => GarmentCategorySchema.parse('invalid_category')).toThrow();
    });

    it('should validate DressDetailsSchema correctly', () => {
      const validDetails = {
        silhouette: 'a_line' as const,
        skirt_length_mm: 600,
        waist_seam: true,
      };
      const parsed = DressDetailsSchema.parse(validDetails);
      expect(parsed.silhouette).toBe('a_line');
      expect(parsed.skirt_length_mm).toBe(600);
      expect(parsed.waist_seam).toBe(true);

      // Siluetas válidas
      expect(DressDetailsSchema.parse({ silhouette: 'straight' }).silhouette).toBe('straight');
      expect(DressDetailsSchema.parse({ silhouette: 'pleated' }).silhouette).toBe('pleated');
      expect(() => DressDetailsSchema.parse({ silhouette: 'unknown' })).toThrow();
    });

    it('should validate KimonoDetailsSchema correctly', () => {
      const validDetails = {
        sleeve_style: 'furisode_square' as const,
        collar_width_mm: 65,
        obi_belt: true,
      };
      const parsed = KimonoDetailsSchema.parse(validDetails);
      expect(parsed.sleeve_style).toBe('furisode_square');
      expect(parsed.collar_width_mm).toBe(65);
      expect(parsed.obi_belt).toBe(true);

      expect(KimonoDetailsSchema.parse({ sleeve_style: 'standard' }).sleeve_style).toBe('standard');
      expect(KimonoDetailsSchema.parse({ sleeve_style: 'cropped' }).sleeve_style).toBe('cropped');
      expect(() => KimonoDetailsSchema.parse({ sleeve_style: 'unknown' })).toThrow();
    });

    it('should validate complete PatternDna with dress_details and kimono_details', () => {
      const dressDna: PatternDna = {
        concept_name: 'test_dress',
        garment_category: 'dress',
        base_block: 'dress_sloper',
        ease: { chest_ease_mm: 30, waist_ease_mm: 20 },
        dress_details: {
          silhouette: 'a_line',
          skirt_length_mm: 550,
          waist_seam: true,
        },
        modifications: {},
      };
      const validatedDress = parsePatternDna(dressDna);
      expect(validatedDress.garment_category).toBe('dress');
      expect(validatedDress.dress_details?.silhouette).toBe('a_line');

      const kimonoDna: PatternDna = {
        concept_name: 'test_haori',
        garment_category: 'haori',
        base_block: 'haori_sloper',
        ease: { chest_ease_mm: 150 },
        kimono_details: {
          sleeve_style: 'furisode_square',
          collar_width_mm: 60,
          obi_belt: true,
        },
        modifications: {},
      };
      const validatedKimono = parsePatternDna(kimonoDna);
      expect(validatedKimono.garment_category).toBe('haori');
      expect(validatedKimono.kimono_details?.sleeve_style).toBe('furisode_square');
    });
  });

  // =========================================================================
  // 2. Modificación de Vestidos (Dress) en todas las tallas (XS a 3XL)
  // =========================================================================
  describe('2. Dress Modification Engine (XS to 3XL)', () => {
    const dressDna = MOCK_PRESETS.anime_water_goddess_dress;

    it('should identify dress DNA correctly', () => {
      expect(isDressGarment(dressDna)).toBe(true);
      expect(isDressGarment({ ...dressDna, garment_category: 'dress', base_block: 'custom_dress' })).toBe(true);
    });

    it.each(STANDARD_SIZES)('should generate all coordinated parts for dress in size %s', (size) => {
      const result = modifyPattern(dressDna, size);

      expect(result.concept_name).toBe(dressDna.concept_name);
      expect(result.size).toBe(size);

      // Piezas requeridas para vestido con unión de cintura coordinada
      expect(result.parts.front_bodice).toBeDefined();
      expect(result.parts.back_bodice).toBeDefined();
      expect(result.parts.front_skirt).toBeDefined();
      expect(result.parts.back_skirt).toBeDefined();
      expect(result.parts.sleeve).toBeDefined();

      const { front_bodice, back_bodice, front_skirt, back_skirt, sleeve } = result.parts;

      // Verificación geométrica: polígonos cerrados y áreas positivas
      for (const part of [front_bodice, back_bodice, front_skirt, back_skirt, sleeve]) {
        expect(part.area_mm2).toBeGreaterThan(0);
        expect(part.width_mm).toBeGreaterThan(0);
        expect(part.height_mm).toBeGreaterThan(0);
        expect(part.pathD).toMatch(/^M\s.+Z$/);
        expect(part.outline.length).toBeGreaterThanOrEqual(4);

        // Verificación de Grainlines en el 100% de piezas
        expect(part.grainline).toBeDefined();
        expect(part.grainline.label).toBe('GRAINLINE / HILO DE TELA');
        expect(part.grainline.start).toBeDefined();
        expect(part.grainline.end).toBeDefined();

        // Verificación de márgenes
        expect(part.seamAllowance_mm).toBeGreaterThanOrEqual(0);
      }

      // Verificación de piquetes pareados en unión de cintura
      const fbNotchCenter = front_bodice.notches.find((n) => n.label.includes('Cintura'));
      const fsNotchCenter = front_skirt.notches.find((n) => n.label.includes('Cintura'));
      expect(fbNotchCenter).toBeDefined();
      expect(fsNotchCenter).toBeDefined();

      const bbNotchCenter = back_bodice.notches.find((n) => n.label.includes('Cintura'));
      const bsNotchCenter = back_skirt.notches.find((n) => n.label.includes('Cintura'));
      expect(bbNotchCenter).toBeDefined();
      expect(bsNotchCenter).toBeDefined();

      // Verificación de coincidencia de costura de costado en corpiño
      const backSideLen = distance(back_bodice.points.armhole_bottom, back_bodice.points.side_waist);
      const frontUpperSideLen = distance(front_bodice.points.armhole_bottom, front_bodice.points.dart_top_leg);
      const frontLowerSideLen = distance(front_bodice.points.dart_bottom_leg, front_bodice.points.side_waist);
      const frontTotalSideLen = frontUpperSideLen + frontLowerSideLen;
      expect(Math.abs(frontTotalSideLen - backSideLen)).toBeLessThanOrEqual(1.0);
    });

    it('should generate continuous single-piece dress when waist_seam is false', () => {
      const continuousDressDna: PatternDna = {
        ...dressDna,
        concept_name: 'seamless_shift_dress',
        dress_details: {
          silhouette: 'a_line',
          skirt_length_mm: 500,
          waist_seam: false,
        },
        modifications: {
          ...dressDna.modifications,
          dress_details: {
            silhouette: 'a_line',
            skirt_length_mm: 500,
            waist_seam: false,
          },
        },
      };

      const result = modifyPattern(continuousDressDna, 'M');

      expect(result.parts.front_dress).toBeDefined();
      expect(result.parts.back_dress).toBeDefined();

      const frontDress = result.parts.front_dress;
      const backDress = result.parts.back_dress;

      expect(frontDress.area_mm2).toBeGreaterThan(100000);
      expect(backDress.area_mm2).toBeGreaterThan(100000);
      expect(frontDress.pathD).toMatch(/^M\s.+Z$/);
      expect(backDress.pathD).toMatch(/^M\s.+Z$/);

      expect(frontDress.grainline.label).toBe('GRAINLINE / HILO DE TELA');
      expect(backDress.grainline.label).toBe('GRAINLINE / HILO DE TELA');
    });
  });

  // =========================================================================
  // 3. Modificación de Kimonos y Haoris Anime con Mangas Cuadradas (Furisode)
  // =========================================================================
  describe('3. Anime Kimono / Haori Modification Engine (XS to 3XL)', () => {
    const haoriDna = MOCK_PRESETS.demon_slayer_haori_kimono;

    it('should identify kimono/haori DNA correctly', () => {
      expect(isKimonoGarment(haoriDna)).toBe(true);
      expect(isKimonoGarment({ ...haoriDna, garment_category: 'kimono', base_block: 'kimono_sloper' })).toBe(true);
    });

    it.each(STANDARD_SIZES)('should generate all iconic Japanese pattern parts for size %s', (size) => {
      const result = modifyPattern(haoriDna, size);

      expect(result.concept_name).toBe(haoriDna.concept_name);
      expect(result.size).toBe(size);

      // Piezas icónicas del Haori / Kimono
      expect(result.parts.front).toBeDefined();
      expect(result.parts.back).toBeDefined();
      expect(result.parts.furisode_sleeve).toBeDefined();
      expect(result.parts.collar_band).toBeDefined();
      expect(result.parts.obi_belt).toBeDefined();

      const { front, back, furisode_sleeve, collar_band, obi_belt } = result.parts;

      // 1. Manga japonesa cuadrada (Furisode Sleeve)
      expect(furisode_sleeve.name).toBe('furisode_sleeve');
      expect(furisode_sleeve.cutCount).toBe(2);
      expect(furisode_sleeve.onFold).toBe(false);
      expect(furisode_sleeve.width_mm).toBeGreaterThanOrEqual(280);
      expect(furisode_sleeve.height_mm).toBeGreaterThanOrEqual(450); // Caída profunda tradicional
      expect(furisode_sleeve.area_mm2).toBeGreaterThan(120000);
      expect(furisode_sleeve.pathD).toMatch(/^M\s.+Z$/);

      // Piquetes de la manga Furisode
      const notchSodeTsukeStart = furisode_sleeve.notches.find((n) => n.label.includes('Start'));
      const notchSodeTsukeEnd = furisode_sleeve.notches.find((n) => n.label.includes('End'));
      const notchSodeGuchi = furisode_sleeve.notches.find((n) => n.label.includes('Muñeca'));
      expect(notchSodeTsukeStart).toBeDefined();
      expect(notchSodeTsukeEnd).toBeDefined();
      expect(notchSodeGuchi).toBeDefined();

      // 2. Cuello plano en banda (Collar band / Eri)
      expect(collar_band.name).toBe('collar_band');
      expect(collar_band.cutCount).toBe(1);
      expect(collar_band.onFold).toBe(true);
      expect(collar_band.width_mm).toBeGreaterThan(600); // Tira larga continua
      expect(collar_band.height_mm).toBe(120); // 60mm * 2
      expect(collar_band.pathD).toMatch(/^M\s.+Z$/);

      const collarCenterNotch = collar_band.notches.find((n) => n.label.includes('Centro Espalda'));
      expect(collarCenterNotch).toBeDefined();
      expect(collarCenterNotch?.type).toBe('double');

      // 3. Cinturón Obi
      expect(obi_belt.name).toBe('obi_belt');
      expect(obi_belt.cutCount).toBe(1);
      expect(obi_belt.onFold).toBe(true);
      expect(obi_belt.width_mm).toBeGreaterThan(600);
      expect(obi_belt.height_mm).toBe(280); // 140mm * 2

      // Verificación de Grainlines en el 100% de piezas
      for (const part of [front, back, furisode_sleeve, collar_band, obi_belt]) {
        expect(part.area_mm2).toBeGreaterThan(0);
        expect(part.grainline).toBeDefined();
        expect(part.grainline.label).toBe('GRAINLINE / HILO DE TELA');
      }

      // Verificación de costura de sisa (Sode-tsuke): coincidencia entre cuerpo y manga
      const frontSisaNotch = front.notches.find((n) => n.label.includes('Sode-tsuke'));
      const backSisaNotch = back.notches.find((n) => n.label.includes('Sode-tsuke'));
      expect(frontSisaNotch).toBeDefined();
      expect(backSisaNotch).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Modificación de Faldas Independientes (Skirts)
  // =========================================================================
  describe('4. Standalone Skirt Modification Engine', () => {
    it('should identify skirt DNA correctly', () => {
      const skirtDna: PatternDna = {
        concept_name: 'anime_school_pleated_skirt',
        garment_category: 'bottom',
        base_block: 'skirt_sloper',
        ease: { chest_ease_mm: 0, waist_ease_mm: 20, hip_ease_mm: 40 },
        dress_details: { silhouette: 'pleated', skirt_length_mm: 420 },
        modifications: {},
      };
      expect(isSkirtGarment(skirtDna)).toBe(true);
    });

    it('should generate front_skirt, back_skirt, and waistband for A-Line skirt', () => {
      const aLineSkirtDna: PatternDna = {
        concept_name: 'gothic_lolita_a_line_skirt',
        garment_category: 'bottom',
        base_block: 'a_line_skirt',
        ease: { chest_ease_mm: 0, waist_ease_mm: 20, hip_ease_mm: 35 },
        dress_details: { silhouette: 'a_line', skirt_length_mm: 520 },
        modifications: {
          waistband: { type: 'fitted', height_mm: 45 },
          pocket: { type: 'patch', width_mm: 150, height_mm: 170 },
        },
      };

      const result = modifyPattern(aLineSkirtDna, 'M');

      expect(result.parts.front_skirt).toBeDefined();
      expect(result.parts.back_skirt).toBeDefined();
      expect(result.parts.waistband).toBeDefined();
      expect(result.parts.pocket).toBeDefined();

      const { front_skirt, back_skirt, waistband, pocket } = result.parts;

      // Verificación de pretina
      expect(waistband.name).toBe('waistband');
      expect(waistband.cutCount).toBe(1);
      expect(waistband.onFold).toBe(true);
      expect(waistband.height_mm).toBe(90); // 45mm * 2

      // Notches en pretina
      expect(waistband.notches.length).toBe(3);
      expect(waistband.notches.some((n) => n.label.includes('Centro Delantero'))).toBe(true);
      expect(waistband.notches.some((n) => n.label.includes('Costado'))).toBe(true);
      expect(waistband.notches.some((n) => n.label.includes('Centro Espalda'))).toBe(true);

      // Verificación de Grainlines en el 100% de piezas
      for (const part of [front_skirt, back_skirt, waistband, pocket]) {
        expect(part.area_mm2).toBeGreaterThan(0);
        expect(part.grainline.label).toBe('GRAINLINE / HILO DE TELA');
      }

      // Verificación de costura de costado coincidente
      const frontSideLen =
        distance(front_skirt.points.side_waist, front_skirt.points.side_hip) +
        distance(front_skirt.points.side_hip, front_skirt.points.side_hem);
      const backSideLen =
        distance(back_skirt.points.side_waist, back_skirt.points.side_hip) +
        distance(back_skirt.points.side_hip, back_skirt.points.side_hem);
      expect(Math.abs(frontSideLen - backSideLen)).toBeLessThanOrEqual(1.0);
    });
  });

  // =========================================================================
  // 5. Graduación Multi-Talla (XS a 3XL) y Consistencia
  // =========================================================================
  describe('5. Multi-Size Graduation & Area Monotonicity', () => {
    it('should scale dress parts monotonically across sizes', () => {
      const multiSizeResults = modifyPatternMultiSize(MOCK_PRESETS.anime_water_goddess_dress);

      expect(multiSizeResults.size).toBe(STANDARD_SIZES.length);

      let prevBodiceArea = 0;
      let prevSkirtArea = 0;

      for (const size of STANDARD_SIZES) {
        const res = multiSizeResults.get(size);
        expect(res).toBeDefined();
        if (!res) continue;

        const bodiceArea = res.parts.front_bodice.area_mm2;
        const skirtArea = res.parts.front_skirt.area_mm2;

        if (prevBodiceArea > 0) {
          expect(bodiceArea).toBeGreaterThan(prevBodiceArea);
          expect(skirtArea).toBeGreaterThan(prevSkirtArea);
        }

        prevBodiceArea = bodiceArea;
        prevSkirtArea = skirtArea;
      }
    });

    it('should scale haori parts monotonically across sizes', () => {
      const multiSizeResults = modifyPatternMultiSize(MOCK_PRESETS.demon_slayer_haori_kimono);

      let prevBackArea = 0;

      for (const size of STANDARD_SIZES) {
        const res = multiSizeResults.get(size);
        expect(res).toBeDefined();
        if (!res) continue;

        const backArea = res.parts.back.area_mm2;
        if (prevBackArea > 0) {
          expect(backArea).toBeGreaterThan(prevBackArea);
        }
        prevBackArea = backArea;
      }
    });
  });

  // =========================================================================
  // 6. Mock AI Provider & Preset Queries
  // =========================================================================
  describe('6. Mock Provider Preset Integration', () => {
    const mockProvider = new MockAiProvider();

    it('should resolve anime water goddess dress query', async () => {
      const dna = await mockProvider.generatePatternDna('Vestido cosplay anime Diosa del Agua Aqua');
      expect(dna.concept_name).toBe('anime_water_goddess_dress');
      expect(dna.garment_category).toBe('dress');
      expect(dna.dress_details?.silhouette).toBe('a_line');
    });

    it('should resolve demon slayer haori kimono query', async () => {
      const dna = await mockProvider.generatePatternDna('Haori kimono anime Demon Slayer Tanjiro mangas cuadradas');
      expect(dna.concept_name).toBe('demon_slayer_haori_kimono');
      expect(dna.garment_category).toBe('haori');
      expect(dna.kimono_details?.sleeve_style).toBe('furisode_square');
    });
  });

  // =========================================================================
  // 7. End-to-End Pipeline Execution for Dresses & Kimonos
  // =========================================================================
  describe('7. End-to-End Pipeline & Deliverable Generation', () => {
    const testOutputDir = path.resolve(process.cwd(), 'output/test_dresses_pipeline');

    it('should execute end-to-end pipeline for anime water goddess dress', async () => {
      const result = await generatePatternPipeline({
        prompt: 'Vestido cosplay de Diosa del Agua Aqua',
        provider: 'mock',
        outputDir: testOutputDir,
        sizes: ['S', 'M', 'L'],
        bundle: false,
      });

      expect(result.success).toBe(true);
      expect(result.conceptName).toBe('anime_water_goddess_dress');
      expect(result.dna.garment_category).toBe('dress');
      expect(result.stats.generatedFilesCount).toBeGreaterThanOrEqual(6);
      expect(fs.existsSync(result.outputDirectory)).toBe(true);
      expect(fs.existsSync(result.files.continuousSvg)).toBe(true);
    });

    it('should execute end-to-end pipeline for demon slayer haori kimono', async () => {
      const result = await generatePatternPipeline({
        prompt: 'Haori kimono anime Demon Slayer Tanjiro mangas cuadradas',
        provider: 'mock',
        outputDir: testOutputDir,
        sizes: ['M', 'L', 'XL'],
        bundle: false,
      });

      expect(result.success).toBe(true);
      expect(result.conceptName).toBe('demon_slayer_haori_kimono');
      expect(result.dna.garment_category).toBe('haori');
      expect(result.stats.generatedFilesCount).toBeGreaterThanOrEqual(6);
      expect(fs.existsSync(result.outputDirectory)).toBe(true);
      expect(fs.existsSync(result.files.continuousSvg)).toBe(true);
    });
  });
});
