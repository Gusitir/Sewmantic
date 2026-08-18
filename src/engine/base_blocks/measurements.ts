/**
 * src/engine/base_blocks/measurements.ts
 * Tablas antropométricas estándar y utilidades de medidas corporales
 * pattern-ai-core
 */

import { StandardSize } from '../../types/pattern.js';

export interface BodyMeasurements {
  chest_circumference_mm: number;
  waist_circumference_mm: number;
  hip_circumference_mm: number;
  neck_circumference_mm: number;
  shoulder_to_shoulder_mm: number;
  shoulder_slope_deg: number;
  back_length_mm: number;
  front_length_mm: number;
  sleeve_length_mm: number;
  bicep_circumference_mm: number;
  wrist_circumference_mm: number;
  head_circumference_mm: number;
}

export const STANDARD_SIZES: StandardSize[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

/**
 * Tabla antropométrica estándar universal para tallaje textil (en milímetros)
 */
export const STANDARD_MEASUREMENTS: Record<StandardSize, BodyMeasurements> = {
  XS: {
    chest_circumference_mm: 860,
    waist_circumference_mm: 720,
    hip_circumference_mm: 880,
    neck_circumference_mm: 360,
    shoulder_to_shoulder_mm: 410,
    shoulder_slope_deg: 15,
    back_length_mm: 660,
    front_length_mm: 680,
    sleeve_length_mm: 610,
    bicep_circumference_mm: 290,
    wrist_circumference_mm: 165,
    head_circumference_mm: 540,
  },
  S: {
    chest_circumference_mm: 920,
    waist_circumference_mm: 780,
    hip_circumference_mm: 940,
    neck_circumference_mm: 375,
    shoulder_to_shoulder_mm: 430,
    shoulder_slope_deg: 15,
    back_length_mm: 680,
    front_length_mm: 700,
    sleeve_length_mm: 625,
    bicep_circumference_mm: 310,
    wrist_circumference_mm: 175,
    head_circumference_mm: 555,
  },
  M: {
    chest_circumference_mm: 1000,
    waist_circumference_mm: 860,
    hip_circumference_mm: 1020,
    neck_circumference_mm: 395,
    shoulder_to_shoulder_mm: 455,
    shoulder_slope_deg: 15,
    back_length_mm: 705,
    front_length_mm: 725,
    sleeve_length_mm: 640,
    bicep_circumference_mm: 335,
    wrist_circumference_mm: 185,
    head_circumference_mm: 570,
  },
  L: {
    chest_circumference_mm: 1080,
    waist_circumference_mm: 940,
    hip_circumference_mm: 1100,
    neck_circumference_mm: 415,
    shoulder_to_shoulder_mm: 480,
    shoulder_slope_deg: 15,
    back_length_mm: 730,
    front_length_mm: 750,
    sleeve_length_mm: 655,
    bicep_circumference_mm: 360,
    wrist_circumference_mm: 195,
    head_circumference_mm: 585,
  },
  XL: {
    chest_circumference_mm: 1160,
    waist_circumference_mm: 1020,
    hip_circumference_mm: 1180,
    neck_circumference_mm: 435,
    shoulder_to_shoulder_mm: 505,
    shoulder_slope_deg: 15,
    back_length_mm: 755,
    front_length_mm: 775,
    sleeve_length_mm: 670,
    bicep_circumference_mm: 385,
    wrist_circumference_mm: 205,
    head_circumference_mm: 600,
  },
  '2XL': {
    chest_circumference_mm: 1240,
    waist_circumference_mm: 1100,
    hip_circumference_mm: 1260,
    neck_circumference_mm: 455,
    shoulder_to_shoulder_mm: 530,
    shoulder_slope_deg: 15,
    back_length_mm: 775,
    front_length_mm: 795,
    sleeve_length_mm: 680,
    bicep_circumference_mm: 410,
    wrist_circumference_mm: 215,
    head_circumference_mm: 615,
  },
  '3XL': {
    chest_circumference_mm: 1320,
    waist_circumference_mm: 1180,
    hip_circumference_mm: 1340,
    neck_circumference_mm: 475,
    shoulder_to_shoulder_mm: 555,
    shoulder_slope_deg: 15,
    back_length_mm: 795,
    front_length_mm: 815,
    sleeve_length_mm: 690,
    bicep_circumference_mm: 435,
    wrist_circumference_mm: 225,
    head_circumference_mm: 630,
  },
};

/**
 * Obtiene las medidas corporales estándar para una talla dada
 * @param size Talla estándar ('XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL')
 * @returns Medidas corporales en mm
 */
export function getStandardMeasurements(size: StandardSize): BodyMeasurements {
  const measurements = STANDARD_MEASUREMENTS[size];
  if (!measurements) {
    throw new Error(
      `Talla estándar desconocida: '${size}'. Tallas soportadas: ${STANDARD_SIZES.join(', ')}`
    );
  }
  // Clonar para evitar mutaciones accidentales
  return { ...measurements };
}
