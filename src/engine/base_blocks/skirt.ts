/**
 * src/engine/base_blocks/skirt.ts
 * Generador de bloque base de Falda Paramétrica (Recta, Evasé A-Line y Tablas Plisadas)
 * pattern-ai-core - Motor Geométrico FreeSewing v3
 */

import { StandardSize } from '../../types/pattern.js';
import {
  Point2D,
  PatternPart,
  BoundingBox,
  TechnicalNotch,
  createPoint,
  sampleBezier,
  distance,
  computePolygonArea,
  computeBounds,
  combineBounds,
} from '../geometry.js';
import { BodyMeasurements, getStandardMeasurements } from './measurements.js';

export type SkirtSilhouette = 'straight' | 'a_line' | 'pleated';

export interface SkirtSloperOptions {
  silhouette?: SkirtSilhouette;
  length_mm?: number;
  waist_ease_mm?: number;
  hip_ease_mm?: number;
  flare_mm?: number;
  pleat_count?: number;
  pleat_depth_mm?: number;
  seam_allowance_mm?: number;
  hem_allowance_mm?: number;
  measurements?: BodyMeasurements;
}

export interface SkirtBlockResult {
  front_skirt: PatternPart;
  back_skirt: PatternPart;
}

export interface BaseBlockResult {
  blockType: string;
  size: StandardSize;
  measurements: BodyMeasurements;
  parts: Record<string, PatternPart>;
  bounds: BoundingBox;
}

/**
 * Genera el bloque base de falda femenina anatómica con soporte de siluetas recta, evasé y plisada
 * @param size Talla estándar ('XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL')
 * @param options Opciones de silueta, holguras y largo
 */
