/**
 * src/engine/modifier.ts
 * Motor de Modificación Paramétrica (Modifier Engine)
 * pattern-ai-core
 *
 * Aplica transformaciones deterministas de ADN Paramétrico (PatternDna)
 * sobre bloques base de moldería textil (FreeSewing v3).
 */

import {
  StandardSize,
  PatternDna,
  TechSpecs,
  NecklineMod,
  SleeveMod,
  HemMod,
  PocketMod,
  HoodMod,
  WaistbandMod,
  TrouserHemMod,
  TrouserLegsMod,
  TrouserPocketMod,
  GarmentCategory,
} from '../types/pattern.js';
import {
  Point2D,
  BoundingBox,
  TechnicalNotch,
  TechnicalGrainline,
  PatternPart,
  createPoint,
  distance,
  bezierPoint,
  sampleBezier,
  bezierLength,
  polylineLength,
  pointAlongPolyline,
  pointAlongBezier,
  computePolygonArea,
  computeBounds,
  combineBounds,
} from './geometry.js';
import {
  BodyMeasurements,
  STANDARD_MEASUREMENTS,
  STANDARD_SIZES,
  getStandardMeasurements,
  generatePocketBlock,
  generateHoodBlock,
  generateTrouserBlock,
  TrouserLengthType,
} from './base_blocks/index.js';

export interface ArmholeHarmonization {
  frontArmholeLength_mm: number;
  backArmholeLength_mm: number;
  totalArmholeLength_mm: number;
  frontSleeveCapLength_mm: number;
  backSleeveCapLength_mm: number;
  totalSleeveCapLength_mm: number;
  easeRatio: number;
  delta_mm: number;
  isHarmonized: boolean;
}

export interface ModifiedPatternResult {
  concept_name: string;
  size: StandardSize;
  base_block: string;
  measurements: BodyMeasurements;
  parts: Record<string, PatternPart>;
  bounds: BoundingBox;
  harmonization?: ArmholeHarmonization;
  seamAllowance_mm: number;
  hemAllowance_mm: number;
  tech_specs?: TechSpecs;
}

/**
 * Calcula la longitud del contorno de copa de manga para una semianchura y altura de copa dadas
 */
function computeSleeveCapCurveLength(
  halfBicep: number,
  capHeight: number
): {
  totalCapLength: number;
  frontCapLength: number;
  backCapLength: number;
  backLowerSamples: Point2D[];
  backUpperSamples: Point2D[];
  frontUpperSamples: Point2D[];
  frontLowerSamples: Point2D[];
  points: {
    cap_top: Point2D;
    cap_front_notch: Point2D;
    cap_back_notch: Point2D;
    underarm_front: Point2D;
    underarm_back: Point2D;
    backCapLowerCp1: Point2D;
    backCapLowerCp2: Point2D;
    backCapUpperCp1: Point2D;
    backCapUpperCp2: Point2D;
    frontCapUpperCp1: Point2D;
    frontCapUpperCp2: Point2D;
    frontCapLowerCp1: Point2D;
    frontCapLowerCp2: Point2D;
  };
} {
  const cap_top = createPoint(0, 0, 'cap_top');
  const cap_front_notch = createPoint(halfBicep * 0.52, capHeight * 0.48, 'cap_front_notch');
  const cap_back_notch = createPoint(-halfBicep * 0.50, capHeight * 0.42, 'cap_back_notch');

  const underarm_front = createPoint(halfBicep, capHeight, 'underarm_front');
  const underarm_back = createPoint(-halfBicep, capHeight, 'underarm_back');

  // Curvas de Espalda
  const backCapLowerCp1 = createPoint(-halfBicep * 0.85, capHeight * 0.92);
  const backCapLowerCp2 = createPoint(-halfBicep * 0.68, capHeight * 0.65);
  const backCapUpperCp1 = createPoint(-halfBicep * 0.32, capHeight * 0.18);
  const backCapUpperCp2 = createPoint(-halfBicep * 0.15, 0);

  // Curvas de Delantero
  const frontCapUpperCp1 = createPoint(halfBicep * 0.15, 0);
  const frontCapUpperCp2 = createPoint(halfBicep * 0.35, capHeight * 0.22);
  const frontCapLowerCp1 = createPoint(halfBicep * 0.70, capHeight * 0.72);
  const frontCapLowerCp2 = createPoint(halfBicep * 0.88, capHeight * 0.94);

  const lenBackLower = bezierLength(underarm_back, backCapLowerCp1, backCapLowerCp2, cap_back_notch);
  const lenBackUpper = bezierLength(cap_back_notch, backCapUpperCp1, backCapUpperCp2, cap_top);
  const lenFrontUpper = bezierLength(cap_top, frontCapUpperCp1, frontCapUpperCp2, cap_front_notch);
  const lenFrontLower = bezierLength(cap_front_notch, frontCapLowerCp1, frontCapLowerCp2, underarm_front);

  const backCapLength = Math.round((lenBackLower + lenBackUpper) * 100) / 100;
  const frontCapLength = Math.round((lenFrontUpper + lenFrontLower) * 100) / 100;
  const totalCapLength = Math.round((backCapLength + frontCapLength) * 100) / 100;

  const backLowerSamples = sampleBezier(underarm_back, backCapLowerCp1, backCapLowerCp2, cap_back_notch);
  const backUpperSamples = sampleBezier(cap_back_notch, backCapUpperCp1, backCapUpperCp2, cap_top);
  const frontUpperSamples = sampleBezier(cap_top, frontCapUpperCp1, frontCapUpperCp2, cap_front_notch);
  const frontLowerSamples = sampleBezier(cap_front_notch, frontCapLowerCp1, frontCapLowerCp2, underarm_front);

  return {
    totalCapLength,
    frontCapLength,
    backCapLength,
    backLowerSamples,
    backUpperSamples,
    frontUpperSamples,
    frontLowerSamples,
    points: {
      cap_top,
      cap_front_notch,
      cap_back_notch,
      underarm_front,
      underarm_back,
      backCapLowerCp1,
      backCapLowerCp2,
      backCapUpperCp1,
      backCapUpperCp2,
      frontCapUpperCp1,
      frontCapUpperCp2,
      frontCapLowerCp1,
      frontCapLowerCp2,
    },
  };
}

/**
 * Determina si el ADN corresponde a una prenda inferior (pantalón, bermuda, shorts)
 */
export function isBottomGarment(dna: PatternDna): boolean {
  if (dna.garment_category === 'bottom') return true;
  const base = dna.base_block.toLowerCase().trim();
  return (
    base === 'pants_sloper' ||
    base === 'trousers_sloper' ||
    base === 'trouser_sloper' ||
    base === 'pants' ||
    base === 'trousers' ||
    base === 'trouser' ||
    base === 'shorts' ||
    base === 'shorts_sloper' ||
    base === 'bermuda' ||
    base === 'bermuda_sloper' ||
    base === 'cropped_pants' ||
    base.includes('pant') ||
    base.includes('trouser') ||
    base.includes('short') ||
    base.includes('bermuda')
  );
}

/**
 * Modifica y adapta un patrón de prenda inferior (pantalón, bermuda, shorts)
 */
