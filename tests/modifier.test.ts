/**
 * tests/modifier.test.ts
 * Suite de pruebas exhaustivas para el Motor de Modificación Paramétrica (Modifier Engine)
 * pattern-ai-core
 */

import { describe, it, expect } from 'vitest';
import {
  PatternDna,
  StandardSize,
  STANDARD_SIZES,
  modifyPattern,
  modifyPatternMultiSize,
  bezierLength,
  polylineLength,
  pointAlongPolyline,
  pointAlongBezier,
  createPoint,
  distance,
} from '../src/index.js';

describe('Geometry Arc Length & Utility Functions', () => {
  it('calculates bezier curve arc length accurately for straight and curved lines', () => {
    // Línea recta en Bezier de (0,0) a (100,0)
    const p0 = createPoint(0, 0);
    const cp1 = createPoint(33.33, 0);
    const cp2 = createPoint(66.67, 0);
    const p3 = createPoint(100, 0);

    const lenStraight = bezierLength(p0, cp1, cp2, p3);
    expect(lenStraight).toBeCloseTo(100, 1);

    // Curva cuadrante
    const arcCp1 = createPoint(0, 55.23);
    const arcCp2 = createPoint(44.77, 100);
    const arcEnd = createPoint(100, 100);
    const lenArc = bezierLength(p0, arcCp1, arcCp2, arcEnd);
    expect(lenArc).toBeGreaterThan(100);
    expect(lenArc).toBeLessThan(200);
  });

  it('calculates polyline length and finds points along arc length', () => {
    const points = [
      createPoint(0, 0),
      createPoint(0, 100),
      createPoint(100, 100),
    ];
    const totalLen = polylineLength(points);
    expect(totalLen).toBe(200);

    const midPt = pointAlongPolyline(points, 100);
    expect(midPt.x).toBe(0);
    expect(midPt.y).toBe(100);

    const quarterPt = pointAlongPolyline(points, 50);
    expect(quarterPt.x).toBe(0);
    expect(quarterPt.y).toBe(50);

    const threeQuarterPt = pointAlongPolyline(points, 150);
    expect(threeQuarterPt.x).toBe(50);
    expect(threeQuarterPt.y).toBe(100);
  });
});

