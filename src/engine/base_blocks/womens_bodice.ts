/**
 * src/engine/base_blocks/womens_bodice.ts
 * Generador de bloque base de Corpiño Femenino Anatómico con Pinzas de Busto y Espalda
 * pattern-ai-core - Motor Geométrico FreeSewing v3
 */

import { StandardSize } from '../../types/pattern.js';
import {
  Point2D,
  PatternPart,
  BoundingBox,
  createPoint,
  sampleBezier,
  distance,
  computePolygonArea,
  computeBounds,
  combineBounds,
} from '../geometry.js';
import { BodyMeasurements, getStandardMeasurements } from './measurements.js';

export interface WomensBodiceOptions {
  chest_ease_mm?: number;
  waist_ease_mm?: number;
  shoulder_ease_mm?: number;
  length_delta_mm?: number;
  neckline_depth_delta_mm?: number;
  neckline_width_delta_mm?: number;
  bust_dart_width_mm?: number;
  waist_dart_width_mm?: number;
  seam_allowance_mm?: number;
  measurements?: BodyMeasurements;
}

export interface WomensBodiceResult {
  front_bodice: PatternPart;
  back_bodice: PatternPart;
}

export interface BaseBlockResult {
  blockType: string;
  size: StandardSize;
  measurements: BodyMeasurements;
  parts: Record<string, PatternPart>;
  bounds: BoundingBox;
}

/**
 * Genera el bloque base anatómico de corpiño femenino con pinza de busto lateral y entalle de espalda
 * @param size Talla estándar ('XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL')
 * @param options Opciones de holgura y modificación paramétrica
 */
