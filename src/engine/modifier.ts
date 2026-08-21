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
  ClosureMod,
  GarmentCategory,
  DressDetails,
  KimonoDetails,
} from '../types/pattern.js';
import {
  Point2D,
  BoundingBox,
  TechnicalNotch,
  TechnicalGrainline,
  TechnicalMarking,
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
  calculateCustomMeasurements,
  generatePocketBlock,
  generateHoodBlock,
  generateTrouserBlock,
  generateWomensBodiceBlock,
  generateSkirtBlock,
  SkirtSilhouette,
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
 * Genera marcas vectoriales de ojales, botones y líneas de centro delantero
 */
export function generateButtonMarkings(options: {
  placketStart: number;
  placketEnd: number;
  buttonCount: number;
  buttonDiameter?: number;
  buttonholeOrientation?: 'vertical' | 'horizontal';
  cfX?: number;
}): TechnicalMarking[] {
  const {
    placketStart,
    placketEnd,
    buttonCount,
    buttonDiameter = 20,
    buttonholeOrientation = 'vertical',
    cfX = 0,
  } = options;

  const markings: TechnicalMarking[] = [];
  const placketLength = placketEnd - placketStart;

  // 1. Línea de centro delantero (CF) / doblez de cruce
  markings.push({
    type: 'fold_line',
    point: createPoint(cfX, placketStart),
    length_mm: placketLength,
    angle_deg: 90,
    label: 'LÍNEA CENTRO DELANTERO (CF)',
  });

  if (buttonCount <= 0) return markings;

  const topMargin = Math.min(25, placketLength * 0.15);
  const bottomMargin = Math.min(35, placketLength * 0.2);
  const firstBtnY = placketStart + topMargin;
  const lastBtnY = placketEnd - bottomMargin;
  const btnSpacing = buttonCount > 1 ? (lastBtnY - firstBtnY) / (buttonCount - 1) : 0;

  for (let i = 0; i < buttonCount; i++) {
    const btnY =
      Math.round(
        (buttonCount === 1 ? placketStart + placketLength / 2 : firstBtnY + i * btnSpacing) * 100
      ) / 100;

    markings.push({
      type: 'buttonhole',
      point: createPoint(cfX, btnY),
      length_mm: buttonDiameter + 4,
      angle_deg: buttonholeOrientation === 'horizontal' ? 0 : 90,
      label: `Ojal ${i + 1} (${buttonDiameter + 4}mm)`,
    });
    markings.push({
      type: 'button',
      point: createPoint(cfX, btnY),
      length_mm: buttonDiameter,
      angle_deg: 0,
      label: `Botón ${i + 1} (Ø${buttonDiameter}mm)`,
    });
  }

  return markings;
}

/**
 * Genera la pieza de vista interior delantera (front_facing) con entretela
 */
export function generateFrontFacing(options: {
  overlap_neck: Point2D;
  front_neck_center: Point2D;
  front_neck_shoulder: Point2D;
  front_shoulder_tip: Point2D;
  frontNeckCp1: Point2D;
  frontNeckCp2: Point2D;
  frontNeckSamples: Point2D[];
  front_center_hem: Point2D;
  overlap_hem: Point2D;
  front_hem_peak?: Point2D;
  armholeDepth: number;
  facingWidth?: number;
  facingShoulderWidth?: number;
  seamAllowance?: number;
}): PatternPart {
  const {
    overlap_neck,
    front_neck_center,
    front_neck_shoulder,
    front_shoulder_tip,
    frontNeckCp1,
    frontNeckCp2,
    frontNeckSamples,
    front_center_hem,
    overlap_hem,
    front_hem_peak,
    armholeDepth,
    facingWidth = 45,
    facingShoulderWidth = 40,
    seamAllowance = 10,
  } = options;

  const shoulderLen = distance(front_neck_shoulder, front_shoulder_tip);
  const tShFacing = Math.min(0.5, facingShoulderWidth / Math.max(30, shoulderLen));
  const facing_shoulder = createPoint(
    front_neck_shoulder.x + tShFacing * (front_shoulder_tip.x - front_neck_shoulder.x),
    front_neck_shoulder.y + tShFacing * (front_shoulder_tip.y - front_neck_shoulder.y),
    'facing_shoulder'
  );
  const facing_inner_mid = createPoint(facingWidth, armholeDepth + 20, 'facing_inner_mid');
  const facing_inner_hem = createPoint(
    facingWidth,
    front_hem_peak
      ? front_center_hem.y + (front_hem_peak.y - front_center_hem.y) * 0.4
      : front_center_hem.y,
    'facing_inner_hem'
  );

  const frontFacingOutline: Point2D[] = [
    overlap_neck,
    ...frontNeckSamples,
    facing_shoulder,
    facing_inner_mid,
    facing_inner_hem,
    front_center_hem,
    overlap_hem,
  ];

  const frontFacingBounds = computeBounds(frontFacingOutline);
  const frontFacingArea = computePolygonArea(frontFacingOutline);

  const frontFacingPathD = [
    `M ${overlap_neck.x} ${overlap_neck.y}`,
    `L ${front_neck_center.x} ${front_neck_center.y}`,
    `C ${frontNeckCp1.x} ${frontNeckCp1.y}, ${frontNeckCp2.x} ${frontNeckCp2.y}, ${front_neck_shoulder.x} ${front_neck_shoulder.y}`,
    `L ${facing_shoulder.x} ${facing_shoulder.y}`,
    `Q ${facing_inner_mid.x} ${facing_inner_mid.y} ${facing_inner_hem.x} ${facing_inner_hem.y}`,
    `L ${front_center_hem.x} ${front_center_hem.y}`,
    `L ${overlap_hem.x} ${overlap_hem.y}`,
    `Z`,
  ].join(' ');

  return {
    name: 'front_facing',
    label: 'VISTA DELANTERA CON ENTRETELA / FRONT INTERFACED FACING',
    cutCount: 2,
    onFold: false,
    isFacing: true,
    requiresInterfacing: true,
    points: {
      overlap_neck,
      neck_center: front_neck_center,
      neck_shoulder: front_neck_shoulder,
      facing_shoulder,
      facing_inner_mid,
      facing_inner_hem,
      center_hem: front_center_hem,
      overlap_hem,
      ...(front_hem_peak ? { hem_peak: front_hem_peak } : {}),
    },
    pathD: frontFacingPathD,
    outline: frontFacingOutline,
    bounds: frontFacingBounds,
    width_mm: frontFacingBounds.width,
    height_mm: frontFacingBounds.height,
    area_mm2: frontFacingArea,
    grainline: {
      start: createPoint(0, overlap_neck.y + 40),
      end: createPoint(0, overlap_hem.y - 40),
      label: 'GRAINLINE / HILO DE TELA (VISTA)',
    },
    notches: [
      {
        point: createPoint(0, front_neck_center.y),
        type: 'single',
        label: 'Piquete Centro Delantero Escote',
      },
      {
        point: createPoint(0, front_center_hem.y),
        type: 'single',
        label: 'Piquete Centro Delantero Bajo',
      },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };
}

/**
 * Genera la vista de cuello espalda en media luna (back_neck_facing) con entretela
 */
export function generateBackNeckFacing(options: {
  back_neck_center: Point2D;
  back_neck_shoulder: Point2D;
  back_shoulder_tip: Point2D;
  backNeckCp1: Point2D;
  backNeckCp2: Point2D;
  backNeckSamples: Point2D[];
  backNeckDepth: number;
  neckWidth: number;
  backFacingWidth?: number;
  seamAllowance?: number;
}): PatternPart {
  const {
    back_neck_center,
    back_neck_shoulder,
    back_shoulder_tip,
    backNeckCp1,
    backNeckCp2,
    backNeckSamples,
    backNeckDepth,
    neckWidth,
    backFacingWidth = 40,
    seamAllowance = 10,
  } = options;

  const backShoulderLen = distance(back_neck_shoulder, back_shoulder_tip);
  const tShBack = Math.min(0.5, backFacingWidth / Math.max(30, backShoulderLen));
  const back_facing_shoulder = createPoint(
    back_neck_shoulder.x + tShBack * (back_shoulder_tip.x - back_neck_shoulder.x),
    back_neck_shoulder.y + tShBack * (back_shoulder_tip.y - back_neck_shoulder.y),
    'facing_shoulder'
  );
  const back_facing_cb_inner = createPoint(0, backNeckDepth + backFacingWidth, 'cb_inner');

  const backInnerCp1 = createPoint(neckWidth * 0.6, backNeckDepth + backFacingWidth);
  const backInnerCp2 = createPoint(neckWidth * 0.2, backNeckDepth + backFacingWidth);
  const backInnerSamples = sampleBezier(
    back_facing_shoulder,
    backInnerCp1,
    backInnerCp2,
    back_facing_cb_inner
  );

  const backFacingOutline: Point2D[] = [
    back_neck_center,
    ...backNeckSamples,
    back_facing_shoulder,
    ...backInnerSamples.slice(1),
  ];

  const backFacingBounds = computeBounds(backFacingOutline);
  const backFacingArea = computePolygonArea(backFacingOutline);

  const backFacingPathD = [
    `M ${back_neck_center.x} ${back_neck_center.y}`,
    `C ${backNeckCp1.x} ${backNeckCp1.y}, ${backNeckCp2.x} ${backNeckCp2.y}, ${back_neck_shoulder.x} ${back_neck_shoulder.y}`,
    `L ${back_facing_shoulder.x} ${back_facing_shoulder.y}`,
    `C ${backInnerCp1.x} ${backInnerCp1.y}, ${backInnerCp2.x} ${backInnerCp2.y}, ${back_facing_cb_inner.x} ${back_facing_cb_inner.y}`,
    `Z`,
  ].join(' ');

  return {
    name: 'back_neck_facing',
    label: 'VISTA CUELLO ESPALDA (MEDIA LUNA) / BACK NECK FACING',
    cutCount: 1,
    onFold: true,
    isFacing: true,
    requiresInterfacing: true,
    points: {
      neck_center: back_neck_center,
      neck_shoulder: back_neck_shoulder,
      facing_shoulder: back_facing_shoulder,
      cb_inner: back_facing_cb_inner,
    },
    pathD: backFacingPathD,
    outline: backFacingOutline,
    bounds: backFacingBounds,
    width_mm: backFacingBounds.width,
    height_mm: backFacingBounds.height,
    area_mm2: backFacingArea,
    grainline: {
      start: createPoint(15, backNeckDepth + 5),
      end: createPoint(15, backNeckDepth + backFacingWidth - 5),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: back_neck_center,
        type: 'single',
        label: 'Piquete Centro Espalda Al Lomo',
      },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };
}

/**
 * Genera la vista de sisa curva (armhole_facing) con entretela para prendas sin mangas
 */
export function generateArmholeFacing(options: {
  front_shoulder_tip: Point2D;
  front_armhole_pitch: Point2D;
  front_armhole_bottom: Point2D;
  frontArmholeUpperSamples: Point2D[];
  frontArmholeLowerSamples: Point2D[];
  armholeFacingWidth?: number;
  seamAllowance?: number;
}): PatternPart {
  const {
    front_shoulder_tip,
    front_armhole_pitch,
    front_armhole_bottom,
    frontArmholeUpperSamples,
    frontArmholeLowerSamples,
    armholeFacingWidth = 35,
    seamAllowance = 10,
  } = options;

  const armholeOuterSamples: Point2D[] = [
    front_shoulder_tip,
    ...frontArmholeUpperSamples.slice(1),
    ...frontArmholeLowerSamples.slice(1),
  ];

  const armholeInnerSamples = armholeOuterSamples
    .map((p, idx) => {
      if (idx === 0) {
        return createPoint(
          Math.max(10, p.x - armholeFacingWidth * 0.9),
          Math.max(0, p.y - armholeFacingWidth * 0.2),
          'facing_shoulder_in'
        );
      }
      if (idx === armholeOuterSamples.length - 1) {
        return createPoint(
          Math.max(10, p.x - armholeFacingWidth),
          p.y + 10,
          'facing_underarm_in'
        );
      }
      return createPoint(
        Math.max(10, p.x - armholeFacingWidth),
        p.y,
        `facing_inner_${idx}`
      );
    })
    .reverse();

  const armholeFacingOutline: Point2D[] = [
    ...armholeOuterSamples,
    ...armholeInnerSamples,
  ];

  const armholeFacingBounds = computeBounds(armholeFacingOutline);
  const armholeFacingArea = computePolygonArea(armholeFacingOutline);

  const armholeFacingPathD =
    `M ${front_shoulder_tip.x} ${front_shoulder_tip.y} ` +
    armholeOuterSamples.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ' ' +
    armholeInnerSamples.map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ' Z';

  return {
    name: 'armhole_facing',
    label: 'VISTA DE SISA CURVA / CURVED ARMHOLE FACING',
    cutCount: 2,
    onFold: false,
    isFacing: true,
    requiresInterfacing: true,
    points: {
      shoulder_tip: front_shoulder_tip,
      armhole_pitch: front_armhole_pitch,
      armhole_bottom: front_armhole_bottom,
    },
    pathD: armholeFacingPathD,
    outline: armholeFacingOutline,
    bounds: armholeFacingBounds,
    width_mm: armholeFacingBounds.width,
    height_mm: armholeFacingBounds.height,
    area_mm2: armholeFacingArea,
    grainline: {
      start: createPoint(
        armholeFacingBounds.minX + armholeFacingBounds.width / 2,
        armholeFacingBounds.minY + 20
      ),
      end: createPoint(
        armholeFacingBounds.minX + armholeFacingBounds.width / 2,
        armholeFacingBounds.maxY - 20
      ),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: front_armhole_pitch,
        type: 'single',
        label: 'Piquete Sisa Delantero',
      },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };
}

/**
 * Genera la pieza de patrón paramétrico para Cuello Alzado / Chimenea / Mao (Stand Collar)
 */
export function generateStandCollarPiece(options: {
  frontNeckLen: number;
  backNeckLen: number;
  overlapMm?: number;
  collarHeight?: number;
  seamAllowance?: number;
}): PatternPart {
  const {
    frontNeckLen,
    backNeckLen,
    overlapMm = 0,
    collarHeight = 45,
    seamAllowance = 10,
  } = options;

  // Longitud de medio cuello: Espalda + Delantero + Solape
  const halfCollarLen = Math.round(backNeckLen + frontNeckLen + overlapMm);
  const shoulderNotchX = Math.round(backNeckLen);
  const centerFrontNotchX = Math.round(backNeckLen + frontNeckLen);

  // Curvatura anatómica suave en la base del cuello
  const curveRise = 8;

  const p_cb_base = createPoint(0, 0, 'cb_base');
  const p_sh_base = createPoint(shoulderNotchX, 1, 'shoulder_base');
  const p_cf_base = createPoint(halfCollarLen, curveRise, 'cf_base');

  const p_cf_top = createPoint(halfCollarLen, curveRise + collarHeight, 'cf_top');
  const p_sh_top = createPoint(shoulderNotchX, collarHeight + 1, 'shoulder_top');
  const p_cb_top = createPoint(0, collarHeight, 'cb_top');

  const outline: Point2D[] = [
    p_cb_base,
    p_sh_base,
    p_cf_base,
    p_cf_top,
    p_sh_top,
    p_cb_top,
  ];

  const bounds = computeBounds(outline);
  const area = computePolygonArea(outline);

  const pathD = `M ${p_cb_base.x} ${p_cb_base.y} L ${p_sh_base.x} ${p_sh_base.y} L ${p_cf_base.x} ${p_cf_base.y} L ${p_cf_top.x} ${p_cf_top.y} L ${p_sh_top.x} ${p_sh_top.y} L ${p_cb_top.x} ${p_cb_top.y} Z`;

  const notches: TechnicalNotch[] = [
    {
      point: p_sh_base,
      type: 'single',
      angle_deg: 90,
      label: 'Piquete de Hombro Cuello Chimenea',
    },
  ];
  if (overlapMm > 0) {
    notches.push({
      point: createPoint(centerFrontNotchX, curveRise, 'cf_notch'),
      type: 'single',
      angle_deg: 90,
      label: 'Piquete Centro Delantero (Línea de Aplomo)',
    });
  }

  return {
    name: 'stand_collar',
    label: 'CUELLO CHIMENEA / ALZADO (STAND COLLAR)',
    cutCount: 2,
    onFold: true,
    requiresInterfacing: true,
    points: {
      cb_base: p_cb_base,
      shoulder_base: p_sh_base,
      cf_base: p_cf_base,
      cf_top: p_cf_top,
      shoulder_top: p_sh_top,
      cb_top: p_cb_top,
    },
    pathD,
    outline,
    bounds,
    width_mm: bounds.width,
    height_mm: bounds.height,
    area_mm2: area,
    grainline: {
      start: createPoint(bounds.width * 0.2, bounds.height / 2),
      end: createPoint(bounds.width * 0.8, bounds.height / 2),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };
}

/**
 * Genera el juego de piezas para Cuello Camisero con Pie de Cuello (Shirt Collar with Stand)
 */
export function generateShirtCollarPieces(options: {
  frontNeckLen: number;
  backNeckLen: number;
  overlapMm?: number;
  standHeight?: number;
  collarHeight?: number;
  pointLength?: number;
  seamAllowance?: number;
}): { stand: PatternPart; fall: PatternPart } {
  const {
    frontNeckLen,
    backNeckLen,
    overlapMm = 15,
    standHeight = 32,
    collarHeight = 45,
    pointLength = 65,
    seamAllowance = 10,
  } = options;

  const halfNeck = Math.round(backNeckLen + frontNeckLen);
  const standTotalLen = Math.round(halfNeck + overlapMm + 10);
  const shoulderX = Math.round(backNeckLen);

  // 1. Pie de Cuello (Collar Stand)
  const s_cb_b = createPoint(0, 0, 'stand_cb_base');
  const s_sh_b = createPoint(shoulderX, 2, 'stand_sh_base');
  const s_cf_b = createPoint(halfNeck, 8, 'stand_cf_base');
  const s_tip_b = createPoint(standTotalLen, 12, 'stand_tip_base');
  const s_tip_t = createPoint(standTotalLen - 3, 12 + standHeight - 4, 'stand_tip_top');
  const s_cf_t = createPoint(halfNeck, 8 + standHeight, 'stand_cf_top');
  const s_sh_t = createPoint(shoulderX, 2 + standHeight, 'stand_sh_top');
  const s_cb_t = createPoint(0, standHeight, 'stand_cb_top');

  const standOutline = [s_cb_b, s_sh_b, s_cf_b, s_tip_b, s_tip_t, s_cf_t, s_sh_t, s_cb_t];
  const standBounds = computeBounds(standOutline);
  const standArea = computePolygonArea(standOutline);
  const standPathD = `M ${s_cb_b.x} ${s_cb_b.y} L ${s_sh_b.x} ${s_sh_b.y} L ${s_cf_b.x} ${s_cf_b.y} L ${s_tip_b.x} ${s_tip_b.y} L ${s_tip_t.x} ${s_tip_t.y} L ${s_cf_t.x} ${s_cf_t.y} L ${s_sh_t.x} ${s_sh_t.y} L ${s_cb_t.x} ${s_cb_t.y} Z`;

  const standPart: PatternPart = {
    name: 'collar_stand',
    label: 'PIE DE CUELLO / COLLAR STAND',
    cutCount: 2,
    onFold: true,
    requiresInterfacing: true,
    points: {
      cb_base: s_cb_b,
      sh_base: s_sh_b,
      cf_base: s_cf_b,
      tip_base: s_tip_b,
      tip_top: s_tip_t,
      cf_top: s_cf_t,
      sh_top: s_sh_t,
      cb_top: s_cb_t,
    },
    pathD: standPathD,
    outline: standOutline,
    bounds: standBounds,
    width_mm: standBounds.width,
    height_mm: standBounds.height,
    area_mm2: standArea,
    grainline: {
      start: createPoint(standBounds.width * 0.2, standBounds.height / 2),
      end: createPoint(standBounds.width * 0.8, standBounds.height / 2),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      { point: s_sh_b, type: 'single', angle_deg: 90, label: 'Piquete Hombro Pie de Cuello' },
      { point: s_cf_b, type: 'single', angle_deg: 90, label: 'Piquete Centro Delantero' },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };

  // 2. Pala de Cuello (Collar Fall / Leaf)
  const f_cb_b = createPoint(0, 0, 'fall_cb_base');
  const f_sh_b = createPoint(shoulderX, 1, 'fall_sh_base');
  const f_cf_b = createPoint(halfNeck - 5, 4, 'fall_cf_base');
  const f_point = createPoint(halfNeck + pointLength * 0.35, collarHeight + pointLength * 0.45, 'fall_point');
  const f_cb_t = createPoint(0, collarHeight, 'fall_cb_top');

  const fallOutline = [f_cb_b, f_sh_b, f_cf_b, f_point, f_cb_t];
  const fallBounds = computeBounds(fallOutline);
  const fallArea = computePolygonArea(fallOutline);
  const fallPathD = `M ${f_cb_b.x} ${f_cb_b.y} L ${f_sh_b.x} ${f_sh_b.y} L ${f_cf_b.x} ${f_cf_b.y} L ${f_point.x} ${f_point.y} L ${f_cb_t.x} ${f_cb_t.y} Z`;

  const fallPart: PatternPart = {
    name: 'collar_fall',
    label: 'PALA DE CUELLO / COLLAR FALL',
    cutCount: 2,
    onFold: true,
    requiresInterfacing: true,
    points: {
      cb_base: f_cb_b,
      sh_base: f_sh_b,
      cf_base: f_cf_b,
      point: f_point,
      cb_top: f_cb_t,
    },
    pathD: fallPathD,
    outline: fallOutline,
    bounds: fallBounds,
    width_mm: fallBounds.width,
    height_mm: fallBounds.height,
    area_mm2: fallArea,
    grainline: {
      start: createPoint(fallBounds.width * 0.2, fallBounds.height / 2),
      end: createPoint(fallBounds.width * 0.8, fallBounds.height / 2),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      { point: f_sh_b, type: 'single', angle_deg: 90, label: 'Piquete Hombro Pala de Cuello' },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };

  return { stand: standPart, fall: fallPart };
}

/**
 * Genera el juego completo de piezas de moldería para un Bolsillo Cargo 3D con Fuelle y Solapa
 */
export function generateCargoPocketSet(options?: {
  width_mm?: number;
  height_mm?: number;
  bellows_depth_mm?: number;
  flap_height_mm?: number;
  hasFlap?: boolean;
  seamAllowance?: number;
  hemAllowance?: number;
}): {
  body: PatternPart;
  bellows: PatternPart;
  flap?: PatternPart;
} {
  const {
    width_mm = 140,
    height_mm = 160,
    bellows_depth_mm = 25,
    flap_height_mm = 50,
    hasFlap = true,
    seamAllowance = 10,
    hemAllowance = 20,
  } = options ?? {};

  // 1. Cuerpo Principal del Bolsillo
  const p_tl = createPoint(0, 0, 'body_tl');
  const p_tr = createPoint(width_mm, 0, 'body_tr');
  const p_br = createPoint(width_mm, height_mm, 'body_br');
  const p_bl = createPoint(0, height_mm, 'body_bl');

  const bodyOutline = [p_tl, p_tr, p_br, p_bl];
  const bodyBounds = computeBounds(bodyOutline);
  const bodyArea = computePolygonArea(bodyOutline);
  const bodyPathD = `M 0 0 L ${width_mm} 0 L ${width_mm} ${height_mm} L 0 ${height_mm} Z`;

  const bodyPart: PatternPart = {
    name: 'cargo_pocket_body',
    label: 'CUERPO BOLSILLO CARGO 3D / CARGO POCKET BODY',
    cutCount: 2,
    onFold: false,
    points: {
      tl: p_tl,
      tr: p_tr,
      br: p_br,
      bl: p_bl,
    },
    pathD: bodyPathD,
    outline: bodyOutline,
    bounds: bodyBounds,
    width_mm: bodyBounds.width,
    height_mm: bodyBounds.height,
    area_mm2: bodyArea,
    grainline: {
      start: createPoint(width_mm / 2, height_mm * 0.8),
      end: createPoint(width_mm / 2, height_mm * 0.2),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      { point: createPoint(0, height_mm), type: 'single', angle_deg: 90, label: 'Piquete Esquina Izquierda' },
      { point: createPoint(width_mm, height_mm), type: 'single', angle_deg: 90, label: 'Piquete Esquina Derecha' },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };

  // 2. Fuelle Perimetral en Tira (3 lados: lateral izq + base + lateral der)
  const bellowsLen = 2 * height_mm + width_mm;
  const bellowsWidth = bellows_depth_mm * 2;

  const b_tl = createPoint(0, 0, 'bellows_tl');
  const b_tr = createPoint(bellowsLen, 0, 'bellows_tr');
  const b_br = createPoint(bellowsLen, bellowsWidth, 'bellows_br');
  const b_bl = createPoint(0, bellowsWidth, 'bellows_bl');

  const bellowsOutline = [b_tl, b_tr, b_br, b_bl];
  const bellowsBounds = computeBounds(bellowsOutline);
  const bellowsArea = computePolygonArea(bellowsOutline);
  const bellowsPathD = `M 0 0 L ${bellowsLen} 0 L ${bellowsLen} ${bellowsWidth} L 0 ${bellowsWidth} Z`;

  const bellowsPart: PatternPart = {
    name: 'cargo_pocket_bellows',
    label: 'FUELLE PERIMETRAL BOLSILLO CARGO / POCKET BELLOWS',
    cutCount: 2,
    onFold: false,
    points: {
      tl: b_tl,
      tr: b_tr,
      br: b_br,
      bl: b_bl,
    },
    pathD: bellowsPathD,
    outline: bellowsOutline,
    bounds: bellowsBounds,
    width_mm: bellowsBounds.width,
    height_mm: bellowsBounds.height,
    area_mm2: bellowsArea,
    grainline: {
      start: createPoint(bellowsLen * 0.2, bellowsWidth / 2),
      end: createPoint(bellowsLen * 0.8, bellowsWidth / 2),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      { point: createPoint(height_mm, 0), type: 'single', angle_deg: 90, label: 'Piquete Esquina Izquierda Fuelle' },
      { point: createPoint(height_mm + width_mm, 0), type: 'single', angle_deg: 90, label: 'Piquete Esquina Derecha Fuelle' },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };

  // 3. Solapa con Broches (Pocket Flap)
  let flapPart: PatternPart | undefined;
  if (hasFlap) {
    const flapW = width_mm + 10;
    const flapDrop = flap_height_mm;
    const flapPointRise = 12;

    const f_tl = createPoint(0, 0, 'flap_tl');
    const f_tr = createPoint(flapW, 0, 'flap_tr');
    const f_br = createPoint(flapW, flapDrop - flapPointRise, 'flap_br');
    const f_mid = createPoint(flapW / 2, flapDrop, 'flap_mid');
    const f_bl = createPoint(0, flapDrop - flapPointRise, 'flap_bl');

    const flapOutline = [f_tl, f_tr, f_br, f_mid, f_bl];
    const flapBounds = computeBounds(flapOutline);
    const flapArea = computePolygonArea(flapOutline);
    const flapPathD = `M 0 0 L ${flapW} 0 L ${flapW} ${flapDrop - flapPointRise} L ${flapW / 2} ${flapDrop} L 0 ${flapDrop - flapPointRise} Z`;

    flapPart = {
      name: 'cargo_pocket_flap',
      label: 'SOLAPA BOLSILLO CARGO / POCKET FLAP',
      cutCount: 4,
      onFold: false,
      requiresInterfacing: true,
      points: {
        tl: f_tl,
        tr: f_tr,
        br: f_br,
        mid: f_mid,
        bl: f_bl,
      },
      pathD: flapPathD,
      outline: flapOutline,
      bounds: flapBounds,
      width_mm: flapBounds.width,
      height_mm: flapBounds.height,
      area_mm2: flapArea,
      grainline: {
        start: createPoint(flapW / 2, flapDrop * 0.2),
        end: createPoint(flapW / 2, flapDrop * 0.8),
        label: 'GRAINLINE / HILO DE TELA',
      },
      notches: [
        { point: createPoint(flapW / 2, 0), type: 'single', angle_deg: 90, label: 'Piquete Centro Solapa' },
      ],
      seamAllowance_mm: seamAllowance,
      hemAllowance_mm: 0,
    };
  }

  return {
    body: bodyPart,
    bellows: bellowsPart,
    flap: flapPart,
  };
}

/**
 * Determina si el ADN corresponde a un conjunto completo de 2 piezas (Top + Bottom / Set)
 */
export function isSetGarment(dna: PatternDna): boolean {
  if (dna.garment_category === 'set') return true;
  if (dna.sub_garments?.top && dna.sub_garments?.bottom) return true;
  if (dna.multi_piece_config?.top_dna && dna.multi_piece_config?.bottom_dna) return true;
  const base = (dna.base_block || '').toLowerCase().trim();
  const concept = (dna.concept_name || '').toLowerCase().trim();
  return (
    base === 'two_piece_set' ||
    base === 'set' ||
    base === 'pirate_set' ||
    base === 'straw_pirate_full_set' ||
    base.includes('two_piece') ||
    base.includes('conjunto') ||
    concept.includes('full_set') ||
    concept.includes('two_piece') ||
    concept.includes('conjunto')
  );
}

/**
 * Modifica y genera las piezas de un conjunto coordinado de 2 piezas (Top + Bottom)
 */
export function modifySetPattern(
  dna: PatternDna,
  size: StandardSize,
  measurements: BodyMeasurements,
  seamAllowance: number,
  hemAllowance: number
): ModifiedPatternResult {
  // 1. Resolver Top DNA
  const topDna: PatternDna = dna.sub_garments?.top ?? dna.multi_piece_config?.top_dna ?? {
    concept_name: `${dna.concept_name}_top`,
    description: `${dna.description ?? dna.concept_name} - Torso / Chaleco`,
    base_block:
      dna.base_block === 'two_piece_set' || dna.base_block === 'set' || dna.base_block.includes('pant')
        ? 'menswear_torso_fitted'
        : dna.base_block,
    garment_category: 'top',
    ease: {
      chest_ease_mm: dna.ease.chest_ease_mm,
      waist_ease_mm: dna.ease.waist_ease_mm,
      hip_ease_mm: dna.ease.hip_ease_mm,
      shoulder_ease_mm: dna.ease.shoulder_ease_mm,
      bicep_ease_mm: dna.ease.bicep_ease_mm,
    },
    modifications: {
      neckline: dna.modifications.neckline,
      sleeves: dna.modifications.sleeves,
      hem: dna.modifications.hem,
      pocket: dna.modifications.pocket,
      hood: dna.modifications.hood,
      closure: dna.modifications.closure,
    },
    sizing: dna.sizing,
    custom_measurements: dna.custom_measurements,
    tech_specs: {
      notions: dna.tech_specs?.notions ?? dna.notions ?? [],
      estimated_fabric_meters: dna.fabric_details?.main_fabric?.estimated_meters ?? 0.85,
      seam_allowance_mm: seamAllowance,
      hem_allowance_mm: hemAllowance,
      fabric_type: dna.fabric_details?.main_fabric?.type ?? dna.tech_specs?.fabric_type,
      fabric_width_mm: dna.fabric_details?.main_fabric?.width_mm ?? dna.tech_specs?.fabric_width_mm ?? 1500,
    },
  };
  if (dna.custom_measurements && !topDna.custom_measurements) {
    topDna.custom_measurements = dna.custom_measurements;
  }

  // 2. Resolver Bottom DNA
  const bottomDna: PatternDna = dna.sub_garments?.bottom ?? dna.multi_piece_config?.bottom_dna ?? {
    concept_name: `${dna.concept_name}_bottom`,
    description: `${dna.description ?? dna.concept_name} - Pantalón / Bermuda`,
    base_block: 'pants_sloper',
    garment_category: 'bottom',
    ease: {
      chest_ease_mm: 0,
      waist_ease_mm: dna.ease.waist_ease_mm ?? 30,
      hip_ease_mm: dna.ease.hip_ease_mm ?? 50,
      crotch_ease_mm: dna.ease.crotch_ease_mm ?? 25,
      thigh_ease_mm: dna.ease.thigh_ease_mm ?? 60,
      knee_ease_mm: dna.ease.knee_ease_mm ?? 70,
      ankle_ease_mm: dna.ease.ankle_ease_mm ?? 40,
    },
    modifications: {
      trouser_legs: dna.modifications.trouser_legs,
      trouser_hem: dna.modifications.trouser_hem,
      waistband: dna.modifications.waistband,
      trouser_pockets: dna.modifications.trouser_pockets,
      pocket: dna.modifications.pocket,
    },
    sizing: dna.sizing,
    custom_measurements: dna.custom_measurements,
    tech_specs: {
      notions: dna.tech_specs?.notions ?? dna.notions ?? [],
      estimated_fabric_meters: dna.fabric_details?.secondary_fabric?.estimated_meters ?? 1.10,
      seam_allowance_mm: seamAllowance,
      hem_allowance_mm: hemAllowance,
      fabric_type: dna.fabric_details?.secondary_fabric?.type ?? dna.tech_specs?.fabric_type,
      fabric_width_mm: dna.fabric_details?.secondary_fabric?.width_mm ?? dna.tech_specs?.fabric_width_mm ?? 1500,
    },
  };
  if (dna.custom_measurements && !bottomDna.custom_measurements) {
    bottomDna.custom_measurements = dna.custom_measurements;
  }

  // 3. Modificar ambas prendas
  const topResult = modifyPattern(topDna, size);
  const bottomResult = modifyTrouserPattern(
    bottomDna,
    size,
    measurements,
    bottomDna.tech_specs?.seam_allowance_mm ?? seamAllowance,
    bottomDna.tech_specs?.hem_allowance_mm ?? hemAllowance
  );

  // 4. Mapear y unificar las piezas de moldería
  const parts: Record<string, PatternPart> = {};

  // Piezas de torso (Top)
  if (topResult.parts.front) {
    const frontPart = { ...topResult.parts.front };
    frontPart.name = 'front_torso';
    frontPart.label = frontPart.label || 'CHALECO DELANTERO / FRONT TORSO';
    parts.front_torso = frontPart;
  }
  if (topResult.parts.back) {
    const backPart = { ...topResult.parts.back };
    backPart.name = 'back_torso';
    backPart.label = backPart.label || 'CHALECO ESPALDA / BACK TORSO';
    parts.back_torso = backPart;
  }
  if (topResult.parts.sleeve) {
    parts.sleeve = topResult.parts.sleeve;
  }
  if (topResult.parts.hood) {
    parts.hood = topResult.parts.hood;
  }
  if (topResult.parts.pocket) {
    const topPocket = { ...topResult.parts.pocket };
    topPocket.name = 'pocket';
    parts.pocket = topPocket;
  }
  if (topResult.parts.front_facing) {
    parts.front_facing = topResult.parts.front_facing;
  }
  if (topResult.parts.back_neck_facing) {
    parts.back_neck_facing = topResult.parts.back_neck_facing;
  }
  if (topResult.parts.armhole_facing) {
    parts.armhole_facing = topResult.parts.armhole_facing;
  }

  // Piezas de pierna (Bottom)
  if (bottomResult.parts.front_leg) {
    parts.front_leg = bottomResult.parts.front_leg;
  }
  if (bottomResult.parts.back_leg) {
    parts.back_leg = bottomResult.parts.back_leg;
  }
  if (bottomResult.parts.waistband) {
    parts.waistband = bottomResult.parts.waistband;
  }
  if (bottomResult.parts.pocket) {
    parts.pocket = bottomResult.parts.pocket;
  }
  if (bottomResult.parts.cuff) {
    parts.cuff = bottomResult.parts.cuff;
  }

  // 5. Verificación de Grainlines y Márgenes en el 100% de piezas
  for (const [_, part] of Object.entries(parts)) {
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
    harmonization: topResult.harmonization,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
    tech_specs: dna.tech_specs,
  };
}

/**
 * Determina si el ADN corresponde a una prenda inferior (pantalón, bermuda, shorts)
 */
export function isBottomGarment(dna: PatternDna): boolean {
  if (isSkirtGarment(dna)) return false;
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
  const trouserHem =
    dna.modifications.trouser_hem ??
    (dna.modifications.trouser?.has_cuff
      ? {
          type: 'cuffed' as const,
          cuff_height_mm: dna.modifications.trouser.cuff_height_mm ?? 45,
        }
      : undefined);
  const waistband = dna.modifications.waistband;

  // Normalización de bolsillos de pantalón
  const trouserPocketMod: TrouserPocketMod | undefined =
    Array.isArray(dna.modifications.trouser_pockets)
      ? dna.modifications.trouser_pockets[0]
      : dna.modifications.trouser_pockets ??
        (dna.modifications.trouser?.pocket_type === 'cargo'
          ? {
              type: 'cargo',
              width_mm: dna.modifications.pocket?.width_mm ?? 170,
              height_mm: dna.modifications.pocket?.height_mm ?? 190,
            }
          : dna.modifications.trouser?.pocket_type === 'patch' ||
            dna.modifications.trouser?.pocket_type === 'jeans_5pocket' ||
            dna.modifications.trouser?.back_pocket_type === 'patch' ||
            dna.modifications.pocket?.type === 'patch'
          ? {
              type: 'patch_back',
              width_mm: dna.modifications.pocket?.width_mm ?? 140,
              height_mm: dna.modifications.pocket?.height_mm ?? 150,
              placement_y_mm: dna.modifications.pocket?.placement_y_mm,
            }
          : dna.modifications.pocket?.type === 'cargo'
          ? {
              type: 'cargo',
              width_mm: dna.modifications.pocket?.width_mm ?? 170,
              height_mm: dna.modifications.pocket?.height_mm ?? 190,
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
 * Determina si el ADN corresponde a una falda independiente (Skirt)
 */
export function isSkirtGarment(dna: PatternDna): boolean {
  if (dna.garment_category === 'dress') return false;
  const base = (dna.base_block || '').toLowerCase().trim();
  const concept = (dna.concept_name || '').toLowerCase().trim();
  if (
    base === 'skirt_sloper' ||
    base === 'skirt' ||
    base === 'a_line_skirt' ||
    base === 'pleated_skirt' ||
    base === 'straight_skirt' ||
    base.includes('skirt')
  ) {
    return true;
  }
  if (
    dna.garment_category === 'bottom' &&
    (base.includes('skirt') || concept.includes('skirt') || concept.includes('falda'))
  ) {
    return true;
  }
  return false;
}

/**
 * Modifica y genera las piezas de una falda independiente (front_skirt, back_skirt, waistband)
 */
export function modifySkirtPattern(
  dna: PatternDna,
  size: StandardSize,
  measurements: BodyMeasurements,
  seamAllowance: number,
  hemAllowance: number
): ModifiedPatternResult {
  const parts: Record<string, PatternPart> = {};

  const dressDetails = dna.modifications.dress_details ?? dna.dress_details;
  const silhouette: SkirtSilhouette =
    dressDetails?.silhouette ??
    (dna.base_block.includes('a_line')
      ? 'a_line'
      : dna.base_block.includes('pleat')
        ? 'pleated'
        : 'straight');

  const skirtLength =
    dressDetails?.skirt_length_mm ??
    (dna.modifications.hem?.drop_mm
      ? measurements.skirt_length_mm + dna.modifications.hem.drop_mm
      : measurements.skirt_length_mm);

  const waistEase = dna.ease.waist_ease_mm ?? 20;
  const hipEase = dna.ease.hip_ease_mm ?? 30;
  const flareMm =
    dna.modifications.hem?.type === 'flared'
      ? 120
      : silhouette === 'a_line'
        ? 85
        : 0;

  // 1. Generar piezas base de falda
  const skirtBlock = generateSkirtBlock(size, {
    silhouette,
    length_mm: skirtLength,
    waist_ease_mm: waistEase,
    hip_ease_mm: hipEase,
    flare_mm: flareMm,
    seam_allowance_mm: seamAllowance,
    hem_allowance_mm: hemAllowance,
    measurements,
  });

  parts.front_skirt = skirtBlock.front_skirt;
  parts.back_skirt = skirtBlock.back_skirt;

  // 2. Generar Pretina (Waistband)
  const wbMod = dna.modifications.waistband;
  const wbType = wbMod?.type ?? 'fitted';
  const wbHeight = wbMod?.height_mm ?? 40;
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

  parts.waistband = {
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

  // 3. Bolsillos si aplica
  const pocketMod = dna.modifications.pocket;
  if (pocketMod && pocketMod.type !== 'none') {
    const pocketBlock = generatePocketBlock(size, {
      type: 'patch',
      width_mm: pocketMod.width_mm ?? 140,
      height_mm: pocketMod.height_mm ?? 160,
      hem_allowance_mm: hemAllowance,
      measurements,
    });
    const pocketPart = pocketBlock.pocket;
    pocketPart.seamAllowance_mm = seamAllowance;
    pocketPart.hemAllowance_mm = hemAllowance;
    parts.pocket = pocketPart;
  }

  // 4. Verificación de Grainlines y Márgenes
  for (const [_, part] of Object.entries(parts)) {
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
 * Determina si el ADN corresponde a un vestido (Dress)
 */
export function isDressGarment(dna: PatternDna): boolean {
  if (dna.garment_category === 'dress') return true;
  const base = (dna.base_block || '').toLowerCase().trim();
  const concept = (dna.concept_name || '').toLowerCase().trim();
  return (
    base === 'dress_sloper' ||
    base === 'dress' ||
    base.includes('dress') ||
    base.includes('vestido') ||
    concept.includes('dress') ||
    concept.includes('vestido')
  );
}

/**
 * Modifica y genera las piezas de un vestido (corpiño + falda coordinados o vestido entero continuo)
 */
export function modifyDressPattern(
  dna: PatternDna,
  size: StandardSize,
  measurements: BodyMeasurements,
  seamAllowance: number,
  hemAllowance: number
): ModifiedPatternResult {
  const parts: Record<string, PatternPart> = {};

  const dressDetails = dna.modifications.dress_details ?? dna.dress_details;
  const hasWaistSeam = dressDetails?.waist_seam !== false;
  const silhouette: SkirtSilhouette = dressDetails?.silhouette ?? 'a_line';
  const skirtLength = dressDetails?.skirt_length_mm ?? 550;

  const chestEase = dna.ease.chest_ease_mm ?? 30;
  const waistEase = dna.ease.waist_ease_mm ?? 20;
  const hipEase = dna.ease.hip_ease_mm ?? 40;
  const shoulderEase = dna.ease.shoulder_ease_mm ?? 0;

  const neckMod = dna.modifications.neckline ?? { type: 'crew' };
  const neckDepthDelta = (neckMod.depth_mm ?? neckMod.drop_mm ?? 0) + (neckMod.type === 'v_neck' ? 25 : 0);
  const neckWidthDelta = neckMod.width_mm ?? 0;

  // 1. Generar Corpiño Femenino (Bodice)
  const bodiceBlock = generateWomensBodiceBlock(size, {
    chest_ease_mm: chestEase,
    waist_ease_mm: waistEase,
    shoulder_ease_mm: shoulderEase,
    neckline_depth_delta_mm: neckDepthDelta,
    neckline_width_delta_mm: neckWidthDelta,
    seam_allowance_mm: seamAllowance,
    measurements,
  });

  const frontBodice = bodiceBlock.front_bodice;
  const backBodice = bodiceBlock.back_bodice;

  // 2. Generar Falda (Skirt)
  const flareMm =
    dna.modifications.hem?.type === 'flared'
      ? 120
      : silhouette === 'a_line'
        ? 85
        : 0;

  const skirtBlock = generateSkirtBlock(size, {
    silhouette,
    length_mm: skirtLength,
    waist_ease_mm: waistEase,
    hip_ease_mm: hipEase,
    flare_mm: flareMm,
    seam_allowance_mm: seamAllowance,
    hem_allowance_mm: hemAllowance,
    measurements,
  });

  const frontSkirt = skirtBlock.front_skirt;
  const backSkirt = skirtBlock.back_skirt;

  // 3. Coordinación de Piquetes de Cintura
  frontBodice.notches.push(
    {
      point: frontBodice.points.center_hem,
      type: 'single',
      label: 'Piquete Centro Delantero Unión Cintura',
    },
    {
      point: frontBodice.points.side_waist,
      type: 'single',
      label: 'Piquete Costado Delantero Unión Cintura',
    }
  );

  frontSkirt.notches.push(
    {
      point: frontSkirt.points.center_waist,
      type: 'single',
      label: 'Piquete Centro Delantero Unión Cintura',
    },
    {
      point: frontSkirt.points.side_waist,
      type: 'single',
      label: 'Piquete Costado Delantero Unión Cintura',
    }
  );

  backBodice.notches.push(
    {
      point: backBodice.points.center_hem,
      type: 'double',
      label: 'Piquete Doble Centro Espalda Unión Cintura',
    },
    {
      point: backBodice.points.side_waist,
      type: 'double',
      label: 'Piquete Doble Costado Espalda Unión Cintura',
    }
  );

  backSkirt.notches.push(
    {
      point: backSkirt.points.center_waist,
      type: 'double',
      label: 'Piquete Doble Centro Espalda Unión Cintura',
    },
    {
      point: backSkirt.points.side_waist,
      type: 'double',
      label: 'Piquete Doble Costado Espalda Unión Cintura',
    }
  );

  // Piquetes pareados de hombro y costado en corpiño
  const frontBodiceShoulderNotch = createPoint(
    (frontBodice.points.neck_shoulder.x + frontBodice.points.shoulder_tip.x) / 2,
    (frontBodice.points.neck_shoulder.y + frontBodice.points.shoulder_tip.y) / 2,
    'shoulder_notch'
  );
  frontBodice.notches.push({
    point: frontBodiceShoulderNotch,
    type: 'single',
    label: 'Piquete Hombro Delantero Corpiño',
  });

  const backBodiceShoulderNotch = createPoint(
    (backBodice.points.neck_shoulder.x + backBodice.points.shoulder_tip.x) / 2,
    (backBodice.points.neck_shoulder.y + backBodice.points.shoulder_tip.y) / 2,
    'shoulder_notch'
  );
  backBodice.notches.push({
    point: backBodiceShoulderNotch,
    type: 'single',
    label: 'Piquete Hombro Espalda Corpiño',
  });

  const frontBodiceSideNotch = createPoint(
    frontBodice.points.armhole_bottom.x,
    (frontBodice.points.armhole_bottom.y + frontBodice.points.side_waist.y) / 2,
    'side_notch'
  );
  frontBodice.notches.push({
    point: frontBodiceSideNotch,
    type: 'single',
    label: 'Piquete Costado Delantero Corpiño',
  });

  const backBodiceSideNotch = createPoint(
    backBodice.points.armhole_bottom.x,
    (backBodice.points.armhole_bottom.y + backBodice.points.side_waist.y) / 2,
    'side_notch'
  );
  backBodice.notches.push({
    point: backBodiceSideNotch,
    type: 'double',
    label: 'Piquete Doble Costado Espalda Corpiño',
  });

  // 4. Bolsillos si aplica
  const pocketMod = dna.modifications.pocket ?? dna.modifications.pockets?.[0];
  if (pocketMod && pocketMod.type !== 'none') {
    const pType = pocketMod.type === 'kangaroo' ? 'kangaroo' : 'patch';
    const pocketBlock = generatePocketBlock(size, {
      type: pType,
      width_mm: pocketMod.width_mm,
      height_mm: pocketMod.height_mm,
      hem_allowance_mm: hemAllowance,
      measurements,
    });
    const pocketPart = pocketBlock.pocket;
    pocketPart.seamAllowance_mm = seamAllowance;
    pocketPart.hemAllowance_mm = hemAllowance;
    parts.pocket = pocketPart;

    if (pType === 'patch') {
      const posX = pocketMod.placement_x_mm ?? (frontBodice.width_mm * 0.42);
      const posY = pocketMod.placement_y_mm ?? (frontBodice.points.armhole_bottom.y + 35);
      frontBodice.notches.push(
        {
          point: createPoint(posX, posY),
          type: 'single',
          label: 'Piquete Referencia Superior Izquierdo Bolsillo Parche',
        },
        {
          point: createPoint(posX + pocketPart.width_mm, posY),
          type: 'single',
          label: 'Piquete Referencia Superior Derecho Bolsillo Parche',
        }
      );
    }
  }

  if (hasWaistSeam) {
    // 2 Piezas separadas unidas por costura de cintura
    parts.front_bodice = frontBodice;
    parts.back_bodice = backBodice;
    parts.front_skirt = frontSkirt;
    parts.back_skirt = backSkirt;
    parts.front = frontBodice;
    parts.back = backBodice;
  } else {
    // Vestido de 1 sola pieza continua (sin costura de cintura / vestido entero / princesa)
    const bodiceH = measurements.front_length_mm;

    // Delantero continuo
    const frontDressOutline: Point2D[] = [
      ...frontBodice.outline.filter((p) => p.name !== 'center_hem' && p.name !== 'side_waist'),
      ...frontSkirt.outline.map((p) => createPoint(p.x, p.y + bodiceH, p.name)),
    ];
    const frontDressBounds = computeBounds(frontDressOutline);
    const frontDressArea = computePolygonArea(frontDressOutline);

    const frontDressPart: PatternPart = {
      name: 'front_dress',
      label: 'VESTIDO ENTERO DELANTERO / ONE-PIECE FRONT DRESS',
      cutCount: 1,
      onFold: true,
      points: {
        ...frontBodice.points,
        center_hem: createPoint(frontSkirt.points.center_hem.x, frontSkirt.points.center_hem.y + bodiceH, 'center_hem'),
        side_hem: createPoint(frontSkirt.points.side_hem.x, frontSkirt.points.side_hem.y + bodiceH, 'side_hem'),
      },
      pathD:
        `M ${frontBodice.points.neck_center.x} ${frontBodice.points.neck_center.y} ` +
        frontBodice.outline.map((p) => `L ${p.x} ${p.y}`).join(' ') +
        ' ' +
        frontSkirt.outline.map((p) => `L ${p.x} ${p.y + bodiceH}`).join(' ') +
        ' Z',
      outline: frontDressOutline,
      bounds: frontDressBounds,
      width_mm: frontDressBounds.width,
      height_mm: frontDressBounds.height,
      area_mm2: frontDressArea,
      grainline: {
        start: createPoint(35, 150),
        end: createPoint(35, bodiceH + skirtLength - 80),
        label: 'GRAINLINE / HILO DE TELA',
      },
      notches: frontBodice.notches,
      seamAllowance_mm: seamAllowance,
      hemAllowance_mm: hemAllowance,
    };

    // Espalda continua
    const backBodiceH = measurements.back_length_mm;
    const backDressOutline: Point2D[] = [
      ...backBodice.outline.filter((p) => p.name !== 'center_hem' && p.name !== 'side_waist'),
      ...backSkirt.outline.map((p) => createPoint(p.x, p.y + backBodiceH, p.name)),
    ];
    const backDressBounds = computeBounds(backDressOutline);
    const backDressArea = computePolygonArea(backDressOutline);

    const backDressPart: PatternPart = {
      name: 'back_dress',
      label: 'VESTIDO ENTERO ESPALDA / ONE-PIECE BACK DRESS',
      cutCount: 2,
      onFold: false,
      points: {
        ...backBodice.points,
        center_hem: createPoint(backSkirt.points.center_hem.x, backSkirt.points.center_hem.y + backBodiceH, 'center_hem'),
        side_hem: createPoint(backSkirt.points.side_hem.x, backSkirt.points.side_hem.y + backBodiceH, 'side_hem'),
      },
      pathD:
        `M ${backBodice.points.neck_center.x} ${backBodice.points.neck_center.y} ` +
        backBodice.outline.map((p) => `L ${p.x} ${p.y}`).join(' ') +
        ' ' +
        backSkirt.outline.map((p) => `L ${p.x} ${p.y + backBodiceH}`).join(' ') +
        ' Z',
      outline: backDressOutline,
      bounds: backDressBounds,
      width_mm: backDressBounds.width,
      height_mm: backDressBounds.height,
      area_mm2: backDressArea,
      grainline: {
        start: createPoint(35, 150),
        end: createPoint(35, backBodiceH + skirtLength - 80),
        label: 'GRAINLINE / HILO DE TELA',
      },
      notches: backBodice.notches,
      seamAllowance_mm: seamAllowance,
      hemAllowance_mm: hemAllowance,
    };

    parts.front_dress = frontDressPart;
    parts.back_dress = backDressPart;
  }

  // 4. Manga si no es sin mangas
  const sleeveMod = dna.modifications.sleeves;
  const isSleeveless =
    sleeveMod?.type === 'sleeveless' ||
    sleeveMod?.length_type === 'sleeveless';

  let harmonization: ArmholeHarmonization | undefined;

  if (!isSleeveless && sleeveMod) {
    const frontArmholeLen =
      distance(frontBodice.points.shoulder_tip, frontBodice.points.armhole_pitch) +
      distance(frontBodice.points.armhole_pitch, frontBodice.points.armhole_bottom);
    const backArmholeLen =
      distance(backBodice.points.shoulder_tip, backBodice.points.armhole_pitch) +
      distance(backBodice.points.armhole_pitch, backBodice.points.armhole_bottom);
    const totalArmhole = frontArmholeLen + backArmholeLen;

    const bicepEase = dna.ease.bicep_ease_mm ?? 35;
    const capHeight = Math.round((measurements.bicep_circumference_mm / 2 + bicepEase / 2) * 0.65);
    const targetCapLength = totalArmhole * 1.005;

    let lowW = targetCapLength * 0.15;
    let highW = targetCapLength * 0.65;
    let bestCap = computeSleeveCapCurveLength((lowW + highW) / 2, capHeight);

    for (let iter = 0; iter < 24; iter++) {
      const midW = (lowW + highW) / 2;
      bestCap = computeSleeveCapCurveLength(midW, capHeight);
      if (bestCap.totalCapLength < targetCapLength) {
        lowW = midW;
      } else {
        highW = midW;
      }
    }

    const delta_mm = Math.round(Math.abs(bestCap.totalCapLength - totalArmhole) * 100) / 100;
    const easeRatio = Math.round((bestCap.totalCapLength / totalArmhole) * 1000) / 1000;
    harmonization = {
      frontArmholeLength_mm: frontArmholeLen,
      backArmholeLength_mm: backArmholeLen,
      totalArmholeLength_mm: totalArmhole,
      frontSleeveCapLength_mm: bestCap.frontCapLength,
      backSleeveCapLength_mm: bestCap.backCapLength,
      totalSleeveCapLength_mm: bestCap.totalCapLength,
      easeRatio,
      delta_mm,
      isHarmonized: delta_mm <= 3.0,
    };

    const sleeveLength =
      sleeveMod.length_mm ??
      (sleeveMod.length_type === 'short' ? 200 : measurements.sleeve_length_mm);
    const wristHalf = measurements.wrist_circumference_mm / 2 + 15;
    const wrist_front = createPoint(wristHalf, sleeveLength, 'wrist_front');
    const wrist_back = createPoint(-wristHalf, sleeveLength, 'wrist_back');

    const sleeveOutline = [
      ...bestCap.backLowerSamples,
      ...bestCap.backUpperSamples.slice(1),
      ...bestCap.frontUpperSamples.slice(1),
      ...bestCap.frontLowerSamples.slice(1),
      wrist_front,
      wrist_back,
    ];

    const sleevePathD = [
      `M ${bestCap.points.underarm_back.x} ${bestCap.points.underarm_back.y}`,
      `C ${bestCap.points.backCapLowerCp1.x} ${bestCap.points.backCapLowerCp1.y}, ${bestCap.points.backCapLowerCp2.x} ${bestCap.points.backCapLowerCp2.y}, ${bestCap.points.cap_back_notch.x} ${bestCap.points.cap_back_notch.y}`,
      `C ${bestCap.points.backCapUpperCp1.x} ${bestCap.points.backCapUpperCp1.y}, ${bestCap.points.backCapUpperCp2.x} ${bestCap.points.backCapUpperCp2.y}, ${bestCap.points.cap_top.x} ${bestCap.points.cap_top.y}`,
      `C ${bestCap.points.frontCapUpperCp1.x} ${bestCap.points.frontCapUpperCp1.y}, ${bestCap.points.frontCapUpperCp2.x} ${bestCap.points.frontCapUpperCp2.y}, ${bestCap.points.cap_front_notch.x} ${bestCap.points.cap_front_notch.y}`,
      `C ${bestCap.points.frontCapLowerCp1.x} ${bestCap.points.frontCapLowerCp1.y}, ${bestCap.points.frontCapLowerCp2.x} ${bestCap.points.frontCapLowerCp2.y}, ${bestCap.points.underarm_front.x} ${bestCap.points.underarm_front.y}`,
      `L ${wrist_front.x} ${wrist_front.y}`,
      `L ${wrist_back.x} ${wrist_back.y}`,
      `Z`,
    ].join(' ');

    const sleeveBounds = computeBounds(sleeveOutline);
    const sleeveArea = computePolygonArea(sleeveOutline);

    parts.sleeve = {
      name: 'sleeve',
      label: 'MANGA DE VESTIDO / DRESS SLEEVE',
      cutCount: 2,
      onFold: false,
      points: {
        cap_top: bestCap.points.cap_top,
        cap_front_notch: bestCap.points.cap_front_notch,
        cap_back_notch: bestCap.points.cap_back_notch,
        underarm_front: bestCap.points.underarm_front,
        underarm_back: bestCap.points.underarm_back,
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
        start: createPoint(0, capHeight + 30),
        end: createPoint(0, sleeveLength - 40),
        label: 'GRAINLINE / HILO DE TELA',
      },
      notches: [
        { point: bestCap.points.cap_top, type: 'single', label: 'Piquete Coronilla Hombro' },
        { point: bestCap.points.cap_front_notch, type: 'single', label: 'Piquete Delantero Sisa' },
        { point: bestCap.points.cap_back_notch, type: 'double', label: 'Piquete Doble Espalda Sisa' },
      ],
      seamAllowance_mm: seamAllowance,
      hemAllowance_mm: hemAllowance,
    };
  }

  // Generación de Vistas Interiores para Vestidos sin Mangas
  if (isSleeveless) {
    const backNeckFacing = generateBackNeckFacing({
      back_neck_center: backBodice.points.neck_center,
      back_neck_shoulder: backBodice.points.neck_shoulder,
      back_shoulder_tip: backBodice.points.shoulder_tip,
      backNeckCp1: createPoint(neckWidthDelta * 0.5 + 40, backBodice.points.neck_center.y),
      backNeckCp2: createPoint(backBodice.points.neck_shoulder.x, backBodice.points.neck_center.y * 0.3),
      backNeckSamples: [backBodice.points.neck_center, backBodice.points.neck_shoulder],
      backNeckDepth: backBodice.points.neck_center.y,
      neckWidth: backBodice.points.neck_shoulder.x,
      backFacingWidth: 40,
      seamAllowance,
    });
    parts.back_neck_facing = backNeckFacing;

    const armholeFacing = generateArmholeFacing({
      front_shoulder_tip: frontBodice.points.shoulder_tip,
      front_armhole_pitch: frontBodice.points.armhole_pitch,
      front_armhole_bottom: frontBodice.points.armhole_bottom,
      frontArmholeUpperSamples: [frontBodice.points.shoulder_tip, frontBodice.points.armhole_pitch],
      frontArmholeLowerSamples: [frontBodice.points.armhole_pitch, frontBodice.points.armhole_bottom],
      armholeFacingWidth: 35,
      seamAllowance,
    });
    parts.armhole_facing = armholeFacing;

    frontBodice.facings = ['armhole'];
    backBodice.facings = ['back_neck', 'armhole'];
  }

  // 5. Verificación de Grainlines y Márgenes
  for (const [_, part] of Object.entries(parts)) {
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
    harmonization,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
    tech_specs: dna.tech_specs,
  };
}

/**
 * Determina si el ADN corresponde a un Kimono o Haori tradicional / anime
 */
export function isKimonoGarment(dna: PatternDna): boolean {
  if (dna.garment_category === 'kimono' || dna.garment_category === 'haori') return true;
  const base = (dna.base_block || '').toLowerCase().trim();
  const concept = (dna.concept_name || '').toLowerCase().trim();
  return (
    base === 'kimono_sloper' ||
    base === 'haori_sloper' ||
    base === 'kimono' ||
    base === 'haori' ||
    base.includes('kimono') ||
    base.includes('haori') ||
    concept.includes('kimono') ||
    concept.includes('haori') ||
    concept.includes('demon_slayer') ||
    concept.includes('tanjiro')
  );
}

/**
 * Modifica y genera la moldería completa tradicional de Haori / Kimono de anime
 * (Torso de caída recta, mangas japonesas cuadradas Furisode y cuello plano de banda)
 */
export function modifyKimonoPattern(
  dna: PatternDna,
  size: StandardSize,
  measurements: BodyMeasurements,
  seamAllowance: number,
  hemAllowance: number
): ModifiedPatternResult {
  const parts: Record<string, PatternPart> = {};

  const kimonoDetails = dna.modifications.kimono_details ?? dna.kimono_details;
  const isHaori =
    dna.garment_category === 'haori' ||
    dna.base_block.includes('haori') ||
    dna.concept_name.includes('haori');
  const sleeveStyle = kimonoDetails?.sleeve_style ?? 'furisode_square';
  const collarWidthMm = kimonoDetails?.collar_width_mm ?? 60;
  const hasObiBelt = kimonoDetails?.obi_belt ?? true;

  // Holguras tradicionales japonesas (Oversized con caída recta)
  const chestEase = dna.ease.chest_ease_mm ?? (isHaori ? 160 : 120);
  const quarterBodyWidth = Math.round(((measurements.chest_circumference_mm + chestEase) / 4 + 35) * 10) / 10;

  // Longitud de torso: Haori llega a medio muslo (~880mm), Kimono cuerpo entero (~1300mm)
  const baseLength = isHaori
    ? 880 + (measurements.front_length_mm - 680) * 0.5
    : 1300 + (measurements.front_length_mm - 680);
  const garmentLength = dna.modifications.hem?.drop_mm ? baseLength + dna.modifications.hem.drop_mm : baseLength;

  const neckWidth = measurements.neck_circumference_mm / 6 + 15;
  const backNeckDepth = 25;
  const frontNeckSlopeEndY = Math.min(420, garmentLength * 0.45);

  const sleeveAttachLength = 260; // Sode-tsuke

  // =========================================================================
  // 1. ESPALDA DE KIMONO / HAORI (BACK PANEL)
  // =========================================================================
  const back_neck_center = createPoint(0, backNeckDepth, 'neck_center');
  const back_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const back_shoulder_edge = createPoint(quarterBodyWidth, 0, 'shoulder_edge');
  const back_armhole_notch = createPoint(quarterBodyWidth, sleeveAttachLength, 'armhole_notch');
  const back_side_hem = createPoint(quarterBodyWidth, garmentLength, 'side_hem');
  const back_center_hem = createPoint(0, garmentLength, 'center_hem');

  const backNeckCp1 = createPoint(neckWidth * 0.5, backNeckDepth);
  const backNeckCp2 = createPoint(neckWidth * 0.85, backNeckDepth * 0.3);
  const backNeckSamples = sampleBezier(back_neck_center, backNeckCp1, backNeckCp2, back_neck_shoulder, 8);

  const backOutline: Point2D[] = [
    ...backNeckSamples,
    back_shoulder_edge,
    back_armhole_notch,
    back_side_hem,
    back_center_hem,
  ];

  const backPathD = [
    `M ${back_neck_center.x} ${back_neck_center.y}`,
    `C ${backNeckCp1.x} ${backNeckCp1.y}, ${backNeckCp2.x} ${backNeckCp2.y}, ${back_neck_shoulder.x} ${back_neck_shoulder.y}`,
    `L ${back_shoulder_edge.x} ${back_shoulder_edge.y}`,
    `L ${back_armhole_notch.x} ${back_armhole_notch.y}`,
    `L ${back_side_hem.x} ${back_side_hem.y}`,
    `L ${back_center_hem.x} ${back_center_hem.y}`,
    `Z`,
  ].join(' ');

  const backBounds = computeBounds(backOutline);
  const backArea = computePolygonArea(backOutline);

  const backPart: PatternPart = {
    name: 'back',
    label: isHaori ? 'HAORI ESPALDA / HAORI BACK PANEL' : 'KIMONO ESPALDA / KIMONO BACK PANEL',
    cutCount: 1,
    onFold: true,
    points: {
      neck_center: back_neck_center,
      neck_shoulder: back_neck_shoulder,
      shoulder_edge: back_shoulder_edge,
      armhole_notch: back_armhole_notch,
      side_hem: back_side_hem,
      center_hem: back_center_hem,
    },
    pathD: backPathD,
    outline: backOutline,
    bounds: backBounds,
    width_mm: backBounds.width,
    height_mm: backBounds.height,
    area_mm2: backArea,
    grainline: {
      start: createPoint(quarterBodyWidth * 0.45, 100),
      end: createPoint(quarterBodyWidth * 0.45, garmentLength - 80),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: back_neck_shoulder,
        type: 'single',
        label: 'Piquete Hombro Unión Cuello',
      },
      {
        point: back_armhole_notch,
        type: 'double',
        label: 'Piquete Doble Sisa Costura Manga Espalda (Sode-tsuke)',
      },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };

  parts.back = backPart;
  parts.back_panel = backPart;

  // =========================================================================
  // 2. DELANTERO DE KIMONO / HAORI (FRONT PANEL)
  // =========================================================================
  const front_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const front_shoulder_edge = createPoint(quarterBodyWidth, 0, 'shoulder_edge');
  const front_armhole_notch = createPoint(quarterBodyWidth, sleeveAttachLength, 'armhole_notch');
  const front_side_hem = createPoint(quarterBodyWidth, garmentLength, 'side_hem');
  const front_center_hem = createPoint(0, garmentLength, 'center_hem');
  const front_collar_cross = createPoint(0, frontNeckSlopeEndY, 'collar_cross');

  const frontOutline: Point2D[] = [
    front_neck_shoulder,
    front_shoulder_edge,
    front_armhole_notch,
    front_side_hem,
    front_center_hem,
    front_collar_cross,
  ];

  const frontPathD = [
    `M ${front_neck_shoulder.x} ${front_neck_shoulder.y}`,
    `L ${front_shoulder_edge.x} ${front_shoulder_edge.y}`,
    `L ${front_armhole_notch.x} ${front_armhole_notch.y}`,
    `L ${front_side_hem.x} ${front_side_hem.y}`,
    `L ${front_center_hem.x} ${front_center_hem.y}`,
    `L ${front_collar_cross.x} ${front_collar_cross.y}`,
    `Z`,
  ].join(' ');

  const frontBounds = computeBounds(frontOutline);
  const frontArea = computePolygonArea(frontOutline);

  const frontPart: PatternPart = {
    name: 'front',
    label: isHaori ? 'HAORI DELANTERO / HAORI FRONT PANEL' : 'KIMONO DELANTERO / KIMONO FRONT PANEL',
    cutCount: 2,
    onFold: false,
    points: {
      neck_shoulder: front_neck_shoulder,
      shoulder_edge: front_shoulder_edge,
      armhole_notch: front_armhole_notch,
      side_hem: front_side_hem,
      center_hem: front_center_hem,
      collar_cross: front_collar_cross,
    },
    pathD: frontPathD,
    outline: frontOutline,
    bounds: frontBounds,
    width_mm: frontBounds.width,
    height_mm: frontBounds.height,
    area_mm2: frontArea,
    grainline: {
      start: createPoint(quarterBodyWidth * 0.45, 100),
      end: createPoint(quarterBodyWidth * 0.45, garmentLength - 80),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: front_neck_shoulder,
        type: 'single',
        label: 'Piquete Hombro Unión Cuello',
      },
      {
        point: front_collar_cross,
        type: 'single',
        label: 'Piquete Quiebre de Solapa / Cruce Cuello',
      },
      {
        point: front_armhole_notch,
        type: 'single',
        label: 'Piquete Sisa Costura Manga Delantero (Sode-tsuke)',
      },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };

  parts.front = frontPart;
  parts.front_panel = frontPart;

  // =========================================================================
  // 3. MANGA JAPONESA CUADRADA FURISODE (FURISODE SLEEVE)
  // =========================================================================
  const sleeveWidth = sleeveStyle === 'cropped' ? 280 : 360;
  const sleeveDrop = sleeveStyle === 'furisode_square' ? 520 : sleeveStyle === 'standard' ? 420 : 320;
  const wristOpeningHeight = 200;
  const cornerRadius = 45;

  const s_top_inner = createPoint(0, 0, 'top_inner');
  const s_top_outer = createPoint(sleeveWidth, 0, 'top_outer');
  const s_wrist_notch = createPoint(sleeveWidth, wristOpeningHeight, 'wrist_notch');
  const s_bottom_outer_corner = createPoint(sleeveWidth, sleeveDrop - cornerRadius, 'bottom_outer_corner');
  const s_bottom_corner_arc = createPoint(sleeveWidth - cornerRadius, sleeveDrop, 'bottom_corner_arc');
  const s_bottom_inner = createPoint(0, sleeveDrop, 'bottom_inner');
  const s_attach_end = createPoint(0, sleeveAttachLength, 'attach_end');

  const cornerCp = createPoint(sleeveWidth, sleeveDrop);
  const cornerSamples = sampleBezier(s_bottom_outer_corner, cornerCp, cornerCp, s_bottom_corner_arc, 8);

  const sleeveOutline: Point2D[] = [
    s_top_inner,
    s_top_outer,
    s_wrist_notch,
    s_bottom_outer_corner,
    ...cornerSamples.slice(1),
    s_bottom_inner,
    s_attach_end,
  ];

  const sleevePathD = [
    `M 0 0`,
    `L ${sleeveWidth} 0`,
    `L ${sleeveWidth} ${wristOpeningHeight}`,
    `L ${sleeveWidth} ${sleeveDrop - cornerRadius}`,
    `Q ${sleeveWidth} ${sleeveDrop} ${sleeveWidth - cornerRadius} ${sleeveDrop}`,
    `L 0 ${sleeveDrop}`,
    `L 0 ${sleeveAttachLength}`,
    `Z`,
  ].join(' ');

  const sleeveBounds = computeBounds(sleeveOutline);
  const sleeveArea = computePolygonArea(sleeveOutline);

  const furisodeSleevePart: PatternPart = {
    name: 'furisode_sleeve',
    label: 'MANGA JAPONESA CUADRADA FURISODE / JAPANESE FURISODE SLEEVE',
    cutCount: 2,
    onFold: false,
    points: {
      top_inner: s_top_inner,
      top_outer: s_top_outer,
      wrist_notch: s_wrist_notch,
      bottom_inner: s_bottom_inner,
      attach_end: s_attach_end,
    },
    pathD: sleevePathD,
    outline: sleeveOutline,
    bounds: sleeveBounds,
    width_mm: sleeveBounds.width,
    height_mm: sleeveBounds.height,
    area_mm2: sleeveArea,
    grainline: {
      start: createPoint(sleeveWidth / 2, 40),
      end: createPoint(sleeveWidth / 2, sleeveDrop - 60),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: s_top_inner,
        type: 'single',
        label: 'Piquete Superior Hombro (Sode-tsuke Start)',
      },
      {
        point: s_attach_end,
        type: 'single',
        label: 'Piquete Fin Costura Sisa (Sode-tsuke End)',
      },
      {
        point: s_wrist_notch,
        type: 'single',
        label: 'Piquete Abertura Muñeca (Sode-guchi)',
      },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };

  parts.furisode_sleeve = furisodeSleevePart;
  parts.sleeve = furisodeSleevePart;

  // =========================================================================
  // 4. CUELLO PLANO DE BANDA (COLLAR BAND / ERI)
  // =========================================================================
  const backNeckLen = bezierLength(back_neck_center, backNeckCp1, backNeckCp2, back_neck_shoulder);
  const frontNeckLen = distance(front_neck_shoulder, front_collar_cross) + (garmentLength - frontNeckSlopeEndY);
  const totalHalfCollarLen = Math.round((backNeckLen + frontNeckLen) * 10) / 10;
  const collarPieceHeight = collarWidthMm * 2;

  const c_tl = createPoint(0, 0, 'top_left');
  const c_tr = createPoint(totalHalfCollarLen, 0, 'top_right');
  const c_br = createPoint(totalHalfCollarLen, collarPieceHeight, 'bottom_right');
  const c_bl = createPoint(0, collarPieceHeight, 'bottom_left');

  const collarOutline = [c_tl, c_tr, c_br, c_bl];
  const collarPathD = `M 0 0 L ${totalHalfCollarLen} 0 L ${totalHalfCollarLen} ${collarPieceHeight} L 0 ${collarPieceHeight} Z`;
  const collarBounds = computeBounds(collarOutline);
  const collarArea = computePolygonArea(collarOutline);

  const collarNotches: TechnicalNotch[] = [
    {
      point: createPoint(0, 0),
      type: 'double',
      label: 'Piquete Doble Centro Espalda Cuello',
    },
    {
      point: createPoint(backNeckLen, 0),
      type: 'single',
      label: 'Piquete Hombro Cuello',
    },
    {
      point: createPoint(backNeckLen + distance(front_neck_shoulder, front_collar_cross), 0),
      type: 'single',
      label: 'Piquete Quiebre de Solapa Cuello',
    },
  ];

  const collarBandPart: PatternPart = {
    name: 'collar_band',
    label: 'CUELLO EN BANDA JAPONÉS / JAPANESE COLLAR BAND (ERI)',
    cutCount: 1,
    onFold: true,
    points: {
      top_left: c_tl,
      top_right: c_tr,
      bottom_right: c_br,
      bottom_left: c_bl,
    },
    pathD: collarPathD,
    outline: collarOutline,
    bounds: collarBounds,
    width_mm: collarBounds.width,
    height_mm: collarBounds.height,
    area_mm2: collarArea,
    grainline: {
      start: createPoint(40, collarWidthMm),
      end: createPoint(totalHalfCollarLen - 40, collarWidthMm),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: collarNotches,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: 0,
  };

  parts.collar_band = collarBandPart;
  parts.collar = collarBandPart;

  // =========================================================================
  // 5. CINTURÓN OBI (OBI BELT / SASH) si aplica
  // =========================================================================
  if (hasObiBelt) {
    const obiWidth = 140;
    const obiHalfLength = Math.round(measurements.waist_circumference_mm * 0.95 * 10) / 10;
    const obiHeight = obiWidth * 2;

    const obi_tl = createPoint(0, 0, 'top_left');
    const obi_tr = createPoint(obiHalfLength, 0, 'top_right');
    const obi_br = createPoint(obiHalfLength, obiHeight, 'bottom_right');
    const obi_bl = createPoint(0, obiHeight, 'bottom_left');

    const obiOutline = [obi_tl, obi_tr, obi_br, obi_bl];
    const obiPathD = `M 0 0 L ${obiHalfLength} 0 L ${obiHalfLength} ${obiHeight} L 0 ${obiHeight} Z`;
    const obiBounds = computeBounds(obiOutline);
    const obiArea = computePolygonArea(obiOutline);

    const obiPart: PatternPart = {
      name: 'obi_belt',
      label: 'CINTURÓN OBI JAPONÉS / JAPANESE OBI SASH',
      cutCount: 1,
      onFold: true,
      points: {
        top_left: obi_tl,
        top_right: obi_tr,
        bottom_right: obi_br,
        bottom_left: obi_bl,
      },
      pathD: obiPathD,
      outline: obiOutline,
      bounds: obiBounds,
      width_mm: obiBounds.width,
      height_mm: obiBounds.height,
      area_mm2: obiArea,
      grainline: {
        start: createPoint(40, obiWidth),
        end: createPoint(obiHalfLength - 40, obiWidth),
        label: 'GRAINLINE / HILO DE TELA',
      },
      notches: [
        {
          point: createPoint(0, 0),
          type: 'single',
          label: 'Piquete Centro Delantero Cinturón Obi',
        },
      ],
      seamAllowance_mm: seamAllowance,
      hemAllowance_mm: 0,
    };

    parts.obi_belt = obiPart;
  }

  // 6. Verificación de Grainlines y Márgenes
  for (const [_, part] of Object.entries(parts)) {
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
  const isTargetSizeMatch = !dna.sizing?.size || dna.sizing.size === size || dna.custom_measurements !== undefined;
  
  const customMerged = dna.custom_measurements
    ? calculateCustomMeasurements(dna.custom_measurements, size)
    : undefined;

  const measurements: BodyMeasurements = customMerged ?? {
    ...getStandardMeasurements(size),
    ...(isTargetSizeMatch && dna.sizing?.chest_circ_mm ? { chest_circumference_mm: dna.sizing.chest_circ_mm } : {}),
    ...(isTargetSizeMatch && dna.sizing?.waist_circ_mm ? { waist_circumference_mm: dna.sizing.waist_circ_mm } : {}),
    ...(isTargetSizeMatch && dna.sizing?.hip_circ_mm ? { hip_circumference_mm: dna.sizing.hip_circ_mm } : {}),
    ...(isTargetSizeMatch && dna.sizing?.height_mm ? { front_length_mm: dna.sizing.height_mm * 0.42, back_length_mm: dna.sizing.height_mm * 0.40 } : {}),
  };

  const seamAllowance = dna.tech_specs?.seam_allowance_mm ?? 10;
  const hemAllowance =
    dna.tech_specs?.hem_allowance_mm ?? dna.modifications.hem?.allowance_mm ?? 25;

  // 1. Si la prenda es un conjunto de 2 piezas (Top + Bottom / Set), delegar a modifySetPattern
  if (isSetGarment(dna)) {
    return modifySetPattern(dna, size, measurements, seamAllowance, hemAllowance);
  }

  // 2. Si la prenda es Kimono o Haori, delegar a modifyKimonoPattern
  if (isKimonoGarment(dna)) {
    return modifyKimonoPattern(dna, size, measurements, seamAllowance, hemAllowance);
  }

  // 3. Si la prenda es un Vestido (Dress), delegar a modifyDressPattern
  if (isDressGarment(dna)) {
    return modifyDressPattern(dna, size, measurements, seamAllowance, hemAllowance);
  }

  // 4. Si la prenda es una Falda independiente (Skirt), delegar a modifySkirtPattern
  if (isSkirtGarment(dna)) {
    return modifySkirtPattern(dna, size, measurements, seamAllowance, hemAllowance);
  }

  // 5. Si la prenda es de tipo inferior (pantalón, bermuda, shorts), delegar a modifyTrouserPattern
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
  const rawNeckWidth =
    baseNeckWidth +
    neckWidthDelta +
    (neckMod.type === 'crossover_hood' && neckWidthDelta === 0 ? 15 : 0);

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

  // Invariante Anatómico de Hombro:
  const minShoulderStrap = 40;
  const maxNeckWidth = halfShoulder - minShoulderStrap;
  const neckWidth = Math.max(
    measurements.neck_circumference_mm / 6 + 5,
    Math.min(rawNeckWidth, maxNeckWidth)
  );

  // Caída de Hombro Positiva Garantizada:
  const shoulderSlopeRad = (measurements.shoulder_slope_deg * Math.PI) / 180;
  const shoulderSpan = Math.max(minShoulderStrap, halfShoulder - neckWidth);
  const baseShoulderSlopeDrop = Math.max(18, shoulderSpan * Math.tan(shoulderSlopeRad));
  const shoulderDrop = Math.max(
    18,
    baseShoulderSlopeDrop + (isDropShoulder ? shoulderDropMm * 0.18 : 0)
  );

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
  const isPointedHem =
    hemMod.type === 'pointed' ||
    (dna.base_block.toLowerCase().includes('wahid') && hemMod.type !== 'straight') ||
    (dna.concept_name.includes('pirate_vest') && hemMod.type !== 'straight');
  const isCurvedTail = hemMod.type === 'curved_tail' && !isPointedHem;
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

  const peakDrop = isPointedHem ? (hemMod.peak_drop_mm ?? hemMod.drop_mm ?? 50) : 0;
  const peakPositionRatio = isPointedHem ? (hemMod.peak_position_ratio ?? 0.38) : 0.38;

  const hemFrontDrop = isPointedHem ? peakDrop : isCurvedTail ? (hemMod.drop_mm ?? 35) : 0;
  const hemBackDrop = isCurvedTail ? (hemMod.back_drop_mm ?? (hemMod.drop_mm ? hemMod.drop_mm + 15 : 50)) : 0;

  // Límites de Escote V y Profundidades de Escote
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

  const maxFrontNeckDepth = Math.min(armholeDepth + 40, frontLength * 0.55);
  frontNeckDepth = Math.min(frontNeckDepth, maxFrontNeckDepth);

  const rawBackNeckDepth =
    25 +
    (neckDepthDelta > 0 ? neckDepthDelta * 0.25 : 0) +
    (neckMod.type === 'crossover_hood' ? 10 : 0);
  const maxBackNeckDepth = Math.min(armholeDepth * 0.5, backLength * 0.35);
  const backNeckDepth = Math.min(rawBackNeckDepth, maxBackNeckDepth);

  // =========================================================================
  // 5. CONSTRUCCIÓN GEOMÉTRICA DE TORSO DELANTERO (FRONT TORSO)
  // =========================================================================
  const closureMod: ClosureMod | undefined =
    dna.modifications.closure ??
    (dna.concept_name.includes('pirate_vest')
      ? {
          type: 'buttons',
          button_count: 3,
          overlap_mm: 20,
          button_diameter_mm: 20,
          buttonhole_orientation: 'vertical',
        }
      : undefined);

  const hasButtonClosure =
    closureMod?.type === 'buttons' || ((closureMod?.button_count ?? 0) > 0);
  const overlap_mm = hasButtonClosure ? (closureMod?.overlap_mm ?? 20) : 0;
  const buttonCount = closureMod?.button_count ?? (hasButtonClosure ? 3 : 0);
  const buttonDiameter = closureMod?.button_diameter_mm ?? 20;
  const buttonholeOrientation = closureMod?.buttonhole_orientation ?? 'vertical';
  const isSleeveless =
    sleeveMod.length_type === 'sleeveless' || sleeveMod.type === 'sleeveless';

  const overlap_neck = createPoint(-overlap_mm, frontNeckDepth, 'overlap_neck');
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
  const front_hem_peak = isPointedHem
    ? createPoint(quarterChest * peakPositionRatio, frontLength + peakDrop, 'hem_peak')
    : undefined;
  const frontCenterHemY = isPointedHem
    ? frontLength + (hasButtonClosure ? Math.round(peakDrop * 0.35) : Math.round(peakDrop * 0.45))
    : frontLength + hemFrontDrop;
  const front_center_hem = createPoint(0, frontCenterHemY, 'center_hem');
  const overlap_hem = createPoint(-overlap_mm, frontCenterHemY, 'overlap_hem');

  // Curvas de escote delantero
  let frontNeckCp1: Point2D;
  let frontNeckCp2: Point2D;
  if (neckMod.type === 'v_neck') {
    frontNeckCp1 = createPoint(neckWidth * 0.30, frontNeckDepth * 0.75);
    frontNeckCp2 = createPoint(neckWidth * 0.70, frontNeckDepth * 0.30);
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

  // Curva o picos de dobladillo delantero
  let frontHemSamples: Point2D[];
  let frontHemCp1: Point2D | undefined;
  let frontHemCp2: Point2D | undefined;
  if (isPointedHem && front_hem_peak) {
    frontHemSamples = [front_side_hem, front_hem_peak, front_center_hem];
  } else if (isCurvedTail) {
    frontHemCp1 = createPoint(quarterChest * 0.65, frontLength);
    frontHemCp2 = createPoint(quarterChest * 0.25, frontLength + hemFrontDrop);
    frontHemSamples = sampleBezier(front_side_hem, frontHemCp1, frontHemCp2, front_center_hem);
  } else {
    frontHemSamples = [front_side_hem, front_center_hem];
  }

  const frontOutline: Point2D[] = hasButtonClosure
    ? [
        overlap_neck,
        ...frontNeckSamples,
        front_shoulder_tip,
        ...frontArmholeUpperSamples.slice(1),
        ...frontArmholeLowerSamples.slice(1),
        ...frontHemSamples,
        overlap_hem,
      ]
    : [
        ...frontNeckSamples,
        front_shoulder_tip,
        ...frontArmholeUpperSamples.slice(1),
        ...frontArmholeLowerSamples.slice(1),
        ...frontHemSamples,
      ];

  const frontPathSegments: string[] = hasButtonClosure
    ? [
        `M ${overlap_neck.x} ${overlap_neck.y}`,
        `L ${front_neck_center.x} ${front_neck_center.y}`,
        `C ${frontNeckCp1.x} ${frontNeckCp1.y}, ${frontNeckCp2.x} ${frontNeckCp2.y}, ${front_neck_shoulder.x} ${front_neck_shoulder.y}`,
        `L ${front_shoulder_tip.x} ${front_shoulder_tip.y}`,
        `C ${frontArmholeCp1.x} ${frontArmholeCp1.y}, ${frontArmholeCp2.x} ${frontArmholeCp2.y}, ${front_armhole_pitch.x} ${front_armhole_pitch.y}`,
        `C ${frontArmholeLowerCp1.x} ${frontArmholeLowerCp1.y}, ${frontArmholeLowerCp2.x} ${frontArmholeLowerCp2.y}, ${front_armhole_bottom.x} ${front_armhole_bottom.y}`,
        `L ${front_side_hem.x} ${front_side_hem.y}`,
        ...(isPointedHem && front_hem_peak
          ? [
              `L ${front_hem_peak.x} ${front_hem_peak.y}`,
              `L ${front_center_hem.x} ${front_center_hem.y}`,
            ]
          : isCurvedTail && frontHemCp1 && frontHemCp2
          ? [
              `C ${frontHemCp1.x} ${frontHemCp1.y}, ${frontHemCp2.x} ${frontHemCp2.y}, ${front_center_hem.x} ${front_center_hem.y}`,
            ]
          : [`L ${front_center_hem.x} ${front_center_hem.y}`]),
        `L ${overlap_hem.x} ${overlap_hem.y}`,
        `Z`,
      ]
    : [
        `M ${front_neck_center.x} ${front_neck_center.y}`,
        `C ${frontNeckCp1.x} ${frontNeckCp1.y}, ${frontNeckCp2.x} ${frontNeckCp2.y}, ${front_neck_shoulder.x} ${front_neck_shoulder.y}`,
        `L ${front_shoulder_tip.x} ${front_shoulder_tip.y}`,
        `C ${frontArmholeCp1.x} ${frontArmholeCp1.y}, ${frontArmholeCp2.x} ${frontArmholeCp2.y}, ${front_armhole_pitch.x} ${front_armhole_pitch.y}`,
        `C ${frontArmholeLowerCp1.x} ${frontArmholeLowerCp1.y}, ${frontArmholeLowerCp2.x} ${frontArmholeLowerCp2.y}, ${front_armhole_bottom.x} ${front_armhole_bottom.y}`,
        `L ${front_side_hem.x} ${front_side_hem.y}`,
        ...(isPointedHem && front_hem_peak
          ? [
              `L ${front_hem_peak.x} ${front_hem_peak.y}`,
              `L ${front_center_hem.x} ${front_center_hem.y}`,
            ]
          : isCurvedTail && frontHemCp1 && frontHemCp2
          ? [
              `C ${frontHemCp1.x} ${frontHemCp1.y}, ${frontHemCp2.x} ${frontHemCp2.y}, ${front_center_hem.x} ${front_center_hem.y}`,
            ]
          : [`L ${front_center_hem.x} ${front_center_hem.y}`]),
        `Z`,
      ];

  const frontBounds = computeBounds(frontOutline);
  const frontArea = computePolygonArea(frontOutline);

  // Piquetes pareados de correspondencia en hombro y costado
  const front_shoulder_notch = createPoint(
    (front_neck_shoulder.x + front_shoulder_tip.x) / 2,
    (front_neck_shoulder.y + front_shoulder_tip.y) / 2,
    'shoulder_notch'
  );
  const minSideLength = Math.min(frontLength, backLength) - armholeDepth;
  const sideNotchDist = Math.round(minSideLength * 0.5);
  const matchedSideNotchY = armholeDepth + sideNotchDist;

  const front_side_notch = createPoint(
    quarterChest,
    matchedSideNotchY,
    'side_notch'
  );

  const frontNotches: TechnicalNotch[] = [
    {
      point: front_armhole_pitch,
      type: 'single',
      label: 'Piquete Delantero Sisa',
    },
    {
      point: front_shoulder_notch,
      type: 'single',
      label: 'Piquete Hombro Delantero / Front Shoulder Notch',
    },
    {
      point: front_side_notch,
      type: 'single',
      label: 'Piquete Costado Delantero / Front Side Notch',
    },
  ];

  if (hasButtonClosure) {
    frontNotches.push(
      {
        point: front_neck_center,
        type: 'single',
        label: 'Piquete Centro Delantero Escote',
      },
      {
        point: front_center_hem,
        type: 'single',
        label: 'Piquete Centro Delantero Bajo',
      }
    );
  }

  // Piquete de split de bajo si corresponde
  if (hemMod.type === 'split' && (hemMod.split_height_mm ?? 60) > 0) {
    const splitH = hemMod.split_height_mm ?? 60;
    frontNotches.push({
      point: createPoint(quarterChest, frontLength - splitH),
      type: 'single',
      label: 'Piquete Apertura Lateral Bajo',
    });
  }

  const frontFacingsList: Array<'front' | 'back_neck' | 'armhole'> = [];
  if (hasButtonClosure) frontFacingsList.push('front');
  if (isSleeveless) frontFacingsList.push('armhole');

  const frontMarkings = hasButtonClosure
    ? generateButtonMarkings({
        placketStart: frontNeckDepth,
        placketEnd: frontLength + hemFrontDrop,
        buttonCount,
        buttonDiameter,
        buttonholeOrientation,
        cfX: 0,
      })
    : undefined;

  const frontPart: PatternPart = {
    name: 'front',
    label: hasButtonClosure
      ? 'TORSO DELANTERO (BOTONADURA) / FRONT TORSO (BUTTON CLOSURE)'
      : 'TORSO DELANTERO / FRONT TORSO',
    cutCount: hasButtonClosure ? 2 : 1,
    onFold: !hasButtonClosure,
    points: {
      ...(hasButtonClosure ? { overlap_neck, overlap_hem } : {}),
      neck_center: front_neck_center,
      neck_shoulder: front_neck_shoulder,
      shoulder_tip: front_shoulder_tip,
      shoulder_notch: front_shoulder_notch,
      armhole_pitch: front_armhole_pitch,
      armhole_bottom: front_armhole_bottom,
      side_notch: front_side_notch,
      side_hem: front_side_hem,
      center_hem: front_center_hem,
      ...(front_hem_peak ? { hem_peak: front_hem_peak } : {}),
    },
    pathD: frontPathSegments.join(' '),
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
    ...(frontFacingsList.length > 0 ? { facings: frontFacingsList } : {}),
    ...(frontMarkings && frontMarkings.length > 0 ? { markings: frontMarkings } : {}),
  };
  parts.front = frontPart;

  // =========================================================================
  // 6. CONSTRUCCIÓN GEOMÉTRICA DE TORSO ESPALDA (BACK TORSO)
  // =========================================================================
  const back_neck_center = createPoint(0, backNeckDepth, 'neck_center');
  const back_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const back_shoulder_tip = createPoint(
    halfShoulder + 4,
    Math.max(14, shoulderDrop - 4),
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

  const back_shoulder_notch = createPoint(
    (back_neck_shoulder.x + back_shoulder_tip.x) / 2,
    (back_neck_shoulder.y + back_shoulder_tip.y) / 2,
    'shoulder_notch'
  );
  const back_side_notch = createPoint(
    quarterChest,
    matchedSideNotchY,
    'side_notch'
  );

  const backNotches: TechnicalNotch[] = [
    {
      point: back_armhole_pitch,
      type: 'double',
      label: 'Piquete Doble Espalda Sisa',
    },
    {
      point: back_shoulder_notch,
      type: 'single',
      label: 'Piquete Hombro Espalda / Back Shoulder Notch',
    },
    {
      point: back_side_notch,
      type: 'double',
      label: 'Piquete Doble Costado Espalda / Back Side Notch',
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

  const backFacingsList: Array<'front' | 'back_neck' | 'armhole'> = [];
  if (isSleeveless) {
    backFacingsList.push('back_neck');
    backFacingsList.push('armhole');
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
      shoulder_notch: back_shoulder_notch,
      armhole_pitch: back_armhole_pitch,
      armhole_bottom: back_armhole_bottom,
      side_notch: back_side_notch,
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
    ...(backFacingsList.length > 0 ? { facings: backFacingsList } : {}),
  };
  parts.back = backPart;

  // Generación de Vistas Interiores (Facings)
  if (hasButtonClosure) {
    const frontFacing = generateFrontFacing({
      overlap_neck,
      front_neck_center,
      front_neck_shoulder,
      front_shoulder_tip,
      frontNeckCp1,
      frontNeckCp2,
      frontNeckSamples,
      front_center_hem,
      overlap_hem,
      front_hem_peak,
      armholeDepth,
      facingWidth: 45,
      facingShoulderWidth: 40,
      seamAllowance,
    });
    parts.front_facing = frontFacing;
  }

  if (isSleeveless) {
    const backNeckFacing = generateBackNeckFacing({
      back_neck_center,
      back_neck_shoulder,
      back_shoulder_tip,
      backNeckCp1,
      backNeckCp2,
      backNeckSamples,
      backNeckDepth,
      neckWidth,
      backFacingWidth: 40,
      seamAllowance,
    });
    parts.back_neck_facing = backNeckFacing;

    const armholeFacing = generateArmholeFacing({
      front_shoulder_tip,
      front_armhole_pitch,
      front_armhole_bottom,
      frontArmholeUpperSamples,
      frontArmholeLowerSamples,
      armholeFacingWidth: 35,
      seamAllowance,
    });
    parts.armhole_facing = armholeFacing;
  }

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
  // 8.5. INTEGRACIÓN DE CUELLOS MODULARES (STAND COLLAR & SHIRT COLLAR)
  // =========================================================================
  const isStandCollar =
    neckMod.type === 'stand_collar' ||
    neckMod.type === 'mandarin' ||
    neckMod.type === 'high_neck' ||
    (neckMod.type === 'collar' && !dna.base_block.toLowerCase().includes('simon'));

  const isShirtCollar =
    neckMod.type === 'shirt_collar_with_stand' ||
    (neckMod.type === 'collar' && dna.base_block.toLowerCase().includes('simon'));

  if (isStandCollar) {
    const frontNeckLen = bezierLength(
      front_neck_center,
      frontNeckCp1,
      frontNeckCp2,
      front_neck_shoulder
    );
    const backNeckLen = bezierLength(
      back_neck_center,
      backNeckCp1,
      backNeckCp2,
      back_neck_shoulder
    );

    const standCollar = generateStandCollarPiece({
      frontNeckLen,
      backNeckLen,
      overlapMm: hasButtonClosure ? overlap_mm : 0,
      collarHeight: neckMod.collar_height_mm ?? neckMod.band_height_mm ?? 45,
      seamAllowance,
    });
    parts.stand_collar = standCollar;
    parts.collar = standCollar;
  } else if (isShirtCollar) {
    const frontNeckLen = bezierLength(
      front_neck_center,
      frontNeckCp1,
      frontNeckCp2,
      front_neck_shoulder
    );
    const backNeckLen = bezierLength(
      back_neck_center,
      backNeckCp1,
      backNeckCp2,
      back_neck_shoulder
    );

    const shirtCollar = generateShirtCollarPieces({
      frontNeckLen,
      backNeckLen,
      overlapMm: hasButtonClosure ? overlap_mm : 15,
      standHeight: neckMod.collar_stand_height_mm ?? 32,
      collarHeight: neckMod.collar_height_mm ?? 45,
      pointLength: neckMod.collar_point_length_mm ?? 65,
      seamAllowance,
    });
    parts.collar_stand = shirtCollar.stand;
    parts.collar_fall = shirtCollar.fall;
    parts.collar = shirtCollar.fall;
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

    if (pType === 'cargo_bellows' || pType === 'cargo') {
      const cargoSet = generateCargoPocketSet({
        width_mm: pocketMod?.width_mm ?? 140,
        height_mm: pocketMod?.height_mm ?? 160,
        bellows_depth_mm: pocketMod?.bellows_depth_mm ?? 25,
        flap_height_mm: pocketMod?.flap_height_mm ?? 50,
        hasFlap: pocketMod?.flap !== false,
        seamAllowance,
        hemAllowance,
      });

      parts.cargo_pocket_body = cargoSet.body;
      parts.cargo_pocket_bellows = cargoSet.bellows;
      if (cargoSet.flap) {
        parts.cargo_pocket_flap = cargoSet.flap;
      }
      parts.pocket = cargoSet.body;

      const posX = pocketMod?.placement_x_mm ?? quarterChest * 0.35;
      const posY = pocketMod?.placement_y_mm ?? armholeDepth + 40;

      frontPart.notches.push({
        point: createPoint(posX, posY),
        type: 'single',
        label: 'Piquete Referencia Superior Izquierdo Bolsillo Cargo 3D',
      });
      frontPart.notches.push({
        point: createPoint(posX + cargoSet.body.width_mm, posY),
        type: 'single',
        label: 'Piquete Referencia Superior Derecho Bolsillo Cargo 3D',
      });
    } else {
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
