/**
 * src/engine/base_blocks/index.ts
 * Punto de entrada del subsistema de bloques base (Slopers)
 * pattern-ai-core
 */

import { StandardSize, BaseBlockType } from '../../types/pattern.js';
import { BoundingBox, PatternPart, combineBounds } from '../geometry.js';
import {
  BodyMeasurements,
  STANDARD_MEASUREMENTS,
  STANDARD_SIZES,
  getStandardMeasurements,
} from './measurements.js';
import { TorsoBlockOptions, TorsoBlockResult, generateTorsoBlock } from './torso.js';
import { SleeveBlockOptions, SleeveBlockResult, generateSleeveBlock } from './sleeve.js';
import { HoodBlockOptions, HoodBlockResult, generateHoodBlock } from './hood.js';
import { PocketBlockOptions, PocketBlockResult, generatePocketBlock } from './pocket.js';

export * from './measurements.js';
export * from './torso.js';
export * from './sleeve.js';
export * from './hood.js';
export * from './pocket.js';

export interface BaseBlockResult {
  blockType: string;
  size: StandardSize;
  measurements: BodyMeasurements;
  parts: Record<string, PatternPart>;
  bounds: BoundingBox;
}

export interface GenerateBlockOptions {
  chest_ease_mm?: number;
  shoulder_ease_mm?: number;
  waist_ease_mm?: number;
  length_delta_mm?: number;
  neckline_depth_delta_mm?: number;
  neckline_width_delta_mm?: number;
  bicep_ease_mm?: number;
  wrist_ease_mm?: number;
  hood_type?: 'standard' | 'crossover';
  hood_height_ease_mm?: number;
  hood_depth_ease_mm?: number;
  crossover_overlap_mm?: number;
  pocket_type?: 'kangaroo' | 'patch';
  pocket_width_mm?: number;
  pocket_height_mm?: number;
  measurements?: BodyMeasurements;
}

/**
 * Función constructora unificada para generar bloques base según su tipo y talla
 * @param blockType Tipo de bloque base o sloper
 * @param size Talla estándar ('XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL')
 * @param options Opciones de personalización geométrica y holguras
 */
export function generateBaseBlock(
  blockType: BaseBlockType | string,
  size: StandardSize,
  options: GenerateBlockOptions = {}
): BaseBlockResult {
  const measurements = options.measurements ?? getStandardMeasurements(size);
  const parts: Record<string, PatternPart> = {};

  const normalizedType = blockType.toLowerCase().trim();

  // Torso oversize default ease
  const isOversize =
    normalizedType.includes('oversize') ||
    normalizedType.includes('hoodie') ||
    normalizedType.includes('streetwear');

  const defaultChestEase = isOversize ? 160 : 40;
  const defaultBicepEase = isOversize ? 60 : 40;
  const defaultShoulderEase = isOversize ? 30 : 0;

  // 1. Bloques de Manga
  if (normalizedType === 'sleeve' || normalizedType === 'sleeve_sloper') {
    const sleeveRes = generateSleeveBlock(size, {
      bicep_ease_mm: options.bicep_ease_mm ?? defaultBicepEase,
      wrist_ease_mm: options.wrist_ease_mm,
      length_delta_mm: options.length_delta_mm,
      measurements,
    });
    parts.sleeve = sleeveRes.sleeve;
  }
  // 2. Bloques de Capucha
  else if (
    normalizedType === 'hood' ||
    normalizedType === 'hood_sloper' ||
    normalizedType === 'hood_standard' ||
    normalizedType === 'hood_crossover' ||
    normalizedType === 'crossover_hood'
  ) {
    const hoodStyle =
      normalizedType.includes('crossover') || options.hood_type === 'crossover'
        ? 'crossover'
        : 'standard';

    const hoodRes = generateHoodBlock(size, {
      type: hoodStyle,
      height_ease_mm: options.hood_height_ease_mm,
      depth_ease_mm: options.hood_depth_ease_mm,
      crossover_overlap_mm: options.crossover_overlap_mm,
      measurements,
    });
    parts.hood = hoodRes.hood;
  }
  // 3. Bloques de Bolsillo
  else if (
    normalizedType === 'pocket' ||
    normalizedType === 'kangaroo_pocket' ||
    normalizedType === 'pocket_kangaroo' ||
    normalizedType === 'patch_pocket' ||
    normalizedType === 'pocket_patch'
  ) {
    const pStyle =
      normalizedType.includes('patch') || options.pocket_type === 'patch'
        ? 'patch'
        : 'kangaroo';

    const pocketRes = generatePocketBlock(size, {
      type: pStyle,
      width_mm: options.pocket_width_mm,
      height_mm: options.pocket_height_mm,
      measurements,
    });
    parts.pocket = pocketRes.pocket;
  }
  // 4. Bloques de Torso / Slopers completos
  else {
    const torsoRes = generateTorsoBlock(size, {
      chest_ease_mm: options.chest_ease_mm ?? defaultChestEase,
      shoulder_ease_mm: options.shoulder_ease_mm ?? defaultShoulderEase,
      waist_ease_mm: options.waist_ease_mm,
      length_delta_mm: options.length_delta_mm,
      neckline_depth_delta_mm: options.neckline_depth_delta_mm,
      neckline_width_delta_mm: options.neckline_width_delta_mm,
      measurements,
    });
    parts.front = torsoRes.front;
    parts.back = torsoRes.back;

    // Si es un sloper de prenda completa (hoodie_sloper o tshirt_sloper), agregar partes complementarias
    if (normalizedType === 'hoodie_sloper' || normalizedType === 'hoodie') {
      const sleeveRes = generateSleeveBlock(size, {
        bicep_ease_mm: options.bicep_ease_mm ?? defaultBicepEase,
        measurements,
      });
      const hoodRes = generateHoodBlock(size, {
        type: options.hood_type ?? 'standard',
        measurements,
      });
      const pocketRes = generatePocketBlock(size, {
        type: options.pocket_type ?? 'kangaroo',
        measurements,
      });
      parts.sleeve = sleeveRes.sleeve;
      parts.hood = hoodRes.hood;
      parts.pocket = pocketRes.pocket;
    } else if (normalizedType === 'tshirt_sloper' || normalizedType === 'tshirt') {
      const sleeveRes = generateSleeveBlock(size, {
        bicep_ease_mm: options.bicep_ease_mm ?? 40,
        length_delta_mm: -380, // Manga corta de camiseta
        measurements,
      });
      parts.sleeve = sleeveRes.sleeve;
    }
  }

  const allPartBounds = Object.values(parts).map((p) => p.bounds);
  const bounds = combineBounds(allPartBounds);

  return {
    blockType,
    size,
    measurements,
    parts,
    bounds,
  };
}
