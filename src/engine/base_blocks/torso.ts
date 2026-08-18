/**
 * src/engine/base_blocks/torso.ts
 * Generador de bloque base de Torso (Delantero y Espalda)
 * pattern-ai-core
 */

import { StandardSize } from '../../types/pattern.js';
import {
  Point2D,
  PatternPart,
  createPoint,
  sampleBezier,
  computePolygonArea,
  computeBounds,
} from '../geometry.js';
import { BodyMeasurements, getStandardMeasurements } from './measurements.js';

export interface TorsoBlockOptions {
  chest_ease_mm?: number;
  shoulder_ease_mm?: number;
  waist_ease_mm?: number;
  length_delta_mm?: number;
  neckline_depth_delta_mm?: number;
  neckline_width_delta_mm?: number;
  measurements?: BodyMeasurements;
}

export interface TorsoBlockResult {
  front: PatternPart;
  back: PatternPart;
}

/**
 * Genera las piezas del bloque base de torso (delantero y espalda)
 * @param size Talla estándar
 * @param options Opciones de holgura y modificación
 */
export function generateTorsoBlock(
  size: StandardSize,
  options: TorsoBlockOptions = {}
): TorsoBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);

  const chestEase = options.chest_ease_mm ?? 40;
  const shoulderEase = options.shoulder_ease_mm ?? 0;
  const lengthDelta = options.length_delta_mm ?? 0;
  const neckDepthDelta = options.neckline_depth_delta_mm ?? 0;
  const neckWidthDelta = options.neckline_width_delta_mm ?? 0;

  const quarterChest = (measurements.chest_circumference_mm + chestEase) / 4;
  const neckWidth = measurements.neck_circumference_mm / 6 + 10 + neckWidthDelta;
  const frontNeckDepth = measurements.neck_circumference_mm / 6 + 20 + neckDepthDelta;
  const backNeckDepth = 25 + (neckDepthDelta > 0 ? neckDepthDelta * 0.3 : 0);

  const halfShoulder = measurements.shoulder_to_shoulder_mm / 2 + shoulderEase / 2;
  const shoulderSlopeRad = (measurements.shoulder_slope_deg * Math.PI) / 180;
  const shoulderDrop = (halfShoulder - neckWidth) * Math.tan(shoulderSlopeRad);

  const frontLength = measurements.front_length_mm + lengthDelta;
  const backLength = measurements.back_length_mm + lengthDelta;
  const armholeDepth = measurements.chest_circumference_mm / 4 - 15 + chestEase * 0.1;

  // ==========================================
  // 1. DELANTERO (FRONT)
  // ==========================================
  const front_neck_center = createPoint(0, frontNeckDepth, 'neck_center');
  const front_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const front_shoulder_tip = createPoint(halfShoulder, shoulderDrop, 'shoulder_tip');
  const front_armhole_pitch = createPoint(quarterChest - 18, armholeDepth - 45, 'armhole_pitch');
  const front_armhole_bottom = createPoint(quarterChest, armholeDepth, 'armhole_bottom');
  const front_side_hem = createPoint(quarterChest, frontLength, 'side_hem');
  const front_center_hem = createPoint(0, frontLength, 'center_hem');

  // Curvas de Delantero
  const frontNeckCp1 = createPoint(neckWidth * 0.45, frontNeckDepth);
  const frontNeckCp2 = createPoint(neckWidth, frontNeckDepth * 0.45);

  const frontArmholeCp1 = createPoint(
    halfShoulder - 5,
    shoulderDrop + (armholeDepth - shoulderDrop) * 0.3
  );
  const frontArmholeCp2 = createPoint(quarterChest - 22, armholeDepth - 65);

  const frontArmholeLowerCp1 = createPoint(quarterChest - 12, armholeDepth - 25);
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

  const frontOutline: Point2D[] = [
    ...frontNeckSamples,
    front_shoulder_tip,
    ...frontArmholeUpperSamples.slice(1),
    ...frontArmholeLowerSamples.slice(1),
    front_side_hem,
    front_center_hem,
  ];

  const frontPathD = [
    `M ${front_neck_center.x} ${front_neck_center.y}`,
    `C ${frontNeckCp1.x} ${frontNeckCp1.y}, ${frontNeckCp2.x} ${frontNeckCp2.y}, ${front_neck_shoulder.x} ${front_neck_shoulder.y}`,
    `L ${front_shoulder_tip.x} ${front_shoulder_tip.y}`,
    `C ${frontArmholeCp1.x} ${frontArmholeCp1.y}, ${frontArmholeCp2.x} ${frontArmholeCp2.y}, ${front_armhole_pitch.x} ${front_armhole_pitch.y}`,
    `C ${frontArmholeLowerCp1.x} ${frontArmholeLowerCp1.y}, ${frontArmholeLowerCp2.x} ${frontArmholeLowerCp2.y}, ${front_armhole_bottom.x} ${front_armhole_bottom.y}`,
    `L ${front_side_hem.x} ${front_side_hem.y}`,
    `L ${front_center_hem.x} ${front_center_hem.y}`,
    `Z`,
  ].join(' ');

  const frontBounds = computeBounds(frontOutline);
  const frontArea = computePolygonArea(frontOutline);

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
    pathD: frontPathD,
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
    notches: [
      {
        point: front_armhole_pitch,
        type: 'single',
        label: 'Piquete Delantero Sisa',
      },
    ],
  };

  // ==========================================
  // 2. ESPALDA (BACK)
  // ==========================================
  const back_neck_center = createPoint(0, backNeckDepth, 'neck_center');
  const back_neck_shoulder = createPoint(neckWidth, 0, 'neck_shoulder');
  const back_shoulder_tip = createPoint(halfShoulder + 4, shoulderDrop - 4, 'shoulder_tip');
  const back_armhole_pitch = createPoint(quarterChest - 12, armholeDepth - 55, 'armhole_pitch');
  const back_armhole_bottom = createPoint(quarterChest, armholeDepth, 'armhole_bottom');
  const back_side_hem = createPoint(quarterChest, backLength, 'side_hem');
  const back_center_hem = createPoint(0, backLength, 'center_hem');

  // Curvas de Espalda
  const backNeckCp1 = createPoint(neckWidth * 0.5, backNeckDepth);
  const backNeckCp2 = createPoint(neckWidth, backNeckDepth * 0.3);

  const backArmholeCp1 = createPoint(
    halfShoulder + 2,
    shoulderDrop + (armholeDepth - shoulderDrop) * 0.3
  );
  const backArmholeCp2 = createPoint(quarterChest - 16, armholeDepth - 75);

  const backArmholeLowerCp1 = createPoint(quarterChest - 8, armholeDepth - 30);
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

  const backOutline: Point2D[] = [
    ...backNeckSamples,
    back_shoulder_tip,
    ...backArmholeUpperSamples.slice(1),
    ...backArmholeLowerSamples.slice(1),
    back_side_hem,
    back_center_hem,
  ];

  const backPathD = [
    `M ${back_neck_center.x} ${back_neck_center.y}`,
    `C ${backNeckCp1.x} ${backNeckCp1.y}, ${backNeckCp2.x} ${backNeckCp2.y}, ${back_neck_shoulder.x} ${back_neck_shoulder.y}`,
    `L ${back_shoulder_tip.x} ${back_shoulder_tip.y}`,
    `C ${backArmholeCp1.x} ${backArmholeCp1.y}, ${backArmholeCp2.x} ${backArmholeCp2.y}, ${back_armhole_pitch.x} ${back_armhole_pitch.y}`,
    `C ${backArmholeLowerCp1.x} ${backArmholeLowerCp1.y}, ${backArmholeLowerCp2.x} ${backArmholeLowerCp2.y}, ${back_armhole_bottom.x} ${back_armhole_bottom.y}`,
    `L ${back_side_hem.x} ${back_side_hem.y}`,
    `L ${back_center_hem.x} ${back_center_hem.y}`,
    `Z`,
  ].join(' ');

  const backBounds = computeBounds(backOutline);
  const backArea = computePolygonArea(backOutline);

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
    pathD: backPathD,
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
    notches: [
      {
        point: back_armhole_pitch,
        type: 'double',
        label: 'Piquete Doble Espalda Sisa',
      },
    ],
  };

  return {
    front: frontPart,
    back: backPart,
  };
}
