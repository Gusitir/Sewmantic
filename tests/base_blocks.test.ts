/**
 * tests/base_blocks.test.ts
 * Suite de pruebas exhaustivas para bloques base (Slopers) y utilidades geométricas
 * pattern-ai-core
 */

import { describe, it, expect } from 'vitest';
import {
  STANDARD_SIZES,
  STANDARD_MEASUREMENTS,
  getStandardMeasurements,
  generateTorsoBlock,
  generateSleeveBlock,
  generateHoodBlock,
  generatePocketBlock,
  generateBaseBlock,
  computePolygonArea,
  computeBounds,
  createPoint,
  sampleBezier,
  distance,
} from '../src/index.js';
import { StandardSize } from '../src/types/pattern.js';

describe('Base Blocks & Geometry Engine', () => {
  // =========================================================================
  // 1. Antropometría y Tabla de Medidas
  // =========================================================================
  describe('Anthropometric Measurements Table', () => {
    it('should have complete measurements for all standard sizes XS to 3XL', () => {
      expect(STANDARD_SIZES).toEqual(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']);

      for (const size of STANDARD_SIZES) {
        const m = getStandardMeasurements(size);
        expect(m.chest_circumference_mm).toBeGreaterThan(0);
        expect(m.waist_circumference_mm).toBeGreaterThan(0);
        expect(m.hip_circumference_mm).toBeGreaterThan(0);
        expect(m.neck_circumference_mm).toBeGreaterThan(0);
        expect(m.shoulder_to_shoulder_mm).toBeGreaterThan(0);
        expect(m.shoulder_slope_deg).toBeGreaterThan(0);
        expect(m.back_length_mm).toBeGreaterThan(0);
        expect(m.front_length_mm).toBeGreaterThan(0);
        expect(m.sleeve_length_mm).toBeGreaterThan(0);
        expect(m.bicep_circumference_mm).toBeGreaterThan(0);
        expect(m.wrist_circumference_mm).toBeGreaterThan(0);
        expect(m.head_circumference_mm).toBeGreaterThan(0);
      }
    });

    it('should exhibit strictly monotonic growth from XS to 3XL for body circumferences', () => {
      for (let i = 0; i < STANDARD_SIZES.length - 1; i++) {
        const currentSize = STANDARD_SIZES[i];
        const nextSize = STANDARD_SIZES[i + 1];

        const mCurrent = getStandardMeasurements(currentSize);
        const mNext = getStandardMeasurements(nextSize);

        expect(mNext.chest_circumference_mm).toBeGreaterThan(mCurrent.chest_circumference_mm);
        expect(mNext.waist_circumference_mm).toBeGreaterThan(mCurrent.waist_circumference_mm);
        expect(mNext.hip_circumference_mm).toBeGreaterThan(mCurrent.hip_circumference_mm);
        expect(mNext.neck_circumference_mm).toBeGreaterThan(mCurrent.neck_circumference_mm);
        expect(mNext.shoulder_to_shoulder_mm).toBeGreaterThan(mCurrent.shoulder_to_shoulder_mm);
        expect(mNext.bicep_circumference_mm).toBeGreaterThan(mCurrent.bicep_circumference_mm);
      }
    });

    it('should throw an error for invalid size names', () => {
      // @ts-expect-error test invalid size
      expect(() => getStandardMeasurements('4XL')).toThrow(/Talla estándar desconocida/);
      // @ts-expect-error test invalid size
      expect(() => getStandardMeasurements('INVALID')).toThrow(/Talla estándar desconocida/);
    });
  });

  // =========================================================================
  // 2. Utilidades Geométricas (Shoelace, Bounds, Bezier)
  // =========================================================================
  describe('Geometry Utilities', () => {
    it('should compute polygon area correctly with Shoelace formula for standard square', () => {
      const square = [
        createPoint(0, 0),
        createPoint(100, 0),
        createPoint(100, 100),
        createPoint(0, 100),
      ];
      expect(computePolygonArea(square)).toBe(10000);
    });

    it('should return 0 area for degenerated polygons with less than 3 points', () => {
      expect(computePolygonArea([])).toBe(0);
      expect(computePolygonArea([createPoint(0, 0), createPoint(10, 10)])).toBe(0);
    });

    it('should compute bounding box accurately', () => {
      const points = [
        createPoint(-50, 10),
        createPoint(100, -20),
        createPoint(30, 200),
      ];
      const bounds = computeBounds(points);
      expect(bounds.minX).toBe(-50);
      expect(bounds.maxX).toBe(100);
      expect(bounds.minY).toBe(-20);
      expect(bounds.maxY).toBe(200);
      expect(bounds.width).toBe(150);
      expect(bounds.height).toBe(220);
    });

    it('should sample Bezier curves smoothly and non-empty', () => {
      const start = createPoint(0, 0);
      const cp1 = createPoint(25, 50);
      const cp2 = createPoint(75, 50);
      const end = createPoint(100, 0);

      const samples = sampleBezier(start, cp1, cp2, end, 10);
      expect(samples.length).toBe(11);
      expect(samples[0]).toEqual({ x: 0, y: 0 });
      expect(samples[10]).toEqual({ x: 100, y: 0 });
    });
  });

  // =========================================================================
  // 3. Generación de Bloques de Torso (Front & Back)
  // =========================================================================
  describe('Torso Slopers (Front & Back)', () => {
    it.each(STANDARD_SIZES)('should generate valid torso slopers for size %s', (size) => {
      const result = generateTorsoBlock(size);
      const { front, back } = result;

      // Validación de Delantero
      expect(front.name).toBe('front');
      expect(front.onFold).toBe(true);
      expect(front.cutCount).toBe(1);
      expect(front.width_mm).toBeGreaterThan(0);
      expect(front.height_mm).toBeGreaterThan(0);
      expect(front.area_mm2).toBeGreaterThan(50000); // Torso adulto > 500 cm2
      expect(front.pathD).toMatch(/^M\s.+Z$/);

      // Puntos de anclaje de delantero requeridos
      const reqFrontPoints = [
        'neck_center',
        'neck_shoulder',
        'shoulder_tip',
        'armhole_pitch',
        'armhole_bottom',
        'side_hem',
        'center_hem',
      ];
      for (const pt of reqFrontPoints) {
        expect(front.points[pt]).toBeDefined();
        expect(Number.isFinite(front.points[pt].x)).toBe(true);
        expect(Number.isFinite(front.points[pt].y)).toBe(true);
      }

      // Validación de Espalda
      expect(back.name).toBe('back');
      expect(back.onFold).toBe(true);
      expect(back.cutCount).toBe(1);
      expect(back.width_mm).toBeGreaterThan(0);
      expect(back.height_mm).toBeGreaterThan(0);
      expect(back.area_mm2).toBeGreaterThan(50000);
      expect(back.pathD).toMatch(/^M\s.+Z$/);

      // Puntos de anclaje de espalda requeridos
      for (const pt of reqFrontPoints) {
        expect(back.points[pt]).toBeDefined();
        expect(Number.isFinite(back.points[pt].x)).toBe(true);
        expect(Number.isFinite(back.points[pt].y)).toBe(true);
      }

      // Marcas técnicas
      expect(front.grainline.label).toContain('GRAINLINE');
      expect(front.notches.length).toBeGreaterThanOrEqual(1);
      expect(front.notches[0].type).toBe('single');

      expect(back.grainline.label).toContain('GRAINLINE');
      expect(back.notches.length).toBeGreaterThanOrEqual(1);
      expect(back.notches[0].type).toBe('double');
    });

    it('should scale torso area monotonically with sizes', () => {
      const areasFront = STANDARD_SIZES.map((s) => generateTorsoBlock(s).front.area_mm2);
      const areasBack = STANDARD_SIZES.map((s) => generateTorsoBlock(s).back.area_mm2);

      for (let i = 0; i < areasFront.length - 1; i++) {
        expect(areasFront[i + 1]).toBeGreaterThan(areasFront[i]);
        expect(areasBack[i + 1]).toBeGreaterThan(areasBack[i]);
      }
    });

    it('should respond to custom ease and delta options', () => {
      const standard = generateTorsoBlock('M', { chest_ease_mm: 40 });
      const oversize = generateTorsoBlock('M', { chest_ease_mm: 160 });

      expect(oversize.front.width_mm).toBeGreaterThan(standard.front.width_mm);
      expect(oversize.front.area_mm2).toBeGreaterThan(standard.front.area_mm2);
    });
  });

  // =========================================================================
  // 4. Generación de Bloques de Manga (Sleeve)
  // =========================================================================
  describe('Sleeve Sloper', () => {
    it.each(STANDARD_SIZES)('should generate valid sleeve for size %s', (size) => {
      const { sleeve } = generateSleeveBlock(size);

      expect(sleeve.name).toBe('sleeve');
      expect(sleeve.cutCount).toBe(2);
      expect(sleeve.width_mm).toBeGreaterThan(0);
      expect(sleeve.height_mm).toBeGreaterThan(0);
      expect(sleeve.area_mm2).toBeGreaterThan(80000);
      expect(sleeve.pathD).toMatch(/^M\s.+Z$/);

      // Puntos de anclaje de manga obligatorios
      const reqPoints = [
        'cap_top',
        'cap_front_notch',
        'cap_back_notch',
        'underarm_front',
        'underarm_back',
        'wrist_front',
        'wrist_back',
      ];
      for (const pt of reqPoints) {
        expect(sleeve.points[pt]).toBeDefined();
        expect(Number.isFinite(sleeve.points[pt].x)).toBe(true);
        expect(Number.isFinite(sleeve.points[pt].y)).toBe(true);
      }

      // Verificación de Notches
      const notchTypes = sleeve.notches.map((n) => n.type);
      expect(notchTypes).toContain('single');
      expect(notchTypes).toContain('double');
      expect(sleeve.grainline.label).toContain('GRAINLINE');
    });

    it('should scale sleeve dimensions monotonically across sizes', () => {
      const widths = STANDARD_SIZES.map((s) => generateSleeveBlock(s).sleeve.width_mm);
      for (let i = 0; i < widths.length - 1; i++) {
        expect(widths[i + 1]).toBeGreaterThan(widths[i]);
      }
    });
  });

  // =========================================================================
  // 5. Generación de Bloques de Capucha (Hood - Standard & Crossover)
  // =========================================================================
  describe('Hood Sloper', () => {
    it.each(STANDARD_SIZES)('should generate valid standard hood for size %s', (size) => {
      const { hood } = generateHoodBlock(size, { type: 'standard' });

      expect(hood.name).toBe('hood');
      expect(hood.cutCount).toBe(2);
      expect(hood.width_mm).toBeGreaterThan(0);
      expect(hood.height_mm).toBeGreaterThan(0);
      expect(hood.area_mm2).toBeGreaterThan(60000);
      expect(hood.pathD).toMatch(/^M\s.+Z$/);

      const reqPoints = [
        'neck_back',
        'neck_front',
        'crown_top',
        'crown_back',
        'face_top',
        'face_bottom',
      ];
      for (const pt of reqPoints) {
        expect(hood.points[pt]).toBeDefined();
        expect(Number.isFinite(hood.points[pt].x)).toBe(true);
        expect(Number.isFinite(hood.points[pt].y)).toBe(true);
      }
    });

    it('should generate crossover hood with crossover_tip and wider base', () => {
      const std = generateHoodBlock('L', { type: 'standard' }).hood;
      const cross = generateHoodBlock('L', { type: 'crossover', crossover_overlap_mm: 60 }).hood;

      expect(cross.points.crossover_tip).toBeDefined();
      expect(cross.points.neck_front.x).toBeGreaterThan(std.points.neck_front.x);
      expect(cross.area_mm2).toBeGreaterThan(std.area_mm2);
      expect(cross.label).toContain('CROSSOVER');
    });
  });

  // =========================================================================
  // 6. Generación de Bloques de Bolsillo (Pocket - Kangaroo & Patch)
  // =========================================================================
  describe('Pocket Slopers', () => {
    it.each(STANDARD_SIZES)('should generate valid kangaroo pocket for size %s', (size) => {
      const { pocket } = generatePocketBlock(size, { type: 'kangaroo' });

      expect(pocket.name).toBe('pocket');
      expect(pocket.width_mm).toBeGreaterThan(0);
      expect(pocket.height_mm).toBeGreaterThan(0);
      expect(pocket.area_mm2).toBeGreaterThan(20000);
      expect(pocket.pathD).toMatch(/^M\s.+Z$/);

      const reqPoints = [
        'top_center',
        'top_outer',
        'opening_top',
        'opening_bottom',
        'bottom_outer',
        'bottom_center',
      ];
      for (const pt of reqPoints) {
        expect(pocket.points[pt]).toBeDefined();
        expect(Number.isFinite(pocket.points[pt].x)).toBe(true);
        expect(Number.isFinite(pocket.points[pt].y)).toBe(true);
      }
    });

    it.each(STANDARD_SIZES)('should generate valid patch pocket for size %s', (size) => {
      const { pocket } = generatePocketBlock(size, { type: 'patch' });

      expect(pocket.name).toBe('pocket');
      expect(pocket.width_mm).toBeGreaterThan(0);
      expect(pocket.height_mm).toBeGreaterThan(0);
      expect(pocket.area_mm2).toBeGreaterThan(15000);
      expect(pocket.pathD).toMatch(/^M\s.+Z$/);

      const reqPoints = [
        'top_left',
        'top_right',
        'bottom_right',
        'bottom_left',
        'hem_left',
        'hem_right',
      ];
      for (const pt of reqPoints) {
        expect(pocket.points[pt]).toBeDefined();
        expect(Number.isFinite(pocket.points[pt].x)).toBe(true);
        expect(Number.isFinite(pocket.points[pt].y)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 7. Constructor Unificado generateBaseBlock
  // =========================================================================
  describe('Unified generateBaseBlock Factory', () => {
    it('should generate complete hoodie sloper with all parts (front, back, sleeve, hood, pocket)', () => {
      const result = generateBaseBlock('hoodie_sloper', 'L');

      expect(result.size).toBe('L');
      expect(result.parts.front).toBeDefined();
      expect(result.parts.back).toBeDefined();
      expect(result.parts.sleeve).toBeDefined();
      expect(result.parts.hood).toBeDefined();
      expect(result.parts.pocket).toBeDefined();

      expect(result.bounds.width).toBeGreaterThan(0);
      expect(result.bounds.height).toBeGreaterThan(0);
    });

    it('should generate complete tshirt sloper with torso and short sleeve', () => {
      const result = generateBaseBlock('tshirt_sloper', 'M');

      expect(result.parts.front).toBeDefined();
      expect(result.parts.back).toBeDefined();
      expect(result.parts.sleeve).toBeDefined();
    });

    it('should generate individual sleeve block', () => {
      const result = generateBaseBlock('sleeve', 'XL');
      expect(result.parts.sleeve).toBeDefined();
      expect(result.parts.front).toBeUndefined();
    });

    it('should generate individual hood block with crossover style', () => {
      const result = generateBaseBlock('crossover_hood', 'S');
      expect(result.parts.hood).toBeDefined();
      expect(result.parts.hood.label).toContain('CROSSOVER');
    });

    it('should generate individual pocket block with patch style', () => {
      const result = generateBaseBlock('patch_pocket', 'M');
      expect(result.parts.pocket).toBeDefined();
      expect(result.parts.pocket.points.top_left).toBeDefined();
    });
  });
});