export function generateWomensBodiceBlock(
  size: StandardSize,
  options: WomensBodiceOptions = {}
): WomensBodiceResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);

  const chestEase = options.chest_ease_mm ?? 30; // Entalle femenino estándar (30 mm de holgura total)
  const waistEase = options.waist_ease_mm ?? 20;
  const shoulderEase = options.shoulder_ease_mm ?? 0;
  const lengthDelta = options.length_delta_mm ?? 0;
  const neckDepthDelta = options.neckline_depth_delta_mm ?? 0;
  const neckWidthDelta = options.neckline_width_delta_mm ?? 0;
  const seamAllowance = options.seam_allowance_mm ?? 10;

  // Parámetros antropométricos principales
  const quarterChest = (measurements.chest_circumference_mm + chestEase) / 4;
  const quarterWaist = (measurements.waist_circumference_mm + waistEase) / 4;
  const neckWidth = measurements.neck_circumference_mm / 6 + 8 + neckWidthDelta;
  const frontNeckDepth = measurements.neck_circumference_mm / 6 + 22 + neckDepthDelta;
  const backNeckDepth = 22 + (neckDepthDelta > 0 ? neckDepthDelta * 0.3 : 0);

  const halfShoulder = measurements.shoulder_to_shoulder_mm / 2 + shoulderEase / 2;
  const shoulderSlopeRad = (measurements.shoulder_slope_deg * Math.PI) / 180;
  const shoulderDrop = (halfShoulder - neckWidth) * Math.tan(shoulderSlopeRad);

  const frontLength = measurements.front_length_mm + lengthDelta;
  const backLength = measurements.back_length_mm + lengthDelta;
  const armholeDepth = measurements.chest_circumference_mm / 4 - 10 + chestEase * 0.1;

  // Punto de busto (Apex) anatómico
  const apexX = measurements.bust_span_mm / 2;
  const apexY = armholeDepth + (frontLength - armholeDepth) * 0.28;
  const bust_apex = createPoint(apexX, apexY, 'bust_apex');

  // =========================================================================
  // 1. ESPALDA DE CORPIÑO (BACK BODICE)
  // Se calcula primero para fijar la longitud exacta de la costura de costado
  // =========================================================================
  const back_neck_center = createPoint(0, backNeckDepth, 'neck_center');
  const back_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const back_shoulder_tip = createPoint(halfShoulder + 2, shoulderDrop - 2, 'shoulder_tip');
  const back_armhole_pitch = createPoint(quarterChest - 14, armholeDepth - 50, 'armhole_pitch');
  const back_armhole_bottom = createPoint(quarterChest, armholeDepth, 'armhole_bottom');

  // Cintura de espalda con entalle anatómico
  const backWaistDartWidth = options.waist_dart_width_mm ?? 22;
  const back_side_waist = createPoint(quarterWaist + backWaistDartWidth * 0.5, backLength, 'side_waist');
  const back_center_hem = createPoint(0, backLength, 'center_hem');

  // Pinza de entalle de cintura de espalda
  const backDartX = (quarterWaist + backWaistDartWidth * 0.5) * 0.48;
  const backDartHeight = (backLength - armholeDepth) * 0.72;
  const back_dart_tip = createPoint(backDartX, backLength - backDartHeight, 'dart_tip');
  const back_dart_inner = createPoint(backDartX - backWaistDartWidth / 2, backLength, 'dart_inner');
  const back_dart_outer = createPoint(backDartX + backWaistDartWidth / 2, backLength, 'dart_outer');

  // Curvas de Espalda
  const backNeckCp1 = createPoint(neckWidth * 0.5, backNeckDepth);
  const backNeckCp2 = createPoint(neckWidth, backNeckDepth * 0.35);

  const backArmholeCp1 = createPoint(
    halfShoulder + 1,
    shoulderDrop + (armholeDepth - shoulderDrop) * 0.32
  );
  const backArmholeCp2 = createPoint(quarterChest - 18, armholeDepth - 70);

  const backArmholeLowerCp1 = createPoint(quarterChest - 10, armholeDepth - 28);
  const backArmholeLowerCp2 = createPoint(quarterChest - 2, armholeDepth);

  const backNeckSamples = sampleBezier(
    back_neck_center,
    backNeckCp1,
    backNeckCp2,
    back_neck_shoulder,
    12
  );
  const backArmholeUpperSamples = sampleBezier(
    back_shoulder_tip,
    backArmholeCp1,
    backArmholeCp2,
    back_armhole_pitch,
    14
  );
  const backArmholeLowerSamples = sampleBezier(
    back_armhole_pitch,
    backArmholeLowerCp1,
    backArmholeLowerCp2,
    back_armhole_bottom,
    12
  );

  const backOutline: Point2D[] = [
    ...backNeckSamples,
    back_shoulder_tip,
    ...backArmholeUpperSamples.slice(1),
    ...backArmholeLowerSamples.slice(1),
    back_side_waist,
    back_dart_outer,
    back_dart_tip,
    back_dart_inner,
    back_center_hem,
  ];

  const backPathD = [
    `M ${back_neck_center.x} ${back_neck_center.y}`,
    `C ${backNeckCp1.x} ${backNeckCp1.y}, ${backNeckCp2.x} ${backNeckCp2.y}, ${back_neck_shoulder.x} ${back_neck_shoulder.y}`,
    `L ${back_shoulder_tip.x} ${back_shoulder_tip.y}`,
    `C ${backArmholeCp1.x} ${backArmholeCp1.y}, ${backArmholeCp2.x} ${backArmholeCp2.y}, ${back_armhole_pitch.x} ${back_armhole_pitch.y}`,
    `C ${backArmholeLowerCp1.x} ${backArmholeLowerCp1.y}, ${backArmholeLowerCp2.x} ${backArmholeLowerCp2.y}, ${back_armhole_bottom.x} ${back_armhole_bottom.y}`,
    `L ${back_side_waist.x} ${back_side_waist.y}`,
    `L ${back_dart_outer.x} ${back_dart_outer.y}`,
    `L ${back_dart_tip.x} ${back_dart_tip.y}`,
    `L ${back_dart_inner.x} ${back_dart_inner.y}`,
    `L ${back_center_hem.x} ${back_center_hem.y}`,
    `Z`,
  ].join(' ');

  const backBounds = computeBounds(backOutline);
  const backArea = computePolygonArea(backOutline);

  // Longitud exacta de la costura de costado de la espalda
  const backSideLength = distance(back_armhole_bottom, back_side_waist);

  const backPart: PatternPart = {
    name: 'back_bodice',
    label: 'CORPIÑO ESPALDA / BACK BODICE',
    cutCount: 1,
    onFold: true,
    points: {
      neck_center: back_neck_center,
      neck_shoulder: back_neck_shoulder,
      shoulder_tip: back_shoulder_tip,
      armhole_pitch: back_armhole_pitch,
      armhole_bottom: back_armhole_bottom,
      side_waist: back_side_waist,
      dart_outer: back_dart_outer,
      dart_tip: back_dart_tip,
      dart_inner: back_dart_inner,
      center_hem: back_center_hem,
    },
    pathD: backPathD,
    outline: backOutline,
    bounds: backBounds,
    width_mm: backBounds.width,
    height_mm: backBounds.height,
    area_mm2: backArea,
    grainline: {
      start: createPoint(35, armholeDepth),
      end: createPoint(35, backLength - 50),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: back_armhole_pitch,
        type: 'double',
        label: 'Piquete Doble Espalda Sisa',
      },
      {
        point: back_dart_inner,
        type: 'double',
        label: 'Piquete Doble Pinza Espalda Interior',
      },
      {
        point: back_dart_outer,
        type: 'double',
        label: 'Piquete Doble Pinza Espalda Exterior',
      },
    ],
    seamAllowance_mm: seamAllowance,
  };

  // =========================================================================
  // 2. DELANTERO DE CORPIÑO (FRONT BODICE) CON PINZA DE BUSTO PARAMÉTRICA
  // REQUISITO MATEMÁTICO INVARIANTE:
  // Costura de costado delantero (con pinza cerrada) == Costura de costado espalda (Δ <= 1 mm)
  // =========================================================================
  const front_neck_center = createPoint(0, frontNeckDepth, 'neck_center');
  const front_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const front_shoulder_tip = createPoint(halfShoulder, shoulderDrop, 'shoulder_tip');
  const front_armhole_pitch = createPoint(quarterChest - 18, armholeDepth - 42, 'armhole_pitch');
  const front_armhole_bottom = createPoint(quarterChest, armholeDepth, 'armhole_bottom');

  // Posicionamiento de la pinza de busto lateral
  // El ancho de la pinza absorbe el desarrollo de busto (frontLength - backLength + delta)
  const bustDelta = frontLength - backLength;
  const dartWidth = options.bust_dart_width_mm ?? Math.max(26, Math.min(50, bustDelta + 18));
  const dartHalfWidth = dartWidth / 2;

  // Centro vertical de la pinza lateral alineado con el apex
  const dartMidY = apexY + 12;
  const dartTopY = dartMidY - dartHalfWidth;
  const dartBottomY = dartMidY + dartHalfWidth;

  // Patas de la pinza en la línea de costado
  const dart_top_leg = createPoint(quarterChest, dartTopY, 'dart_top_leg');
  const dart_bottom_leg = createPoint(quarterChest, dartBottomY, 'dart_bottom_leg');

  // Punta de la pinza dirigida hacia el bust apex (termina a 25 mm del vértice para caída anatómica suave)
  const dart_tip = createPoint(apexX + 22, dartMidY, 'bust_dart_tip');

  // Cálculo del segmento superior del costado delantero
  const upperSideDist = distance(front_armhole_bottom, dart_top_leg);

  // Distancia restante requerida para el segmento inferior del costado
  const lowerSideDistRequired = backSideLength - upperSideDist;

  // Posición del punto de costado en cintura delantera para satisfacer exactamente la longitud requerida
  const waistTargetX = quarterWaist + 12;
  const waistDirX = waistTargetX - dart_bottom_leg.x;
  const waistDirY = frontLength - dart_bottom_leg.y;
  const waistHypot = Math.sqrt(waistDirX * waistDirX + waistDirY * waistDirY);

  const front_side_waist = createPoint(
    dart_bottom_leg.x + (waistDirX / waistHypot) * lowerSideDistRequired,
    dart_bottom_leg.y + (waistDirY / waistHypot) * lowerSideDistRequired,
    'side_waist'
  );

  const front_center_hem = createPoint(0, frontLength, 'center_hem');

  // Curvas de Delantero
  const frontNeckCp1 = createPoint(neckWidth * 0.45, frontNeckDepth);
  const frontNeckCp2 = createPoint(neckWidth, frontNeckDepth * 0.42);

  const frontArmholeCp1 = createPoint(
    halfShoulder - 4,
    shoulderDrop + (armholeDepth - shoulderDrop) * 0.3
  );
  const frontArmholeCp2 = createPoint(quarterChest - 22, armholeDepth - 62);

  const frontArmholeLowerCp1 = createPoint(quarterChest - 12, armholeDepth - 24);
  const frontArmholeLowerCp2 = createPoint(quarterChest - 4, armholeDepth);

  const frontNeckSamples = sampleBezier(
    front_neck_center,
    frontNeckCp1,
    frontNeckCp2,
    front_neck_shoulder,
    12
  );
  const frontArmholeUpperSamples = sampleBezier(
    front_shoulder_tip,
    frontArmholeCp1,
    frontArmholeCp2,
    front_armhole_pitch,
    14
  );
  const frontArmholeLowerSamples = sampleBezier(
    front_armhole_pitch,
    frontArmholeLowerCp1,
    frontArmholeLowerCp2,
    front_armhole_bottom,
    12
  );

  // Contorno completo ordenado del Delantero
  const frontOutline: Point2D[] = [
    ...frontNeckSamples,
    front_shoulder_tip,
    ...frontArmholeUpperSamples.slice(1),
    ...frontArmholeLowerSamples.slice(1),
    dart_top_leg,
    dart_tip,
    dart_bottom_leg,
    front_side_waist,
    front_center_hem,
  ];

  const frontPathD = [
    `M ${front_neck_center.x} ${front_neck_center.y}`,
    `C ${frontNeckCp1.x} ${frontNeckCp1.y}, ${frontNeckCp2.x} ${frontNeckCp2.y}, ${front_neck_shoulder.x} ${front_neck_shoulder.y}`,
    `L ${front_shoulder_tip.x} ${front_shoulder_tip.y}`,
    `C ${frontArmholeCp1.x} ${frontArmholeCp1.y}, ${frontArmholeCp2.x} ${frontArmholeCp2.y}, ${front_armhole_pitch.x} ${front_armhole_pitch.y}`,
    `C ${frontArmholeLowerCp1.x} ${frontArmholeLowerCp1.y}, ${frontArmholeLowerCp2.x} ${frontArmholeLowerCp2.y}, ${front_armhole_bottom.x} ${front_armhole_bottom.y}`,
    `L ${dart_top_leg.x} ${dart_top_leg.y}`,
    `L ${dart_tip.x} ${dart_tip.y}`,
    `L ${dart_bottom_leg.x} ${dart_bottom_leg.y}`,
    `L ${front_side_waist.x} ${front_side_waist.y}`,
    `L ${front_center_hem.x} ${front_center_hem.y}`,
    `Z`,
  ].join(' ');

  const frontBounds = computeBounds(frontOutline);
  const frontArea = computePolygonArea(frontOutline);

  const frontPart: PatternPart = {
    name: 'front_bodice',
    label: 'CORPIÑO DELANTERO / FRONT BODICE',
    cutCount: 1,
    onFold: true,
    points: {
      neck_center: front_neck_center,
      neck_shoulder: front_neck_shoulder,
      shoulder_tip: front_shoulder_tip,
      armhole_pitch: front_armhole_pitch,
      armhole_bottom: front_armhole_bottom,
      bust_apex,
      dart_top_leg,
      dart_tip,
      bust_dart_tip: dart_tip,
      dart_bottom_leg,
      side_waist: front_side_waist,
      center_hem: front_center_hem,
    },
    pathD: frontPathD,
    outline: frontOutline,
    bounds: frontBounds,
    width_mm: frontBounds.width,
    height_mm: frontBounds.height,
    area_mm2: frontArea,
    grainline: {
      start: createPoint(35, armholeDepth),
      end: createPoint(35, frontLength - 50),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: front_armhole_pitch,
        type: 'single',
        label: 'Piquete Delantero Sisa',
      },
      {
        point: dart_top_leg,
        type: 'single',
        label: 'Piquete Superior Pinza Busto',
      },
      {
        point: dart_bottom_leg,
        type: 'single',
        label: 'Piquete Inferior Pinza Busto',
      },
    ],
    seamAllowance_mm: seamAllowance,
  };

  return {
    front_bodice: frontPart,
    back_bodice: backPart,
  };
}

/**
 * Obtiene el Sloper completo de Corpiño Femenino como BaseBlockResult
 * @param size Talla estándar
 * @param options Opciones de personalización y holguras
 */
export function getWomensBodiceSloper(
  size: StandardSize,
  options: WomensBodiceOptions = {}
): BaseBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);
  const { front_bodice, back_bodice } = generateWomensBodiceBlock(size, options);
  const parts: Record<string, PatternPart> = {
    front_bodice,
    back_bodice,
  };
  const bounds = combineBounds([front_bodice.bounds, back_bodice.bounds]);

  return {
    blockType: 'womenswear_bodice',
    size,
    measurements,
    parts,
    bounds,
  };
}
