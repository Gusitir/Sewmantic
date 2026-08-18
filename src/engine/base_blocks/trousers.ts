/**
 * src/engine/base_blocks/trousers.ts
 * Generador de bloque base de Pantalón y Shorts Paramétrico (Delantero y Espalda)
 * pattern-ai-core - Motor Geométrico FreeSewing v3
 */

import { StandardSize } from '../../types/pattern.js';
import {
  Point2D,
  PatternPart,
  BoundingBox,
  createPoint,
  sampleBezier,
  bezierLength,
  distance,
  computePolygonArea,
  computeBounds,
  combineBounds,
} from '../geometry.js';
import { BodyMeasurements, getStandardMeasurements } from './measurements.js';

export type TrouserLengthType = 'full' | 'shorts' | 'bermuda' | 'cropped';

export interface TrouserSloperOptions {
  length_type?: TrouserLengthType;
  waist_ease_mm?: number;
  hip_ease_mm?: number;
  crotch_ease_mm?: number;
  thigh_ease_mm?: number;
  knee_ease_mm?: number;
  ankle_ease_mm?: number;
  length_delta_mm?: number;
  back_rise_mm?: number;
  seam_allowance_mm?: number;
  hem_allowance_mm?: number;
  measurements?: BodyMeasurements;
}

export interface TrouserBlockResult {
  front_leg: PatternPart;
  back_leg: PatternPart;
}

export interface BaseBlockResult {
  blockType: string;
  size: StandardSize;
  measurements: BodyMeasurements;
  parts: Record<string, PatternPart>;
  bounds: BoundingBox;
}

/**
 * Genera el bloque base paramétrico de pantalón / bermuda (delantero y espalda)
 * @param size Talla estándar ('XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL')
 * @param options Opciones de longitud, holguras y personalización anatómica
 */
