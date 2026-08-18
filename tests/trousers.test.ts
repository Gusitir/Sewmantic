/**
 * tests/trousers.test.ts
 * Suite de pruebas exhaustivas para el Sloper Base de Pantalón y Shorts Paramétrico
 * pattern-ai-core - Motor Geométrico FreeSewing v3
 */

import { describe, it, expect } from 'vitest';
import {
  STANDARD_SIZES,
  STANDARD_MEASUREMENTS,
  getStandardMeasurements,
  generateTrouserBlock,
  getTrouserSloper,
  generateBaseBlock,
  bezierLength,
  distance,
} from '../src/index.js';
import { StandardSize } from '../src/types/pattern.js';
import { TrouserLengthType } from '../src/engine/base_blocks/trousers.js';

describe('Trouser & Shorts Parametric Sloper Engine', () => {
  // =========================================================================
  // 1. Antropometría de Tren Inferior
  // =========================================================================
  describe('Lower Body Anthropometric Measurements', () => {
    it('should include all required lower body anthropometric fields for all standard sizes', () => {
      for (const size of STANDARD_SIZES) {
        const m = getStandardMeasurements(size);
        expect(m.waist_to_floor_mm).toBeGreaterThan(900);
        expect(m.crotch_depth_mm).toBeGreaterThan(200);
        expect(m.inseam_mm).toBeGreaterThan(600);
        expect(m.thigh_circumference_mm).toBeGreaterThan(400);
        expect(m.knee_circumference_mm).toBeGreaterThan(300);
        expect(m.ankle_circumference_mm).toBeGreaterThan(180);
      }
    });

    it('should satisfy monotonic growth across sizes for lower body measurements', () => {
      for (let i = 0; i < STANDARD_SIZES.length - 1; i++) {
        const currentSize = STANDARD_SIZES[i];
        const nextSize = STANDARD_SIZES[i + 1];

        const mCurrent = getStandardMeasurements(currentSize);
        const mNext = getStandardMeasurements(nextSize);

        expect(mNext.waist_to_floor_mm).toBeGreaterThan(mCurrent.waist_to_floor_mm);
        expect(mNext.crotch_depth_mm).toBeGreaterThan(mCurrent.crotch_depth_mm);
        expect(mNext.inseam_mm).toBeGreaterThanOrEqual(mCurrent.inseam_mm);
        expect(mNext.thigh_circumference_mm).toBeGreaterThan(mCurrent.thigh_circumference_mm);
        expect(mNext.knee_circumference_mm).toBeGreaterThan(mCurrent.knee_circumference_mm);
        expect(mNext.ankle_circumference_mm).toBeGreaterThan(mCurrent.ankle_circumference_mm);
      }
    });
  });

  // =========================================================================
  // 2. Generación de Delantero y Espalda en todas las tallas (XS a 3XL)
  // =========================================================================
  describe('Trouser Sloper Generation across all Standard Sizes (XS to 3XL)', () => {
    it.each(STANDARD_SIZES)('should generate valid front_leg and back_leg for size %s', (size) => {
      const { front_leg, back_leg } = generateTrouserBlock(size);

      // --- Delantero (front_leg) ---
      expect(front_leg.name).toBe('front_leg');
      expect(front_leg.cutCount).toBe(2);
      expect(front_leg.onFold).toBe(false);
      expect(front_leg.width_mm).toBeGreaterThan(0);
      expect(front_leg.height_mm).toBeGreaterThan(0);
      expect(front_leg.area_mm2).toBeGreaterThan(80000); // Pierna de pantalón adulto > 800 cm2
      expect(front_leg.pathD).toMatch(/^M\s.+Z$/);
      expect(front_leg.outline.length).toBeGreaterThanOrEqual(10);

      // Puntos de anclaje obligatorios del delantero
      const reqPointsFront = [
        'waist_center',
        'waist_side',
        'hip_center',
        'hip_side',
        'crotch_tip',
        'knee_in',
        'knee_out',
        'hem_in',
        'hem_out',
        'crease_top',
        'crease_bottom',
      ];
      for (const pt of reqPointsFront) {
        expect(front_leg.points[pt]).toBeDefined();
        expect(Number.isFinite(front_leg.points[pt].x)).toBe(true);
        expect(Number.isFinite(front_leg.points[pt].y)).toBe(true);
      }

      // --- Espalda (back_leg) ---
      expect(back_leg.name).toBe('back_leg');
      expect(back_leg.cutCount).toBe(2);
      expect(back_leg.onFold).toBe(false);
      expect(back_leg.width_mm).toBeGreaterThan(0);
      expect(back_leg.height_mm).toBeGreaterThan(0);
      expect(back_leg.area_mm2).toBeGreaterThan(80000);
      expect(back_leg.pathD).toMatch(/^M\s.+Z$/);
      expect(back_leg.outline.length).toBeGreaterThanOrEqual(10);

      // Puntos de anclaje obligatorios de la espalda
      for (const pt of reqPointsFront) {
        expect(back_leg.points[pt]).toBeDefined();
        expect(Number.isFinite(back_leg.points[pt].x)).toBe(true);
        expect(Number.isFinite(back_leg.points[pt].y)).toBe(true);
      }

      // La cintura trasera debe tener elevación anatómica negativa en Y (Y crece hacia abajo)
      expect(back_leg.points.waist_center.y).toBeLessThan(front_leg.points.waist_center.y);

      // La punta de tiro trasera debe proyectarse más que la delantera
      const frontCrotchSpan = Math.abs(front_leg.points.crotch_tip.x - front_leg.points.hip_center.x);
      const backCrotchSpan = Math.abs(back_leg.points.crotch_tip.x - back_leg.points.hip_center.x);
      expect(backCrotchSpan).toBeGreaterThan(frontCrotchSpan);
    });

    it('should scale pattern area monotonically with sizes', () => {
      const frontAreas = STANDARD_SIZES.map((s) => generateTrouserBlock(s).front_leg.area_mm2);
      const backAreas = STANDARD_SIZES.map((s) => generateTrouserBlock(s).back_leg.area_mm2);

      for (let i = 0; i < frontAreas.length - 1; i++) {
        expect(frontAreas[i + 1]).toBeGreaterThan(frontAreas[i]);
        expect(backAreas[i + 1]).toBeGreaterThan(backAreas[i]);
      }
    });
  });

  // =========================================================================
  // 3. REQUISITO MATEMÁTICO INVARIANTE: Tolerancia de Entrepierna (Δ <= 3 mm)
  // =========================================================================
  describe('Mathematical Invariant: Inseam Seam Matching Tolerance (Δ <= 3 mm)', () => {
    it.each(STANDARD_SIZES)(
      'should match front and back inseam lengths strictly within 3 mm for size %s',
      (size) => {
        const { front_leg, back_leg } = generateTrouserBlock(size);

        // Medir longitud real de costura de entrepierna delantera
        const frontCrotch = front_leg.points.crotch_tip;
        const frontKnee = front_leg.points.knee_in;
        const frontHem = front_leg.points.hem_in;

        // Medir longitud real de costura de entrepierna trasera
        const backCrotch = back_leg.points.crotch_tip;
        const backKnee = back_leg.points.knee_in;
        const backHem = back_leg.points.hem_in;

        // Calcular distancia o aproximación del contorno de entrepierna
        // En front_leg y back_leg, la entrepierna va desde crotch_tip hasta knee_in y luego a hem_in
        const frontInseamRough = distance(frontCrotch, frontKnee) + distance(frontKnee, frontHem);
        const backInseamRough = distance(backCrotch, backKnee) + distance(backKnee, backHem);

        // Tolerancia geométrica global <= 3 mm
        const delta = Math.abs(frontInseamRough - backInseamRough);
        expect(delta).toBeLessThanOrEqual(3.0);
      }
    );

    const lengthTypes: TrouserLengthType[] = ['full', 'shorts', 'bermuda', 'cropped'];
    it.each(lengthTypes)(
      'should satisfy inseam tolerance <= 3 mm for length variant "%s"',
      (lengthType) => {
        const { front_leg, back_leg } = generateTrouserBlock('L', { length_type: lengthType });

        const isShorts = lengthType === 'shorts' || lengthType === 'bermuda';
        let frontLen: number;
        let backLen: number;

        if (isShorts) {
          frontLen = distance(front_leg.points.crotch_tip, front_leg.points.hem_in);
          backLen = distance(back_leg.points.crotch_tip, back_leg.points.hem_in);
        } else {
          frontLen =
            distance(front_leg.points.crotch_tip, front_leg.points.knee_in) +
            distance(front_leg.points.knee_in, front_leg.points.hem_in);
          backLen =
            distance(back_leg.points.crotch_tip, back_leg.points.knee_in) +
            distance(back_leg.points.knee_in, back_leg.points.hem_in);
        }

        const delta = Math.abs(frontLen - backLen);
        expect(delta).toBeLessThanOrEqual(3.0);
      }
    );
  });

  // =========================================================================
  // 4. Variantes de Longitud: full, shorts, bermuda, cropped
  // =========================================================================
  describe('Length Variants (full, shorts, bermuda, cropped)', () => {
    it('should generate full length trousers with standard floor length', () => {
      const { front_leg } = generateTrouserBlock('M', { length_type: 'full' });
      const m = getStandardMeasurements('M');
      expect(front_leg.height_mm).toBeGreaterThan(950);
      expect(front_leg.label).toContain('PANTALÓN');
    });

    it('should generate shorts/bermuda with knee-level hem', () => {
      const full = generateTrouserBlock('M', { length_type: 'full' }).front_leg;
      const shorts = generateTrouserBlock('M', { length_type: 'shorts' }).front_leg;
      const bermuda = generateTrouserBlock('M', { length_type: 'bermuda' }).front_leg;

      expect(shorts.height_mm).toBeLessThan(full.height_mm);
      expect(shorts.area_mm2).toBeLessThan(full.area_mm2);
      expect(shorts.label).toContain('SHORTS');

      expect(bermuda.height_mm).toBeLessThan(full.height_mm);
      expect(bermuda.label).toContain('SHORTS');
    });

    it('should generate cropped capri/pescador between knee and floor', () => {
      const full = generateTrouserBlock('M', { length_type: 'full' }).front_leg;
      const cropped = generateTrouserBlock('M', { length_type: 'cropped' }).front_leg;
      const shorts = generateTrouserBlock('M', { length_type: 'shorts' }).front_leg;

      expect(cropped.height_mm).toBeLessThan(full.height_mm);
      expect(cropped.height_mm).toBeGreaterThan(shorts.height_mm);
    });
  });

  // =========================================================================
  // 5. Marcas Técnicas Obligatorias: Grainline & Notches (100% de las piezas)
  // =========================================================================
  describe('Technical Marks: Grainline, Notches and Seam Allowances', () => {
    it('should have vertical grainline aligned with crease line on both front and back legs', () => {
      for (const size of STANDARD_SIZES) {
        const { front_leg, back_leg } = generateTrouserBlock(size);

        // Delantero
        expect(front_leg.grainline).toBeDefined();
        expect(front_leg.grainline.label).toContain('GRAINLINE');
        expect(front_leg.grainline.start.x).toBe(0); // Centrado en la línea de aplomo
        expect(front_leg.grainline.end.x).toBe(0);
        expect(front_leg.grainline.end.y).toBeGreaterThan(front_leg.grainline.start.y);

        // Espalda
        expect(back_leg.grainline).toBeDefined();
        expect(back_leg.grainline.label).toContain('GRAINLINE');
        expect(back_leg.grainline.start.x).toBe(0);
        expect(back_leg.grainline.end.x).toBe(0);
        expect(back_leg.grainline.end.y).toBeGreaterThan(back_leg.grainline.start.y);
      }
    });

    it('should have single notches on front leg and double notches on back leg', () => {
      const { front_leg, back_leg } = generateTrouserBlock('M');

      // Delantero: Piquetes simples
      expect(front_leg.notches.length).toBeGreaterThanOrEqual(2);
      const frontTypes = front_leg.notches.map((n) => n.type);
      expect(frontTypes.every((t) => t === 'single')).toBe(true);

      // Espalda: Piquetes dobles
      expect(back_leg.notches.length).toBeGreaterThanOrEqual(2);
      const backTypes = back_leg.notches.map((n) => n.type);
      expect(backTypes.every((t) => t === 'double')).toBe(true);
    });

    it('should include correct seam and hem allowances', () => {
      const { front_leg, back_leg } = generateTrouserBlock('L', {
        seam_allowance_mm: 12,
        hem_allowance_mm: 35,
      });

      expect(front_leg.seamAllowance_mm).toBe(12);
      expect(front_leg.hemAllowance_mm).toBe(35);
      expect(back_leg.seamAllowance_mm).toBe(12);
      expect(back_leg.hemAllowance_mm).toBe(35);
    });
  });

  // =========================================================================
  // 6. getTrouserSloper y Constructor Unificado generateBaseBlock
  // =========================================================================
  describe('getTrouserSloper & Unified Factory generateBaseBlock', () => {
    it('should generate BaseBlockResult with getTrouserSloper', () => {
      const result = getTrouserSloper('M');

      expect(result.blockType).toBe('pants_sloper');
      expect(result.size).toBe('M');
      expect(result.measurements).toBeDefined();
      expect(result.parts.front_leg).toBeDefined();
      expect(result.parts.back_leg).toBeDefined();
      expect(result.bounds.width).toBeGreaterThan(0);
      expect(result.bounds.height).toBeGreaterThan(0);
    });

    it.each([
      'pants_sloper',
      'pants',
      'trousers',
      'trouser_sloper',
      'shorts',
      'bermuda',
      'cropped_pants',
    ])('should generate trouser parts via generateBaseBlock("%s", "L")', (blockType) => {
      const res = generateBaseBlock(blockType, 'L');

      expect(res.parts.front_leg).toBeDefined();
      expect(res.parts.back_leg).toBeDefined();
      expect(res.bounds.width).toBeGreaterThan(0);
      expect(res.bounds.height).toBeGreaterThan(0);
    });
  });
});
