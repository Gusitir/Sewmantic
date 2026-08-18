/**
 * src/engine/base_blocks/sleeve.ts
 * Generador de bloque base de Manga (Sleeve)
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

export interface SleeveBlockOptions {
  bicep_ease_mm?: number;
  wrist_ease_mm?: number;
  length_delta_mm?: number;
  cap_height_factor?: number;
  measurements?: BodyMeasurements;
}

export interface SleeveBlockResult {
  sleeve: PatternPart;
}

/**
 * Genera el bloque base de manga simétrica/anatómica
 * @param size Talla estándar
 * @param options Opciones de holgura y longitud
 */
export function generateSleeveBlock(
  size: StandardSize,
  options: SleeveBlockOptions = {}
): SleeveBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);

  const bicepEase = options.bicep_ease_mm ?? 40;
  const wristEase = options.wrist_ease_mm ?? 30;
  const lengthDelta = options.length_delta_mm ?? 0;
  const capHeightFactor = options.cap_height_factor ?? 0.72;

  const totalBicep = measurements.bicep_circumference_mm + bicepEase;
  const halfBicep = totalBicep / 2;

  const totalWrist = measurements.wrist_circumference_mm + wristEase;
  const halfWrist = totalWrist / 2;

  const sleeveLength = measurements.sleeve_length_mm + lengthDelta;
  const capHeight = halfBicep * capHeightFactor;

  // ==========================================
  // PUNTOS DE ANCLAJE
  // ==========================================
  const cap_top = createPoint(0, 0, 'cap_top');
  const cap_front_notch = createPoint(halfBicep * 0.52, capHeight * 0.48, 'cap_front_notch');
  const cap_back_notch = createPoint(-halfBicep * 0.50, capHeight * 0.42, 'cap_back_notch');

  const underarm_front = createPoint(halfBicep, capHeight, 'underarm_front');
  const underarm_back = createPoint(-halfBicep, capHeight, 'underarm_back');

  const wrist_front = createPoint(halfWrist, sleeveLength, 'wrist_front');
  const wrist_back = createPoint(-halfWrist, sleeveLength, 'wrist_back');

  // ==========================================
  // CURVAS DE COPA DE MANGA (SLEEVE CAP)
  // ==========================================
  // 1. Espalda: underarm_back -> cap_back_notch (cóncavo)
  const backCapLowerCp1 = createPoint(-halfBicep * 0.85, capHeight * 0.92);
  const backCapLowerCp2 = createPoint(-halfBicep * 0.68, capHeight * 0.65);

  // 2. Espalda: cap_back_notch -> cap_top (convexo)
  const backCapUpperCp1 = createPoint(-halfBicep * 0.32, capHeight * 0.18);
  const backCapUpperCp2 = createPoint(-halfBicep * 0.15, 0);

  // 3. Delantero: cap_top -> cap_front_notch (convexo)
  const frontCapUpperCp1 = createPoint(halfBicep * 0.15, 0);
  const frontCapUpperCp2 = createPoint(halfBicep * 0.35, capHeight * 0.22);

  // 4. Delantero: cap_front_notch -> underarm_front (cóncavo más pronunciado)
  const frontCapLowerCp1 = createPoint(halfBicep * 0.70, capHeight * 0.72);
  const frontCapLowerCp2 = createPoint(halfBicep * 0.88, capHeight * 0.94);

  // Muestreo de curvas Bezier
  const backLowerSamples = sampleBezier(
    underarm_back,
    backCapLowerCp1,
    backCapLowerCp2,
    cap_back_notch
  );
  const backUpperSamples = sampleBezier(
    cap_back_notch,
    backCapUpperCp1,
    backCapUpperCp2,
    cap_top
  );
  const frontUpperSamples = sampleBezier(
    cap_top,
    frontCapUpperCp1,
    frontCapUpperCp2,
    cap_front_notch
  );
  const frontLowerSamples = sampleBezier(
    cap_front_notch,
    frontCapLowerCp1,
    frontCapLowerCp2,
    underarm_front
  );

  const outline: Point2D[] = [
    ...backLowerSamples,
    ...backUpperSamples.slice(1),
    ...frontUpperSamples.slice(1),
    ...frontLowerSamples.slice(1),
    wrist_front,
    wrist_back,
  ];

  const pathD = [
    `M ${underarm_back.x} ${underarm_back.y}`,
    `C ${backCapLowerCp1.x} ${backCapLowerCp1.y}, ${backCapLowerCp2.x} ${backCapLowerCp2.y}, ${cap_back_notch.x} ${cap_back_notch.y}`,
    `C ${backCapUpperCp1.x} ${backCapUpperCp1.y}, ${backCapUpperCp2.x} ${backCapUpperCp2.y}, ${cap_top.x} ${cap_top.y}`,
    `C ${frontCapUpperCp1.x} ${frontCapUpperCp1.y}, ${frontCapUpperCp2.x} ${frontCapUpperCp2.y}, ${cap_front_notch.x} ${cap_front_notch.y}`,
    `C ${frontCapLowerCp1.x} ${frontCapLowerCp1.y}, ${frontCapLowerCp2.x} ${frontCapLowerCp2.y}, ${underarm_front.x} ${underarm_front.y}`,
    `L ${wrist_front.x} ${wrist_front.y}`,
    `L ${wrist_back.x} ${wrist_back.y}`,
    `Z`,
  ].join(' ');

  const bounds = computeBounds(outline);
  const area = computePolygonArea(outline);

  const sleevePart: PatternPart = {
    name: 'sleeve',
    label: 'MANGA / SLEEVE',
    cutCount: 2,
    onFold: false,
    points: {
      cap_top,
      cap_front_notch,
      cap_back_notch,
      underarm_front,
      underarm_back,
      wrist_front,
      wrist_back,
    },
    pathD,
    outline,
    bounds,
    width_mm: bounds.width,
    height_mm: bounds.height,
    area_mm2: area,
    grainline: {
      start: createPoint(0, capHeight + 40),
      end: createPoint(0, sleeveLength - 60),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: cap_top,
        type: 'single',
        label: 'Piquete Coronilla Hombro',
      },
      {
        point: cap_front_notch,
        type: 'single',
        label: 'Piquete Delantero Copa',
      },
      {
        point: cap_back_notch,
        type: 'double',
        label: 'Piquete Doble Espalda Copa',
      },
    ],
  };

  return {
    sleeve: sleevePart,
  };
}