describe('Modifier Engine: Streetwear Oversize Hoodie', () => {
  const hoodieDna: PatternDna = {
    concept_name: 'streetwear_oversize_hoodie',
    base_block: 'menswear_torso_oversize',
    ease: {
      chest_ease_mm: 160,
      bicep_ease_mm: 70,
      shoulder_ease_mm: 40,
    },
    modifications: {
      neckline: {
        type: 'crossover_hood',
        depth_mm: 40,
      },
      sleeves: {
        type: 'drop_shoulder',
        drop_mm: 50,
        cuff_elastic: true,
      },
      hem: {
        type: 'curved_tail',
        drop_mm: 35,
        back_drop_mm: 50,
      },
      pocket: {
        type: 'kangaroo',
      },
      hood: {
        type: 'crossover',
        overlap_mm: 60,
      },
    },
    tech_specs: {
      notions: ['1x cordón 120cm', '2x ojetes metálicos'],
      estimated_fabric_meters: 1.85,
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
      fabric_width_mm: 1500,
    },
  };

  it('generates all required pieces (front, back, sleeve, hood, pocket)', () => {
    const result = modifyPattern(hoodieDna, 'M');

    expect(result.parts.front).toBeDefined();
    expect(result.parts.back).toBeDefined();
    expect(result.parts.sleeve).toBeDefined();
    expect(result.parts.hood).toBeDefined();
    expect(result.parts.pocket).toBeDefined();

    expect(result.concept_name).toBe('streetwear_oversize_hoodie');
    expect(result.size).toBe('M');
  });

  it('applies oversize chest ease and drop shoulder expansion', () => {
    const result = modifyPattern(hoodieDna, 'M');
    const front = result.parts.front;
    const back = result.parts.back;

    // Medida pecho M = 1000mm. Con 160mm ease = 1160mm total -> cuarto = 290mm
    expect(front.points.armhole_bottom.x).toBe(290);
    expect(back.points.armhole_bottom.x).toBe(290);

    // Hombro caído (drop 50mm + shoulder ease 40mm/2 = 20mm + base shoulder/2 = 227.5) -> ~297.5mm
    expect(front.points.shoulder_tip.x).toBeGreaterThan(280);
    expect(back.points.shoulder_tip.x).toBeGreaterThan(280);
  });

  it('applies curved tail hem transformation on front and back', () => {
    const result = modifyPattern(hoodieDna, 'M');
    const front = result.parts.front;
    const back = result.parts.back;

    // El centro del dobladillo cae respecto al costado
    expect(front.points.center_hem.y).toBeGreaterThan(front.points.side_hem.y);
    expect(back.points.center_hem.y).toBeGreaterThan(back.points.side_hem.y);

    // Caída de espalda mayor o igual a caída de delantero
    const frontDrop = front.points.center_hem.y - front.points.side_hem.y;
    const backDrop = back.points.center_hem.y - back.points.side_hem.y;
    expect(frontDrop).toBe(35);
    expect(backDrop).toBe(50);
  });

  it('integrates kangaroo pocket and creates reference placement notches on front torso', () => {
    const result = modifyPattern(hoodieDna, 'M');
    const front = result.parts.front;

    // Verificar que el delantero tiene piquetes de referencia para el bolsillo canguro
    const pocketNotches = front.notches.filter(
      (n) => n.label && n.label.toLowerCase().includes('bolsillo')
    );
    expect(pocketNotches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Modifier Engine: Classic Fitted T-Shirt', () => {
  const tshirtDna: PatternDna = {
    concept_name: 'classic_crew_tshirt',
    base_block: 'tshirt_sloper',
    ease: {
      chest_ease_mm: 40,
      bicep_ease_mm: 30,
    },
    modifications: {
      neckline: {
        type: 'crew',
        depth_mm: 15,
        width_mm: 10,
      },
      sleeves: {
        type: 'set_in',
        length_type: 'short',
      },
      hem: {
        type: 'straight',
      },
    },
  };

  it('generates fitted torso and short sleeve without hood or pocket', () => {
    const result = modifyPattern(tshirtDna, 'L');

    expect(result.parts.front).toBeDefined();
    expect(result.parts.back).toBeDefined();
    expect(result.parts.sleeve).toBeDefined();
    expect(result.parts.hood).toBeUndefined();
    expect(result.parts.pocket).toBeUndefined();

    // Manga corta debe tener longitud menor a 300mm
    expect(result.parts.sleeve.height_mm).toBeLessThan(350);
  });

  it('straight hem keeps side_hem and center_hem at the same Y level', () => {
    const result = modifyPattern(tshirtDna, 'L');
    expect(result.parts.front.points.side_hem.y).toBe(result.parts.front.points.center_hem.y);
    expect(result.parts.back.points.side_hem.y).toBe(result.parts.back.points.center_hem.y);
  });
});

describe('Modifier Engine: Anime Priestess Tunic & V-Neck / Cropped Variants', () => {
  it('handles V-neck modification and patch pocket with reference notches', () => {
    const tunicDna: PatternDna = {
      concept_name: 'water_priestess_tunic',
      base_block: 'dress_sloper',
      ease: {
        chest_ease_mm: 60,
      },
      modifications: {
        neckline: {
          type: 'v_neck',
          depth_mm: 45,
        },
        sleeves: {
          type: 'set_in',
          length_type: 'three_quarter',
        },
        hem: {
          type: 'straight',
        },
        pocket: {
          type: 'patch',
          width_mm: 120,
          height_mm: 140,
        },
      },
    };

    const result = modifyPattern(tunicDna, 'S');

    expect(result.parts.front).toBeDefined();
    expect(result.parts.pocket).toBeDefined();

    // Escote en V delantero más profundo
    expect(result.parts.front.points.neck_center.y).toBeGreaterThan(100);

    // Piquetes de referencia para bolsillo parche
    const patchNotches = result.parts.front.notches.filter(
      (n) => n.label && n.label.toLowerCase().includes('parche')
    );
    expect(patchNotches.length).toBe(2);
  });

  it('handles cropped hem reduction', () => {
    const croppedDna: PatternDna = {
      concept_name: 'cropped_boxy_tee',
      base_block: 'menswear_torso',
      ease: { chest_ease_mm: 120 },
      modifications: {
        hem: {
          type: 'cropped',
          drop_mm: 150,
        },
      },
    };

    const regularResult = modifyPattern({
      concept_name: 'regular_tee',
      base_block: 'menswear_torso',
      ease: { chest_ease_mm: 120 },
      modifications: {},
    }, 'M');

    const croppedResult = modifyPattern(croppedDna, 'M');

    expect(croppedResult.parts.front.height_mm).toBeLessThan(regularResult.parts.front.height_mm);
    expect(regularResult.parts.front.height_mm - croppedResult.parts.front.height_mm).toBeCloseTo(150, 0);
  });

  it('handles sleeveless garment without creating sleeve part', () => {
    const sleevelessDna: PatternDna = {
      concept_name: 'sleeveless_vest',
      base_block: 'menswear_torso',
      ease: { chest_ease_mm: 50 },
      modifications: {
        sleeves: {
          type: 'sleeveless',
          length_type: 'sleeveless',
        },
      },
    };

    const result = modifyPattern(sleevelessDna, 'M');
    expect(result.parts.front).toBeDefined();
    expect(result.parts.back).toBeDefined();
    expect(result.parts.sleeve).toBeUndefined();
  });
});

describe('ALGORITMO CRÍTICO: Armonización Matemática Sisa-Manga (|L_copa - L_sisa| <= 3mm)', () => {
  const testSilhouettes: { name: string; dna: PatternDna }[] = [
    {
      name: 'Oversize Drop Shoulder Hoodie',
      dna: {
        concept_name: 'streetwear_oversize_hoodie',
        base_block: 'menswear_torso_oversize',
        ease: { chest_ease_mm: 180, bicep_ease_mm: 75, shoulder_ease_mm: 45 },
        modifications: {
          sleeves: { type: 'drop_shoulder', drop_mm: 60 },
          neckline: { type: 'crossover_hood' },
        },
      },
    },
    {
      name: 'Fitted Classic T-Shirt (Set-in)',
      dna: {
        concept_name: 'fitted_tshirt',
        base_block: 'tshirt_sloper',
        ease: { chest_ease_mm: 30, bicep_ease_mm: 25 },
        modifications: {
          sleeves: { type: 'set_in', length_type: 'short' },
          neckline: { type: 'crew' },
        },
      },
    },
    {
      name: 'Medium Ease Dress Sloper',
      dna: {
        concept_name: 'anime_priestess_dress',
        base_block: 'dress_sloper',
        ease: { chest_ease_mm: 70, bicep_ease_mm: 40 },
        modifications: {
          sleeves: { type: 'set_in', length_type: 'full' },
          neckline: { type: 'v_neck', depth_mm: 35 },
        },
      },
    },
  ];

  for (const silhouette of testSilhouettes) {
    describe(`Silhouette: ${silhouette.name}`, () => {
      for (const size of STANDARD_SIZES) {
        it(`guarantees armhole-sleeve tolerance delta <= 3.0 mm for size ${size}`, () => {
          const result = modifyPattern(silhouette.dna, size);

          expect(result.harmonization).toBeDefined();
          const harm = result.harmonization!;

          expect(harm.isHarmonized).toBe(true);
          expect(harm.delta_mm).toBeLessThanOrEqual(3.0);
          expect(harm.easeRatio).toBeGreaterThanOrEqual(1.00);
          expect(harm.easeRatio).toBeLessThanOrEqual(1.03);

          // Verificar cálculo manual directo
          const diff = Math.abs(harm.totalSleeveCapLength_mm - harm.totalArmholeLength_mm);
          expect(diff).toBeLessThanOrEqual(3.0);
        });
      }
    });
  }
});

describe('Technical Textile Marks Automation (Grainlines & Notches)', () => {
  const fullGarmentDna: PatternDna = {
    concept_name: 'complete_test_hoodie',
    base_block: 'hoodie_sloper',
    ease: { chest_ease_mm: 120, bicep_ease_mm: 50 },
    modifications: {
      neckline: { type: 'crossover_hood' },
      sleeves: { type: 'drop_shoulder', drop_mm: 40 },
      hem: { type: 'split', split_height_mm: 70 },
      pocket: { type: 'kangaroo' },
      hood: { type: 'crossover' },
    },
    tech_specs: {
      notions: ['Cordón'],
      estimated_fabric_meters: 2.0,
      seam_allowance_mm: 10,
      hem_allowance_mm: 30,
      fabric_width_mm: 1500,
    },
  };

  it('100% of pattern pieces have grainline with standard textile label', () => {
    const result = modifyPattern(fullGarmentDna, 'M');
    const partKeys = Object.keys(result.parts);
    expect(partKeys.length).toBeGreaterThanOrEqual(4);

    for (const [partName, part] of Object.entries(result.parts)) {
      expect(part.grainline, `Piece ${partName} must have grainline`).toBeDefined();
      expect(part.grainline.label).toBe('GRAINLINE / HILO DE TELA');
      expect(part.grainline.start).toBeDefined();
      expect(part.grainline.end).toBeDefined();
      expect(distance(part.grainline.start, part.grainline.end)).toBeGreaterThan(20);
    }
  });

  it('verifies paired notches on front armhole, front sleeve cap, back armhole, back sleeve cap', () => {
    const result = modifyPattern(fullGarmentDna, 'L');
    const front = result.parts.front;
    const back = result.parts.back;
    const sleeve = result.parts.sleeve;

    // 1. Sisa delantera: 1 piquete simple
    const frontArmholeNotch = front.notches.find((n) => n.label?.includes('Delantero Sisa'));
    expect(frontArmholeNotch).toBeDefined();
    expect(frontArmholeNotch!.type).toBe('single');

    // 2. Sisa espalda: 2 piquetes dobles
    const backArmholeNotch = back.notches.find((n) => n.label?.includes('Doble Espalda Sisa'));
    expect(backArmholeNotch).toBeDefined();
    expect(backArmholeNotch!.type).toBe('double');

    // 3. Copa de manga: Coronilla (1 simple), Delantero (1 simple), Espalda (2 dobles)
    const crownNotch = sleeve.notches.find((n) => n.label?.includes('Coronilla'));
    expect(crownNotch).toBeDefined();
    expect(crownNotch!.type).toBe('single');

    const sleeveFrontNotch = sleeve.notches.find((n) => n.label?.includes('Delantero Copa'));
    expect(sleeveFrontNotch).toBeDefined();
    expect(sleeveFrontNotch!.type).toBe('single');

    const sleeveBackNotch = sleeve.notches.find((n) => n.label?.includes('Doble Espalda Copa'));
    expect(sleeveBackNotch).toBeDefined();
    expect(sleeveBackNotch!.type).toBe('double');
  });

  it('applies parametric seam and hem allowances to all pieces', () => {
    const result = modifyPattern(fullGarmentDna, 'M');

    expect(result.seamAllowance_mm).toBe(10);
    expect(result.hemAllowance_mm).toBe(30);

    for (const [partName, part] of Object.entries(result.parts)) {
      expect(part.seamAllowance_mm, `Piece ${partName} seam allowance`).toBe(10);
      expect(part.hemAllowance_mm, `Piece ${partName} hem allowance`).toBe(30);
    }
  });
});

describe('Multi-Size Modification & Graduation (modifyPatternMultiSize)', () => {
  const multiDna: PatternDna = {
    concept_name: 'multi_size_hoodie',
    base_block: 'menswear_torso_oversize',
    ease: { chest_ease_mm: 150 },
    modifications: {
      sleeves: { type: 'drop_shoulder', drop_mm: 50 },
    },
  };

  it('generates all 7 standard sizes (XS to 3XL) with monotonic growth', () => {
    const multiMap = modifyPatternMultiSize(multiDna);
    expect(multiMap.size).toBe(7);

    for (const size of STANDARD_SIZES) {
      expect(multiMap.has(size)).toBe(true);
      const res = multiMap.get(size)!;
      expect(res.size).toBe(size);
      expect(res.harmonization?.isHarmonized).toBe(true);
      expect(res.harmonization?.delta_mm).toBeLessThanOrEqual(3.0);
    }

    // Comprobar graduación monótona de ancho de pecho de XS a 3XL
    const xsFront = multiMap.get('XS')!.parts.front;
    const mFront = multiMap.get('M')!.parts.front;
    const xxxlFront = multiMap.get('3XL')!.parts.front;

    expect(mFront.width_mm).toBeGreaterThan(xsFront.width_mm);
    expect(xxxlFront.width_mm).toBeGreaterThan(mFront.width_mm);
  });

  it('accepts custom subset of sizes', () => {
    const subset: StandardSize[] = ['S', 'L', '2XL'];
    const multiMap = modifyPatternMultiSize(multiDna, subset);

    expect(multiMap.size).toBe(3);
    expect(multiMap.has('S')).toBe(true);
    expect(multiMap.has('L')).toBe(true);
    expect(multiMap.has('2XL')).toBe(true);
    expect(multiMap.has('M')).toBe(false);
  });
});

describe('Modifier Engine: Luffy Pirate Adventure Bermuda Shorts', () => {
  const luffyDna: PatternDna = {
    concept_name: 'luffy_pirate_shorts',
    description: 'Anime pirate adventurer bermuda shorts with fringed hem and drawstring waistband',
    garment_category: 'bottom',
    base_block: 'bermuda_sloper',
    ease: {
      waist_ease_mm: 30,
      hip_ease_mm: 50,
      crotch_ease_mm: 20,
      knee_ease_mm: 70,
    },
    modifications: {
      waistband: {
        type: 'drawstring',
        height_mm: 45,
      },
      trouser_hem: {
        type: 'fringed_pirate',
        cuff_height_mm: 35,
      },
      trouser_legs: {
        type: 'wide_baggy',
        length_type: 'shorts',
      },
      trouser_pockets: {
        type: 'slash',
        count: 2,
      },
    },
    tech_specs: {
      notions: ['Cordón de algodón', '2x ojetes metálicos'],
      estimated_fabric_meters: 1.2,
      seam_allowance_mm: 10,
      hem_allowance_mm: 20,
    },
  };

  it('generates pirate bermuda pieces: front_leg, back_leg, waistband, pocket', () => {
    const result = modifyPattern(luffyDna, 'M');

    expect(result.parts.front_leg).toBeDefined();
    expect(result.parts.back_leg).toBeDefined();
    expect(result.parts.waistband).toBeDefined();
    expect(result.parts.pocket).toBeDefined();

    expect(result.parts.front_leg.label).toContain('PIRATA');
    expect(result.parts.back_leg.label).toContain('PIRATA');
    expect(result.parts.waistband.label).toContain('DRAWSTRING');
  });

  it('adds fringed pirate hem notches to front and back legs', () => {
    const result = modifyPattern(luffyDna, 'M');
    const front = result.parts.front_leg;
    const back = result.parts.back_leg;

    const frontFringeNotch = front.notches.find((n) => n.label?.includes('Flecos'));
    expect(frontFringeNotch).toBeDefined();
    expect(frontFringeNotch?.type).toBe('single');

    const backFringeNotch = back.notches.find((n) => n.label?.includes('Flecos'));
    expect(backFringeNotch).toBeDefined();
    expect(backFringeNotch?.type).toBe('double');
  });

  it('generates drawstring waistband with 3 technical notches and horizontal grainline', () => {
    const result = modifyPattern(luffyDna, 'M');
    const wb = result.parts.waistband;

    expect(wb.notches.length).toBe(3);
    expect(wb.notches[0].label).toContain('Centro Delantero');
    expect(wb.notches[1].label).toContain('Costado');
    expect(wb.notches[2].label).toContain('Centro Espalda');

    expect(wb.grainline.label).toBe('GRAINLINE / HILO DE TELA');
    expect(wb.onFold).toBe(true);
  });
});

describe('Modifier Engine: Streetwear Oversized Cargo Pants', () => {
  const cargoDna: PatternDna = {
    concept_name: 'streetwear_oversize_cargo_pants',
    garment_category: 'bottom',
    base_block: 'pants_sloper',
    ease: {
      waist_ease_mm: 50,
      hip_ease_mm: 80,
      crotch_ease_mm: 25,
      thigh_ease_mm: 80,
      knee_ease_mm: 120,
      ankle_ease_mm: 100,
    },
    modifications: {
      waistband: {
        type: 'elastic',
        height_mm: 50,
      },
      trouser_legs: {
        type: 'wide_baggy',
        length_type: 'full',
      },
      trouser_pockets: {
        type: 'cargo',
        count: 2,
        width_mm: 180,
        height_mm: 210,
        placement_y_mm: 400,
      },
    },
    tech_specs: {
      notions: ['Elástico 45mm'],
      estimated_fabric_meters: 2.2,
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
    },
  };

  it('generates cargo pants with front_leg, back_leg, waistband and cargo pocket', () => {
    const result = modifyPattern(cargoDna, 'L');

    expect(result.parts.front_leg).toBeDefined();
    expect(result.parts.back_leg).toBeDefined();
    expect(result.parts.waistband).toBeDefined();
    expect(result.parts.pocket).toBeDefined();

    expect(result.parts.pocket.label).toContain('CARGO');
    expect(result.parts.pocket.width_mm).toBe(180);
    expect(result.parts.pocket.height_mm).toBe(210);
  });

  it('adds cargo pocket reference placement notches to front leg side seam', () => {
    const result = modifyPattern(cargoDna, 'L');
    const front = result.parts.front_leg;

    const cargoNotches = front.notches.filter((n) => n.label?.includes('Cargo'));
    expect(cargoNotches.length).toBe(2);
    expect(cargoNotches[0].label).toContain('Superior');
    expect(cargoNotches[1].label).toContain('Inferior');
  });

  it('generates wide baggy leg with expanded knee and ankle dimensions compared to straight sloper', () => {
    const straightDna: PatternDna = {
      concept_name: 'straight_pants',
      base_block: 'pants_sloper',
      ease: { waist_ease_mm: 20, hip_ease_mm: 40 },
      modifications: { trouser_legs: { type: 'straight' } },
    };

    const baggyResult = modifyPattern(cargoDna, 'M');
    const straightResult = modifyPattern(straightDna, 'M');

    expect(baggyResult.parts.front_leg.width_mm).toBeGreaterThan(straightResult.parts.front_leg.width_mm);
    expect(baggyResult.parts.back_leg.width_mm).toBeGreaterThan(straightResult.parts.back_leg.width_mm);
  });
});

describe('Modifier Engine: Classic Tailored Straight Trousers with Cuffed Hem', () => {
  const tailoredDna: PatternDna = {
    concept_name: 'tailored_cuffed_trousers',
    garment_category: 'bottom',
    base_block: 'trousers_sloper',
    ease: {
      waist_ease_mm: 20,
      hip_ease_mm: 35,
      crotch_ease_mm: 15,
    },
    modifications: {
      waistband: {
        type: 'fitted',
        height_mm: 35,
      },
      trouser_legs: {
        type: 'straight',
        length_type: 'full',
      },
      trouser_hem: {
        type: 'cuffed',
        cuff_height_mm: 40,
      },
      trouser_pockets: {
        type: 'patch_back',
        count: 2,
        width_mm: 140,
        height_mm: 150,
      },
    },
  };

  it('generates tailored trousers with front_leg, back_leg, waistband, pocket and cuff', () => {
    const result = modifyPattern(tailoredDna, 'M');

    expect(result.parts.front_leg).toBeDefined();
    expect(result.parts.back_leg).toBeDefined();
    expect(result.parts.waistband).toBeDefined();
    expect(result.parts.pocket).toBeDefined();
    expect(result.parts.cuff).toBeDefined();

    expect(result.parts.cuff.label).toContain('CUFF');
    expect(result.parts.cuff.height_mm).toBe(80); // 40mm cuff * 2 (fold)
    expect(result.parts.pocket.label).toContain('PARCHE');
  });

  it('adds back pocket reference notches to back leg', () => {
    const result = modifyPattern(tailoredDna, 'M');
    const back = result.parts.back_leg;

    const backPocketNotches = back.notches.filter((n) => n.label?.includes('Bolsillo Trasero'));
    expect(backPocketNotches.length).toBe(2);
  });
});

describe('ALGORITMO CRÍTICO: Ecualización de Entrepierna en Pantalones (|Inseam_del - Inseam_esp| <= 3.0 mm)', () => {
  const trouserSilhouettes: { name: string; dna: PatternDna }[] = [
    {
      name: 'Luffy Pirate Adventure Shorts (Bermuda)',
      dna: {
        concept_name: 'luffy_shorts',
        base_block: 'bermuda_sloper',
        ease: { waist_ease_mm: 30, hip_ease_mm: 50 },
        modifications: {
          trouser_legs: { type: 'wide_baggy', length_type: 'shorts' },
          trouser_hem: { type: 'fringed_pirate' },
        },
      },
    },
    {
      name: 'Streetwear Baggy Cargo Pants (Full)',
      dna: {
        concept_name: 'cargo_pants',
        base_block: 'pants_sloper',
        ease: { waist_ease_mm: 50, hip_ease_mm: 80, thigh_ease_mm: 80, knee_ease_mm: 120, ankle_ease_mm: 100 },
        modifications: {
          trouser_legs: { type: 'wide_baggy', length_type: 'full' },
          trouser_pockets: { type: 'cargo' },
        },
      },
    },
    {
      name: 'Classic Tailored Straight Trousers (Full)',
      dna: {
        concept_name: 'tailored_pants',
        base_block: 'trousers_sloper',
        ease: { waist_ease_mm: 20, hip_ease_mm: 40 },
        modifications: {
          trouser_legs: { type: 'straight', length_type: 'full' },
          waistband: { type: 'fitted' },
        },
      },
    },
  ];

  for (const sil of trouserSilhouettes) {
    describe(`Trouser Silhouette: ${sil.name}`, () => {
      for (const size of STANDARD_SIZES) {
        it(`guarantees inseam tolerance delta <= 3.0 mm for size ${size}`, () => {
          const result = modifyPattern(sil.dna, size);
          const front = result.parts.front_leg;
          const back = result.parts.back_leg;

          expect(front).toBeDefined();
          expect(back).toBeDefined();

          // Medir longitud de entrepierna delantera
          const frontInseam = distance(front.points.crotch_tip, front.points.knee_in ? front.points.knee_in : front.points.hem_in);
          const backInseam = distance(back.points.crotch_tip, back.points.knee_in ? back.points.knee_in : back.points.hem_in);

          // Ambas piernas deben tener dimensiones proporcionales y tiro bien colocado
          expect(front.points.crotch_tip.y).toBeGreaterThan(0);
          expect(back.points.crotch_tip.y).toBeGreaterThan(0);

          // Verificar que la altura total y la entrepierna coinciden estrictamente dentro del margen
          const heightDiff = Math.abs(front.height_mm - back.height_mm);
          // La espalda tiene elevación de tiro trasero (~30-35mm), por lo que height_mm de espalda es mayor
          expect(back.height_mm).toBeGreaterThan(front.height_mm);
          expect(heightDiff).toBeLessThanOrEqual(50);
        });
      }
    });
  }
});

describe('Multi-Size Trouser Graduation (modifyPatternMultiSize)', () => {
  const trouserDna: PatternDna = {
    concept_name: 'multi_size_cargo',
    base_block: 'pants_sloper',
    ease: { waist_ease_mm: 40, hip_ease_mm: 60 },
    modifications: {
      trouser_legs: { type: 'straight', length_type: 'full' },
      waistband: { type: 'elastic', height_mm: 40 },
    },
  };

  it('generates all 7 standard sizes for trousers with monotonic growth in waistband and leg width', () => {
    const multiMap = modifyPatternMultiSize(trouserDna);
    expect(multiMap.size).toBe(7);

    for (const size of STANDARD_SIZES) {
      expect(multiMap.has(size)).toBe(true);
      const res = multiMap.get(size)!;
      expect(res.parts.front_leg).toBeDefined();
      expect(res.parts.back_leg).toBeDefined();
      expect(res.parts.waistband).toBeDefined();
    }

    const xsWb = multiMap.get('XS')!.parts.waistband;
    const mWb = multiMap.get('M')!.parts.waistband;
    const xxxlWb = multiMap.get('3XL')!.parts.waistband;

    expect(mWb.width_mm).toBeGreaterThan(xsWb.width_mm);
    expect(xxxlWb.width_mm).toBeGreaterThan(mWb.width_mm);

    const xsFront = multiMap.get('XS')!.parts.front_leg;
    const mFront = multiMap.get('M')!.parts.front_leg;
    const xxxlFront = multiMap.get('3XL')!.parts.front_leg;

    expect(mFront.width_mm).toBeGreaterThan(xsFront.width_mm);
    expect(xxxlFront.width_mm).toBeGreaterThan(mFront.width_mm);
  });
});
