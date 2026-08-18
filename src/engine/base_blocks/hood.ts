/**
 * src/engine/base_blocks/hood.ts
 * Generador de bloque base de Capucha (Hood - Standard & Crossover)
 * pattern-ai-core
 */

import { StandardSize, HoodType } from '../../types/pattern.js';
import {
  Point2D,
  PatternPart,
  createPoint,
  sampleBezier,
  computePolygonArea,
  computeBounds,
} from '../geometry.js';
import { BodyMeasurements, getStandardMeasurements } from './measurements.js';

export interface HoodBlockOptions {
  type?: 'standard' | 'crossover';
  height_ease_mm?: number;
  depth_ease_mm?: number;
  crossover_overlap_mm?: number;
  measurements?: BodyMeasurements;
}

export interface HoodBlockResult {
  hood: PatternPart;
}

/**
 * Genera el bloque base de capucha de 2 piezas (Standard o Crossover)
 * @param size Talla estándar
 * @param options Opciones de personalización de capucha
 */
export function generateHoodBlock(
  size: StandardSize,
  options: HoodBlockOptions = {}
): HoodBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);
  const hoodType = options.type ?? 'standard';

  const heightEase = options.height_ease_mm ?? 60;
  const depthEase = options.depth_ease_mm ?? 40;
  const overlap = hoodType === 'crossover' ? (options.crossover_overlap_mm ?? 60) : 0;

  // Dimensiones basadas en circunferencia de cabeza y cuello
  const hoodHeight = measurements.head_circumference_mm * 0.65 + heightEase;
  const hoodDepth = measurements.head_circumference_mm * 0.45 + depthEase;
  const baseNeckWidth = measurements.neck_circumference_mm * 0.48;

  // ==========================================
  // PUNTOS DE ANCLAJE
  // ==========================================
  const neck_back = createPoint(0, hoodHeight, 'neck_back');
  const crown_back = createPoint(-18, hoodHeight * 0.48, 'crown_back');
  const crown_top = createPoint(hoodDepth * 0.42, 0, 'crown_top');
  const face_top = createPoint(hoodDepth, 22, 'face_top');

  const neckFrontX = baseNeckWidth + overlap;
  const neckFrontY = hoodHeight - 28 - (hoodType === 'crossover' ? 12 : 0);

  const face_bottom = createPoint(neckFrontX, neckFrontY, 'face_bottom');
  const neck_front = createPoint(neckFrontX, neckFrontY, 'neck_front');
  const crossover_tip = createPoint(neckFrontX, neckFrontY, 'crossover_tip');

  // ==========================================
  // CURVAS Y TANGENTES
  // ==========================================
  // 1. Escote inferior: neck_back -> face_bottom
  const neckCp1 = createPoint(baseNeckWidth * 0.35, hoodHeight + 18);
  const neckCp2 = createPoint(baseNeckWidth * 0.75, hoodHeight + 8);

  // 2. Abertura facial: face_bottom -> face_top
  const faceCp1 = createPoint(neckFrontX - 12, hoodHeight * 0.62);
  const faceCp2 = createPoint(hoodDepth - 8, hoodHeight * 0.28);

  // 3. Coronilla frontal: face_top -> crown_top
  const crownFrontCp1 = createPoint(hoodDepth * 0.82, 5);
  const crownFrontCp2 = createPoint(hoodDepth * 0.58, 0);

  // 4. Coronilla superior trasera: crown_top -> crown_back
  const crownBackCp1 = createPoint(hoodDepth * 0.22, 0);
  const crownBackCp2 = createPoint(-18, hoodHeight * 0.22);

  // 5. Nuca trasera: crown_back -> neck_back
  const napeCp1 = createPoint(-18, hoodHeight * 0.74);
  const napeCp2 = createPoint(-6, hoodHeight - 12);

  // Muestreo para el contorno cerrado
  const neckSamples = sampleBezier(neck_back, neckCp1, neckCp2, face_bottom);
  const faceSamples = sampleBezier(face_bottom, faceCp1, faceCp2, face_top);
  const crownFrontSamples = sampleBezier(face_top, crownFrontCp1, crownFrontCp2, crown_top);
  const crownBackSamples = sampleBezier(crown_top, crownBackCp1, crownBackCp2, crown_back);
  const napeSamples = sampleBezier(crown_back, napeCp1, napeCp2, neck_back);

  const outline: Point2D[] = [
    ...neckSamples,
    ...faceSamples.slice(1),
    ...crownFrontSamples.slice(1),
    ...crownBackSamples.slice(1),
    ...napeSamples.slice(1),
  ];

  const pathD = [
    `M ${neck_back.x} ${neck_back.y}`,
    `C ${neckCp1.x} ${neckCp1.y}, ${neckCp2.x} ${neckCp2.y}, ${face_bottom.x} ${face_bottom.y}`,
    `C ${faceCp1.x} ${faceCp1.y}, ${faceCp2.x} ${faceCp2.y}, ${face_top.x} ${face_top.y}`,
    `C ${crownFrontCp1.x} ${crownFrontCp1.y}, ${crownFrontCp2.x} ${crownFrontCp2.y}, ${crown_top.x} ${crown_top.y}`,
    `C ${crownBackCp1.x} ${crownBackCp1.y}, ${crownBackCp2.x} ${crownBackCp2.y}, ${crown_back.x} ${crown_back.y}`,
    `C ${napeCp1.x} ${napeCp1.y}, ${napeCp2.x} ${napeCp2.y}, ${neck_back.x} ${neck_back.y}`,
    `Z`,
  ].join(' ');

  const bounds = computeBounds(outline);
  const area = computePolygonArea(outline);

  const pointsRecord: Record<string, Point2D> = {
    neck_back,
    neck_front,
    crown_top,
    crown_back,
    face_top,
    face_bottom,
  };

  if (hoodType === 'crossover') {
    pointsRecord.crossover_tip = crossover_tip;
  }

  const hoodPart: PatternPart = {
    name: 'hood',
    label:
      hoodType === 'crossover'
        ? 'CAPUCHA CRUZADA / CROSSOVER HOOD'
        : 'CAPUCHA ESTÁNDAR / STANDARD HOOD',
    cutCount: 2,
    onFold: false,
    points: pointsRecord,
    pathD,
    outline,
    bounds,
    width_mm: bounds.width,
    height_mm: bounds.height,
    area_mm2: area,
    grainline: {
      start: createPoint(hoodDepth * 0.4, hoodHeight * 0.75),
      end: createPoint(hoodDepth * 0.4, hoodHeight * 0.25),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: neck_back,
        type: 'single',
        label: 'Piquete Unión Escote Espalda',
      },
      {
        point: crown_top,
        type: 'single',
        label: 'Piquete Vértice Coronilla',
      },
      {
        point: face_top,
        type: 'single',
        label: 'Piquete Dobladillo Facial',
      },
    ],
  };

  return {
    hood: hoodPart,
  };
}
