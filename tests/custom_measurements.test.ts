/**
 * tests/custom_measurements.test.ts
 * Suite completa de pruebas para el Motor de Personalización Antropométrica por Medidas Exactas
 * pattern-ai-core
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  calculateCustomMeasurements,
  clampMeasurement,
  ANATOMICAL_LIMITS,
  getStandardMeasurements,
  STANDARD_MEASUREMENTS,
  STANDARD_SIZES,
  BodyMeasurements,
} from '../src/engine/base_blocks/measurements.js';
import {
  generateTechSheet,
  generateTechSheetMarkdown,
  generateTechSheetJson,
  generateTechSheetPdf,
} from '../src/engine/tech_sheet.js';
import {
  generatePatternPipeline,
  parseMeasurementsArg,
  PipelineRequest,
} from '../src/pipeline.js';
import { PatternDna } from '../src/types/pattern.js';

describe('Motor de Personalización Antropométrica (Custom Measurements Engine)', () => {
  const TEST_OUTPUT_DIR = path.resolve('output/test_custom_measurements');

  beforeAll(async () => {
    await fs.promises.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.promises.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch {
      // Ignorar si ya fue limpiado
    }
  });

  // =========================================================================
  // 1. INTERPOLACIÓN ANATÓMICA A PARTIR DE MEDIDAS PARCIALES
  // =========================================================================
  describe('1. Interpolación Antropométrica Armónica y Monotónica', () => {
    it('debe devolver exactamente las medidas estándar cuando el objeto custom está vacío', () => {
      const baseM = getStandardMeasurements('M');
      const calculated = calculateCustomMeasurements({}, 'M');

      expect(calculated).toEqual(baseM);
    });

    it('debe mantener las medidas explícitas exactas e interpolar armónicamente las medidas derivadas (solo pecho)', () => {
      const baseM = getStandardMeasurements('M');
      // Pecho correspondiente a talla L (1080 mm vs 1000 mm en M, ratio = 1.08)
      const calculated = calculateCustomMeasurements(
        { chest_circumference_mm: 1080 },
        'M'
      );

      // Medida explícita debe ser exactamente 1080 mm
      expect(calculated.chest_circumference_mm).toBe(1080);

      // Medidas derivadas de contorno superior deben escalar armónicamente
      expect(calculated.bicep_circumference_mm).toBeGreaterThan(baseM.bicep_circumference_mm);
      expect(calculated.shoulder_to_shoulder_mm).toBeGreaterThan(baseM.shoulder_to_shoulder_mm);
      expect(calculated.neck_circumference_mm).toBeGreaterThan(baseM.neck_circumference_mm);
      expect(calculated.waist_circumference_mm).toBeGreaterThan(baseM.waist_circumference_mm);

      // Medidas de longitud deben escalar más suavemente
      expect(calculated.back_length_mm).toBeGreaterThan(baseM.back_length_mm);
      expect(calculated.sleeve_length_mm).toBeGreaterThan(baseM.sleeve_length_mm);

      // Inclinación de hombro no debe verse afectada por contorno
      expect(calculated.shoulder_slope_deg).toBe(baseM.shoulder_slope_deg);
    });

    it('debe preservar la monotonicidad matemática: a mayor pecho, mayores dimensiones derivadas', () => {
      const resSmall = calculateCustomMeasurements({ chest_circumference_mm: 920 }, 'M');
      const resMedium = calculateCustomMeasurements({ chest_circumference_mm: 1000 }, 'M');
      const resLarge = calculateCustomMeasurements({ chest_circumference_mm: 1080 }, 'M');
      const resXLarge = calculateCustomMeasurements({ chest_circumference_mm: 1160 }, 'M');

      // Monotonicidad estricta en bíceps, hombros y cuello
      expect(resSmall.bicep_circumference_mm).toBeLessThan(resMedium.bicep_circumference_mm);
      expect(resMedium.bicep_circumference_mm).toBeLessThan(resLarge.bicep_circumference_mm);
      expect(resLarge.bicep_circumference_mm).toBeLessThan(resXLarge.bicep_circumference_mm);

      expect(resSmall.shoulder_to_shoulder_mm).toBeLessThan(resMedium.shoulder_to_shoulder_mm);
      expect(resMedium.shoulder_to_shoulder_mm).toBeLessThan(resLarge.shoulder_to_shoulder_mm);
      expect(resLarge.shoulder_to_shoulder_mm).toBeLessThan(resXLarge.shoulder_to_shoulder_mm);

      expect(resSmall.neck_circumference_mm).toBeLessThan(resMedium.neck_circumference_mm);
      expect(resMedium.neck_circumference_mm).toBeLessThan(resLarge.neck_circumference_mm);
      expect(resLarge.neck_circumference_mm).toBeLessThan(resXLarge.neck_circumference_mm);
    });

    it('debe interpolar medidas de tren inferior cuando se suministra cintura y cadera', () => {
      const baseM = getStandardMeasurements('M');
      const calculated = calculateCustomMeasurements(
        {
          waist_circumference_mm: 940,
          hip_circumference_mm: 1120,
        },
        'M'
      );

      expect(calculated.waist_circumference_mm).toBe(940);
      expect(calculated.hip_circumference_mm).toBe(1120);

      // Perneras deben escalar proporcionalmente a la cadera
      expect(calculated.thigh_circumference_mm).toBeGreaterThan(baseM.thigh_circumference_mm);
      expect(calculated.knee_circumference_mm).toBeGreaterThan(baseM.knee_circumference_mm);
      expect(calculated.ankle_circumference_mm).toBeGreaterThan(baseM.ankle_circumference_mm);
      expect(calculated.crotch_depth_mm).toBeGreaterThan(baseM.crotch_depth_mm);
    });

    it('debe respetar múltiples medidas exactas explícitas simultáneamente', () => {
      const customInput: Partial<BodyMeasurements> = {
        chest_circumference_mm: 1040,
        waist_circumference_mm: 870,
        hip_circumference_mm: 1050,
        sleeve_length_mm: 670,
        shoulder_to_shoulder_mm: 480,
        back_length_mm: 740,
      };

      const calculated = calculateCustomMeasurements(customInput, 'M');

      expect(calculated.chest_circumference_mm).toBe(1040);
      expect(calculated.waist_circumference_mm).toBe(870);
      expect(calculated.hip_circumference_mm).toBe(1050);
      expect(calculated.sleeve_length_mm).toBe(670);
      expect(calculated.shoulder_to_shoulder_mm).toBe(480);
      expect(calculated.back_length_mm).toBe(740);

      // Medidas no pasadas (como bíceps y cuello) se derivan armónicamente
      expect(calculated.bicep_circumference_mm).toBeGreaterThan(0);
      expect(calculated.neck_circumference_mm).toBeGreaterThan(0);
    });

    it('debe funcionar con diferentes tallas de referencia base (ej: S, L, XL)', () => {
      const custom = { chest_circumference_mm: 1050 };

      const fromS = calculateCustomMeasurements(custom, 'S');
      const fromL = calculateCustomMeasurements(custom, 'L');

      // Ambas deben respetar el pecho explícito
      expect(fromS.chest_circumference_mm).toBe(1050);
      expect(fromL.chest_circumference_mm).toBe(1050);
    });
  });

  // =========================================================================
  // 2. CLAMPING DE SEGURIDAD ANATÓMICA
  // =========================================================================
  describe('2. Clamping de Seguridad Anatómica', () => {
    it('debe tener límites de seguridad definidos para las 18 medidas corporales', () => {
      const allKeys: (keyof BodyMeasurements)[] = [
        'chest_circumference_mm',
        'waist_circumference_mm',
        'hip_circumference_mm',
        'neck_circumference_mm',
        'shoulder_to_shoulder_mm',
        'shoulder_slope_deg',
        'back_length_mm',
        'front_length_mm',
        'sleeve_length_mm',
        'bicep_circumference_mm',
        'wrist_circumference_mm',
        'head_circumference_mm',
        'waist_to_floor_mm',
        'crotch_depth_mm',
        'inseam_mm',
        'thigh_circumference_mm',
        'knee_circumference_mm',
        'ankle_circumference_mm',
      ];

      allKeys.forEach((key) => {
        const limit = ANATOMICAL_LIMITS[key];
        expect(limit).toBeDefined();
        expect(limit.min).toBeGreaterThan(0);
        expect(limit.max).toBeGreaterThan(limit.min);
        expect(limit.label.length).toBeGreaterThan(0);
      });
    });

    it('clampMeasurement debe restringir valores por debajo del mínimo físico', () => {
      expect(clampMeasurement('chest_circumference_mm', 200)).toBe(ANATOMICAL_LIMITS.chest_circumference_mm.min);
      expect(clampMeasurement('waist_circumference_mm', -50)).toBe(ANATOMICAL_LIMITS.waist_circumference_mm.min);
      expect(clampMeasurement('shoulder_slope_deg', 0)).toBe(ANATOMICAL_LIMITS.shoulder_slope_deg.min);
    });

    it('clampMeasurement debe restringir valores por encima del máximo físico', () => {
      expect(clampMeasurement('chest_circumference_mm', 3500)).toBe(ANATOMICAL_LIMITS.chest_circumference_mm.max);
      expect(clampMeasurement('shoulder_slope_deg', 85)).toBe(ANATOMICAL_LIMITS.shoulder_slope_deg.max);
      expect(clampMeasurement('hip_circumference_mm', 5000)).toBe(ANATOMICAL_LIMITS.hip_circumference_mm.max);
    });

    it('clampMeasurement debe manejar valores no válidos (NaN, Infinity)', () => {
      expect(clampMeasurement('chest_circumference_mm', NaN)).toBe(ANATOMICAL_LIMITS.chest_circumference_mm.min);
      expect(clampMeasurement('bicep_circumference_mm', Infinity)).toBe(ANATOMICAL_LIMITS.bicep_circumference_mm.min);
    });

    it('calculateCustomMeasurements debe aplicar clamping global a entradas extremas', () => {
      const extremeCustom = {
        chest_circumference_mm: 50, // Demasiado pequeño
        waist_circumference_mm: 4000, // Demasiado grande
        shoulder_slope_deg: 90, // Ángulo absurdo
      };

      const calculated = calculateCustomMeasurements(extremeCustom, 'M');

      expect(calculated.chest_circumference_mm).toBe(ANATOMICAL_LIMITS.chest_circumference_mm.min);
      expect(calculated.waist_circumference_mm).toBe(ANATOMICAL_LIMITS.waist_circumference_mm.max);
      expect(calculated.shoulder_slope_deg).toBe(ANATOMICAL_LIMITS.shoulder_slope_deg.max);
    });
  });

  // =========================================================================
  // 3. PARSING DE ARGUMENTOS CLI (--measurements)
  // =========================================================================
  describe('3. Parser de Argumentos CLI (--measurements)', () => {
    it('debe parsear un string JSON directo con medidas válidas', () => {
      const jsonStr = '{"chest_circumference_mm":1040,"waist_circumference_mm":880}';
      const parsed = parseMeasurementsArg(jsonStr);

      expect(parsed).toEqual({
        chest_circumference_mm: 1040,
        waist_circumference_mm: 880,
      });
    });

    it('debe retornar undefined si el argumento es vacío o undefined', () => {
      expect(parseMeasurementsArg(undefined)).toBeUndefined();
      expect(parseMeasurementsArg('')).toBeUndefined();
      expect(parseMeasurementsArg('   ')).toBeUndefined();
    });

    it('debe leer y parsear un archivo .json con medidas desde disco', async () => {
      const tempJsonPath = path.join(TEST_OUTPUT_DIR, 'custom_client_meas.json');
      const testData = {
        chest_circumference_mm: 1060,
        waist_circumference_mm: 920,
        hip_circumference_mm: 1080,
      };

      await fs.promises.writeFile(tempJsonPath, JSON.stringify(testData, null, 2), 'utf-8');

      const parsed = parseMeasurementsArg(tempJsonPath);
      expect(parsed).toEqual(testData);
    });

    it('debe lanzar error claro si el archivo .json especificado no existe', () => {
      expect(() => parseMeasurementsArg('non_existent_measurements_file_123.json')).toThrow(
        /No se encontró el archivo de medidas personalizadas/
      );
    });

    it('debe lanzar error si el JSON es sintácticamente inválido', () => {
      expect(() => parseMeasurementsArg('{ chest_circumference_mm: 1040, broken')).toThrow(
        /Error al procesar medidas personalizadas/
      );
    });

    it('debe lanzar error si el JSON parseado es un array o primitivo', () => {
      expect(() => parseMeasurementsArg('[1000, 800]')).toThrow(
        /El contenido de medidas debe ser un objeto JSON válido/
      );
    });
  });

  // =========================================================================
  // 4. REFLEJO EN LA FICHA TÉCNICA (POM Y SECCIÓN DESTACADA)
  // =========================================================================
  describe('4. Ficha Técnica con Medidas a Medida', () => {
    const sampleDna: PatternDna = {
      concept_name: 'cyberpunk_custom_hoodie',
      description: 'Hoodie personalizado por medidas exactas',
      base_block: 'menswear_torso_oversize',
      ease: {
        chest_ease_mm: 140,
        bicep_ease_mm: 60,
      },
      modifications: {
        sleeves: {
          type: 'drop_shoulder',
          drop_mm: 60,
        },
        hood: {
          type: 'standard',
          height_mm: 380,
        },
      },
      sizing: {
        size: 'M',
        custom_measurements: {
          chest_circumference_mm: 1060,
          waist_circumference_mm: 910,
        },
      },
    };

    it('generateTechSheet debe incluir customMeasurements cuando se proporcionan medidas', () => {
      const techSheet = generateTechSheet(sampleDna, new Map());

      expect(techSheet.customMeasurements).toBeDefined();
      expect(techSheet.customMeasurements?.referenceSize).toBe('M');
      expect(techSheet.customMeasurements?.providedFieldsCount).toBe(2);
      expect(techSheet.customMeasurements?.measurements.length).toBe(Object.keys(ANATOMICAL_LIMITS).length);

      // Medida explícita de pecho
      const chestComparison = techSheet.customMeasurements?.measurements.find(
        (m) => m.key === 'chest_circumference_mm'
      );
      expect(chestComparison).toBeDefined();
      expect(chestComparison?.baseValue_mm).toBe(1000);
      expect(chestComparison?.customValue_mm).toBe(1060);
      expect(chestComparison?.delta_mm).toBe(60);
      expect(chestComparison?.isExplicit).toBe(true);

      // Medida derivada (bíceps)
      const bicepComparison = techSheet.customMeasurements?.measurements.find(
        (m) => m.key === 'bicep_circumference_mm'
      );
      expect(bicepComparison).toBeDefined();
      expect(bicepComparison?.isExplicit).toBe(false);
      expect(bicepComparison?.customValue_mm).toBeGreaterThan(bicepComparison?.baseValue_mm || 0);
    });

    it('generateTechSheetMarkdown debe renderizar la sección 1.1 de Personalización Antropométrica', () => {
      const techSheet = generateTechSheet(sampleDna, new Map());
      const md = generateTechSheetMarkdown(techSheet);

      expect(md).toContain('## 1.1 PERSONALIZACIÓN ANTROPOMÉTRICA (MEDIDAS A MEDIDA DEL CLIENTE)');
      expect(md).toContain('Patrón ajustado a medidas personalizadas del cliente');
      expect(md).toContain('Contorno de Pecho / Busto');
      expect(md).toContain('1060 mm');
      expect(md).toContain('+60 mm');
      expect(md).toContain('Exacta (Suministrada)');
      expect(md).toContain('Interpolación Armónica');
    });

    it('generateTechSheetJson debe serializar la estructura customMeasurements', () => {
      const techSheet = generateTechSheet(sampleDna, new Map());
      const jsonStr = generateTechSheetJson(techSheet);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.customMeasurements).toBeDefined();
      expect(parsed.customMeasurements.referenceSize).toBe('M');
      expect(parsed.customMeasurements.providedFieldsCount).toBe(2);
    });

    it('generateTechSheetPdf debe generar un buffer PDF válido con la sección personalizada', async () => {
      const techSheet = generateTechSheet(sampleDna, new Map());
      const pdfBuffer = await generateTechSheetPdf(techSheet);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(5000);
      // Validar firma de archivo PDF (%PDF-)
      expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('debe reflejar las medidas personalizadas en la tabla POM (Points of Measurement)', () => {
      const techSheet = generateTechSheet(sampleDna, new Map());
      const pomChest = techSheet.finishedMeasurements.find((p) => p.code === 'POM-01');

      expect(pomChest).toBeDefined();
      // Pecho terminado en M = pecho cliente (1060) + holgura (140) = 1200 mm
      expect(pomChest?.values['M']).toBe(1200);
    });
  });

  // =========================================================================
  // 5. GENERACIÓN END-TO-END EN PIPELINE CON MEDIDAS PERSONALIZADAS
  // =========================================================================
  describe('5. Pipeline End-to-End con --measurements', () => {
    it('debe ejecutar el pipeline completo con customMeasurements y generar los 8 archivos entregables', async () => {
      const directDna: PatternDna = {
        concept_name: 'samurai_custom_hoodie',
        base_block: 'menswear_torso_oversize',
        ease: {
          chest_ease_mm: 120,
        },
        modifications: {
          sleeves: {
            type: 'drop_shoulder',
            drop_mm: 50,
          },
          hem: {
            type: 'straight',
          },
        },
      };

      const request: PipelineRequest = {
        prompt: 'Samurai custom hoodie',
        outputDir: TEST_OUTPUT_DIR,
        directDna,
        sizes: ['M'],
        customMeasurements: {
          chest_circumference_mm: 1050,
          waist_circumference_mm: 890,
          sleeve_length_mm: 660,
        },
      };

      const result = await generatePatternPipeline(request);

      expect(result.success).toBe(true);
      expect(result.conceptName).toBe('samurai_custom_hoodie');
      expect(result.stats.generatedFilesCount).toBe(8);

      // Verificar que los 8 archivos existen físicamente en disco
      for (const [key, filePath] of Object.entries(result.files)) {
        expect(fs.existsSync(filePath), `Archivo ${key} (${filePath}) debe existir`).toBe(true);
        const stat = fs.statSync(filePath);
        expect(stat.size).toBeGreaterThan(0);
      }

      // Verificar contenido de techpack.json
      const techpackJsonContent = fs.readFileSync(result.files.techpackJson, 'utf-8');
      const techpackData = JSON.parse(techpackJsonContent);
      expect(techpackData.customMeasurements).toBeDefined();
      expect(techpackData.customMeasurements.providedFieldsCount).toBe(3);

      // Verificar contenido de techpack.md
      const techpackMdContent = fs.readFileSync(result.files.techpackMd, 'utf-8');
      expect(techpackMdContent).toContain('PERSONALIZACIÓN ANTROPOMÉTRICA');
      expect(techpackMdContent).toContain('1050 mm');
    });

    it('debe compilar techpack desde archivo ADN con medidas personalizadas inyectadas', async () => {
      const dnaPath = path.join(TEST_OUTPUT_DIR, 'test_dna_custom.json');
      const testDna: PatternDna = {
        concept_name: 'cyberpunk_custom_pants',
        garment_category: 'bottom',
        base_block: 'pants_sloper',
        ease: {
          waist_ease_mm: 40,
          hip_ease_mm: 60,
        },
        modifications: {
          trouser_legs: {
            type: 'wide_baggy',
            length_type: 'full',
          },
        },
      };

      await fs.promises.writeFile(dnaPath, JSON.stringify(testDna, null, 2), 'utf-8');

      const { compileTechpackFromFile } = await import('../src/pipeline.js');
      const result = await compileTechpackFromFile(dnaPath, {
        outputDir: TEST_OUTPUT_DIR,
        customMeasurements: {
          waist_circumference_mm: 920,
          hip_circumference_mm: 1080,
          thigh_circumference_mm: 650,
        },
      });

      expect(fs.existsSync(result.pdfPath)).toBe(true);
      expect(fs.existsSync(result.mdPath)).toBe(true);
      expect(fs.existsSync(result.jsonPath)).toBe(true);
      expect(result.techSheet.customMeasurements).toBeDefined();
      expect(result.techSheet.customMeasurements?.providedFieldsCount).toBe(3);
    });
  });
});