export function generateSkirtBlock(
  size: StandardSize,
  options: SkirtSloperOptions = {}
): SkirtBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);

  const silhouette: SkirtSilhouette = options.silhouette ?? 'straight';
  const isALine = silhouette === 'a_line';
  const isPleated = silhouette === 'pleated';

  const waistEase = options.waist_ease_mm ?? 20;
  const hipEase = options.hip_ease_mm ?? 30;
  const skirtLength = options.length_mm ?? measurements.skirt_length_mm;
  const hipDepth = measurements.waist_to_hip_mm;
  const flareMm = options.flare_mm ?? (isALine ? 85 : 0);
  const pleatCount = options.pleat_count ?? 8;
  const pleatDepthMm = options.pleat_depth_mm ?? 30;
  const seamAllowance = options.seam_allowance_mm ?? 10;
  const hemAllowance = options.hem_allowance_mm ?? 30;

  // Anchuras base de un cuarto de patrón
  const quarterHip = (measurements.hip_circumference_mm + hipEase) / 4;
  const quarterWaist = (measurements.waist_circumference_mm + waistEase) / 4;

  // Exceso de cintura para entalle de pinzas y costado
  const waistExcess = quarterHip - quarterWaist;

  // Incremento de ancho para falda plisada (pliegues distribuidos)
  const pleatExpansion = isPleated ? (pleatCount * pleatDepthMm) / 4 : 0;

  // =========================================================================
  // 1. DELANTERO DE FALDA (FRONT SKIRT) - 1 PINZA ANATÓMICA
  // =========================================================================
  const frontQuarterHip = quarterHip + 5 + pleatExpansion;
  const frontQuarterWaist = quarterWaist + pleatExpansion;
  const frontWaistDartWidth = isPleated ? 0 : Math.max(18, Math.min(28, waistExcess * 0.55));
  const frontSideSuppression = isPleated ? 0 : Math.max(10, Math.min(25, waistExcess * 0.45));

  // Puntos del Delantero
  const front_center_waist = createPoint(0, 0, 'center_waist');
  const front_center_hip = createPoint(0, hipDepth, 'center_hip');
  const front_center_hem = createPoint(0, skirtLength, 'center_hem');

  // Posicionamiento de la pinza delantera (alineada con la caída del busto/pecho)
  const frontDartX = Math.min(measurements.bust_span_mm / 2, frontQuarterWaist * 0.45);
  const frontDartLength = hipDepth * 0.55; // Termina 70-90 mm arriba de la línea de cadera

  const front_dart_tip = createPoint(frontDartX, frontDartLength, 'dart_tip');
  const front_dart_left = createPoint(frontDartX - frontWaistDartWidth / 2, 0, 'dart_left');
  const front_dart_right = createPoint(frontDartX + frontWaistDartWidth / 2, 0, 'dart_right');

  // Costado de cintura delantera (ligeramente elevado 8 mm para acomodar la cresta ilíaca)
  const frontSideWaistX = frontQuarterWaist + frontWaistDartWidth - frontSideSuppression * 0.25;
  const front_side_waist = createPoint(frontSideWaistX, -8, 'side_waist');
  const front_side_hip = createPoint(frontQuarterHip, hipDepth, 'side_hip');

  // Bajo de costado delantero según silueta
  let frontSideHemX: number;
  let frontSideHemY: number;

  if (isALine) {
    frontSideHemX = frontQuarterHip + flareMm;
    frontSideHemY = skirtLength - 8; // Compensación de arco de bajo para largo uniforme
  } else if (isPleated) {
    frontSideHemX = frontQuarterHip;
    frontSideHemY = skirtLength;
  } else {
    // Recta / tubo
    frontSideHemX = frontQuarterHip - 4;
    frontSideHemY = skirtLength;
  }

  const front_side_hem = createPoint(frontSideHemX, frontSideHemY, 'side_hem');

  // Curvas del Delantero
  // Curva de costado (de cintura a cadera)
  const frontSideCp1 = createPoint(front_side_hip.x + 2, hipDepth * 0.45);
  const frontSideCp2 = createPoint(front_side_hip.x + 1, hipDepth * 0.85);
  const frontSideWaistHipSamples = sampleBezier(
    front_side_waist,
    frontSideCp1,
    frontSideCp2,
    front_side_hip,
    12
  );

  // Curva de cintura delantera (de pinza a costado)
  const frontWaistCp1 = createPoint(front_dart_right.x + (front_side_waist.x - front_dart_right.x) * 0.5, 0);
  const frontWaistCp2 = createPoint(front_side_waist.x - 10, -5);
  const frontWaistSamples = sampleBezier(
    front_dart_right,
    frontWaistCp1,
    frontWaistCp2,
    front_side_waist,
    10
  );

  // Curva de bajo (en evasé a_line)
  let frontHemSamples: Point2D[];
  if (isALine) {
    const hemCp1 = createPoint(frontSideHemX * 0.65, skirtLength);
    const hemCp2 = createPoint(frontSideHemX * 0.90, skirtLength - 3);
    frontHemSamples = sampleBezier(
      front_center_hem,
      hemCp1,
      hemCp2,
      front_side_hem,
      12
    );
  } else {
    frontHemSamples = [front_center_hem, front_side_hem];
  }

  // Contorno del Delantero
  const frontOutline: Point2D[] = [
    front_center_waist,
    front_dart_left,
    front_dart_tip,
    ...frontWaistSamples,
    ...frontSideWaistHipSamples.slice(1),
    front_side_hem,
    front_center_hem,
  ];

  const frontPathSegments: string[] = [
    `M ${front_center_waist.x} ${front_center_waist.y}`,
    `L ${front_dart_left.x} ${front_dart_left.y}`,
    `L ${front_dart_tip.x} ${front_dart_tip.y}`,
    `L ${front_dart_right.x} ${front_dart_right.y}`,
    `C ${frontWaistCp1.x} ${frontWaistCp1.y}, ${frontWaistCp2.x} ${frontWaistCp2.y}, ${front_side_waist.x} ${front_side_waist.y}`,
    `C ${frontSideCp1.x} ${frontSideCp1.y}, ${frontSideCp2.x} ${frontSideCp2.y}, ${front_side_hip.x} ${front_side_hip.y}`,
    `L ${front_side_hem.x} ${front_side_hem.y}`,
  ];

  if (isALine) {
    const hemCp1 = createPoint(frontSideHemX * 0.90, skirtLength - 3);
    const hemCp2 = createPoint(frontSideHemX * 0.65, skirtLength);
    frontPathSegments.push(
      `C ${hemCp1.x} ${hemCp1.y}, ${hemCp2.x} ${hemCp2.y}, ${front_center_hem.x} ${front_center_hem.y}`
    );
  } else {
    frontPathSegments.push(`L ${front_center_hem.x} ${front_center_hem.y}`);
  }

  frontPathSegments.push(`L ${front_center_waist.x} ${front_center_waist.y}`, `Z`);

  const frontPathD = frontPathSegments.join(' ');
  const frontBounds = computeBounds(frontOutline);
  const frontArea = computePolygonArea(frontOutline);

  // Piquetes técnicos del Delantero
  const frontNotches: TechnicalNotch[] = [
    {
      point: front_side_hip,
      type: 'single',
      label: 'Piquete Cadera Delantero',
    },
    {
      point: front_dart_left,
      type: 'single',
      label: 'Piquete Pinza Delantera Izquierda',
    },
    {
      point: front_dart_right,
      type: 'single',
      label: 'Piquete Pinza Delantera Derecha',
    },
  ];

  if (isPleated) {
    for (let p = 1; p <= pleatCount / 2; p++) {
      const pleatStepX = (frontQuarterWaist / (pleatCount / 2)) * p;
      frontNotches.push({
        point: createPoint(pleatStepX, 0),
        type: 'single',
        label: `Piquete Pliegue Delantero ${p}`,
      });
    }
  }

  const frontPart: PatternPart = {
    name: 'front_skirt',
    label: isALine
      ? 'FALDA DELANTERA EVASÉ / FRONT A-LINE SKIRT'
      : isPleated
        ? 'FALDA DELANTERA PLISADA / FRONT PLEATED SKIRT'
        : 'FALDA DELANTERA RECTA / FRONT STRAIGHT SKIRT',
    cutCount: 1,
    onFold: true,
    points: {
      center_waist: front_center_waist,
      center_hip: front_center_hip,
      center_hem: front_center_hem,
      dart_left: front_dart_left,
      dart_tip: front_dart_tip,
      dart_right: front_dart_right,
      side_waist: front_side_waist,
      side_hip: front_side_hip,
      side_hem: front_side_hem,
    },
    pathD: frontPathD,
    outline: frontOutline,
    bounds: frontBounds,
    width_mm: frontBounds.width,
    height_mm: frontBounds.height,
    area_mm2: frontArea,
    grainline: {
      start: createPoint(frontQuarterHip * 0.45, hipDepth),
      end: createPoint(frontQuarterHip * 0.45, skirtLength - 60),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: frontNotches,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };

  // =========================================================================
  // 2. ESPALDA DE FALDA (BACK SKIRT) - 2 PINZAS ANATÓMICAS
  // =========================================================================
  const backQuarterHip = quarterHip - 5 + pleatExpansion;
  const backQuarterWaist = quarterWaist + pleatExpansion;

  // Supresión total de pinzas de espalda dividida en 2 pinzas
  const backTotalDartWidth = isPleated ? 0 : Math.max(22, Math.min(36, waistExcess * 0.65));
  const backDart1Width = backTotalDartWidth * 0.55; // Pinza 1 (más cercana al centro)
  const backDart2Width = backTotalDartWidth * 0.45; // Pinza 2 (entre pinza 1 y costado)
  const backSideSuppression = isPleated ? 0 : Math.max(10, Math.min(25, waistExcess * 0.35));

  const back_center_waist = createPoint(0, 0, 'center_waist');
  const back_center_hip = createPoint(0, hipDepth, 'center_hip');
  const back_center_hem = createPoint(0, skirtLength, 'center_hem');

  // Pinza 1 de espalda (más larga)
  const backDart1X = backQuarterWaist * 0.35;
  const backDart1Length = hipDepth * 0.70;
  const back_dart1_tip = createPoint(backDart1X, backDart1Length, 'dart1_tip');
  const back_dart1_left = createPoint(backDart1X - backDart1Width / 2, 0, 'dart1_left');
  const back_dart1_right = createPoint(backDart1X + backDart1Width / 2, 0, 'dart1_right');

  // Pinza 2 de espalda (más corta)
  const backDart2X = backQuarterWaist * 0.68;
  const backDart2Length = hipDepth * 0.52;
  const back_dart2_tip = createPoint(backDart2X, backDart2Length, 'dart2_tip');
  const back_dart2_left = createPoint(backDart2X - backDart2Width / 2, -2, 'dart2_left');
  const back_dart2_right = createPoint(backDart2X + backDart2Width / 2, -3, 'dart2_right');

  // Costado de cintura de espalda
  const backSideWaistX = backQuarterWaist + backTotalDartWidth - backSideSuppression * 0.25;
  const back_side_waist = createPoint(backSideWaistX, -8, 'side_waist');
  const back_side_hip = createPoint(backQuarterHip, hipDepth, 'side_hip');

  // Bajo de costado de espalda
  let targetBackSideHemX: number;
  let targetBackSideHemY: number;

  if (isALine) {
    targetBackSideHemX = backQuarterHip + flareMm;
    targetBackSideHemY = skirtLength - 8;
  } else if (isPleated) {
    targetBackSideHemX = backQuarterHip;
    targetBackSideHemY = skirtLength;
  } else {
    targetBackSideHemX = backQuarterHip - 4;
    targetBackSideHemY = skirtLength;
  }

  // REQUISITO MATEMÁTICO INVARIANTE:
  // Ajustar la longitud de costura de costado de espalda para coincidir exactamente con el delantero
  const frontSideLen =
    distance(front_side_waist, front_side_hip) + distance(front_side_hip, front_side_hem);
  const backUpperSideLen = distance(back_side_waist, back_side_hip);
  const requiredBackLowerLen = frontSideLen - backUpperSideLen;

  const backSideVecX = targetBackSideHemX - back_side_hip.x;
  const backSideVecY = targetBackSideHemY - back_side_hip.y;
  const backSideVecLen = Math.sqrt(backSideVecX * backSideVecX + backSideVecY * backSideVecY);

  const back_side_hem = createPoint(
    back_side_hip.x + (backSideVecX / backSideVecLen) * requiredBackLowerLen,
    back_side_hip.y + (backSideVecY / backSideVecLen) * requiredBackLowerLen,
    'side_hem'
  );

  // Curvas de Espalda
  const backSideCp1 = createPoint(back_side_hip.x + 2, hipDepth * 0.45);
  const backSideCp2 = createPoint(back_side_hip.x + 1, hipDepth * 0.85);
  const backSideWaistHipSamples = sampleBezier(
    back_side_waist,
    backSideCp1,
    backSideCp2,
    back_side_hip,
    12
  );

  const backWaistCp1 = createPoint(back_dart2_right.x + (back_side_waist.x - back_dart2_right.x) * 0.5, -2);
  const backWaistCp2 = createPoint(back_side_waist.x - 10, -5);
  const backWaistSamples = sampleBezier(
    back_dart2_right,
    backWaistCp1,
    backWaistCp2,
    back_side_waist,
    10
  );

  // Contorno de la Espalda
  const backOutline: Point2D[] = [
    back_center_waist,
    back_dart1_left,
    back_dart1_tip,
    back_dart1_right,
    back_dart2_left,
    back_dart2_tip,
    ...backWaistSamples,
    ...backSideWaistHipSamples.slice(1),
    back_side_hem,
    back_center_hem,
  ];

  const backPathSegments: string[] = [
    `M ${back_center_waist.x} ${back_center_waist.y}`,
    `L ${back_dart1_left.x} ${back_dart1_left.y}`,
    `L ${back_dart1_tip.x} ${back_dart1_tip.y}`,
    `L ${back_dart1_right.x} ${back_dart1_right.y}`,
    `L ${back_dart2_left.x} ${back_dart2_left.y}`,
    `L ${back_dart2_tip.x} ${back_dart2_tip.y}`,
    `L ${back_dart2_right.x} ${back_dart2_right.y}`,
    `C ${backWaistCp1.x} ${backWaistCp1.y}, ${backWaistCp2.x} ${backWaistCp2.y}, ${back_side_waist.x} ${back_side_waist.y}`,
    `C ${backSideCp1.x} ${backSideCp1.y}, ${backSideCp2.x} ${backSideCp2.y}, ${back_side_hip.x} ${back_side_hip.y}`,
    `L ${back_side_hem.x} ${back_side_hem.y}`,
  ];

  if (isALine) {
    const hemCp1 = createPoint(back_side_hem.x * 0.90, skirtLength - 3);
    const hemCp2 = createPoint(back_side_hem.x * 0.65, skirtLength);
    backPathSegments.push(
      `C ${hemCp1.x} ${hemCp1.y}, ${hemCp2.x} ${hemCp2.y}, ${back_center_hem.x} ${back_center_hem.y}`
    );
  } else {
    backPathSegments.push(`L ${back_center_hem.x} ${back_center_hem.y}`);
  }

  backPathSegments.push(`L ${back_center_waist.x} ${back_center_waist.y}`, `Z`);

  const backPathD = backPathSegments.join(' ');
  const backBounds = computeBounds(backOutline);
  const backArea = computePolygonArea(backOutline);

  // Piquetes técnicos de la Espalda
  const backNotches: TechnicalNotch[] = [
    {
      point: back_side_hip,
      type: 'double',
      label: 'Piquete Doble Cadera Espalda',
    },
    {
      point: back_dart1_left,
      type: 'double',
      label: 'Piquete Doble Pinza Espalda 1 Izquierda',
    },
    {
      point: back_dart1_right,
      type: 'double',
      label: 'Piquete Doble Pinza Espalda 1 Derecha',
    },
    {
      point: back_dart2_left,
      type: 'double',
      label: 'Piquete Doble Pinza Espalda 2 Izquierda',
    },
    {
      point: back_dart2_right,
      type: 'double',
      label: 'Piquete Doble Pinza Espalda 2 Derecha',
    },
  ];

  if (isPleated) {
    for (let p = 1; p <= pleatCount / 2; p++) {
      const pleatStepX = (backQuarterWaist / (pleatCount / 2)) * p;
      backNotches.push({
        point: createPoint(pleatStepX, 0),
        type: 'double',
        label: `Piquete Doble Pliegue Espalda ${p}`,
      });
    }
  }

  const backPart: PatternPart = {
    name: 'back_skirt',
    label: isALine
      ? 'FALDA ESPALDA EVASÉ / BACK A-LINE SKIRT'
      : isPleated
        ? 'FALDA ESPALDA PLISADA / BACK PLEATED SKIRT'
        : 'FALDA ESPALDA RECTA / BACK STRAIGHT SKIRT',
    cutCount: 2,
    onFold: false,
    points: {
      center_waist: back_center_waist,
      center_hip: back_center_hip,
      center_hem: back_center_hem,
      dart1_left: back_dart1_left,
      dart1_tip: back_dart1_tip,
      dart1_right: back_dart1_right,
      dart2_left: back_dart2_left,
      dart2_tip: back_dart2_tip,
      dart2_right: back_dart2_right,
      side_waist: back_side_waist,
      side_hip: back_side_hip,
      side_hem: back_side_hem,
    },
    pathD: backPathD,
    outline: backOutline,
    bounds: backBounds,
    width_mm: backBounds.width,
    height_mm: backBounds.height,
    area_mm2: backArea,
    grainline: {
      start: createPoint(backQuarterHip * 0.45, hipDepth),
      end: createPoint(backQuarterHip * 0.45, skirtLength - 60),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: backNotches,
    seamAllowance_mm: seamAllowance,
    hemAllowance_mm: hemAllowance,
  };

  return {
    front_skirt: frontPart,
    back_skirt: backPart,
  };
}

/**
 * Obtiene el Sloper completo de Falda como BaseBlockResult
 * @param size Talla estándar
 * @param options Opciones de silueta y longitud
 */
export function getSkirtSloper(
  size: StandardSize,
  options: SkirtSloperOptions = {}
): BaseBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);
  const { front_skirt, back_skirt } = generateSkirtBlock(size, options);
  const parts: Record<string, PatternPart> = {
    front_skirt,
    back_skirt,
  };
  const bounds = combineBounds([front_skirt.bounds, back_skirt.bounds]);

  return {
    blockType: 'skirt_sloper',
    size,
    measurements,
    parts,
    bounds,
  };
}
