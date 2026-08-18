/**
 * src/engine/base_blocks/pocket.ts
 * Generador de bloques base de Bolsillos (Pocket - Kangaroo & Patch)
 * pattern-ai-core
 */

import { StandardSize, PocketType } from '../../types/pattern.js';
import {
  Point2D,
  PatternPart,
  createPoint,
  computePolygonArea,
  computeBounds,
} from '../geometry.js';
import { BodyMeasurements, getStandardMeasurements } from './measurements.js';

export interface PocketBlockOptions {
  type?: 'kangaroo' | 'patch';
  width_mm?: number;
  height_mm?: number;
  hem_allowance_mm?: number;
  measurements?: BodyMeasurements;
}

export interface PocketBlockResult {
  pocket: PatternPart;
}

/**
 * Genera el bloque base de bolsillo (Kangaroo o Patch)
 * @param size Talla estándar
 * @param options Opciones de configuración de bolsillo
 */
export function generatePocketBlock(
  size: StandardSize,
  options: PocketBlockOptions = {}
): PocketBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);
  const pocketType = options.type ?? 'kangaroo';
  const hemAllowance = options.hem_allowance_mm ?? 25;

  const chestDelta = (measurements.chest_circumference_mm - 860);

  if (pocketType === 'patch') {
    // ==========================================
    // BOLSILLO PARCHE (PATCH POCKET)
    // ==========================================
    const width = options.width_mm ?? Math.round(130 + chestDelta * 0.04);
    const height = options.height_mm ?? Math.round(155 + chestDelta * 0.05);

    const top_left = createPoint(0, 0, 'top_left');
    const top_right = createPoint(width, 0, 'top_right');
    const bottom_right = createPoint(width, height, 'bottom_right');
    const bottom_center = createPoint(width / 2, height + 15, 'bottom_center');
    const bottom_left = createPoint(0, height, 'bottom_left');
    const hem_left = createPoint(0, hemAllowance, 'hem_left');
    const hem_right = createPoint(width, hemAllowance, 'hem_right');

    const outline: Point2D[] = [
      top_left,
      top_right,
      bottom_right,
      bottom_center,
      bottom_left,
    ];

    const pathD = [
      `M ${top_left.x} ${top_left.y}`,
      `L ${top_right.x} ${top_right.y}`,
      `L ${bottom_right.x} ${bottom_right.y}`,
      `L ${bottom_center.x} ${bottom_center.y}`,
      `L ${bottom_left.x} ${bottom_left.y}`,
      `Z`,
    ].join(' ');

    const bounds = computeBounds(outline);
    const area = computePolygonArea(outline);

    const patchPart: PatternPart = {
      name: 'pocket',
      label: 'BOLSILLO PARCHE / PATCH POCKET',
      cutCount: 1,
      onFold: false,
      points: {
        top_left,
        top_right,
        bottom_right,
        bottom_center,
        bottom_left,
        hem_left,
        hem_right,
      },
      pathD,
      outline,
      bounds,
      width_mm: bounds.width,
      height_mm: bounds.height,
      area_mm2: area,
      grainline: {
        start: createPoint(width / 2, hemAllowance + 20),
        end: createPoint(width / 2, height - 20),
        label: 'GRAINLINE / HILO DE TELA',
      },
      notches: [
        {
          point: hem_left,
          type: 'single',
          label: 'Piquete Dobladillo Izquierdo',
        },
        {
          point: hem_right,
          type: 'single',
          label: 'Piquete Dobladillo Derecho',
        },
      ],
    };

    return { pocket: patchPart };
  }

  // ==========================================
  // BOLSILLO CANGURO (KANGAROO POCKET)
  // ==========================================
  const totalTopWidth = options.width_mm ?? Math.round(230 + chestDelta * 0.06);
  const totalBottomWidth = Math.round(totalTopWidth * 1.65);
  const height = options.height_mm ?? Math.round(210 + chestDelta * 0.05);

  const halfTop = totalTopWidth / 2;
  const halfBottom = totalBottomWidth / 2;
  const slantHeight = height * 0.35; // Altura lateral recta inferior

  // Puntos clave
  const top_center = createPoint(0, 0, 'top_center');
  const top_outer = createPoint(halfTop, 0, 'top_outer');
  const opening_top = createPoint(halfTop, 0, 'opening_top');
  const opening_bottom = createPoint(halfBottom, height - slantHeight, 'opening_bottom');
  const bottom_outer = createPoint(halfBottom, height, 'bottom_outer');
  const bottom_center = createPoint(0, height, 'bottom_center');

  // Lado izquierdo simétrico
  const top_outer_left = createPoint(-halfTop, 0, 'top_outer_left');
  const opening_bottom_left = createPoint(-halfBottom, height - slantHeight, 'opening_bottom_left');
  const bottom_outer_left = createPoint(-halfBottom, height, 'bottom_outer_left');

  const outline: Point2D[] = [
    top_outer_left,
    top_center,
    top_outer,
    opening_bottom,
    bottom_outer,
    bottom_center,
    bottom_outer_left,
    opening_bottom_left,
  ];

  const pathD = [
    `M ${top_outer_left.x} ${top_outer_left.y}`,
    `L ${top_outer.x} ${top_outer.y}`,
    `L ${opening_bottom.x} ${opening_bottom.y}`,
    `L ${bottom_outer.x} ${bottom_outer.y}`,
    `L ${bottom_outer_left.x} ${bottom_outer_left.y}`,
    `L ${opening_bottom_left.x} ${opening_bottom_left.y}`,
    `Z`,
  ].join(' ');

  const bounds = computeBounds(outline);
  const area = computePolygonArea(outline);

  const kangarooPart: PatternPart = {
    name: 'pocket',
    label: 'BOLSILLO CANGURO / KANGAROO POCKET',
    cutCount: 1,
    onFold: false,
    points: {
      top_center,
      top_outer,
      opening_top,
      opening_bottom,
      bottom_outer,
      bottom_center,
      top_outer_left,
      opening_bottom_left,
      bottom_outer_left,
    },
    pathD,
    outline,
    bounds,
    width_mm: bounds.width,
    height_mm: bounds.height,
    area_mm2: area,
    grainline: {
      start: createPoint(0, 30),
      end: createPoint(0, height - 30),
      label: 'GRAINLINE / HILO DE TELA',
    },
    notches: [
      {
        point: top_center,
        type: 'single',
        label: 'Piquete Centro Superior',
      },
      {
        point: bottom_center,
        type: 'single',
        label: 'Piquete Centro Inferior',
      },
      {
        point: opening_bottom,
        type: 'single',
        label: 'Piquete Apertura Lateral Derecha',
      },
      {
        point: opening_bottom_left,
        type: 'single',
        label: 'Piquete Apertura Lateral Izquierda',
      },
    ],
  };

  return { pocket: kangarooPart };
}
