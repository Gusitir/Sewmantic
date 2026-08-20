/**
 * tests/womenswear.test.ts
 * Suite de pruebas unitarias y de integración para Slopers Femeninos (Corpiño con Pinzas y Falda)
 * pattern-ai-core - Motor Geométrico FreeSewing v3
 */

import { describe, it, expect } from 'vitest';
import {
  STANDARD_SIZES,
  STANDARD_MEASUREMENTS,
  getStandardMeasurements,
  calculateCustomMeasurements,
  generateWomensBodiceBlock,
  getWomensBodiceSloper,
  generateSkirtBlock,
  getSkirtSloper,
  generateBaseBlock,
  distance,
} from '../src/index.js';
import { StandardSize } from '../src/types/pattern.js';
import { SkirtSilhouette } from '../src/engine/base_blocks/skirt.js';

describe('Womenswear Parametric Sloper Engine (Bodice & Skirt)', () => {
  // =========================================================================
  // 1. Antropometría Femenina Ampliada
  // =========================================================================
  describe('1. Female Anthropometric Measurements', () => {
    it('should include all required female anthropometric fields for all standard sizes', () => {
      for (const size of STANDARD_SIZES) {
        const m = getStandardMeasurements(size);
        expect(m.bust_span_mm).toBeGreaterThanOrEqual(160);
        expect(m.bust_span_mm).toBeLessThanOrEqual(260);

        expect(m.underbust_circumference_mm).toBeGreaterThanOrEqual(600);
        expect(m.underbust_circumference_mm).toBeLessThanOrEqual(1200);

        expect(m.waist_to_hip_mm).toBeGreaterThanOrEqual(160);
        expect(m.waist_to_hip_mm).toBeLessThanOrEqual(240);

        expect(m.skirt_length_mm).toBeGreaterThanOrEqual(450);
        expect(m.skirt_length_mm).toBeLessThanOrEqual(750);
      }
    });

    it('should satisfy monotonic growth across sizes for female measurements', () => {
      for (let i = 0; i < STANDARD_SIZES.length - 1; i++) {
        const currentSize = STANDARD_SIZES[i];
        const nextSize = STANDARD_SIZES[i + 1];

        const mCurrent = getStandardMeasurements(currentSize);
        const mNext = getStandardMeasurements(nextSize);

        expect(mNext.bust_span_mm).toBeGreaterThan(mCurrent.bust_span_mm);
        expect(mNext.underbust_circumference_mm).toBeGreaterThan(mCurrent.underbust_circumference_mm);
        expect(mNext.waist_to_hip_mm).toBeGreaterThanOrEqual(mCurrent.waist_to_hip_mm);
        expect(mNext.skirt_length_mm).toBeGreaterThanOrEqual(mCurrent.skirt_length_mm);
      }
    });

    it('should calculate harmonic custom female measurements correctly', () => {
      const custom = calculateCustomMeasurements(
        {
          chest_circumference_mm: 1040,
          bust_span_mm: 210,
          waist_to_hip_mm: 205,
        },
        'M'
      );

      expect(custom.chest_circumference_mm).toBe(1040);
      expect(custom.bust_span_mm).toBe(210);
      expect(custom.waist_to_hip_mm).toBe(205);
      expect(custom.underbust_circumference_mm).toBeGreaterThan(810);
    });
  });

  // =========================================================================
  // 2. Corpiño Femenino Anatómico con Pinzas (Womens Bodice)
  // =========================================================================
  describe('2. Womens Bodice Sloper Generation (XS to 3XL)', () => {
    it.each(STANDARD_SIZES)('should generate valid front_bodice and back_bodice for size %s', (size) => {
      const { front_bodice, back_bodice } = generateWomensBodiceBlock(size);

      // --- Delantero (front_bodice) ---
      expect(front_bodice.name).toBe('front_bodice');
      expect(front_bodice.cutCount).toBe(1);
      expect(front_bodice.onFold).toBe(true);
      expect(front_bodice.width_mm).toBeGreaterThan(0);
      expect(front_bodice.height_mm).toBeGreaterThan(0);
      expect(front_bodice.area_mm2).toBeGreaterThan(30000);
      expect(front_bodice.pathD).toMatch(/^M\s.+Z$/);
      expect(front_bodice.outline.length).toBeGreaterThanOrEqual(8);

      // Puntos de anclaje obligatorios del delantero
      const reqPointsFront = [
        'neck_center',
        'neck_shoulder',
        'shoulder_tip',
        'armhole_pitch',
        'armhole_bottom',
        'bust_apex',
        'dart_top_leg',
        'dart_tip',
        'dart_bottom_leg',
        'side_waist',
        'center_hem',
      ];
      for (const pt of reqPointsFront) {
        expect(front_bodice.points[pt]).toBeDefined();
        expect(Number.isFinite(front_bodice.points[pt].x)).toBe(true);
        expect(Number.isFinite(front_bodice.points[pt].y)).toBe(true);
      }

      // --- Espalda (back_bodice) ---
      expect(back_bodice.name).toBe('back_bodice');
      expect(back_bodice.cutCount).toBe(1);
      expect(back_bodice.onFold).toBe(true);
      expect(back_bodice.width_mm).toBeGreaterThan(0);
      expect(back_bodice.height_mm).toBeGreaterThan(0);
      expect(back_bodice.area_mm2).toBeGreaterThan(30000);
      expect(back_bodice.pathD).toMatch(/^M\s.+Z$/);
      expect(back_bodice.outline.length).toBeGreaterThanOrEqual(8);

      // Puntos de anclaje obligatorios de la espalda
      const reqPointsBack = [
        'neck_center',
        'neck_shoulder',
        'shoulder_tip',
        'armhole_pitch',
        'armhole_bottom',
        'side_waist',
        'dart_outer',
        'dart_tip',
        'dart_inner',
        'center_hem',
      ];
      for (const pt of reqPointsBack) {
        expect(back_bodice.points[pt]).toBeDefined();
        expect(Number.isFinite(back_bodice.points[pt].x)).toBe(true);
        expect(Number.isFinite(back_bodice.points[pt].y)).toBe(true);
      }
    });

    it('should scale bodice pattern areas monotonically with sizes', () => {
      const frontAreas = STANDARD_SIZES.map((s) => generateWomensBodiceBlock(s).front_bodice.area_mm2);
      const backAreas = STANDARD_SIZES.map((s) => generateWomensBodiceBlock(s).back_bodice.area_mm2);

      for (let i = 0; i < frontAreas.length - 1; i++) {
        expect(frontAreas[i + 1]).toBeGreaterThan(frontAreas[i]);
        expect(backAreas[i + 1]).toBeGreaterThan(backAreas[i]);
      }
    });

    // =======================================================================
    // REQUISITO MATEMÁTICO INVARIANTE:
    // Longitud de costura de costado delantero (con pinza cerrada) == espalda (Δ <= 1 mm)
    // =======================================================================
    it.each(STANDARD_SIZES)(
      'should strictly match front and back side seam lengths within 1 mm for size %s',
      (size) => {
        const { front_bodice, back_bodice } = generateWomensBodiceBlock(size);

        // Medir longitud real de costura de costado delantero con pinza cerrada
        const frontArmholeBottom = front_bodice.points.armhole_bottom;
        const dartTopLeg = front_bodice.points.dart_top_leg;
        const dartBottomLeg = front_bodice.points.dart_bottom_leg;
        const frontSideWaist = front_bodice.points.side_waist;

        const frontSewnSideLength =
          distance(frontArmholeBottom, dartTopLeg) + distance(dartBottomLeg, frontSideWaist);

        // Medir longitud real de costura de costado espalda
        const backArmholeBottom = back_bodice.points.armhole_bottom;
        const backSideWaist = back_bodice.points.side_waist;
        const backSideLength = distance(backArmholeBottom, backSideWaist);

        const delta = Math.abs(frontSewnSideLength - backSideLength);
        expect(delta).toBeLessThanOrEqual(1.0);
      }
    );

    it('should have symmetrical dart legs on front bodice side dart', () => {
      for (const size of STANDARD_SIZES) {
        const { front_bodice } = generateWomensBodiceBlock(size);
        const topLeg = front_bodice.points.dart_top_leg;
        const tip = front_bodice.points.bust_dart_tip;
        const bottomLeg = front_bodice.points.dart_bottom_leg;

        const topLegLength = distance(topLeg, tip);
        const bottomLegLength = distance(bottomLeg, tip);

        const legDelta = Math.abs(topLegLength - bottomLegLength);
        expect(legDelta).toBeLessThanOrEqual(0.01);
      }
    });
  });

  // =========================================================================
  // 3. Falda Paramétrica (Skirt Sloper)
  // =========================================================================
  describe('3. Skirt Sloper Generation across all Silhouettes and Sizes', () => {
    it.each(STANDARD_SIZES)('should generate valid front_skirt and back_skirt for size %s', (size) => {
      const { front_skirt, back_skirt } = generateSkirtBlock(size);

      // --- Delantero (front_skirt) ---
      expect(front_skirt.name).toBe('front_skirt');
      expect(front_skirt.cutCount).toBe(1);
      expect(front_skirt.onFold).toBe(true);
      expect(front_skirt.width_mm).toBeGreaterThan(0);
      expect(front_skirt.height_mm).toBeGreaterThan(0);
      expect(front_skirt.area_mm2).toBeGreaterThan(50000);
      expect(front_skirt.pathD).toMatch(/^M\s.+Z$/);
      expect(front_skirt.outline.length).toBeGreaterThanOrEqual(6);

      // Puntos de anclaje de delantero (1 pinza)
      const reqFront = [
        'center_waist',
        'center_hip',
        'center_hem',
        'dart_left',
        'dart_tip',
        'dart_right',
        'side_waist',
        'side_hip',
        'side_hem',
      ];
      for (const pt of reqFront) {
        expect(front_skirt.points[pt]).toBeDefined();
        expect(Number.isFinite(front_skirt.points[pt].x)).toBe(true);
        expect(Number.isFinite(front_skirt.points[pt].y)).toBe(true);
      }

      // --- Espalda (back_skirt) ---
      expect(back_skirt.name).toBe('back_skirt');
      expect(back_skirt.cutCount).toBe(2);
      expect(back_skirt.onFold).toBe(false);
      expect(back_skirt.width_mm).toBeGreaterThan(0);
      expect(back_skirt.height_mm).toBeGreaterThan(0);
      expect(back_skirt.area_mm2).toBeGreaterThan(50000);
      expect(back_skirt.pathD).toMatch(/^M\s.+Z$/);
      expect(back_skirt.outline.length).toBeGreaterThanOrEqual(8);

      // Puntos de anclaje de espalda (2 pinzas)
      const reqBack = [
        'center_waist',
        'center_hip',
        'center_hem',
        'dart1_left',
        'dart1_tip',
        'dart1_right',
        'dart2_left',
        'dart2_tip',
        'dart2_right',
        'side_waist',
        'side_hip',
        'side_hem',
      ];
      for (const pt of reqBack) {
        expect(back_skirt.points[pt]).toBeDefined();
        expect(Number.isFinite(back_skirt.points[pt].x)).toBe(true);
        expect(Number.isFinite(back_skirt.points[pt].y)).toBe(true);
      }
    });

    const silhouettes: SkirtSilhouette[] = ['straight', 'a_line', 'pleated'];

    it.each(silhouettes)('should generate valid geometry for silhouette "%s"', (silhouette) => {
      const { front_skirt, back_skirt } = generateSkirtBlock('M', { silhouette });

      expect(front_skirt.area_mm2).toBeGreaterThan(0);
      expect(back_skirt.area_mm2).toBeGreaterThan(0);
      expect(front_skirt.width_mm).toBeGreaterThan(0);
      expect(back_skirt.width_mm).toBeGreaterThan(0);

      if (silhouette === 'straight') {
        expect(front_skirt.label).toContain('RECTA');
      } else if (silhouette === 'a_line') {
        expect(front_skirt.label).toContain('EVASÉ');
        // Evasé debe tener mayor anchura en el bajo que recta
        const straightFront = generateSkirtBlock('M', { silhouette: 'straight' }).front_skirt;
        expect(front_skirt.width_mm).toBeGreaterThan(straightFront.width_mm);
        expect(front_skirt.area_mm2).toBeGreaterThan(straightFront.area_mm2);
      } else if (silhouette === 'pleated') {
        expect(front_skirt.label).toContain('PLISADA');
        // Plisada debe contener piquetes de pliegues adicionales
        expect(front_skirt.notches.length).toBeGreaterThan(3);
        expect(back_skirt.notches.length).toBeGreaterThan(5);
      }
    });

    it('should match front and back side seam lengths for skirt within 1 mm', () => {
      for (const silhouette of silhouettes) {
        const { front_skirt, back_skirt } = generateSkirtBlock('L', { silhouette });

        const frontSideLen =
          distance(front_skirt.points.side_waist, front_skirt.points.side_hip) +
          distance(front_skirt.points.side_hip, front_skirt.points.side_hem);

        const backSideLen =
          distance(back_skirt.points.side_waist, back_skirt.points.side_hip) +
          distance(back_skirt.points.side_hip, back_skirt.points.side_hem);

        const delta = Math.abs(frontSideLen - backSideLen);
        expect(delta).toBeLessThanOrEqual(1.0);
      }
    });
  });

  // =========================================================================
  // 4. Marcas Técnicas Obligatorias: Grainline & Notches (100% de piezas)
  // =========================================================================
  describe('4. Technical Marks: Grainlines, Notches & Seam Allowances', () => {
    it('should have vertical grainlines on 100% of bodice and skirt pieces', () => {
      for (const size of STANDARD_SIZES) {
        const bodice = generateWomensBodiceBlock(size);
        const skirt = generateSkirtBlock(size);

        const allPieces = [
          bodice.front_bodice,
          bodice.back_bodice,
          skirt.front_skirt,
          skirt.back_skirt,
        ];

        for (const piece of allPieces) {
          expect(piece.grainline).toBeDefined();
          expect(piece.grainline.label).toContain('GRAINLINE');
          expect(piece.grainline.end.y).toBeGreaterThan(piece.grainline.start.y);
          expect(Number.isFinite(piece.grainline.start.x)).toBe(true);
          expect(Number.isFinite(piece.grainline.end.x)).toBe(true);
        }
      }
    });

    it('should have single notches for front and double notches for back', () => {
      const bodice = generateWomensBodiceBlock('M');
      const skirt = generateSkirtBlock('M');

      // Bodice Delantero: Piquetes simples
      expect(bodice.front_bodice.notches.length).toBeGreaterThanOrEqual(2);
      expect(bodice.front_bodice.notches.every((n) => n.type === 'single')).toBe(true);

      // Bodice Espalda: Piquetes dobles
      expect(bodice.back_bodice.notches.length).toBeGreaterThanOrEqual(2);
      expect(bodice.back_bodice.notches.every((n) => n.type === 'double')).toBe(true);

      // Skirt Delantero: Piquetes simples
      expect(skirt.front_skirt.notches.length).toBeGreaterThanOrEqual(3);
      expect(skirt.front_skirt.notches.every((n) => n.type === 'single')).toBe(true);

      // Skirt Espalda: Piquetes dobles
      expect(skirt.back_skirt.notches.length).toBeGreaterThanOrEqual(3);
      expect(skirt.back_skirt.notches.every((n) => n.type === 'double')).toBe(true);
    });

    it('should preserve configured seam and hem allowances', () => {
      const bodice = generateWomensBodiceBlock('M', { seam_allowance_mm: 12 });
      expect(bodice.front_bodice.seamAllowance_mm).toBe(12);
      expect(bodice.back_bodice.seamAllowance_mm).toBe(12);

      const skirt = generateSkirtBlock('M', {
        seam_allowance_mm: 15,
        hem_allowance_mm: 40,
      });
      expect(skirt.front_skirt.seamAllowance_mm).toBe(15);
      expect(skirt.front_skirt.hemAllowance_mm).toBe(40);
      expect(skirt.back_skirt.seamAllowance_mm).toBe(15);
      expect(skirt.back_skirt.hemAllowance_mm).toBe(40);
    });
  });

  // =========================================================================
  // 5. Fábrica Unificada generateBaseBlock y Funciones get*Sloper
  // =========================================================================
  describe('5. Unified Factory generateBaseBlock & Sloper Result Wrappers', () => {
    it('should generate BaseBlockResult via getWomensBodiceSloper', () => {
      const res = getWomensBodiceSloper('M');

      expect(res.blockType).toBe('womenswear_bodice');
      expect(res.size).toBe('M');
      expect(res.measurements).toBeDefined();
      expect(res.parts.front_bodice).toBeDefined();
      expect(res.parts.back_bodice).toBeDefined();
      expect(res.bounds.width).toBeGreaterThan(0);
      expect(res.bounds.height).toBeGreaterThan(0);
    });

    it('should generate BaseBlockResult via getSkirtSloper', () => {
      const res = getSkirtSloper('L', { silhouette: 'a_line' });

      expect(res.blockType).toBe('skirt_sloper');
      expect(res.size).toBe('L');
      expect(res.measurements).toBeDefined();
      expect(res.parts.front_skirt).toBeDefined();
      expect(res.parts.back_skirt).toBeDefined();
      expect(res.bounds.width).toBeGreaterThan(0);
      expect(res.bounds.height).toBeGreaterThan(0);
    });

    it.each([
      'womenswear_bodice',
      'womens_bodice',
      'womenswear_torso_fitted',
      'bodice_sloper',
      'bodice',
    ])('should generate womens bodice parts via generateBaseBlock("%s", "M")', (blockType) => {
      const res = generateBaseBlock(blockType, 'M');

      expect(res.parts.front_bodice).toBeDefined();
      expect(res.parts.back_bodice).toBeDefined();
      expect(res.bounds.width).toBeGreaterThan(0);
      expect(res.bounds.height).toBeGreaterThan(0);
    });

    it.each([
      'skirt_sloper',
      'skirt',
      'a_line_skirt',
      'pleated_skirt',
      'straight_skirt',
    ])('should generate skirt parts via generateBaseBlock("%s", "S")', (blockType) => {
      const res = generateBaseBlock(blockType, 'S');

      expect(res.parts.front_skirt).toBeDefined();
      expect(res.parts.back_skirt).toBeDefined();
      expect(res.bounds.width).toBeGreaterThan(0);
      expect(res.bounds.height).toBeGreaterThan(0);
    });
  });
});