export function modifyTrouserPattern(
  dna: PatternDna,
  size: StandardSize,
  measurements: BodyMeasurements,
  seamAllowance: number,
  hemAllowance: number
): ModifiedPatternResult {
  const parts: Record<string, PatternPart> = {};

  const baseBlockNorm = dna.base_block.toLowerCase().trim();
  const trouserLegs = dna.modifications.trouser_legs;
  const trouserHem = dna.modifications.trouser_hem;
  const waistband = dna.modifications.waistband;

  // Normalización de bolsillos de pantalón
  const trouserPocketMod: TrouserPocketMod | undefined =
    Array.isArray(dna.modifications.trouser_pockets)
      ? dna.modifications.trouser_pockets[0]
      : dna.modifications.trouser_pockets ??
        (dna.modifications.pocket?.type === 'cargo' ||
        dna.modifications.pocket?.type === 'patch'
          ? {
              type: dna.modifications.pocket.type === 'cargo' ? 'cargo' : 'patch_back',
              width_mm: dna.modifications.pocket.width_mm,
              height_mm: dna.modifications.pocket.height_mm,
              placement_y_mm: dna.modifications.pocket.placement_y_mm,
            }
          : undefined);

  // Tipología de longitud
  const lengthType: TrouserLengthType =
    trouserLegs?.length_type ??
    (baseBlockNorm.includes('short') ||
    baseBlockNorm.includes('bermuda') ||
    trouserHem?.type === 'fringed_pirate'
      ? 'shorts'
      : baseBlockNorm.includes('crop')
        ? 'cropped'
        : 'full');

  const legType = trouserLegs?.type ?? 'straight';

  // Holguras paramétricas textiles
  const waistEase =
    dna.ease.waist_ease_mm ?? (legType === 'wide_baggy' ? 50 : 20);
  const hipEase =
    dna.ease.hip_ease_mm ?? (legType === 'wide_baggy' ? 80 : 40);
  const crotchEase =
    dna.ease.crotch_ease_mm ??
    (legType === 'wide_baggy' ? 25 : legType === 'slim' ? 5 : 15);
  const thighEase =
    dna.ease.thigh_ease_mm ??
    (legType === 'wide_baggy' ? 80 : legType === 'slim' ? 10 : 30);
  const kneeEase =
    dna.ease.knee_ease_mm ??
    (legType === 'wide_baggy'
      ? 120
      : legType === 'slim'
        ? 15
        : legType === 'flare'
          ? 20
          : legType === 'tapered'
            ? 50
            : lengthType === 'shorts' || lengthType === 'bermuda'
              ? 60
              : 40);
  const ankleEase =
    dna.ease.ankle_ease_mm ??
    (legType === 'wide_baggy'
      ? 100
      : legType === 'slim'
        ? 15
        : legType === 'flare'
          ? 140
          : legType === 'tapered'
            ? 15
            : 40);

  const lengthDelta = trouserLegs?.inseam_mm
    ? trouserLegs.inseam_mm - measurements.inseam_mm
    : (dna.modifications.hem?.drop_mm ?? 0);

  // 1. Generar piezas base de pierna (Delantero y Espalda)
  const trouserBlock = generateTrouserBlock(size, {
    length_type: lengthType,
    waist_ease_mm: waistEase,
    hip_ease_mm: hipEase,
    crotch_ease_mm: crotchEase,
    thigh_ease_mm: thighEase,
    knee_ease_mm: kneeEase,
    ankle_ease_mm: ankleEase,
    length_delta_mm: lengthDelta,
    seam_allowance_mm: seamAllowance,
    hem_allowance_mm: hemAllowance,
    measurements,
  });

  const frontLeg = trouserBlock.front_leg;
  const backLeg = trouserBlock.back_leg;

  // Ajustes de terminación de bajo pirata si aplica
  if (trouserHem?.type === 'fringed_pirate') {
    frontLeg.label = 'SHORTS DELANTERO PIRATA (FLECOS) / PIRATE SHORTS FRONT';
    backLeg.label = 'SHORTS ESPALDA PIRATA (FLECOS) / PIRATE SHORTS BACK';
    frontLeg.notches.push({
      point: createPoint(0, frontLeg.points.hem_in.y),
      type: 'single',
      label: 'Piquete Flecos / Fringes Delantero',
    });
    backLeg.notches.push({
      point: createPoint(0, backLeg.points.hem_in.y),
      type: 'double',
      label: 'Piquete Doble Flecos / Fringes Espalda',
    });
  }

  parts.front_leg = frontLeg;
  parts.back_leg = backLeg;

  // 2. Generar Pretina (Waistband)
  const wbType =
    waistband?.type ??
    (legType === 'wide_baggy' || lengthType === 'shorts' ? 'elastic' : 'fitted');
  const wbHeight = waistband?.height_mm ?? 40;
  const totalWaistCirc = measurements.waist_circumference_mm + waistEase;
  const halfWaist = Math.round((totalWaistCirc / 2) * 10) / 10;
  const pieceHeight = wbHeight * 2;

  const wb_tl = createPoint(0, 0, 'top_left');
  const wb_tr = createPoint(halfWaist, 0, 'top_right');
  const wb_br = createPoint(halfWaist, pieceHeight, 'bottom_right');
  const wb_bl = createPoint(0, pieceHeight, 'bottom_left');

  const wb_outline = [wb_tl, wb_tr, wb_br, wb_bl];
  const wb_pathD = `M 0 0 L ${halfWaist} 0 L ${halfWaist} ${pieceHeight} L 0 ${pieceHeight} Z`;
  const wb_bounds = computeBounds(wb_outline);
  const wb_area = computePolygonArea(wb_outline);

  const wb_notches: TechnicalNotch[] = [
    {
      point: createPoint(0, 0),
      type: 'single',
      label: 'Piquete Centro Delantero Pretina',
    },
    {
      point: createPoint(halfWaist / 2, 0),
      type: 'single',
      label: 'Piquete Costado Pretina',
    },
    {
      point: createPoint(halfWaist, 0),
      type: 'double',
      label: 'Piquete Centro Espalda Pretina',
    },
  ];

  const waistbandPart: PatternPart = {
    name: 'waistband',
    label: `PRETINA ${wbType.toUpperCase()} / WAISTBAND ${wbType.toUpperCase()}`,
    cutCount: 1,
    onFold: true,
    points: {
      top_left: wb_tl,
      top_right: wb_tr,
      bottom_right: wb_br,
      bottom_left: wb_bl,
    },
    pathD: wb_pathD,
    outline: wb_outline,
    bounds: wb_bounds,
    width_mm: wb_bounds.width,
    height_mm: wb_bounds.height,
    area_mm2: wb_area,
    grainline: {
      start: createPoint(20, wbHeight),
      end: createPoint(halfWaist - 20, wbHeight),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: wb_notches,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };

  parts.waistband = waistbandPart;

  // 3. Generar Bolsillos (Pockets)
  if (trouserPocketMod) {
    const pType = trouserPocketMod.type;
    const cutCount = trouserPocketMod.count ?? 2;

    if (pType === 'cargo') {
      const pWidth = trouserPocketMod.width_mm ?? 170;
      const pHeight = trouserPocketMod.height_mm ?? 190;

      const p_tl = createPoint(0, 0, 'top_left');
      const p_tr = createPoint(pWidth, 0, 'top_right');
      const p_br = createPoint(pWidth, pHeight, 'bottom_right');
      const p_bl = createPoint(0, pHeight, 'bottom_left');

      const outline = [p_tl, p_tr, p_br, p_bl];
      const pathD = `M 0 0 L ${pWidth} 0 L ${pWidth} ${pHeight} L 0 ${pHeight} Z`;
      const bounds = computeBounds(outline);
      const area = computePolygonArea(outline);

      const cargoPart: PatternPart = {
        name: 'pocket',
        label: 'BOLSILLO CARGO / CARGO POCKET',
        cutCount,
        onFold: false,
        points: {
          top_left: p_tl,
          top_right: p_tr,
          bottom_right: p_br,
          bottom_left: p_bl,
        },
        pathD,
        outline,
        bounds,
        width_mm: bounds.width,
        height_mm: bounds.height,
        area_mm2: area,
        grainline: {
          start: createPoint(pWidth / 2, 20),
          end: createPoint(pWidth / 2, pHeight - 20),
          label: 'GRAINLINE / HILO DE TELA',
        },
        notches: [
          {
            point: createPoint(0, seamAllowance + 15),
            type: 'single',
            label: 'Piquete Dobladillo Superior Bolsillo Cargo',
          },
          {
            point: createPoint(pWidth, seamAllowance + 15),
            type: 'single',
            label: 'Piquete Dobladillo Superior Bolsillo Cargo',
          },
        ],
        seamAllowance_mm: seamAllowance,
        hemAllowance_mm: hemAllowance,
      };

      parts.pocket = cargoPart;

      // Piquetes de referencia en el lateral del delantero para posicionamiento del bolsillo cargo
      const placementY =
        trouserPocketMod.placement_y_mm ?? (measurements.crotch_depth_mm + 50);
      const sideX = frontLeg.points.hip_side.x;

      frontLeg.notches.push(
        {
          point: createPoint(sideX - 10, placementY),
          type: 'single',
          label: 'Piquete Superior Bolsillo Cargo',
        },
        {
          point: createPoint(sideX - 10, placementY + pHeight),
          type: 'single',
          label: 'Piquete Inferior Bolsillo Cargo',
        }
      );
    } else if (pType === 'patch_back') {
      const pWidth = trouserPocketMod.width_mm ?? 140;
      const pHeight = trouserPocketMod.height_mm ?? 150;
      const pointDrop = 20;

      const p_tl = createPoint(0, 0, 'top_left');
      const p_tr = createPoint(pWidth, 0, 'top_right');
      const p_br = createPoint(pWidth, pHeight - pointDrop, 'bottom_right');
      const p_tip = createPoint(pWidth / 2, pHeight, 'bottom_tip');
      const p_bl = createPoint(0, pHeight - pointDrop, 'bottom_left');

      const outline = [p_tl, p_tr, p_br, p_tip, p_bl];
      const pathD = `M 0 0 L ${pWidth} 0 L ${pWidth} ${pHeight - pointDrop} L ${pWidth / 2} ${pHeight} L 0 ${pHeight - pointDrop} Z`;
      const bounds = computeBounds(outline);
      const area = computePolygonArea(outline);

      const patchPart: PatternPart = {
        name: 'pocket',
        label: 'BOLSILLO TRASERO PARCHE / BACK PATCH POCKET',
        cutCount,
        onFold: false,
        points: {
          top_left: p_tl,
          top_right: p_tr,
          bottom_right: p_br,
          bottom_tip: p_tip,
          bottom_left: p_bl,
        },
        pathD,
        outline,
        bounds,
        width_mm: bounds.width,
        height_mm: bounds.height,
        area_mm2: area,
        grainline: {
          start: createPoint(pWidth / 2, 20),
          end: createPoint(pWidth / 2, pHeight - 30),
          label: 'GRAINLINE / HILO DE TELA',
        },
        notches: [],
        seamAllowance_mm: seamAllowance,
        hemAllowance_mm: hemAllowance,
      };

      parts.pocket = patchPart;

      // Piquetes de referencia en espalda
      const placementY =
        trouserPocketMod.placement_y_mm ?? (measurements.crotch_depth_mm * 0.4);
      backLeg.notches.push(
        {
          point: createPoint(backLeg.points.hip_side.x * 0.2, placementY),
          type: 'single',
          label: 'Piquete Referencia Superior Izquierdo Bolsillo Trasero',
        },
        {
          point: createPoint(backLeg.points.hip_side.x * 0.2 + pWidth, placementY),
          type: 'single',
          label: 'Piquete Referencia Superior Derecho Bolsillo Trasero',
        }
      );
    } else if (pType === 'in_seam' || pType === 'slash') {
      const pWidth = trouserPocketMod.width_mm ?? 160;
      const pHeight = trouserPocketMod.height_mm ?? 260;

      const p_tl = createPoint(0, 0, 'top_left');
      const p_tr = createPoint(pWidth, 0, 'top_right');
      const p_br = createPoint(pWidth, pHeight * 0.6, 'bottom_right');
      const p_bc = createPoint(pWidth * 0.5, pHeight, 'bottom_center');
      const p_bl = createPoint(0, pHeight * 0.7, 'bottom_left');

      const outline = [p_tl, p_tr, p_br, p_bc, p_bl];
      const pathD = `M 0 0 L ${pWidth} 0 L ${pWidth} ${pHeight * 0.6} Q ${pWidth} ${pHeight} ${pWidth * 0.5} ${pHeight} Q 0 ${pHeight} 0 ${pHeight * 0.7} Z`;
      const bounds = computeBounds(outline);
      const area = computePolygonArea(outline);

      const slashPart: PatternPart = {
        name: 'pocket',
        label: 'BOLSA DE BOLSILLO LATERAL / POCKET BAG',
        cutCount: 4,
        onFold: false,
        points: {
          top_left: p_tl,
          top_right: p_tr,
          bottom_right: p_br,
          bottom_center: p_bc,
          bottom_left: p_bl,
        },
        pathD,
        outline,
        bounds,
        width_mm: bounds.width,
        height_mm: bounds.height,
        area_mm2: area,
        grainline: {
          start: createPoint(pWidth / 2, 20),
          end: createPoint(pWidth / 2, pHeight - 40),
          label: 'GRAINLINE / HILO DE TELA',
        },
        notches: [
          {
            point: createPoint(0, 40),
            type: 'single',
            label: 'Piquete Superior Boca Bolsillo',
          },
          {
            point: createPoint(0, 190),
            type: 'single',
            label: 'Piquete Inferior Boca Bolsillo',
          },
        ],
        seamAllowance_mm: seamAllowance,
        hemAllowance_mm: 0,
      };

      parts.pocket = slashPart;

      // Piquetes de apertura en el costado del delantero
      frontLeg.notches.push(
        {
          point: createPoint(frontLeg.points.waist_side.x - 5, 40),
          type: 'single',
          label: 'Piquete Superior Boca Bolsillo Costado',
        },
        {
          point: createPoint(frontLeg.points.hip_side.x, 190),
          type: 'single',
          label: 'Piquete Inferior Boca Bolsillo Costado',
        }
      );
    }
  }

  // 4. Generar Vuelta de Dobladillo / Puño si `trouserHem?.type === 'cuffed'`
  if (trouserHem?.type === 'cuffed') {
    const cuffHeight = trouserHem.cuff_height_mm ?? 40;
    const frontHemW = Math.abs(frontLeg.points.hem_out.x - frontLeg.points.hem_in.x);
    const backHemW = Math.abs(backLeg.points.hem_out.x - backLeg.points.hem_in.x);
    const halfCuffW = Math.round(((frontHemW + backHemW) / 2) * 10) / 10;
    const cuffPieceHeight = cuffHeight * 2;

    const c_tl = createPoint(0, 0, 'top_left');
    const c_tr = createPoint(halfCuffW, 0, 'top_right');
    const c_br = createPoint(halfCuffW, cuffPieceHeight, 'bottom_right');
    const c_bl = createPoint(0, cuffPieceHeight, 'bottom_left');

    const cuffOutline = [c_tl, c_tr, c_br, c_bl];
    const cuffPathD = `M 0 0 L ${halfCuffW} 0 L ${halfCuffW} ${cuffPieceHeight} L 0 ${cuffPieceHeight} Z`;
    const cuffBounds = computeBounds(cuffOutline);
    const cuffArea = computePolygonArea(cuffOutline);

    const cuffPart: PatternPart = {
      name: 'cuff',
      label: 'VUELTA DOBLADILLO / TROUSER CUFF',
      cutCount: 2,
      onFold: true,
      points: {
        top_left: c_tl,
        top_right: c_tr,
        bottom_right: c_br,
        bottom_left: c_bl,
      },
      pathD: cuffPathD,
      outline: cuffOutline,
      bounds: cuffBounds,
      width_mm: cuffBounds.width,
      height_mm: cuffBounds.height,
      area_mm2: cuffArea,
      grainline: {
        start: createPoint(20, cuffHeight),
        end: createPoint(halfCuffW - 20, cuffHeight),
        label: 'GRAINLINE / HILO DE TELA',
      },
      notches: [
        {
          point: createPoint(halfCuffW / 2, 0),
          type: 'single',
          label: 'Piquete Costado Vuelta Dobladillo',
        },
      ],
      seamAllowance_mm: seamAllowance,
      hemAllowance_mm: 0,
    };

    parts.cuff = cuffPart;
  }

  // 5. Verificación de Grainlines y Márgenes en el 100% de piezas
  for (const [partName, part] of Object.entries(parts)) {
    if (!part.grainline || !part.grainline.label) {
      part.grainline = {
        start: createPoint(part.width_mm / 2, part.height_mm * 0.8),
        end: createPoint(part.width_mm / 2, part.height_mm * 0.2),
        label: 'GRAINLINE / HILO DE TELA',
      };
    }
    if (part.seamAllowance_mm === undefined) {
      part.seamAllowance_mm = seamAllowance;
    }
    if (part.hemAllowance_mm === undefined) {
      part.hemAllowance_mm = hemAllowance;
    }
  }

  const allBounds = Object.values(parts).map((p) => p.bounds);
  const totalBounds = combineBounds(allBounds);

  return {
    concept_name: dna.concept_name,
    size,
    base_block: dna.base_block,
    measurements,
    parts,
    bounds: totalBounds,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
    tech_specs: dna.tech_specs,
  };
}

/**
 * Aplica modificaciones paramétricas de ADN sobre los bloques base y genera las piezas adaptadas
 * @param dna ADN paramétrico del patrón
 * @param targetSize Talla estándar a generar (por defecto 'M' o la especificada en sizing)
 */
export function modifyPattern(
  dna: PatternDna,
  targetSize?: StandardSize
): ModifiedPatternResult {
  const size: StandardSize = targetSize ?? dna.sizing?.size ?? 'M';
  const measurements: BodyMeasurements = {
    ...getStandardMeasurements(size),
    ...(dna.sizing?.chest_circ_mm ? { chest_circumference_mm: dna.sizing.chest_circ_mm } : {}),
    ...(dna.sizing?.waist_circ_mm ? { waist_circumference_mm: dna.sizing.waist_circ_mm } : {}),
    ...(dna.sizing?.hip_circ_mm ? { hip_circumference_mm: dna.sizing.hip_circ_mm } : {}),
    ...(dna.sizing?.height_mm ? { front_length_mm: dna.sizing.height_mm * 0.42, back_length_mm: dna.sizing.height_mm * 0.40 } : {}),
  };

  const seamAllowance = dna.tech_specs?.seam_allowance_mm ?? 10;
  const hemAllowance =
    dna.tech_specs?.hem_allowance_mm ?? dna.modifications.hem?.allowance_mm ?? 25;

  // Si la prenda es de tipo inferior (pantalón, bermuda, shorts), delegar a modifyTrouserPattern
  if (isBottomGarment(dna)) {
    return modifyTrouserPattern(dna, size, measurements, seamAllowance, hemAllowance);
  }

  const parts: Record<string, PatternPart> = {};

  // =========================================================================
  // 1. ANÁLISIS DE MODIFICACIONES Y HOLGURAS (EASE SETTINGS)
  // =========================================================================
  const chestEase = dna.ease.chest_ease_mm ?? 40;
  const shoulderEase = dna.ease.shoulder_ease_mm ?? (chestEase > 100 ? 30 : 0);
  const waistEase = dna.ease.waist_ease_mm ?? chestEase * 0.8;
  const hipEase = dna.ease.hip_ease_mm ?? chestEase * 0.9;
  const baseBicepEase = dna.ease.bicep_ease_mm ?? (chestEase > 100 ? 60 : 40);

  const quarterChest = (measurements.chest_circumference_mm + chestEase) / 4;
  const quarterWaist = (measurements.waist_circumference_mm + waistEase) / 4;
  const quarterHip = (measurements.hip_circumference_mm + hipEase) / 4;

  // =========================================================================
  // 2. TRANSFORMACIONES DE ESCOTE (NECKLINE MODIFICATIONS)
  // =========================================================================
  const neckMod: NecklineMod = dna.modifications.neckline ?? { type: 'crew' };
  const neckDepthDelta = neckMod.depth_mm ?? neckMod.drop_mm ?? 0;
  const neckWidthDelta = neckMod.width_mm ?? 0;

  const baseNeckWidth = measurements.neck_circumference_mm / 6 + 10;
  const neckWidth =
    baseNeckWidth +
    neckWidthDelta +
    (neckMod.type === 'crossover_hood' && neckWidthDelta === 0 ? 15 : 0);

  let frontNeckDepth: number;
  if (neckMod.type === 'v_neck') {
    frontNeckDepth = measurements.neck_circumference_mm / 6 + 45 + neckDepthDelta;
  } else if (neckMod.type === 'crossover_hood') {
    frontNeckDepth =
      measurements.neck_circumference_mm / 6 + 35 + (neckDepthDelta > 0 ? neckDepthDelta : 15);
  } else if (neckMod.type === 'scoop') {
    frontNeckDepth = measurements.neck_circumference_mm / 6 + 50 + neckDepthDelta;
  } else {
    // crew, hood, etc.
    frontNeckDepth = measurements.neck_circumference_mm / 6 + 20 + neckDepthDelta;
  }

  const backNeckDepth =
    25 +
    (neckDepthDelta > 0 ? neckDepthDelta * 0.25 : 0) +
    (neckMod.type === 'crossover_hood' ? 10 : 0);

  // =========================================================================
  // 3. TRANSFORMACIONES DE HOMBRO Y SISAS (SHOULDER & SLEEVE MODIFICATIONS)
  // =========================================================================
  const sleeveMod: SleeveMod = dna.modifications.sleeves ?? { type: 'set_in' };
  const isDropShoulder =
    sleeveMod.type === 'drop_shoulder' ||
    sleeveMod.type === 'oversized' ||
    dna.base_block.toLowerCase().includes('oversize');

  const shoulderDropMm = isDropShoulder ? (sleeveMod.drop_mm ?? 50) : 0;
  const halfShoulder =
    measurements.shoulder_to_shoulder_mm / 2 + shoulderEase / 2 + shoulderDropMm;

  const shoulderSlopeRad = (measurements.shoulder_slope_deg * Math.PI) / 180;
  const baseShoulderSlopeDrop = (halfShoulder - neckWidth) * Math.tan(shoulderSlopeRad);
  const shoulderDrop =
    baseShoulderSlopeDrop + (isDropShoulder ? shoulderDropMm * 0.18 : 0);

  // Profundidad de sisa adaptada a la caída de hombro y holgura de pecho
  const armholeDepth =
    measurements.chest_circumference_mm / 4 -
    15 +
    chestEase * 0.1 +
    (isDropShoulder ? shoulderDropMm * 0.25 : 0);

  // =========================================================================
  // 4. TRANSFORMACIONES DE BAJO / DOBLADILLO (HEM MODIFICATIONS)
  // =========================================================================
  const hemMod: HemMod = dna.modifications.hem ?? { type: 'straight' };
  const isCurvedTail = hemMod.type === 'curved_tail';
  const isCropped = hemMod.type === 'cropped';
  const isRibbed = hemMod.type === 'ribbed';

  const croppedDelta = isCropped ? (hemMod.drop_mm && hemMod.drop_mm > 0 ? hemMod.drop_mm : 140) : 0;
  const ribHeightDelta = isRibbed ? (hemMod.rib_height_mm ?? 60) : 0;
  const lengthReduction = croppedDelta + ribHeightDelta;

  const isDress =
    dna.base_block.toLowerCase().includes('dress') ||
    dna.base_block.toLowerCase().includes('skirt');
  const dressLengthDelta = isDress ? 350 : 0;

  const frontLength = measurements.front_length_mm - lengthReduction + dressLengthDelta;
  const backLength = measurements.back_length_mm - lengthReduction + dressLengthDelta;

  const hemFrontDrop = isCurvedTail ? (hemMod.drop_mm ?? 35) : 0;
  const hemBackDrop = isCurvedTail ? (hemMod.back_drop_mm ?? (hemMod.drop_mm ? hemMod.drop_mm + 15 : 50)) : 0;

  // =========================================================================
  // 5. CONSTRUCCIÓN GEOMÉTRICA DE TORSO DELANTERO (FRONT TORSO)
  // =========================================================================
  const front_neck_center = createPoint(0, frontNeckDepth, 'neck_center');
  const front_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const front_shoulder_tip = createPoint(halfShoulder, shoulderDrop, 'shoulder_tip');
  const front_armhole_pitch = createPoint(
    quarterChest - (isDropShoulder ? 24 : 18),
    armholeDepth - 45,
    'armhole_pitch'
  );
  const front_armhole_bottom = createPoint(quarterChest, armholeDepth, 'armhole_bottom');
  const front_side_hem = createPoint(quarterChest, frontLength, 'side_hem');
  const front_center_hem = createPoint(0, frontLength + hemFrontDrop, 'center_hem');

  // Curvas de escote delantero
  let frontNeckCp1: Point2D;
  let frontNeckCp2: Point2D;
  if (neckMod.type === 'v_neck') {
    frontNeckCp1 = createPoint(neckWidth * 0.35, frontNeckDepth * 0.85);
    frontNeckCp2 = createPoint(neckWidth * 0.75, frontNeckDepth * 0.35);
  } else {
    frontNeckCp1 = createPoint(neckWidth * 0.45, frontNeckDepth);
    frontNeckCp2 = createPoint(neckWidth, frontNeckDepth * 0.45);
  }

  // Curvas de sisa delantera
  const frontArmholeCp1 = createPoint(
    halfShoulder - (isDropShoulder ? 2 : 5),
    shoulderDrop + (armholeDepth - shoulderDrop) * (isDropShoulder ? 0.38 : 0.30)
  );
  const frontArmholeCp2 = createPoint(
    quarterChest - (isDropShoulder ? 28 : 22),
    armholeDepth - 65
  );
  const frontArmholeLowerCp1 = createPoint(
    quarterChest - (isDropShoulder ? 15 : 12),
    armholeDepth - 25
  );
  const frontArmholeLowerCp2 = createPoint(quarterChest - 4, armholeDepth);

  const frontNeckSamples = sampleBezier(
    front_neck_center,
    frontNeckCp1,
    frontNeckCp2,
    front_neck_shoulder
  );
  const frontArmholeUpperSamples = sampleBezier(
    front_shoulder_tip,
    frontArmholeCp1,
    frontArmholeCp2,
    front_armhole_pitch
  );
  const frontArmholeLowerSamples = sampleBezier(
    front_armhole_pitch,
    frontArmholeLowerCp1,
    frontArmholeLowerCp2,
    front_armhole_bottom
  );

  // Curva de dobladillo delantero
  let frontHemSamples: Point2D[];
  let frontHemCp1: Point2D | undefined;
  let frontHemCp2: Point2D | undefined;
  if (isCurvedTail) {
    frontHemCp1 = createPoint(quarterChest * 0.65, frontLength);
    frontHemCp2 = createPoint(quarterChest * 0.25, frontLength + hemFrontDrop);
    frontHemSamples = sampleBezier(front_side_hem, frontHemCp1, frontHemCp2, front_center_hem);
  } else {
    frontHemSamples = [front_side_hem, front_center_hem];
  }

  const frontOutline: Point2D[] = [
    ...frontNeckSamples,
    front_shoulder_tip,
    ...frontArmholeUpperSamples.slice(1),
    ...frontArmholeLowerSamples.slice(1),
    ...frontHemSamples,
  ];

  let frontPathD = [
    `M ${front_neck_center.x} ${front_neck_center.y}`,
    `C ${frontNeckCp1.x} ${frontNeckCp1.y}, ${frontNeckCp2.x} ${frontNeckCp2.y}, ${front_neck_shoulder.x} ${front_neck_shoulder.y}`,
    `L ${front_shoulder_tip.x} ${front_shoulder_tip.y}`,
    `C ${frontArmholeCp1.x} ${frontArmholeCp1.y}, ${frontArmholeCp2.x} ${frontArmholeCp2.y}, ${front_armhole_pitch.x} ${front_armhole_pitch.y}`,
    `C ${frontArmholeLowerCp1.x} ${frontArmholeLowerCp1.y}, ${frontArmholeLowerCp2.x} ${frontArmholeLowerCp2.y}, ${front_armhole_bottom.x} ${front_armhole_bottom.y}`,
    `L ${front_side_hem.x} ${front_side_hem.y}`,
  ];
  if (isCurvedTail && frontHemCp1 && frontHemCp2) {
    frontPathD.push(
      `C ${frontHemCp1.x} ${frontHemCp1.y}, ${frontHemCp2.x} ${frontHemCp2.y}, ${front_center_hem.x} ${front_center_hem.y}`
    );
  } else {
    frontPathD.push(`L ${front_center_hem.x} ${front_center_hem.y}`);
  }
  frontPathD.push(`Z`);

  const frontBounds = computeBounds(frontOutline);
  const frontArea = computePolygonArea(frontOutline);

  const frontNotches: TechnicalNotch[] = [
    {
      point: front_armhole_pitch,
      type: 'single',
      label: 'Piquete Delantero Sisa',
    },
  ];

  // Piquete de split de bajo si corresponde
  if (hemMod.type === 'split' && (hemMod.split_height_mm ?? 60) > 0) {
    const splitH = hemMod.split_height_mm ?? 60;
    frontNotches.push({
      point: createPoint(quarterChest, frontLength - splitH),
      type: 'single',
      label: 'Piquete Apertura Lateral Bajo',
    });
  }

  const frontPart: PatternPart = {
    name: 'front',
    label: 'TORSO DELANTERO / FRONT TORSO',
    cutCount: 1,
    onFold: true,
    points: {
      neck_center: front_neck_center,
      neck_shoulder: front_neck_shoulder,
      shoulder_tip: front_shoulder_tip,
      armhole_pitch: front_armhole_pitch,
      armhole_bottom: front_armhole_bottom,
      side_hem: front_side_hem,
      center_hem: front_center_hem,
    },
    pathD: frontPathD.join(' '),
    outline: frontOutline,
    bounds: frontBounds,
    width_mm: frontBounds.width,
    height_mm: frontBounds.height,
    area_mm2: frontArea,
    grainline: {
      start: createPoint(35, armholeDepth),
      end: createPoint(35, frontLength - 60),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: frontNotches,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };
  parts.front = frontPart;

  // =========================================================================
  // 6. CONSTRUCCIÓN GEOMÉTRICA DE TORSO ESPALDA (BACK TORSO)
  // =========================================================================
  const back_neck_center = createPoint(0, backNeckDepth, 'neck_center');
  const back_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const back_shoulder_tip = createPoint(
    halfShoulder + 4,
    shoulderDrop - 4,
    'shoulder_tip'
  );
  const back_armhole_pitch = createPoint(
    quarterChest - (isDropShoulder ? 18 : 12),
    armholeDepth - 55,
    'armhole_pitch'
  );
  const back_armhole_bottom = createPoint(quarterChest, armholeDepth, 'armhole_bottom');
  const back_side_hem = createPoint(quarterChest, backLength, 'side_hem');
  const back_center_hem = createPoint(0, backLength + hemBackDrop, 'center_hem');

  // Curvas de escote espalda
  const backNeckCp1 = createPoint(neckWidth * 0.5, backNeckDepth);
  const backNeckCp2 = createPoint(neckWidth, backNeckDepth * 0.3);

  // Curvas de sisa espalda
  const backArmholeCp1 = createPoint(
    halfShoulder + (isDropShoulder ? 4 : 2),
    shoulderDrop + (armholeDepth - shoulderDrop) * (isDropShoulder ? 0.38 : 0.30)
  );
  const backArmholeCp2 = createPoint(
    quarterChest - (isDropShoulder ? 22 : 16),
    armholeDepth - 75
  );
  const backArmholeLowerCp1 = createPoint(
    quarterChest - (isDropShoulder ? 10 : 8),
    armholeDepth - 30
  );
  const backArmholeLowerCp2 = createPoint(quarterChest - 2, armholeDepth);

  const backNeckSamples = sampleBezier(
    back_neck_center,
    backNeckCp1,
    backNeckCp2,
    back_neck_shoulder
  );
  const backArmholeUpperSamples = sampleBezier(
    back_shoulder_tip,
    backArmholeCp1,
    backArmholeCp2,
    back_armhole_pitch
  );
  const backArmholeLowerSamples = sampleBezier(
    back_armhole_pitch,
    backArmholeLowerCp1,
    backArmholeLowerCp2,
    back_armhole_bottom
  );

  let backHemSamples: Point2D[];
  let backHemCp1: Point2D | undefined;
  let backHemCp2: Point2D | undefined;
  if (isCurvedTail) {
    backHemCp1 = createPoint(quarterChest * 0.65, backLength);
    backHemCp2 = createPoint(quarterChest * 0.25, backLength + hemBackDrop);
    backHemSamples = sampleBezier(back_side_hem, backHemCp1, backHemCp2, back_center_hem);
  } else {
    backHemSamples = [back_side_hem, back_center_hem];
  }

  const backOutline: Point2D[] = [
    ...backNeckSamples,
    back_shoulder_tip,
    ...backArmholeUpperSamples.slice(1),
    ...backArmholeLowerSamples.slice(1),
    ...backHemSamples,
  ];

  let backPathD = [
    `M ${back_neck_center.x} ${back_neck_center.y}`,
    `C ${backNeckCp1.x} ${backNeckCp1.y}, ${backNeckCp2.x} ${backNeckCp2.y}, ${back_neck_shoulder.x} ${back_neck_shoulder.y}`,
    `L ${back_shoulder_tip.x} ${back_shoulder_tip.y}`,
    `C ${backArmholeCp1.x} ${backArmholeCp1.y}, ${backArmholeCp2.x} ${backArmholeCp2.y}, ${back_armhole_pitch.x} ${back_armhole_pitch.y}`,
    `C ${backArmholeLowerCp1.x} ${backArmholeLowerCp1.y}, ${backArmholeLowerCp2.x} ${backArmholeLowerCp2.y}, ${back_armhole_bottom.x} ${back_armhole_bottom.y}`,
    `L ${back_side_hem.x} ${back_side_hem.y}`,
  ];
  if (isCurvedTail && backHemCp1 && backHemCp2) {
    backPathD.push(
      `C ${backHemCp1.x} ${backHemCp1.y}, ${backHemCp2.x} ${backHemCp2.y}, ${back_center_hem.x} ${back_center_hem.y}`
    );
  } else {
    backPathD.push(`L ${back_center_hem.x} ${back_center_hem.y}`);
  }
  backPathD.push(`Z`);

  const backBounds = computeBounds(backOutline);
  const backArea = computePolygonArea(backOutline);

  const backNotches: TechnicalNotch[] = [
    {
      point: back_armhole_pitch,
      type: 'double',
      label: 'Piquete Doble Espalda Sisa',
    },
  ];

  if (hemMod.type === 'split' && (hemMod.split_height_mm ?? 60) > 0) {
    const splitH = hemMod.split_height_mm ?? 60;
    backNotches.push({
      point: createPoint(quarterChest, backLength - splitH),
      type: 'single',
      label: 'Piquete Apertura Lateral Bajo',
    });
  }

  const backPart: PatternPart = {
    name: 'back',
    label: 'TORSO ESPALDA / BACK TORSO',
    cutCount: 1,
    onFold: true,
    points: {
      neck_center: back_neck_center,
      neck_shoulder: back_neck_shoulder,
      shoulder_tip: back_shoulder_tip,
      armhole_pitch: back_armhole_pitch,
      armhole_bottom: back_armhole_bottom,
      side_hem: back_side_hem,
      center_hem: back_center_hem,
    },
    pathD: backPathD.join(' '),
    outline: backOutline,
    bounds: backBounds,
    width_mm: backBounds.width,
    height_mm: backBounds.height,
    area_mm2: backArea,
    grainline: {
      start: createPoint(35, armholeDepth),
      end: createPoint(35, backLength - 60),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: backNotches,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };
  parts.back = backPart;

  // =========================================================================
  // 7. ALGORITMO CRÍTICO: ARMONIZACIÓN MATEMÁTICA SISA-MANGA
  // =========================================================================
  // Medición de arco real de las sisas modificadas
  const lenFrontArmholeUpper = bezierLength(
    front_shoulder_tip,
    frontArmholeCp1,
    frontArmholeCp2,
    front_armhole_pitch
  );
  const lenFrontArmholeLower = bezierLength(
    front_armhole_pitch,
    frontArmholeLowerCp1,
    frontArmholeLowerCp2,
    front_armhole_bottom
  );
  const frontArmholeLength =
    Math.round((lenFrontArmholeUpper + lenFrontArmholeLower) * 100) / 100;

  const lenBackArmholeUpper = bezierLength(
    back_shoulder_tip,
    backArmholeCp1,
    backArmholeCp2,
    back_armhole_pitch
  );
  const lenBackArmholeLower = bezierLength(
    back_armhole_pitch,
    backArmholeLowerCp1,
    backArmholeLowerCp2,
    back_armhole_bottom
  );
  const backArmholeLength =
    Math.round((lenBackArmholeUpper + lenBackArmholeLower) * 100) / 100;

  const totalArmholeLength =
    Math.round((frontArmholeLength + backArmholeLength) * 100) / 100;

  let harmonization: ArmholeHarmonization | undefined;

  const isSleeveless = sleeveMod.length_type === 'sleeveless' || sleeveMod.type === 'sleeveless';

  if (!isSleeveless) {
    // Largo de manga adaptado (compensación por hombro caído y tipo de largo)
    let sleeveLength = measurements.sleeve_length_mm;
    if (isDropShoulder) {
      sleeveLength -= shoulderDropMm * 0.85;
    }

    if (sleeveMod.length_type === 'short') {
      sleeveLength = 220 + (measurements.sleeve_length_mm - 610) * 0.2;
    } else if (sleeveMod.length_type === 'three_quarter') {
      sleeveLength = 440 + (measurements.sleeve_length_mm - 610) * 0.5;
    } else if (sleeveMod.length_mm && sleeveMod.length_mm > 0) {
      sleeveLength = sleeveMod.length_mm;
    }

    if (sleeveMod.cuff_rib_mm && sleeveMod.cuff_rib_mm > 0) {
      sleeveLength -= sleeveMod.cuff_rib_mm;
    }

    // Altura de copa adaptada al estilo de hombro
    let capHeight: number;
    if (isDropShoulder) {
      const baseCap = (measurements.bicep_circumference_mm / 2 + baseBicepEase / 2) * 0.42;
      capHeight = Math.max(45, Math.round(baseCap - shoulderDropMm * 0.3));
    } else {
      capHeight = Math.round(
        (measurements.bicep_circumference_mm / 2 + baseBicepEase / 2) * 0.72
      );
    }

    // Objetivo de longitud de copa: ratio de embebido 1.005 (0.5% holgura de costura)
    // Tolerancia estricta garantizada: |L_copa - L_sisa| < 3mm
    const targetEaseRatio = 1.005;
    const targetCapLength = totalArmholeLength * targetEaseRatio;

    // Búsqueda de raíz por bisección para hallar halfBicep exacto
    let lowW = targetCapLength * 0.15;
    let highW = targetCapLength * 0.65;
    let bestCap = computeSleeveCapCurveLength((lowW + highW) / 2, capHeight);

    for (let iter = 0; iter < 28; iter++) {
      const midW = (lowW + highW) / 2;
      bestCap = computeSleeveCapCurveLength(midW, capHeight);

      if (bestCap.totalCapLength < targetCapLength) {
        lowW = midW;
      } else {
        highW = midW;
      }
    }

    const harmonizedHalfBicep = Math.round(((lowW + highW) / 2) * 100) / 100;
    const finalCap = computeSleeveCapCurveLength(harmonizedHalfBicep, capHeight);

    const delta_mm = Math.round(Math.abs(finalCap.totalCapLength - totalArmholeLength) * 100) / 100;
    const easeRatio = Math.round((finalCap.totalCapLength / totalArmholeLength) * 1000) / 1000;
    const isHarmonized = delta_mm <= 3.0 && easeRatio >= 1.00 && easeRatio <= 1.03;

    harmonization = {
      frontArmholeLength_mm: frontArmholeLength,
      backArmholeLength_mm: backArmholeLength,
      totalArmholeLength_mm: totalArmholeLength,
      frontSleeveCapLength_mm: finalCap.frontCapLength,
      backSleeveCapLength_mm: finalCap.backCapLength,
      totalSleeveCapLength_mm: finalCap.totalCapLength,
      easeRatio,
      delta_mm,
      isHarmonized,
    };

    // Muñeca / Puño
    const wristEase = sleeveMod.cuff_width_mm
      ? sleeveMod.cuff_width_mm - measurements.wrist_circumference_mm
      : 30;
    const totalWrist = measurements.wrist_circumference_mm + wristEase;
    const halfWrist = Math.round((totalWrist / 2) * 100) / 100;

    const wrist_front = createPoint(halfWrist, sleeveLength, 'wrist_front');
    const wrist_back = createPoint(-halfWrist, sleeveLength, 'wrist_back');

    // Emparejamiento exacto de piquetes por longitud de arco
    // Piquete delantero en copa: emparejado a la distancia de sisa delantera inferior
    const frontCapPolyline = [
      finalCap.points.cap_top,
      ...finalCap.frontUpperSamples.slice(1),
      ...finalCap.frontLowerSamples.slice(1),
    ];
    const targetFrontCapNotchDist =
      finalCap.frontCapLength * (lenFrontArmholeUpper / frontArmholeLength);
    const matchedFrontNotchPoint = pointAlongPolyline(
      frontCapPolyline,
      targetFrontCapNotchDist
    );

    // Piquete doble trasero en copa: emparejado a la distancia de sisa espalda superior
    const backCapPolyline = [
      finalCap.points.cap_top,
      ...[...finalCap.backUpperSamples].reverse().slice(1),
      ...[...finalCap.backLowerSamples].reverse().slice(1),
    ];
    const targetBackCapNotchDist =
      finalCap.backCapLength * (lenBackArmholeUpper / backArmholeLength);
    const matchedBackNotchPoint = pointAlongPolyline(
      backCapPolyline,
      targetBackCapNotchDist
    );

    const sleeveOutline: Point2D[] = [
      ...finalCap.backLowerSamples,
      ...finalCap.backUpperSamples.slice(1),
      ...finalCap.frontUpperSamples.slice(1),
      ...finalCap.frontLowerSamples.slice(1),
      wrist_front,
      wrist_back,
    ];

    const sleevePathD = [
      `M ${finalCap.points.underarm_back.x} ${finalCap.points.underarm_back.y}`,
      `C ${finalCap.points.backCapLowerCp1.x} ${finalCap.points.backCapLowerCp1.y}, ${finalCap.points.backCapLowerCp2.x} ${finalCap.points.backCapLowerCp2.y}, ${finalCap.points.cap_back_notch.x} ${finalCap.points.cap_back_notch.y}`,
      `C ${finalCap.points.backCapUpperCp1.x} ${finalCap.points.backCapUpperCp1.y}, ${finalCap.points.backCapUpperCp2.x} ${finalCap.points.backCapUpperCp2.y}, ${finalCap.points.cap_top.x} ${finalCap.points.cap_top.y}`,
      `C ${finalCap.points.frontCapUpperCp1.x} ${finalCap.points.frontCapUpperCp1.y}, ${finalCap.points.frontCapUpperCp2.x} ${finalCap.points.frontCapUpperCp2.y}, ${finalCap.points.cap_front_notch.x} ${finalCap.points.cap_front_notch.y}`,
      `C ${finalCap.points.frontCapLowerCp1.x} ${finalCap.points.frontCapLowerCp1.y}, ${finalCap.points.frontCapLowerCp2.x} ${finalCap.points.frontCapLowerCp2.y}, ${finalCap.points.underarm_front.x} ${finalCap.points.underarm_front.y}`,
      `L ${wrist_front.x} ${wrist_front.y}`,
      `L ${wrist_back.x} ${wrist_back.y}`,
      `Z`,
    ].join(' ');

    const sleeveBounds = computeBounds(sleeveOutline);
    const sleeveArea = computePolygonArea(sleeveOutline);

    const sleevePart: PatternPart = {
      name: 'sleeve',
      label: 'MANGA / SLEEVE',
      cutCount: 2,
      onFold: false,
      points: {
        cap_top: finalCap.points.cap_top,
        cap_front_notch: matchedFrontNotchPoint,
        cap_back_notch: matchedBackNotchPoint,
        underarm_front: finalCap.points.underarm_front,
        underarm_back: finalCap.points.underarm_back,
        wrist_front,
        wrist_back,
      },
      pathD: sleevePathD,
      outline: sleeveOutline,
      bounds: sleeveBounds,
      width_mm: sleeveBounds.width,
      height_mm: sleeveBounds.height,
      area_mm2: sleeveArea,
      grainline: {
        start: createPoint(0, capHeight + 40),
        end: createPoint(0, sleeveLength - 60),
        label: 'GRAINLINE / HILO DE TELA',
      },
      notches: [
        {
          point: finalCap.points.cap_top,
          type: 'single',
          label: 'Piquete Coronilla Hombro',
        },
        {
          point: matchedFrontNotchPoint,
          type: 'single',
          label: 'Piquete Delantero Copa',
        },
        {
          point: matchedBackNotchPoint,
          type: 'double',
          label: 'Piquete Doble Espalda Copa',
        },
      ],
      seamAllowance_mm: seamAllowance,
      hemAllowance_mm: hemAllowance,
    };

    parts.sleeve = sleevePart;
  }

  // =========================================================================
  // 8. INTEGRACIÓN DE CAPUCHA (HOOD INTEGRATION)
  // =========================================================================
  const hoodMod: HoodMod | undefined = dna.modifications.hood;
  const isHoodNeeded =
    hoodMod !== undefined ||
    neckMod.type === 'crossover_hood' ||
    neckMod.type === 'hood' ||
    dna.base_block.toLowerCase().includes('hoodie');

  if (isHoodNeeded && hoodMod?.type !== 'none') {
    const hoodType =
      hoodMod?.type === 'crossover' || neckMod.type === 'crossover_hood'
        ? 'crossover'
        : 'standard';

    const hoodBlock = generateHoodBlock(size, {
      type: hoodType,
      height_ease_mm: hoodMod?.height_mm ? hoodMod.height_mm - measurements.head_circumference_mm * 0.65 : 60,
      depth_ease_mm: hoodMod?.depth_mm ? hoodMod.depth_mm - measurements.head_circumference_mm * 0.45 : 40,
      crossover_overlap_mm: hoodMod?.overlap_mm ?? (hoodType === 'crossover' ? 60 : 0),
      measurements,
    });

    const hoodPart = hoodBlock.hood;
    hoodPart.seamAllowance_mm = seamAllowance;
    hoodPart.hemAllowance_mm = hemAllowance;
    parts.hood = hoodPart;
  }

  // =========================================================================
  // 9. INTEGRACIÓN DE BOLSILLOS (POCKET INTEGRATION)
  // =========================================================================
  const pocketMod: PocketMod | undefined =
    dna.modifications.pocket ?? dna.modifications.pockets?.[0];
  const isHoodieBlock = dna.base_block.toLowerCase().includes('hoodie');
  const isPocketNeeded =
    pocketMod !== undefined ||
    isHoodieBlock;

  if (isPocketNeeded && pocketMod?.type !== 'none') {
    const pType = pocketMod?.type ?? (isHoodieBlock ? 'kangaroo' : 'patch');

    const pocketBlock = generatePocketBlock(size, {
      type: pType === 'patch' ? 'patch' : 'kangaroo',
      width_mm: pocketMod?.width_mm,
      height_mm: pocketMod?.height_mm,
      hem_allowance_mm: hemAllowance,
      measurements,
    });

    const pocketPart = pocketBlock.pocket;
    pocketPart.seamAllowance_mm = seamAllowance;
    pocketPart.hemAllowance_mm = hemAllowance;
    parts.pocket = pocketPart;

    // Agregar piquetes de referencia en el delantero para posicionamiento del bolsillo
    if (pType === 'kangaroo') {
      const pocketH = pocketPart.height_mm;
      const placementY = frontLength - pocketH - (ribHeightDelta > 0 ? 0 : 25);
      const topW = pocketPart.points.top_outer ? pocketPart.points.top_outer.x : pocketPart.width_mm / 4;

      frontPart.notches.push({
        point: createPoint(0, placementY),
        type: 'single',
        label: 'Piquete Referencia Centro Bolsillo Canguro',
      });
      frontPart.notches.push({
        point: createPoint(topW, placementY),
        type: 'single',
        label: 'Piquete Referencia Extremo Superior Bolsillo',
      });
    } else if (pType === 'patch') {
      const posX = pocketMod?.placement_x_mm ?? quarterChest * 0.42;
      const posY = pocketMod?.placement_y_mm ?? armholeDepth + 35;

      frontPart.notches.push({
        point: createPoint(posX, posY),
        type: 'single',
        label: 'Piquete Referencia Superior Izquierdo Bolsillo Parche',
      });
      frontPart.notches.push({
        point: createPoint(posX + pocketPart.width_mm, posY),
        type: 'single',
        label: 'Piquete Referencia Superior Derecho Bolsillo Parche',
      });
    }
  }

  // =========================================================================
  // 10. VERIFICACIÓN Y MARCAS TÉCNICAS (GRAINLINES Y NOTCHES EN EL 100% DE PIEZAS)
  // =========================================================================
  for (const [partName, part] of Object.entries(parts)) {
    // Asegurar grainline en el 100% de las piezas
    if (!part.grainline || !part.grainline.label) {
      part.grainline = {
        start: createPoint(part.width_mm / 2, part.height_mm * 0.8),
        end: createPoint(part.width_mm / 2, part.height_mm * 0.2),
        label: 'GRAINLINE / HILO DE TELA',
      };
    }
    // Asegurar márgenes
    if (part.seamAllowance_mm === undefined) {
      part.seamAllowance_mm = seamAllowance;
    }
    if (part.hemAllowance_mm === undefined) {
      part.hemAllowance_mm = hemAllowance;
    }
  }

  const allBounds = Object.values(parts).map((p) => p.bounds);
  const totalBounds = combineBounds(allBounds);

  return {
    concept_name: dna.concept_name,
    size,
    base_block: dna.base_block,
    measurements,
    parts,
    bounds: totalBounds,
    harmonization,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
    tech_specs: dna.tech_specs,
  };
}

/**
 * Modifica y gradúa un patrón para múltiples tallas estándar (o todas las soportadas)
 * @param dna ADN paramétrico del patrón
 * @param sizes Tallas estándar a generar (por defecto XS a 3XL)
 * @returns Map de talla estándar a ModifiedPatternResult
 */
export function modifyPatternMultiSize(
  dna: PatternDna,
  sizes?: StandardSize[]
): Map<StandardSize, ModifiedPatternResult> {
  const targetSizes = sizes ?? dna.sizing?.target_layers ?? STANDARD_SIZES;
  const results = new Map<StandardSize, ModifiedPatternResult>();

  for (const size of targetSizes) {
    const modified = modifyPattern(dna, size);
    results.set(size, modified);
  }

  return results;
}
