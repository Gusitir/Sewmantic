/**
 * tests/cargo_pockets.test.ts
 * Suite de Pruebas: Bolsillos Cargo 3D con Fuelle, Solapas y Blueprint Utility Vest (T-34)
 * pattern-ai-core
 */

import { describe, it, expect } from 'vitest';
import { PatternDna } from '../src/types/pattern.js';
import {
  modifyPattern,
  generateCargoPocketSet,
} from '../src/engine/modifier.js';
import { parsePatternDna } from '../src/schema/pattern_schema.js';
import { PromptBuilder } from '../src/ai/prompt_builder.js';
import { MockAiProvider } from '../src/ai/mock_provider.js';

describe('Bolsillos Cargo 3D, Solapas y Blueprint Utility Vest (T-34)', () => {
  // =========================================================================
  // 1. GENERADOR AISLADO: BOLSILLO CARGO CON FUELLE Y SOLAPA
  // =========================================================================
  describe('1. generateCargoPocketSet', () => {
    it('debe generar el juego de 3 piezas: cuerpo, fuelle perimetral y solapa con broches', () => {
      const cargoSet = generateCargoPocketSet({
        width_mm: 140,
        height_mm: 160,
        bellows_depth_mm: 25,
        flap_height_mm: 50,
        hasFlap: true,
        seamAllowance: 10,
        hemAllowance: 20,
      });

      // 1. Cuerpo
      expect(cargoSet.body.name).toBe('cargo_pocket_body');
      expect(cargoSet.body.width_mm).toBeCloseTo(140, 1);
      expect(cargoSet.body.height_mm).toBeCloseTo(160, 1);
      expect(cargoSet.body.cutCount).toBe(2);
      expect(cargoSet.body.area_mm2).toBeGreaterThan(20000);

      // 2. Fuelle Perimetral (longitud = 2 * 160 + 140 = 460 mm, ancho = 25 * 2 = 50 mm)
      expect(cargoSet.bellows.name).toBe('cargo_pocket_bellows');
      expect(cargoSet.bellows.width_mm).toBeCloseTo(460, 1);
      expect(cargoSet.bellows.height_mm).toBeCloseTo(50, 1);
      expect(cargoSet.bellows.cutCount).toBe(2);
      expect(cargoSet.bellows.notches.length).toBeGreaterThanOrEqual(2);

      // 3. Solapa
      expect(cargoSet.flap).toBeDefined();
      expect(cargoSet.flap!.name).toBe('cargo_pocket_flap');
      expect(cargoSet.flap!.width_mm).toBeCloseTo(150, 1); // 140 + 10
      expect(cargoSet.flap!.height_mm).toBeCloseTo(50, 1);
      expect(cargoSet.flap!.requiresInterfacing).toBe(true);
      expect(cargoSet.flap!.cutCount).toBe(4);
    });
  });

  // =========================================================================
  // 2. INTEGRACIÓN EN modifyPattern
  // =========================================================================
  describe('2. Integración en modifyPattern', () => {
    it('debe generar cargo_pocket_body, cargo_pocket_bellows y cargo_pocket_flap cuando pocket.type === "cargo_bellows"', () => {
      const vestDna: PatternDna = {
        concept_name: 'safari_tactical_vest',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 70 },
        modifications: {
          neckline: {
            type: 'stand_collar',
            collar_height_mm: 45,
          },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'straight' },
          closure: {
            type: 'buttons',
            overlap_mm: 20,
            button_count: 5,
          },
          pocket: {
            type: 'cargo_bellows',
            width_mm: 130,
            height_mm: 150,
            bellows_depth_mm: 20,
            flap: true,
          },
        },
      };

      const res = modifyPattern(vestDna, 'M');

      expect(res.parts.stand_collar).toBeDefined();
      expect(res.parts.cargo_pocket_body).toBeDefined();
      expect(res.parts.cargo_pocket_bellows).toBeDefined();
      expect(res.parts.cargo_pocket_flap).toBeDefined();
      expect(res.parts.pocket).toBeDefined();

      // Piquetes de referencia en el delantero
      const front = res.parts.front;
      const pocketNotch = front.notches.find((n) => n.label?.includes('Bolsillo Cargo 3D'));
      expect(pocketNotch).toBeDefined();
    });
  });

  // =========================================================================
  // 3. BLUEPRINT CONTEXT & PROMPT BUILDER
  // =========================================================================
  describe('3. Blueprint Context en PromptBuilder', () => {
    it('debe retornar las directivas anatómicas de UTILITY VEST al solicitar blueprint "utility_vest"', () => {
      const context = PromptBuilder.buildBlueprintContext('utility_vest');

      expect(context).toContain('UTILITY VEST');
      expect(context).toContain('stand_collar');
      expect(context).toContain('cargo_bellows');
      expect(context).toContain('straight');
      expect(context).toContain('sleeveless');
    });

    it('debe responder con el preset tactical_cargo_utility_vest en MockAiProvider', async () => {
      const provider = new MockAiProvider();
      const dna = await provider.generatePatternDna('Chaleco táctico militar', undefined, 'utility_vest');

      expect(dna.concept_name).toBe('tactical_cargo_utility_vest');
      expect(dna.modifications.neckline?.type).toBe('stand_collar');
      expect(dna.modifications.pocket?.type).toBe('cargo_bellows');
      expect(dna.modifications.hem?.type).toBe('straight');
      expect(dna.modifications.sleeves?.type).toBe('sleeveless');
    });

    it('debe validar la estructura de ADN con Zod parsePatternDna incluyendo pocket cargo_bellows', () => {
      const validDna = {
        concept_name: 'tactical_vest',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 60 },
        modifications: {
          pocket: {
            type: 'cargo_bellows',
            width_mm: 140,
            height_mm: 160,
            bellows_depth_mm: 30,
            flap: true,
            flap_height_mm: 45,
            count: 4,
          },
        },
      };

      const parsed = parsePatternDna(validDna);
      expect(parsed.modifications.pocket?.type).toBe('cargo_bellows');
      expect(parsed.modifications.pocket?.bellows_depth_mm).toBe(30);
      expect(parsed.modifications.pocket?.count).toBe(4);
    });
  });
});