export function generateTrouserBlock(
  size: StandardSize,
  options: TrouserSloperOptions = {}
): TrouserBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);

  const lengthType: TrouserLengthType = options.length_type ?? 'full';
  const isShorts = lengthType === 'shorts' || lengthType === 'bermuda';
  const isCropped = lengthType === 'cropped';

  // Holguras textiles anatómicas estándar (en mm)
  const waistEase = options.waist_ease_mm ?? 20;
  const hipEase = options.hip_ease_mm ?? 40;
  const crotchEase = options.crotch_ease_mm ?? 15;
  const kneeEase = options.knee_ease_mm ?? (isShorts ? 60 : 40);
  const ankleEase = options.ankle_ease_mm ?? 40;
  const lengthDelta = options.length_delta_mm ?? 0;
  const backRise = options.back_rise_mm ?? 30; // Elevación anatómica de cintura trasera
  const seamAllowance = options.seam_allowance_mm ?? 10;
  const hemAllowance = options.hem_allowance_mm ?? (isShorts ? 25 : 30);

  // Niveles verticales de referencia (Y crece hacia abajo)
  const crotchDepth = measurements.crotch_depth_mm + crotchEase;
  const hipDepth = crotchDepth * 0.65;
  const fullInseam = measurements.inseam_mm + lengthDelta;
  const kneeDepth = crotchDepth + fullInseam * 0.52 - 20;

  // Cálculo de altura del bajo (hemY) según la tipología de longitud
  let hemY: number;
  if (isShorts) {
    // Shorts / Bermuda: justo a la altura o ligeramente bajo la rodilla (+25mm)
    hemY = kneeDepth + 25 + (lengthDelta !== 0 ? lengthDelta : 0);
  } else if (isCropped) {
    // Cropped / Pescador: entre rodilla y tobillo (aproximadamente 60% de pantorrilla)
    const fullHemY = crotchDepth + fullInseam;
    hemY = kneeDepth + (fullHemY - kneeDepth) * 0.60;
  } else {
    // Full: pantalón largo estándar
    hemY = crotchDepth + fullInseam;
  }

  // Dimensiones perimetrales base
  const totalHip = measurements.hip_circumference_mm + hipEase;
  const totalWaist = measurements.waist_circumference_mm + waistEase;
  const totalKnee = measurements.knee_circumference_mm + kneeEase;
  const totalAnkle = measurements.ankle_circumference_mm + ankleEase;

  // Anchos del delantero (Crease line / línea de aplomo centrada en X = 0)
  const frontHipWidth = totalHip / 4 - 10;
  const frontCrotchExtension = totalHip / 16; // Proyección de punta de tiro delantero (~55-75 mm)
  const frontWaistWidth = totalWaist / 4;
  const frontKneeHalfWidth = totalKnee / 4 - 10;

  let frontHemHalfWidth: number;
  if (isShorts) {
    frontHemHalfWidth = frontKneeHalfWidth + 8;
  } else if (isCropped) {
    frontHemHalfWidth = (frontKneeHalfWidth + (totalAnkle / 4 - 10)) / 2 + 5;
  } else {
    frontHemHalfWidth = totalAnkle / 4 - 10;
  }

  // =========================================================================
  // 1. DELANTERO DE PIERNA (FRONT LEG)
  // =========================================================================
  const front_center_x = -frontHipWidth / 2;
  const front_side_x = frontHipWidth / 2;

  // Puntos del Delantero
  const front_waist_center = createPoint(front_center_x + 8, 0, 'waist_center');
  const front_waist_side = createPoint(front_center_x + 8 + frontWaistWidth, 0, 'waist_side');

  const front_hip_center = createPoint(front_center_x, hipDepth, 'hip_center');
  const front_hip_side = createPoint(front_side_x + 4, hipDepth, 'hip_side');

  const front_crotch_tip = createPoint(
    front_center_x - frontCrotchExtension,
    crotchDepth + 6,
    'crotch_tip'
  );

  const front_knee_in = createPoint(-frontKneeHalfWidth, kneeDepth, 'knee_in');
  const front_knee_out = createPoint(frontKneeHalfWidth, kneeDepth, 'knee_out');

  const front_hem_in = createPoint(-frontHemHalfWidth, hemY, 'hem_in');
  const front_hem_out = createPoint(frontHemHalfWidth, hemY, 'hem_out');

  const front_crease_top = createPoint(0, 0, 'crease_top');
  const front_crease_bottom = createPoint(0, hemY, 'crease_bottom');

  // Curvas del Delantero
  // Curva de tiro delantero: desde front_hip_center a front_crotch_tip (cóncava suave)
  const frontCrotchCp1 = createPoint(
    front_center_x,
    hipDepth + (crotchDepth - hipDepth) * 0.65
  );
  const frontCrotchCp2 = createPoint(
    front_center_x - frontCrotchExtension * 0.60,
    crotchDepth + 6
  );
  const frontCrotchSamples = sampleBezier(
    front_hip_center,
    frontCrotchCp1,
    frontCrotchCp2,
    front_crotch_tip,
    16
  );

  // Curva de entrepierna delantera: desde front_crotch_tip hacia la rodilla (o bajo en shorts)
  const frontInseamTarget = isShorts ? front_hem_in : front_knee_in;
  const frontInseamCp1 = createPoint(
    front_crotch_tip.x + (frontInseamTarget.x - front_crotch_tip.x) * 0.32 + 10,
    front_crotch_tip.y + (frontInseamTarget.y - front_crotch_tip.y) * 0.35
  );
  const frontInseamCp2 = createPoint(
    frontInseamTarget.x + 3,
    frontInseamTarget.y - (frontInseamTarget.y - front_crotch_tip.y) * 0.20
  );
  const frontInseamCurveSamples = sampleBezier(
    front_crotch_tip,
    frontInseamCp1,
    frontInseamCp2,
    frontInseamTarget,
    20
  );

  // Curva de costado (cadera hacia rodilla/bajo)
  const frontOutseamTarget = isShorts ? front_hem_out : front_knee_out;
  const frontOutseamLowerCp1 = createPoint(
    frontOutseamTarget.x + 2,
    frontOutseamTarget.y - (frontOutseamTarget.y - hipDepth) * 0.25
  );
  const frontOutseamLowerCp2 = createPoint(
    front_hip_side.x + 3,
    hipDepth + (frontOutseamTarget.y - hipDepth) * 0.20
  );
  const frontOutseamLowerSamples = sampleBezier(
    frontOutseamTarget,
    frontOutseamLowerCp1,
    frontOutseamLowerCp2,
    front_hip_side,
    16
  );

  // Curva de cadera a cintura
  const frontSideWaistCp1 = createPoint(
    front_hip_side.x + 2,
    hipDepth * 0.45
  );
  const frontSideWaistCp2 = createPoint(
    front_waist_side.x + 2,
    hipDepth * 0.15
  );
  const frontSideWaistSamples = sampleBezier(
    front_hip_side,
    frontSideWaistCp1,
    frontSideWaistCp2,
    front_waist_side,
    12
  );

  // Contorno completo ordenado del Delantero
  const frontOutline: Point2D[] = [
    front_waist_center,
    front_hip_center,
    ...frontCrotchSamples.slice(1),
    ...frontInseamCurveSamples.slice(1),
    ...(isShorts ? [] : [front_hem_in]),
    front_hem_out,
    ...(isShorts ? [] : [front_knee_out]),
    ...frontOutseamLowerSamples.slice(1),
    ...frontSideWaistSamples.slice(1),
  ];

  // Construcción del Path SVG (d)
  const frontPathSegments: string[] = [
    `M ${front_waist_center.x} ${front_waist_center.y}`,
    `L ${front_hip_center.x} ${front_hip_center.y}`,
    `C ${frontCrotchCp1.x} ${frontCrotchCp1.y}, ${frontCrotchCp2.x} ${frontCrotchCp2.y}, ${front_crotch_tip.x} ${front_crotch_tip.y}`,
  ];

  if (isShorts) {
    frontPathSegments.push(
      `C ${frontInseamCp1.x} ${frontInseamCp1.y}, ${frontInseamCp2.x} ${frontInseamCp2.y}, ${front_hem_in.x} ${front_hem_in.y}`
    );
  } else {
    frontPathSegments.push(
      `C ${frontInseamCp1.x} ${frontInseamCp1.y}, ${frontInseamCp2.x} ${frontInseamCp2.y}, ${front_knee_in.x} ${front_knee_in.y}`,
      `L ${front_hem_in.x} ${front_hem_in.y}`
    );
  }

  frontPathSegments.push(`L ${front_hem_out.x} ${front_hem_out.y}`);

  if (isShorts) {
    frontPathSegments.push(
      `C ${frontOutseamLowerCp1.x} ${frontOutseamLowerCp1.y}, ${frontOutseamLowerCp2.x} ${frontOutseamLowerCp2.y}, ${front_hip_side.x} ${front_hip_side.y}`
    );
  } else {
    frontPathSegments.push(
      `L ${front_knee_out.x} ${front_knee_out.y}`,
      `C ${frontOutseamLowerCp1.x} ${frontOutseamLowerCp1.y}, ${frontOutseamLowerCp2.x} ${frontOutseamLowerCp2.y}, ${front_hip_side.x} ${front_hip_side.y}`
    );
  }

  frontPathSegments.push(
    `C ${frontSideWaistCp1.x} ${frontSideWaistCp1.y}, ${frontSideWaistCp2.x} ${frontSideWaistCp2.y}, ${front_waist_side.x} ${front_waist_side.y}`,
    `L ${front_waist_center.x} ${front_waist_center.y}`,
    `Z`
  );

  const frontPathD = frontPathSegments.join(' ');
  const frontBounds = computeBounds(frontOutline);
  const frontArea = computePolygonArea(frontOutline);

  // Longitud real exacta de la costura de entrepierna delantera
  const frontInseamCurveLen = bezierLength(
    front_crotch_tip,
    frontInseamCp1,
    frontInseamCp2,
    frontInseamTarget,
    60
  );
  const frontTotalInseamLen = isShorts
    ? frontInseamCurveLen
    : frontInseamCurveLen + distance(front_knee_in, front_hem_in);

  const frontPart: PatternPart = {
    name: 'front_leg',
    label: isShorts
      ? 'SHORTS DELANTERO / FRONT SHORTS'
      : 'PANTALÓN DELANTERO / FRONT TROUSER',
    cutCount: 2,
    onFold: false,
    points: {
      waist_center: front_waist_center,
      waist_side: front_waist_side,
      hip_center: front_hip_center,
      hip_side: front_hip_side,
      crotch_tip: front_crotch_tip,
      knee_in: front_knee_in,
      knee_out: front_knee_out,
      hem_in: front_hem_in,
      hem_out: front_hem_out,
      crease_top: front_crease_top,
      crease_bottom: front_crease_bottom,
    },
    pathD: frontPathD,
    outline: frontOutline,
    bounds: frontBounds,
    width_mm: frontBounds.width,
    height_mm: frontBounds.height,
    area_mm2: frontArea,
    grainline: {
      start: createPoint(0, Math.min(crotchDepth + 40, hemY - 100)),
      end: createPoint(0, Math.max(crotchDepth + 80, hemY - 40)),
      label: 'GRAINLINE / LÍNEA DE APLOMO',
    },
    notches: [
      {
        point: isShorts ? front_hem_in : front_knee_in,
        type: 'single',
        label: 'Piquete Delantero Rodilla Entrepierna',
      },
      {
        point: front_crotch_tip,
        type: 'single',
        label: 'Piquete Delantero Tiro',
      },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };

  // =========================================================================
  // 2. ESPALDA DE PIERNA (BACK LEG)
  // =========================================================================
  const backHipWidth = totalHip / 4 + 10;
  const backCrotchExtension = totalHip / 8 + 12; // Proyección de tiro trasero (~130-170 mm para acomodar glúteos)
  const backWaistWidth = totalWaist / 4 + 15;
  const backKneeHalfWidth = frontKneeHalfWidth + 10; // Espalda 20 mm más ancha en rodilla

  let backHemHalfWidth: number;
  if (isShorts) {
    backHemHalfWidth = frontHemHalfWidth + 10;
  } else if (isCropped) {
    backHemHalfWidth = frontHemHalfWidth + 10;
  } else {
    backHemHalfWidth = frontHemHalfWidth + 10;
  }

  const back_center_x = -backHipWidth / 2 + 15;
  const back_side_x = backHipWidth / 2 + 10;

  // Elevación e inclinación diagonal de cintura trasera
  const back_waist_center = createPoint(
    back_center_x + 35,
    -backRise,
    'waist_center'
  );
  const back_waist_side = createPoint(
    back_waist_center.x + backWaistWidth * 0.98,
    -backRise * 0.20,
    'waist_side'
  );

  const back_hip_center = createPoint(back_center_x + 10, hipDepth, 'hip_center');
  const back_hip_side = createPoint(back_side_x + 5, hipDepth, 'hip_side');

  const back_knee_in = createPoint(-backKneeHalfWidth, kneeDepth, 'knee_in');
  const back_knee_out = createPoint(backKneeHalfWidth, kneeDepth, 'knee_out');

  const back_hem_in = createPoint(-backHemHalfWidth, hemY, 'hem_in');
  const back_hem_out = createPoint(backHemHalfWidth, hemY, 'hem_out');

  const back_crease_top = createPoint(0, 0, 'crease_top');
  const back_crease_bottom = createPoint(0, hemY, 'crease_bottom');

  const backCrotchTipX = back_center_x - backCrotchExtension;
  const backInseamTarget = isShorts ? back_hem_in : back_knee_in;

  // Función para evaluar la longitud de entrepierna trasera según la coordenada Y del tiro
  function computeBackInseamLength(testCrotchY: number): number {
    const testCrotchTip = createPoint(backCrotchTipX, testCrotchY);
    const testCp1 = createPoint(
      testCrotchTip.x + (backInseamTarget.x - testCrotchTip.x) * 0.32 + 12,
      testCrotchTip.y + (backInseamTarget.y - testCrotchTip.y) * 0.35
    );
    const testCp2 = createPoint(
      backInseamTarget.x + 3,
      backInseamTarget.y - (backInseamTarget.y - testCrotchTip.y) * 0.20
    );
    const cLen = bezierLength(testCrotchTip, testCp1, testCp2, backInseamTarget, 60);
    return isShorts ? cLen : cLen + distance(back_knee_in, back_hem_in);
  }

  // =========================================================================
  // REQUISITO MATEMÁTICO INVARIANTE:
  // Ajuste de precisión sub-milimétrica (tolerancia < 0.05 mm << 3.0 mm)
  // =========================================================================
  let lowY = crotchDepth - 80;
  let highY = crotchDepth + 80;
  let solvedCrotchY = crotchDepth + 12;

  for (let iter = 0; iter < 28; iter++) {
    const midY = (lowY + highY) / 2;
    const currentLen = computeBackInseamLength(midY);
    if (currentLen > frontTotalInseamLen) {
      lowY = midY; // Al aumentar Y, la distancia a la rodilla disminuye
    } else {
      highY = midY;
    }
    solvedCrotchY = midY;
  }

  const back_crotch_tip = createPoint(backCrotchTipX, solvedCrotchY, 'crotch_tip');

  // Curvas definitivas de la Espalda
  // 1. Curva de tiro de espalda: desde cintura centro pasando por cadera hasta punta de tiro
  const backSeatUpperCp1 = createPoint(
    back_waist_center.x - 10,
    -backRise + (hipDepth - -backRise) * 0.45
  );
  const backSeatUpperCp2 = createPoint(
    back_hip_center.x + 2,
    hipDepth * 0.70
  );
  const backSeatUpperSamples = sampleBezier(
    back_waist_center,
    backSeatUpperCp1,
    backSeatUpperCp2,
    back_hip_center,
    14
  );

  const backCrotchCp1 = createPoint(
    back_hip_center.x,
    hipDepth + (solvedCrotchY - hipDepth) * 0.60
  );
  const backCrotchCp2 = createPoint(
    back_crotch_tip.x + backCrotchExtension * 0.45,
    solvedCrotchY + 8
  );
  const backCrotchCurveSamples = sampleBezier(
    back_hip_center,
    backCrotchCp1,
    backCrotchCp2,
    back_crotch_tip,
    18
  );

  // 2. Entrepierna trasera
  const backInseamCp1 = createPoint(
    back_crotch_tip.x + (backInseamTarget.x - back_crotch_tip.x) * 0.32 + 12,
    back_crotch_tip.y + (backInseamTarget.y - back_crotch_tip.y) * 0.35
  );
  const backInseamCp2 = createPoint(
    backInseamTarget.x + 3,
    backInseamTarget.y - (backInseamTarget.y - back_crotch_tip.y) * 0.20
  );
  const backInseamCurveSamples = sampleBezier(
    back_crotch_tip,
    backInseamCp1,
    backInseamCp2,
    backInseamTarget,
    20
  );

  // 3. Costado de espalda (cadera a rodilla/bajo)
  const backOutseamTarget = isShorts ? back_hem_out : back_knee_out;
  const backOutseamLowerCp1 = createPoint(
    backOutseamTarget.x + 2,
    backOutseamTarget.y - (backOutseamTarget.y - hipDepth) * 0.25
  );
  const backOutseamLowerCp2 = createPoint(
    back_hip_side.x + 4,
    hipDepth + (backOutseamTarget.y - hipDepth) * 0.20
  );
  const backOutseamLowerSamples = sampleBezier(
    backOutseamTarget,
    backOutseamLowerCp1,
    backOutseamLowerCp2,
    back_hip_side,
    16
  );

  // 4. Cadera a cintura de espalda
  const backSideWaistCp1 = createPoint(
    back_hip_side.x + 2,
    hipDepth * 0.45
  );
  const backSideWaistCp2 = createPoint(
    back_waist_side.x + 2,
    hipDepth * 0.10
  );
  const backSideWaistSamples = sampleBezier(
    back_hip_side,
    backSideWaistCp1,
    backSideWaistCp2,
    back_waist_side,
    12
  );

  // Contorno ordenado de la Espalda
  const backOutline: Point2D[] = [
    back_waist_center,
    ...backSeatUpperSamples.slice(1),
    ...backCrotchCurveSamples.slice(1),
    ...backInseamCurveSamples.slice(1),
    ...(isShorts ? [] : [back_hem_in]),
    back_hem_out,
    ...(isShorts ? [] : [back_knee_out]),
    ...backOutseamLowerSamples.slice(1),
    ...backSideWaistSamples.slice(1),
  ];

  // Construcción del Path SVG (d) para la Espalda
  const backPathSegments: string[] = [
    `M ${back_waist_center.x} ${back_waist_center.y}`,
    `C ${backSeatUpperCp1.x} ${backSeatUpperCp1.y}, ${backSeatUpperCp2.x} ${backSeatUpperCp2.y}, ${back_hip_center.x} ${back_hip_center.y}`,
    `C ${backCrotchCp1.x} ${backCrotchCp1.y}, ${backCrotchCp2.x} ${backCrotchCp2.y}, ${back_crotch_tip.x} ${back_crotch_tip.y}`,
  ];

  if (isShorts) {
    backPathSegments.push(
      `C ${backInseamCp1.x} ${backInseamCp1.y}, ${backInseamCp2.x} ${backInseamCp2.y}, ${back_hem_in.x} ${back_hem_in.y}`
    );
  } else {
    backPathSegments.push(
      `C ${backInseamCp1.x} ${backInseamCp1.y}, ${backInseamCp2.x} ${backInseamCp2.y}, ${back_knee_in.x} ${back_knee_in.y}`,
      `L ${back_hem_in.x} ${back_hem_in.y}`
    );
  }

  backPathSegments.push(`L ${back_hem_out.x} ${back_hem_out.y}`);

  if (isShorts) {
    backPathSegments.push(
      `C ${backOutseamLowerCp1.x} ${backOutseamLowerCp1.y}, ${backOutseamLowerCp2.x} ${backOutseamLowerCp2.y}, ${back_hip_side.x} ${back_hip_side.y}`
    );
  } else {
    backPathSegments.push(
      `L ${back_knee_out.x} ${back_knee_out.y}`,
      `C ${backOutseamLowerCp1.x} ${backOutseamLowerCp1.y}, ${backOutseamLowerCp2.x} ${backOutseamLowerCp2.y}, ${back_hip_side.x} ${back_hip_side.y}`
    );
  }

  backPathSegments.push(
    `C ${backSideWaistCp1.x} ${backSideWaistCp1.y}, ${backSideWaistCp2.x} ${backSideWaistCp2.y}, ${back_waist_side.x} ${back_waist_side.y}`,
    `L ${back_waist_center.x} ${back_waist_center.y}`,
    `Z`
  );

  const backPathD = backPathSegments.join(' ');
  const backBounds = computeBounds(backOutline);
  const backArea = computePolygonArea(backOutline);

  const backPart: PatternPart = {
    name: 'back_leg',
    label: isShorts
      ? 'SHORTS ESPALDA / BACK SHORTS'
      : 'PANTALÓN ESPALDA / BACK TROUSER',
    cutCount: 2,
    onFold: false,
    points: {
      waist_center: back_waist_center,
      waist_side: back_waist_side,
      hip_center: back_hip_center,
      hip_side: back_hip_side,
      crotch_tip: back_crotch_tip,
      knee_in: back_knee_in,
      knee_out: back_knee_out,
      hem_in: back_hem_in,
      hem_out: back_hem_out,
      crease_top: back_crease_top,
      crease_bottom: back_crease_bottom,
    },
    pathD: backPathD,
    outline: backOutline,
    bounds: backBounds,
    width_mm: backBounds.width,
    height_mm: backBounds.height,
    area_mm2: backArea,
    grainline: {
      start: createPoint(0, Math.min(crotchDepth + 40, hemY - 100)),
      end: createPoint(0, Math.max(crotchDepth + 80, hemY - 40)),
      label: 'GRAINLINE / LÍNEA DE APLOMO',
    },
    notches: [
      {
        point: isShorts ? back_hem_in : back_knee_in,
        type: 'double',
        label: 'Piquete Doble Espalda Rodilla Entrepierna',
      },
      {
        point: back_crotch_tip,
        type: 'double',
        label: 'Piquete Doble Espalda Tiro',
      },
    ],
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };

  return {
    front_leg: frontPart,
    back_leg: backPart,
  };
}

/**
 * Obtiene el Sloper completo de pantalón como BaseBlockResult
 * @param size Talla estándar
 * @param options Opciones de personalización y longitud
 */
export function getTrouserSloper(
  size: StandardSize,
  options: TrouserSloperOptions = {}
): BaseBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);
  const { front_leg, back_leg } = generateTrouserBlock(size, options);
  const parts: Record<string, PatternPart> = {
    front_leg,
    back_leg,
  };
  const bounds = combineBounds([front_leg.bounds, back_leg.bounds]);

  return {
    blockType: 'pants_sloper',
    size,
    measurements,
    parts,
    bounds,
  };
}
