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
import {
  TrouserSloperOptions,
  TrouserBlockResult,
  TrouserLengthType,
  generateTrouserBlock,
  getTrouserSloper,
} from './trousers.js';
import {
  WomensBodiceOptions,
  WomensBodiceResult,
  generateWomensBodiceBlock,
  getWomensBodiceSloper,
} from './womens_bodice.js';
import {
  SkirtSilhouette,
  SkirtSloperOptions,
  SkirtBlockResult,
  generateSkirtBlock,
  getSkirtSloper,
} from './skirt.js';

export * from './measurements.js';
export * from './torso.js';
export * from './sleeve.js';
export * from './hood.js';
export * from './pocket.js';
export * from './trousers.js';
export * from './womens_bodice.js';
export * from './skirt.js';
export * from '../triangulator.js';

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
  hip_ease_mm?: number;
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
  // Opciones de Pantalón / Shorts
  length_type?: TrouserLengthType;
  crotch_ease_mm?: number;
  thigh_ease_mm?: number;
  knee_ease_mm?: number;
  ankle_ease_mm?: number;
  back_rise_mm?: number;
  seam_allowance_mm?: number;
  hem_allowance_mm?: number;
  // Opciones de Corpiño Femenino
  bust_dart_width_mm?: number;
  waist_dart_width_mm?: number;
  // Opciones de Falda
  skirt_silhouette?: SkirtSilhouette;
  skirt_length_mm?: number;
  skirt_flare_mm?: number;
  pleat_count?: number;
  pleat_depth_mm?: number;
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
  // 4. Bloques de Pantalón / Shorts / Bermuda
  else if (
    normalizedType === 'pants' ||
    normalizedType === 'pants_sloper' ||
    normalizedType === 'trousers' ||
    normalizedType === 'trouser' ||
    normalizedType === 'trouser_sloper' ||
    normalizedType === 'trousers_sloper' ||
    normalizedType === 'shorts' ||
    normalizedType === 'shorts_sloper' ||
    normalizedType === 'bermuda' ||
    normalizedType === 'bermuda_sloper' ||
    normalizedType === 'cropped_pants'
  ) {
    const defaultLengthType: TrouserLengthType =
      options.length_type ??
      (normalizedType.includes('short') || normalizedType.includes('bermuda')
        ? 'shorts'
        : normalizedType.includes('crop')
          ? 'cropped'
          : 'full');

    const trouserRes = generateTrouserBlock(size, {
      length_type: defaultLengthType,
      waist_ease_mm: options.waist_ease_mm,
      hip_ease_mm: options.hip_ease_mm,
      crotch_ease_mm: options.crotch_ease_mm,
      thigh_ease_mm: options.thigh_ease_mm,
      knee_ease_mm: options.knee_ease_mm,
      ankle_ease_mm: options.ankle_ease_mm,
      length_delta_mm: options.length_delta_mm,
      back_rise_mm: options.back_rise_mm,
      seam_allowance_mm: options.seam_allowance_mm,
      hem_allowance_mm: options.hem_allowance_mm,
      measurements,
    });
    parts.front_leg = trouserRes.front_leg;
    parts.back_leg = trouserRes.back_leg;
  }
  // 5. Bloques de Corpiño Femenino Anatómico con Pinzas
  else if (
    normalizedType === 'womenswear_bodice' ||
    normalizedType === 'womens_bodice' ||
    normalizedType === 'womens_bodice_sloper' ||
    normalizedType === 'womenswear_bodice_sloper' ||
    normalizedType === 'womenswear_torso_fitted' ||
    normalizedType === 'bodice' ||
    normalizedType === 'bodice_sloper'
  ) {
    const bodiceRes = generateWomensBodiceBlock(size, {
      chest_ease_mm: options.chest_ease_mm ?? 30,
      waist_ease_mm: options.waist_ease_mm ?? 20,
      shoulder_ease_mm: options.shoulder_ease_mm ?? 0,
      length_delta_mm: options.length_delta_mm,
      neckline_depth_delta_mm: options.neckline_depth_delta_mm,
      neckline_width_delta_mm: options.neckline_width_delta_mm,
      bust_dart_width_mm: options.bust_dart_width_mm,
      waist_dart_width_mm: options.waist_dart_width_mm,
      seam_allowance_mm: options.seam_allowance_mm,
      measurements,
    });
    parts.front_bodice = bodiceRes.front_bodice;
    parts.back_bodice = bodiceRes.back_bodice;
  }
  // 6. Bloques de Falda (Recta, Evasé y Plisada)
  else if (
    normalizedType === 'skirt' ||
    normalizedType === 'skirt_sloper' ||
    normalizedType === 'a_line_skirt' ||
    normalizedType === 'pleated_skirt' ||
    normalizedType === 'straight_skirt' ||
    normalizedType === 'skirt_straight' ||
    normalizedType === 'skirt_a_line' ||
    normalizedType === 'skirt_pleated'
  ) {
    const defaultSilhouette: SkirtSilhouette =
      options.skirt_silhouette ??
      (normalizedType.includes('a_line') || normalizedType.includes('evase')
        ? 'a_line'
        : normalizedType.includes('pleat') || normalizedType.includes('tabla')
          ? 'pleated'
          : 'straight');

    const skirtRes = generateSkirtBlock(size, {
      silhouette: defaultSilhouette,
      length_mm: options.skirt_length_mm,
      waist_ease_mm: options.waist_ease_mm,
      hip_ease_mm: options.hip_ease_mm,
      flare_mm: options.skirt_flare_mm,
      pleat_count: options.pleat_count,
      pleat_depth_mm: options.pleat_depth_mm,
      seam_allowance_mm: options.seam_allowance_mm,
      hem_allowance_mm: options.hem_allowance_mm,
      measurements,
    });
    parts.front_skirt = skirtRes.front_skirt;
    parts.back_skirt = skirtRes.back_skirt;
  }
  // 7. Bloques de Torso Unisex / Masculino / Slopers completos
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
