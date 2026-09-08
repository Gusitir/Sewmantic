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
  modifyPatternMultiSize,
  type Point2D,
} from '../src/index.js';
import { StandardSize, PatternDna } from '../src/types/pattern.js';
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

  // =========================================================================
  // 7. T-62: Garantía de Polígono Simple (Regresión Auto-Intersección Pernera)
  //    Decision D-2026-09-08-LEG / PLAN v1.9
  // =========================================================================
  describe('T-62: Simple-Polygon Guarantee (Back Leg Self-Intersection Regression)', () => {
    // Helper: intersección segmento-segmento (orientaciones + casos colineales)
    const GEOM_EPS = 1e-6;

    function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
      return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    }

    function onSegment(a: Point2D, b: Point2D, p: Point2D): boolean {
      return (
        Math.min(a.x, b.x) - GEOM_EPS <= p.x &&
        p.x <= Math.max(a.x, b.x) + GEOM_EPS &&
        Math.min(a.y, b.y) - GEOM_EPS <= p.y &&
        p.y <= Math.max(a.y, b.y) + GEOM_EPS
      );
    }

    function segmentsIntersect(a1: Point2D, a2: Point2D, b1: Point2D, b2: Point2D): boolean {
      // Segmentos degenerados (longitud cero) no participan
      if (distance(a1, a2) < GEOM_EPS || distance(b1, b2) < GEOM_EPS) return false;

      const o1 = orient(a1.x, a1.y, a2.x, a2.y, b1.x, b1.y);
      const o2 = orient(a1.x, a1.y, a2.x, a2.y, b2.x, b2.y);
      const o3 = orient(b1.x, b1.y, b2.x, b2.y, a1.x, a1.y);
      const o4 = orient(b1.x, b1.y, b2.x, b2.y, a2.x, a2.y);

      if (((o1 > GEOM_EPS && o2 < -GEOM_EPS) || (o1 < -GEOM_EPS && o2 > GEOM_EPS)) &&
          ((o3 > GEOM_EPS && o4 < -GEOM_EPS) || (o3 < -GEOM_EPS && o4 > GEOM_EPS))) {
        return true;
      }
      if (Math.abs(o1) <= GEOM_EPS && onSegment(a1, a2, b1)) return true;
      if (Math.abs(o2) <= GEOM_EPS && onSegment(a1, a2, b2)) return true;
      if (Math.abs(o3) <= GEOM_EPS && onSegment(b1, b2, a1)) return true;
      if (Math.abs(o4) <= GEOM_EPS && onSegment(b1, b2, a2)) return true;
      return false;
    }

    /** Un contorno es polígono simple si ningún par de segmentos no adyacentes se cruza. */
    function isSimpleClosedOutline(outline: Point2D[]): boolean {
      const n = outline.length;
      if (n < 3) return false;
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue; // adyacentes en el anillo cerrado
          const a1 = outline[i];
          const a2 = outline[(i + 1) % n];
          const b1 = outline[j];
          const b2 = outline[(j + 1) % n];
          if (segmentsIntersect(a1, a2, b1, b2)) return false;
        }
      }
      return true;
    }

    function expectSimpleLegs(front: { outline: Point2D[] }, back: { outline: Point2D[] }, context: string) {
      expect(isSimpleClosedOutline(front.outline), `front_leg outline self-intersects for ${context}`).toBe(true);
      expect(isSimpleClosedOutline(back.outline), `back_leg outline self-intersects for ${context}`).toBe(true);
    }

    // ADN exacto del fallo en producción (output/pirate_captain_denim_bermuda)
    const failingDna: PatternDna = {
      concept_name: 'pirate_captain_denim_bermuda',
      base_block: 'pants_sloper',
      ease: {
        chest_ease_mm: 0,
        waist_ease_mm: 30,
        hip_ease_mm: 70,
      },
      modifications: {
        hem: { type: 'custom', allowance_mm: 50 },
        waistband: { type: 'fitted', height_mm: 40 },
        trouser_hem: { type: 'cuffed', cuff_height_mm: 45 },
        trouser_legs: { type: 'wide_baggy', length_type: 'bermuda', inseam_mm: 340 },
        closure: {
          type: 'zipper',
          overlap_mm: 35,
          button_count: 1,
          button_diameter_mm: 20,
          buttonhole_orientation: 'horizontal',
        },
      },
      sizing: {
        size: 'M',
        height_mm: 1780,
        waist_circ_mm: 820,
        hip_circ_mm: 980,
        target_layers: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
        custom_measurements: {
          chest_circumference_mm: 1040,
          waist_circumference_mm: 820,
          hip_circumference_mm: 980,
          inseam_mm: 800,
          sleeve_length_mm: 650,
        },
        chest_circ_mm: 1040,
      },
      custom_measurements: {
        chest_circumference_mm: 1040,
        waist_circumference_mm: 820,
        hip_circumference_mm: 980,
        inseam_mm: 800,
        sleeve_length_mm: 650,
      },
    };

    it('regression: real failing DNA (wide_baggy + bermuda inseam 340 + cuffed) produces simple outlines in all sizes', () => {
      const sizes: StandardSize[] = ['S', 'M', 'L', 'XL', '2XL'];
      const results = modifyPatternMultiSize(failingDna, sizes);

      for (const size of sizes) {
        const result = results.get(size);
        expect(result, `no result for size ${size}`).toBeDefined();
        const front = result!.parts.front_leg;
        const back = result!.parts.back_leg;
        expect(front).toBeDefined();
        expect(back).toBeDefined();

        // Hem por debajo del tiro (invariante básico de pierna)
        expect(front.points.hem_in.y, `front hem above crotch for ${size}`).toBeGreaterThan(
          front.points.crotch_tip.y
        );
        expect(back.points.hem_in.y, `back hem above crotch for ${size}`).toBeGreaterThan(
          back.points.crotch_tip.y
        );

        expectSimpleLegs(front, back, `failing DNA size ${size}`);
      }
    });

    it('extreme combos: inseam 100/1200 x silhouettes x lengths x cuff always produce simple outlines', () => {
      const inseams = [100, 340, 1200];
      const legTypes = ['wide_baggy', 'slim', 'flare'] as const;
      const lengths = ['shorts', 'bermuda', 'cropped', 'full'] as const;

      for (const inseam of inseams) {
        for (const legType of legTypes) {
          for (const lengthType of lengths) {
            const dna: PatternDna = {
              concept_name: `t62_extreme_${legType}_${lengthType}_${inseam}`,
              base_block: 'pants_sloper',
              ease: { waist_ease_mm: 30, hip_ease_mm: 70 },
              modifications: {
                trouser_hem: { type: 'cuffed', cuff_height_mm: 45 },
                trouser_legs: { type: legType, length_type: lengthType, inseam_mm: inseam },
              },
              custom_measurements: {
                chest_circumference_mm: 1040,
                waist_circumference_mm: 820,
                hip_circumference_mm: 980,
                inseam_mm: 800,
                sleeve_length_mm: 650,
              },
            };

            const result = modifyPatternMultiSize(dna, ['M']).get('M')!;
            expectSimpleLegs(
              result.parts.front_leg,
              result.parts.back_leg,
              `${legType} + ${lengthType} + inseam ${inseam} + cuff`
            );
          }
        }
      }
    });
  });
});
