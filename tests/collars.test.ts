/**
 * tests/collars.test.ts
 * Suite de Pruebas: Módulos de Cuellos Técnicos (Stand Collar & Shirt Collar) (T-33)
 * pattern-ai-core
 */

import { describe, it, expect } from 'vitest';
import { PatternDna } from '../src/types/pattern.js';
import {
  modifyPattern,
  generateStandCollarPiece,
  generateShirtCollarPieces,
} from '../src/engine/modifier.js';
import { parsePatternDna } from '../src/schema/pattern_schema.js';

describe('Módulos de Cuellos Técnicos (T-33)', () => {
  // =========================================================================
  // 1. GENERADOR AISLADO: CUELLO CHIMENEA / ALZADO (STAND COLLAR)
  // =========================================================================
  describe('1. generateStandCollarPiece', () => {
    it('debe generar la pieza stand_collar con dimensiones y piquetes correctos', () => {
      const standCollar = generateStandCollarPiece({
        frontNeckLen: 120,
        backNeckLen: 95,
        overlapMm: 20,
        collarHeight: 45,
        seamAllowance: 10,
      });

      expect(standCollar.name).toBe('stand_collar');
      expect(standCollar.cutCount).toBe(2);
      expect(standCollar.requiresInterfacing).toBe(true);
      expect(standCollar.onFold).toBe(true);

      // Longitud total = 95 + 120 + 20 = 235 mm
      expect(standCollar.width_mm).toBeCloseTo(235, 0);
      // Altura total = collarHeight + curveRise = 45 + 8 = 53 mm
      expect(standCollar.height_mm).toBeCloseTo(53, 0);
      expect(standCollar.area_mm2).toBeGreaterThan(5000);

      // Puntos clave
      expect(standCollar.points.cb_base).toBeDefined();
      expect(standCollar.points.shoulder_base).toBeDefined();
      expect(standCollar.points.cf_base).toBeDefined();
      expect(standCollar.points.cf_top).toBeDefined();

      // Piquetes
      expect(standCollar.notches.length).toBeGreaterThanOrEqual(2);
      const shNotch = standCollar.notches.find((n) => n.label?.includes('Hombro'));
      const cfNotch = standCollar.notches.find((n) => n.label?.includes('Centro Delantero'));
      expect(shNotch).toBeDefined();
      expect(cfNotch).toBeDefined();
    });
  });

  // =========================================================================
  // 2. GENERADOR AISLADO: CUELLO CAMISERO CON TIRILLA (SHIRT COLLAR WITH STAND)
  // =========================================================================
  describe('2. generateShirtCollarPieces', () => {
    it('debe generar el pie de cuello (stand) y la pala (fall) coordinados', () => {
      const { stand, fall } = generateShirtCollarPieces({
        frontNeckLen: 115,
        backNeckLen: 90,
        overlapMm: 15,
        standHeight: 32,
        collarHeight: 45,
        pointLength: 70,
        seamAllowance: 10,
      });

      expect(stand.name).toBe('collar_stand');
      expect(stand.cutCount).toBe(2);
      expect(stand.requiresInterfacing).toBe(true);
      expect(stand.width_mm).toBeGreaterThan(200);

      expect(fall.name).toBe('collar_fall');
      expect(fall.cutCount).toBe(2);
      expect(fall.requiresInterfacing).toBe(true);
      expect(fall.points.point).toBeDefined();
      expect(fall.width_mm).toBeGreaterThan(180);
    });
  });

  // =========================================================================
  // 3. INTEGRACIÓN EN EL MOTOR PARAMÉTRICO (modifyPattern)
  // =========================================================================
  describe('3. Integración en modifyPattern', () => {
    it('debe generar stand_collar en un chaleco / chaqueta con cuello alzado', () => {
      const tacticalVestDna: PatternDna = {
        concept_name: 'tactical_utility_vest',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 50 },
        modifications: {
          neckline: {
            type: 'stand_collar',
            collar_height_mm: 50,
          },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'straight' },
          closure: {
            type: 'buttons',
            overlap_mm: 20,
            button_count: 5,
          },
        },
      };

      const res = modifyPattern(tacticalVestDna, 'M');

      expect(res.parts.stand_collar).toBeDefined();
      expect(res.parts.collar).toBeDefined();
      expect(res.parts.stand_collar.cutCount).toBe(2);
      expect(res.parts.stand_collar.requiresInterfacing).toBe(true);
      expect(res.parts.stand_collar.height_mm).toBeCloseTo(58, 1); // 50 + 8
    });

    it('debe generar collar_stand y collar_fall en una camisa con cuello camisero', () => {
      const shirtDna: PatternDna = {
        concept_name: 'safari_shirt',
        base_block: 'simon',
        ease: { chest_ease_mm: 60 },
        modifications: {
          neckline: {
            type: 'shirt_collar_with_stand',
            collar_height_mm: 45,
            collar_stand_height_mm: 32,
            collar_point_length_mm: 70,
          },
          sleeves: { type: 'set_in' },
          closure: {
            type: 'buttons',
            overlap_mm: 15,
            button_count: 6,
          },
        },
      };

      const res = modifyPattern(shirtDna, 'L');

      expect(res.parts.collar_stand).toBeDefined();
      expect(res.parts.collar_fall).toBeDefined();
      expect(res.parts.collar).toBeDefined();
      expect(res.parts.collar_stand.requiresInterfacing).toBe(true);
      expect(res.parts.collar_fall.requiresInterfacing).toBe(true);
    });

    it('debe validar la estructura de ADN con Zod parsePatternDna incluyendo cuellos técnicos', () => {
      const validDna = {
        concept_name: 'bomber_jacket',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 70 },
        modifications: {
          neckline: {
            type: 'stand_collar',
            collar_height_mm: 45,
            collar_stand_height_mm: 30,
            collar_point_length_mm: 60,
          },
        },
      };

      const parsed = parsePatternDna(validDna);
      expect(parsed.modifications.neckline?.type).toBe('stand_collar');
      expect(parsed.modifications.neckline?.collar_height_mm).toBe(45);
    });
  });
});
