/**
 * tests/industrial_patterns.test.ts
 * Suite de Pruebas: Moldería Industrial - Cruces de Botones, Ojales, Vistas Interiores y Piquetes Pareados (T-29)
 * pattern-ai-core
 */

import { describe, it, expect } from 'vitest';
import {
  PatternDna,
  StandardSize,
} from '../src/types/pattern.js';
import {
  modifyPattern,
  modifyPatternMultiSize,
  modifyDressPattern,
  modifySetPattern,
  generateButtonMarkings,
  generateFrontFacing,
  generateBackNeckFacing,
  generateArmholeFacing,
} from '../src/engine/modifier.js';
import {
  STANDARD_SIZES,
  getStandardMeasurements,
} from '../src/engine/base_blocks/measurements.js';
import { parsePatternDna } from '../src/schema/pattern_schema.js';

describe('Moldería Industrial: Cruces, Ojales, Vistas y Piquetes Pareados (T-29)', () => {
  // =========================================================================
  // 1. EXTENSIÓN Y CRUCE DE BOTONADURA (+15 a +25 mm)
  // =========================================================================
  describe('1. Extensión y Cruce de Botonadura Frontal', () => {
    it('debe agregar la extensión de botonadura (+20mm por defecto) cuando closure.type === "buttons"', () => {
      const dnaWithoutButtons: PatternDna = {
        concept_name: 'shirt_pullover',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 60 },
        modifications: {
          neckline: { type: 'crew' },
          sleeves: { type: 'set_in' },
        },
      };

      const dnaWithButtons: PatternDna = {
        concept_name: 'shirt_buttoned',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 60 },
        modifications: {
          neckline: { type: 'crew' },
          sleeves: { type: 'set_in' },
          closure: {
            type: 'buttons',
            overlap_mm: 20,
            button_count: 5,
            button_diameter_mm: 18,
          },
        },
      };

      const resClosed = modifyPattern(dnaWithoutButtons, 'M');
      const resButtoned = modifyPattern(dnaWithButtons, 'M');

      const frontClosed = resClosed.parts.front;
      const frontButtoned = resButtoned.parts.front;

      // La pieza cerrada se corta al lomo (onFold = true, cutCount = 1)
      expect(frontClosed.onFold).toBe(true);
      expect(frontClosed.cutCount).toBe(1);

      // La pieza con botonadura se abre al centro (onFold = false, cutCount = 2)
      expect(frontButtoned.onFold).toBe(false);
      expect(frontButtoned.cutCount).toBe(2);

      // El ancho total de la pieza delantera incluye el cruce de 20mm
      expect(frontButtoned.width_mm).toBeCloseTo(frontClosed.width_mm + 20, 1);
      expect(frontButtoned.bounds.minX).toBeCloseTo(-20, 1);

      // Los puntos de cruce existen en la geometría
      expect(frontButtoned.points.overlap_neck).toBeDefined();
      expect(frontButtoned.points.overlap_hem).toBeDefined();
      expect(frontButtoned.points.overlap_neck.x).toBeCloseTo(-20, 1);
      expect(frontButtoned.points.overlap_hem.x).toBeCloseTo(-20, 1);

      // El área de la pieza con cruce es mayor que la cerrada
      expect(frontButtoned.area_mm2).toBeGreaterThan(frontClosed.area_mm2);
    });

    it('debe respetar cruces personalizados (ej. 15mm o 25mm)', () => {
      const dna15: PatternDna = {
        concept_name: 'shirt_15mm',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 40 },
        modifications: {
          closure: {
            type: 'buttons',
            overlap_mm: 15,
            button_count: 4,
          },
        },
      };

      const dna25: PatternDna = {
        concept_name: 'shirt_25mm',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 40 },
        modifications: {
          closure: {
            type: 'buttons',
            overlap_mm: 25,
            button_count: 4,
          },
        },
      };

      const res15 = modifyPattern(dna15, 'L');
      const res25 = modifyPattern(dna25, 'L');

      expect(res15.parts.front.bounds.minX).toBeCloseTo(-15, 1);
      expect(res25.parts.front.bounds.minX).toBeCloseTo(-25, 1);
      expect(res25.parts.front.width_mm - res15.parts.front.width_mm).toBeCloseTo(10, 1);
    });
  });

  // =========================================================================
  // 2. MARCAS VECTORIALES DE OJALES Y BOTONES
  // =========================================================================
  describe('2. Marcas Vectoriales Exactas de Ojales y Botones', () => {
    it('debe calcular la cantidad exacta y espaciado equidistante de ojales y botones', () => {
      const buttonCount = 6;
      const buttonDiameter = 22;
      const dna: PatternDna = {
        concept_name: 'industrial_waistcoat',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 40 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 100 },
          closure: {
            type: 'buttons',
            button_count: buttonCount,
            button_diameter_mm: buttonDiameter,
            buttonhole_orientation: 'vertical',
            overlap_mm: 20,
          },
        },
      };

      const res = modifyPattern(dna, 'M');
      const front = res.parts.front;

      expect(front.markings).toBeDefined();
      const markings = front.markings!;

      // Filtrar ojales y botones
      const buttonholes = markings.filter((m) => m.type === 'buttonhole');
      const buttons = markings.filter((m) => m.type === 'button');
      const foldLines = markings.filter((m) => m.type === 'fold_line');

      expect(buttonholes.length).toBe(buttonCount);
      expect(buttons.length).toBe(buttonCount);
      expect(foldLines.length).toBe(1);

      // Verificar que todos están centrados en el eje Centro Delantero (X = 0)
      for (const bh of buttonholes) {
        expect(bh.point.x).toBe(0);
        expect(bh.length_mm).toBe(buttonDiameter + 4);
        expect(bh.angle_deg).toBe(90); // Vertical
      }
      for (const btn of buttons) {
        expect(btn.point.x).toBe(0);
        expect(btn.length_mm).toBe(buttonDiameter);
      }

      // Verificar espaciado constante entre botones consecutivos
      const buttonYPositions = buttons.map((b) => b.point.y);
      const spacing1 = buttonYPositions[1] - buttonYPositions[0];
      for (let i = 1; i < buttonYPositions.length - 1; i++) {
        const currentSpacing = buttonYPositions[i + 1] - buttonYPositions[i];
        expect(currentSpacing).toBeCloseTo(spacing1, 1);
      }
    });

    it('debe soportar orientación horizontal de ojales', () => {
      const dna: PatternDna = {
        concept_name: 'shirt_horizontal_buttonholes',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 40 },
        modifications: {
          closure: {
            type: 'buttons',
            button_count: 4,
            buttonhole_orientation: 'horizontal',
          },
        },
      };

      const res = modifyPattern(dna, 'M');
      const buttonholes = res.parts.front.markings!.filter((m) => m.type === 'buttonhole');
      expect(buttonholes.length).toBe(4);
      for (const bh of buttonholes) {
        expect(bh.angle_deg).toBe(0); // Horizontal
      }
    });

    it('la función utilitaria generateButtonMarkings debe ser pura y determinista', () => {
      const marks = generateButtonMarkings({
        placketStart: 50,
        placketEnd: 650,
        buttonCount: 5,
        buttonDiameter: 20,
        buttonholeOrientation: 'vertical',
      });

      expect(marks.length).toBe(11); // 1 fold line + 5 buttonholes + 5 buttons
      const btns = marks.filter((m) => m.type === 'button');
      expect(btns[0].point.y).toBeCloseTo(50 + 25, 0); // primer botón
      expect(btns[4].point.y).toBeCloseTo(650 - 35, 0); // último botón
    });
  });

  // =========================================================================
  // 3. GENERACIÓN DE VISTAS INTERIORES CON ENTRETELA (FACINGS)
  // =========================================================================
  describe('3. Piezas de Vistas Interiores (front_facing, back_neck_facing, armhole_facing)', () => {
    it('debe generar vista delantera (front_facing) en prendas con botones', () => {
      const dna: PatternDna = {
        concept_name: 'tailored_vest',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 40 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 120 },
          sleeves: { type: 'set_in' },
          closure: {
            type: 'buttons',
            overlap_mm: 20,
            button_count: 4,
          },
        },
      };

      const res = modifyPattern(dna, 'M');
      expect(res.parts.front_facing).toBeDefined();

      const facing = res.parts.front_facing;
      expect(facing.name).toBe('front_facing');
      expect(facing.isFacing).toBe(true);
      expect(facing.requiresInterfacing).toBe(true);
      expect(facing.cutCount).toBe(2);
      expect(facing.onFold).toBe(false);

      // Geometría cerrada y área positiva
      expect(facing.area_mm2).toBeGreaterThan(5000);
      expect(facing.bounds.minX).toBeCloseTo(-20, 1); // Cruce exterior a -20mm
      expect(facing.points.facing_inner_hem.x).toBeCloseTo(45, 1); // Ancho interior de 45mm
      expect(facing.width_mm).toBeGreaterThan(65); // Cruce + extensión a hombro
      expect(facing.outline.length).toBeGreaterThanOrEqual(6);
      expect(facing.pathD.endsWith('Z')).toBe(true);

      // Grainline y piquetes
      expect(facing.grainline).toBeDefined();
      expect(facing.grainline.label).toContain('VISTA');
      expect(facing.notches.length).toBeGreaterThanOrEqual(2);

      // Declaración en frontPart.facings
      expect(res.parts.front.facings).toContain('front');
    });

    it('debe generar vistas de sisa (armhole_facing) y cuello espalda (back_neck_facing) en prendas sin mangas', () => {
      const dna: PatternDna = {
        concept_name: 'sleeveless_vest',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 40 },
        modifications: {
          neckline: { type: 'crew' },
          sleeves: { type: 'sleeveless' },
        },
      };

      const res = modifyPattern(dna, 'M');

      // 1. Vista de Cuello Espalda (Media Luna)
      expect(res.parts.back_neck_facing).toBeDefined();
      const backFacing = res.parts.back_neck_facing;
      expect(backFacing.isFacing).toBe(true);
      expect(backFacing.requiresInterfacing).toBe(true);
      expect(backFacing.cutCount).toBe(1);
      expect(backFacing.onFold).toBe(true);
      expect(backFacing.area_mm2).toBeGreaterThan(1500);
      expect(backFacing.points.cb_inner.y - backFacing.points.neck_center.y).toBeCloseTo(40, 1); // Ancho media luna 40mm
      expect(backFacing.height_mm).toBeGreaterThanOrEqual(40);
      expect(backFacing.pathD.endsWith('Z')).toBe(true);

      // 2. Vista de Sisa Curva
      expect(res.parts.armhole_facing).toBeDefined();
      const armFacing = res.parts.armhole_facing;
      expect(armFacing.isFacing).toBe(true);
      expect(armFacing.requiresInterfacing).toBe(true);
      expect(armFacing.cutCount).toBe(2);
      expect(armFacing.onFold).toBe(false);
      expect(armFacing.area_mm2).toBeGreaterThan(3000);
      expect(armFacing.width_mm).toBeGreaterThan(30);
      expect(armFacing.pathD.endsWith('Z')).toBe(true);

      // Lista de facings en piezas principales
      expect(res.parts.front.facings).toContain('armhole');
      expect(res.parts.back.facings).toContain('back_neck');
      expect(res.parts.back.facings).toContain('armhole');
    });

    it('debe generar las 3 vistas complementarias en prendas sin mangas con botones (ej. Chaleco)', () => {
      const dna: PatternDna = {
        concept_name: 'pirate_buttoned_vest',
        base_block: 'menswear_torso_fitted',
        ease: { chest_ease_mm: 50 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 130 },
          sleeves: { type: 'sleeveless' },
          closure: {
            type: 'buttons',
            overlap_mm: 20,
            button_count: 3,
          },
        },
      };

      const res = modifyPattern(dna, 'M');

      expect(res.parts.front_facing).toBeDefined();
      expect(res.parts.back_neck_facing).toBeDefined();
      expect(res.parts.armhole_facing).toBeDefined();

      expect(res.parts.front_facing.area_mm2).toBeGreaterThan(0);
      expect(res.parts.back_neck_facing.area_mm2).toBeGreaterThan(0);
      expect(res.parts.armhole_facing.area_mm2).toBeGreaterThan(0);

      expect(res.parts.front.facings).toEqual(expect.arrayContaining(['front', 'armhole']));
      expect(res.parts.back.facings).toEqual(expect.arrayContaining(['back_neck', 'armhole']));
    });
  });

  // =========================================================================
  // 4. PIQUETES PAREADOS DE CORRESPONDENCIA
  // =========================================================================
  describe('4. Piquetes Pareados de Correspondencia (Hombros y Costados)', () => {
    it('debe generar piquetes pareados en costuras de hombro (hombro_delantero <-> hombro_espalda)', () => {
      const dna: PatternDna = {
        concept_name: 'tshirt_industrial',
        base_block: 'tshirt_sloper',
        ease: { chest_ease_mm: 40 },
        modifications: {
          neckline: { type: 'crew' },
          sleeves: { type: 'set_in' },
        },
      };

      const res = modifyPattern(dna, 'M');
      const front = res.parts.front;
      const back = res.parts.back;

      const frontShoulderNotch = front.notches.find((n) => n.label?.includes('Hombro'));
      const backShoulderNotch = back.notches.find((n) => n.label?.includes('Hombro'));

      expect(frontShoulderNotch).toBeDefined();
      expect(backShoulderNotch).toBeDefined();

      // Cotas de hombro coinciden en longitud proporcional
      expect(front.points.shoulder_notch).toBeDefined();
      expect(back.points.shoulder_notch).toBeDefined();
    });

    it('debe generar piquetes pareados en costuras de costado (costado_delantero <-> costado_espalda)', () => {
      const dna: PatternDna = {
        concept_name: 'shirt_industrial',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 40 },
        modifications: {
          neckline: { type: 'crew' },
          sleeves: { type: 'set_in' },
        },
      };

      const res = modifyPattern(dna, 'M');
      const front = res.parts.front;
      const back = res.parts.back;

      const frontSideNotch = front.notches.find((n) => n.label?.includes('Costado'));
      const backSideNotch = back.notches.find((n) => n.label?.includes('Costado'));

      expect(frontSideNotch).toBeDefined();
      expect(backSideNotch).toBeDefined();

      // La posición Y del piquete de costado coincide exactamente entre delantero y espalda
      expect(frontSideNotch!.point.y).toBeCloseTo(backSideNotch!.point.y, 1);
      expect(frontSideNotch!.type).toBe('single');
      expect(backSideNotch!.type).toBe('double');
    });
  });

  // =========================================================================
  // 5. COMPATIBILIDAD CON TODAS LAS TALLAS (XS A 3XL) Y PRESETS OFICIALES
  // =========================================================================
  describe('5. Compatibilidad Multi-Talla (XS-3XL) y Presets Oficiales', () => {
    it('debe graduar correctamente botonaduras, vistas y marcas en todas las tallas estándar (XS a 3XL)', () => {
      const dna: PatternDna = {
        concept_name: 'luffy_pirate_vest_multisize',
        base_block: 'menswear_torso_fitted',
        ease: { chest_ease_mm: 50 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 130 },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'curved_tail', drop_mm: 45 },
          closure: {
            type: 'buttons',
            overlap_mm: 20,
            button_count: 3,
            button_diameter_mm: 20,
          },
        },
      };

      const multiResults = modifyPatternMultiSize(dna, STANDARD_SIZES);
      expect(multiResults.size).toBe(7);

      for (const size of STANDARD_SIZES) {
        const res = multiResults.get(size)!;
        expect(res).toBeDefined();

        // 1. Pieza Delantera con Cruce
        const front = res.parts.front;
        expect(front.cutCount).toBe(2);
        expect(front.onFold).toBe(false);
        expect(front.bounds.minX).toBeCloseTo(-20, 1);
        expect(front.markings?.filter((m) => m.type === 'button').length).toBe(3);

        // 2. Vistas Interiores
        expect(res.parts.front_facing).toBeDefined();
        expect(res.parts.back_neck_facing).toBeDefined();
        expect(res.parts.armhole_facing).toBeDefined();

        expect(res.parts.front_facing.area_mm2).toBeGreaterThan(0);
        expect(res.parts.back_neck_facing.area_mm2).toBeGreaterThan(0);
        expect(res.parts.armhole_facing.area_mm2).toBeGreaterThan(0);

        // 3. Piquetes Pareados
        const shFront = front.notches.find((n) => n.label?.includes('Hombro'));
        const shBack = res.parts.back.notches.find((n) => n.label?.includes('Hombro'));
        expect(shFront).toBeDefined();
        expect(shBack).toBeDefined();
      }
    });

    it('debe generar el Preset Oficial Chaleco de Luffy con todas las piezas y especificaciones industriales', () => {
      const luffyVestDna: PatternDna = {
        concept_name: 'straw_pirate_adventurer_vest',
        description: 'Anime pirate captain sleeveless red waistcoat vest with deep V-neck, 3-button front closure',
        base_block: 'menswear_torso_fitted',
        ease: { chest_ease_mm: 50, waist_ease_mm: 40, hip_ease_mm: 35, shoulder_ease_mm: 0 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 130, width_mm: 35 },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'curved_tail', drop_mm: 45, back_drop_mm: 0 },
          closure: {
            type: 'buttons',
            overlap_mm: 20,
            button_count: 3,
            button_diameter_mm: 20,
            buttonhole_orientation: 'vertical',
          },
        },
      };

      const res = modifyPattern(luffyVestDna, 'M');

      expect(res.parts.front).toBeDefined();
      expect(res.parts.back).toBeDefined();
      expect(res.parts.front_facing).toBeDefined();
      expect(res.parts.back_neck_facing).toBeDefined();
      expect(res.parts.armhole_facing).toBeDefined();

      // Cruce frontal
      expect(res.parts.front.bounds.minX).toBeCloseTo(-20, 1);
      expect(res.parts.front.cutCount).toBe(2);

      // Marcas de 3 botones y 3 ojales
      const buttons = res.parts.front.markings!.filter((m) => m.type === 'button');
      expect(buttons.length).toBe(3);

      // Entretela en vistas
      expect(res.parts.front_facing.requiresInterfacing).toBe(true);
      expect(res.parts.back_neck_facing.requiresInterfacing).toBe(true);
      expect(res.parts.armhole_facing.requiresInterfacing).toBe(true);
    });

    it('debe generar el Preset Oficial Vestido de Aqua con vistas y piquetes pareados en corpiño', () => {
      const aquaDressDna: PatternDna = {
        concept_name: 'anime_water_goddess_dress',
        garment_category: 'dress',
        base_block: 'dress_sloper',
        ease: { chest_ease_mm: 30, waist_ease_mm: 20, hip_ease_mm: 40, shoulder_ease_mm: 0 },
        dress_details: {
          silhouette: 'a_line',
          skirt_length_mm: 550,
          waist_seam: true,
        },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 60 },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'straight' },
        },
      };

      const res = modifyPattern(aquaDressDna, 'M');

      expect(res.parts.front_bodice).toBeDefined();
      expect(res.parts.back_bodice).toBeDefined();
      expect(res.parts.front_skirt).toBeDefined();
      expect(res.parts.back_skirt).toBeDefined();

      // Vistas sin mangas
      expect(res.parts.back_neck_facing).toBeDefined();
      expect(res.parts.armhole_facing).toBeDefined();

      // Piquetes pareados en corpiño
      const bodiceFront = res.parts.front_bodice;
      const bodiceBack = res.parts.back_bodice;
      const shNotchFront = bodiceFront.notches.find((n) => n.label?.includes('Hombro'));
      const shNotchBack = bodiceBack.notches.find((n) => n.label?.includes('Hombro'));
      expect(shNotchFront).toBeDefined();
      expect(shNotchBack).toBeDefined();
    });

    it('debe generar el bajo en doble pico (pointed waistcoat hem) con vértice hem_peak y abertura en V', () => {
      const vestDna: PatternDna = {
        concept_name: 'straw_pirate_pointed_vest',
        base_block: 'wahid',
        ease: { chest_ease_mm: 35 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 120 },
          sleeves: { type: 'sleeveless' },
          hem: {
            type: 'pointed',
            peak_drop_mm: 50,
            peak_position_ratio: 0.38,
          },
          closure: {
            type: 'buttons',
            overlap_mm: 20,
            button_count: 3,
            button_diameter_mm: 20,
          },
        },
      };

      const parsed = parsePatternDna(vestDna);
      expect(parsed.modifications.hem?.type).toBe('pointed');
      expect(parsed.modifications.hem?.peak_drop_mm).toBe(50);

      const res = modifyPattern(parsed, 'M');
      const front = res.parts.front;

      // 1. El vértice del pico existe en points y outline
      expect(front.points.hem_peak).toBeDefined();
      expect(front.points.side_hem).toBeDefined();
      expect(front.points.center_hem).toBeDefined();

      const peak = front.points.hem_peak!;
      const side = front.points.side_hem!;
      const center = front.points.center_hem!;

      // 2. El pico desciende más abajo que el costado y que el centro
      expect(peak.y).toBeGreaterThan(side.y);
      expect(peak.y).toBeGreaterThan(center.y);
      expect(peak.y - side.y).toBeCloseTo(50, 1);

      // 3. El centro delantero queda por encima del pico formando la abertura en V
      expect(center.y).toBeLessThan(peak.y);
      expect(center.y).toBeGreaterThan(side.y);

      // 4. La vista interior contiene también la referencia al hem_peak
      expect(res.parts.front_facing).toBeDefined();
      expect(res.parts.front_facing.points.hem_peak).toBeDefined();
    });

    it('debe validar la estructura de ADN con Zod parsePatternDna incluyendo ClosureModSchema', () => {
      const validDna = {
        concept_name: 'industrial_jacket',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 80 },
        modifications: {
          closure: {
            type: 'buttons',
            overlap_mm: 25,
            button_count: 5,
            button_diameter_mm: 22,
            buttonhole_orientation: 'horizontal',
          },
        },
      };

      const parsed = parsePatternDna(validDna);
      expect(parsed.modifications.closure?.type).toBe('buttons');
      expect(parsed.modifications.closure?.overlap_mm).toBe(25);
      expect(parsed.modifications.closure?.button_count).toBe(5);
      expect(parsed.modifications.closure?.buttonhole_orientation).toBe('horizontal');
    });
  });
});
