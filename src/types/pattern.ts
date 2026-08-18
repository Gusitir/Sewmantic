/**
 * src/types/pattern.ts
 * Definiciones de tipos TypeScript para el ADN Paramétrico de Moldería y Patronaje IA
 * pattern-ai-core
 */

/**
 * Tallas estándar soportadas para graduación y capas de exportación PDF
 */
export type StandardSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

/**
 * Bloques base anatómicos (slopers) soportados por el motor FreeSewing
 */
export type BaseBlockType =
  | 'menswear_torso_oversize'
  | 'menswear_torso'
  | 'womenswear_torso_fitted'
  | 'womenswear_torso'
  | 'unisex_torso'
  | 'tshirt_sloper'
  | 'hoodie_sloper'
  | 'dress_sloper'
  | 'pants_sloper'
  | 'skirt_sloper'
  | (string & {});

/**
 * Tipos de escote / cuello
 */
export type NecklineType =
  | 'crew'
  | 'v_neck'
  | 'crossover_hood'
  | 'hood'
  | 'scoop'
  | 'boat'
  | 'high_neck'
  | 'collar'
  | 'square'
  | 'sweetheart'
  | 'custom';

/**
 * Modificaciones geométricas de escote y cuello
 */
export interface NecklineMod {
  type: NecklineType;
  depth_mm?: number;
  width_mm?: number;
  drop_mm?: number;
  band_height_mm?: number;
  collar_height_mm?: number;
}

/**
 * Tipos de manga / hombro
 */
export type SleeveType =
  | 'set_in'
  | 'drop_shoulder'
  | 'raglan'
  | 'kimono'
  | 'sleeveless'
  | 'oversized'
  | 'bishop'
  | 'puff'
  | 'custom';

/**
 * Largo de manga estándar
 */
export type SleeveLengthType = 'sleeveless' | 'short' | 'three_quarter' | 'full' | 'custom';

/**
 * Modificaciones geométricas de manga
 */
export interface SleeveMod {
  type: SleeveType;
  drop_mm?: number;
  length_type?: SleeveLengthType;
  length_mm?: number;
  bicep_ease_mm?: number;
  cuff_elastic?: boolean;
  cuff_rib_mm?: number;
  cuff_width_mm?: number;
}

/**
 * Tipos de bajo / dobladillo
 */
export type HemType =
  | 'straight'
  | 'curved_tail'
  | 'split'
  | 'ribbed'
  | 'cropped'
  | 'drawstring'
  | 'asymmetric'
  | 'flared'
  | 'custom';

/**
 * Modificaciones geométricas de bajo / dobladillo
 */
export interface HemMod {
  type: HemType;
  drop_mm?: number;
  back_drop_mm?: number;
  split_height_mm?: number;
  rib_height_mm?: number;
  allowance_mm?: number;
}

/**
 * Tipos de bolsillo
 */
export type PocketType =
  | 'kangaroo'
  | 'welt'
  | 'patch'
  | 'seam'
  | 'cargo'
  | 'flap'
  | 'hidden'
  | 'none'
  | 'custom';

/**
 * Modificaciones y especificaciones de bolsillos
 */
export interface PocketMod {
  type: PocketType;
  width_mm?: number;
  height_mm?: number;
  placement_y_mm?: number;
  placement_x_mm?: number;
  flap?: boolean;
  zip?: boolean;
}

/**
 * Tipos de capucha
 */
export type HoodType =
  | 'standard'
  | 'crossover'
  | 'ninja'
  | 'oversized'
  | 'three_piece'
  | 'scuba'
  | 'pointed'
  | 'none'
  | 'custom';

/**
 * Modificaciones geométricas de capucha
 */
export interface HoodMod {
  type: HoodType;
  height_mm?: number;
  depth_mm?: number;
  overlap_mm?: number;
  center_panel_width_mm?: number;
  drawcord?: boolean;
  eyelets?: boolean;
}

/**
 * Árbol completo de modificaciones paramétricas sobre el bloque base
 */
export interface ModificationTree {
  neckline?: NecklineMod;
  sleeves?: SleeveMod;
  hem?: HemMod;
  pocket?: PocketMod;
  pockets?: PocketMod[];
  hood?: HoodMod;
  custom?: Record<string, unknown>;
}

/**
 * Configuración de holguras textiles (Ease) en milímetros
 * - Confort (20-40mm)
 * - Diseño / Streetwear (120-250mm)
 */
export interface EaseSettings {
  chest_ease_mm: number;
  bicep_ease_mm?: number;
  waist_ease_mm?: number;
  hip_ease_mm?: number;
  shoulder_ease_mm?: number;
}

/**
 * Configuración de tallaje y medidas corporales
 */
export interface SizingSettings {
  size: StandardSize;
  height_mm?: number;
  chest_circ_mm?: number;
  waist_circ_mm?: number;
  hip_circ_mm?: number;
  target_layers?: StandardSize[];
}

/**
 * Ficha técnica, insumos y márgenes de costura
 */
export interface TechSpecs {
  notions: string[];
  estimated_fabric_meters: number;
  seam_allowance_mm: number;
  hem_allowance_mm: number;
  fabric_type?: string;
  fabric_width_mm?: number;
}

/**
 * Contrato de ADN Paramétrico Principal (PatternDna)
 */
export interface PatternDna {
  concept_name: string;
  description?: string;
  base_block: string;
  ease: EaseSettings;
  modifications: ModificationTree;
  sizing?: SizingSettings;
  tech_specs?: TechSpecs;
  notions?: string[];
  estimated_fabric_meters?: number;
}
