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
  // Medidas antropométricas de tren inferior (Sloper de pantalón / shorts)
  waist_to_floor_mm: number;
  crotch_depth_mm: number;
  inseam_mm: number;
  thigh_circumference_mm: number;
  knee_circumference_mm: number;
  ankle_circumference_mm: number;
  // Medidas antropométricas femeninas (Sloper de corpiño con pinzas y falda)
  bust_span_mm: number;
  underbust_circumference_mm: number;
  waist_to_hip_mm: number;
  skirt_length_mm: number;
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
    waist_to_floor_mm: 1000,
    crotch_depth_mm: 260,
    inseam_mm: 740,
    thigh_circumference_mm: 530,
    knee_circumference_mm: 360,
    ankle_circumference_mm: 220,
    bust_span_mm: 175,
    underbust_circumference_mm: 700,
    waist_to_hip_mm: 185,
    skirt_length_mm: 540,
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
    waist_to_floor_mm: 1020,
    crotch_depth_mm: 270,
    inseam_mm: 750,
    thigh_circumference_mm: 560,
    knee_circumference_mm: 375,
    ankle_circumference_mm: 230,
    bust_span_mm: 185,
    underbust_circumference_mm: 750,
    waist_to_hip_mm: 190,
    skirt_length_mm: 560,
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
    waist_to_floor_mm: 1045,
    crotch_depth_mm: 280,
    inseam_mm: 765,
    thigh_circumference_mm: 600,
    knee_circumference_mm: 395,
    ankle_circumference_mm: 240,
    bust_span_mm: 195,
    underbust_circumference_mm: 810,
    waist_to_hip_mm: 195,
    skirt_length_mm: 580,
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
    waist_to_floor_mm: 1065,
    crotch_depth_mm: 290,
    inseam_mm: 775,
    thigh_circumference_mm: 640,
    knee_circumference_mm: 415,
    ankle_circumference_mm: 250,
    bust_span_mm: 205,
    underbust_circumference_mm: 870,
    waist_to_hip_mm: 200,
    skirt_length_mm: 600,
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
    waist_to_floor_mm: 1085,
    crotch_depth_mm: 300,
    inseam_mm: 785,
    thigh_circumference_mm: 680,
    knee_circumference_mm: 435,
    ankle_circumference_mm: 260,
    bust_span_mm: 215,
    underbust_circumference_mm: 940,
    waist_to_hip_mm: 205,
    skirt_length_mm: 620,
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
    waist_to_floor_mm: 1100,
    crotch_depth_mm: 310,
    inseam_mm: 790,
    thigh_circumference_mm: 720,
    knee_circumference_mm: 455,
    ankle_circumference_mm: 270,
    bust_span_mm: 225,
    underbust_circumference_mm: 1010,
    waist_to_hip_mm: 210,
    skirt_length_mm: 640,
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
    waist_to_floor_mm: 1115,
    crotch_depth_mm: 320,
    inseam_mm: 795,
    thigh_circumference_mm: 760,
    knee_circumference_mm: 475,
    ankle_circumference_mm: 280,
    bust_span_mm: 235,
    underbust_circumference_mm: 1080,
    waist_to_hip_mm: 215,
    skirt_length_mm: 650,
  },
};

/**
 * Límites de seguridad anatómica para evitar geometrías textiles colapsadas o físicamente imposibles
 */
export const ANATOMICAL_LIMITS: Record<
  keyof BodyMeasurements,
  { min: number; max: number; label: string }
> = {
  chest_circumference_mm: { min: 600, max: 2000, label: 'Contorno de Pecho / Busto' },
  waist_circumference_mm: { min: 500, max: 2000, label: 'Contorno de Cintura' },
  hip_circumference_mm: { min: 600, max: 2200, label: 'Contorno de Cadera' },
  neck_circumference_mm: { min: 250, max: 650, label: 'Contorno de Cuello' },
  shoulder_to_shoulder_mm: { min: 300, max: 700, label: 'Ancho Hombro a Hombro' },
  shoulder_slope_deg: { min: 5, max: 35, label: 'Inclinación de Hombro (°)' },
  back_length_mm: { min: 450, max: 1100, label: 'Largo Talle Espalda' },
  front_length_mm: { min: 450, max: 1150, label: 'Largo Talle Delantero' },
  sleeve_length_mm: { min: 400, max: 950, label: 'Largo Total de Manga' },
  bicep_circumference_mm: { min: 180, max: 650, label: 'Contorno de Bíceps' },
  wrist_circumference_mm: { min: 120, max: 320, label: 'Contorno de Muñeca' },
  head_circumference_mm: { min: 450, max: 750, label: 'Contorno de Cabeza' },
  waist_to_floor_mm: { min: 700, max: 1500, label: 'Cintura al Suelo' },
  crotch_depth_mm: { min: 180, max: 450, label: 'Tiro / Altura de Entrepierna' },
  inseam_mm: { min: 500, max: 1100, label: 'Largo Interior de Pierna' },
  thigh_circumference_mm: { min: 350, max: 1100, label: 'Contorno de Muslo' },
  knee_circumference_mm: { min: 250, max: 700, label: 'Contorno de Rodilla' },
  ankle_circumference_mm: { min: 150, max: 450, label: 'Contorno de Tobillo' },
  bust_span_mm: { min: 120, max: 320, label: 'Separación de Busto / Distancia entre Pezones' },
  underbust_circumference_mm: { min: 500, max: 1800, label: 'Contorno Bajo Busto' },
  waist_to_hip_mm: { min: 120, max: 300, label: 'Altura de Cadera' },
  skirt_length_mm: { min: 200, max: 1200, label: 'Largo de Falda Estándar' },
};

/**
 * Aplica clamping de seguridad anatómica a una medida individual
 */
export function clampMeasurement(key: keyof BodyMeasurements, value: number): number {
  const limits = ANATOMICAL_LIMITS[key];
  if (!limits) return Math.round(value);
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return limits.min;
  }
  return Math.round(Math.max(limits.min, Math.min(limits.max, value)));
}

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

/**
 * Calcula un conjunto completo de medidas anatómicas a partir de medidas exactas o parciales proporcionadas por el usuario.
 * Si se proporcionan medidas parciales (ej: solo pecho y cintura), interpola y escala de forma armónica y monotónica
 * las medidas derivadas (bíceps, hombros, cuello, largo de manga, perneras, etc.), aplicando clamping de seguridad.
 *
 * @param custom Medidas personalizadas parciales o completas
 * @param referenceSize Talla estándar de referencia base (por defecto 'M')
 * @returns Medidas corporales completas y validadas
 */
export function calculateCustomMeasurements(
  custom: Partial<BodyMeasurements> = {},
  referenceSize: StandardSize = 'M'
): BodyMeasurements {
  const base = getStandardMeasurements(referenceSize);
  const explicit: Partial<Record<keyof BodyMeasurements, number>> = {};

  // 1. Extraer y asegurar medidas explícitas dadas por el usuario
  for (const [k, v] of Object.entries(custom)) {
    const key = k as keyof BodyMeasurements;
    if (typeof v === 'number' && !isNaN(v) && isFinite(v)) {
      explicit[key] = clampMeasurement(key, v);
    }
  }

  // 2. Determinar factores de escala principales armónicos
  // Escala de contorno superior (pecho / torso)
  let scaleChest = 1.0;
  if (explicit.chest_circumference_mm !== undefined) {
    scaleChest = explicit.chest_circumference_mm / base.chest_circumference_mm;
  } else if (explicit.waist_circumference_mm !== undefined) {
    scaleChest = explicit.waist_circumference_mm / base.waist_circumference_mm;
  } else if (explicit.hip_circumference_mm !== undefined) {
    scaleChest = explicit.hip_circumference_mm / base.hip_circumference_mm;
  }

  // Escala de contorno de cintura
  const scaleWaist =
    explicit.waist_circumference_mm !== undefined
      ? explicit.waist_circumference_mm / base.waist_circumference_mm
      : scaleChest;

  // Escala de contorno inferior (cadera / tren inferior)
  let scaleHip = scaleChest;
  if (explicit.hip_circumference_mm !== undefined) {
    scaleHip = explicit.hip_circumference_mm / base.hip_circumference_mm;
  } else if (explicit.waist_circumference_mm !== undefined) {
    scaleHip = explicit.waist_circumference_mm / base.waist_circumference_mm;
  } else if (explicit.thigh_circumference_mm !== undefined) {
    scaleHip = explicit.thigh_circumference_mm / base.thigh_circumference_mm;
  }

  // Escala vertical / alturas
  let scaleVertical = 1.0;
  if (explicit.back_length_mm !== undefined) {
    scaleVertical = explicit.back_length_mm / base.back_length_mm;
  } else if (explicit.front_length_mm !== undefined) {
    scaleVertical = explicit.front_length_mm / base.front_length_mm;
  } else if (explicit.waist_to_floor_mm !== undefined) {
    scaleVertical = explicit.waist_to_floor_mm / base.waist_to_floor_mm;
  } else if (explicit.inseam_mm !== undefined) {
    scaleVertical = explicit.inseam_mm / base.inseam_mm;
  } else if (explicit.sleeve_length_mm !== undefined) {
    scaleVertical = explicit.sleeve_length_mm / base.sleeve_length_mm;
  } else if (explicit.waist_to_hip_mm !== undefined) {
    scaleVertical = explicit.waist_to_hip_mm / base.waist_to_hip_mm;
  } else if (explicit.skirt_length_mm !== undefined) {
    scaleVertical = explicit.skirt_length_mm / base.skirt_length_mm;
  } else {
    // Si no se proporcionaron medidas verticales, escala suavemente con el contorno de pecho
    scaleVertical = 1.0 + (scaleChest - 1.0) * 0.35;
  }

  // 3. Interpolación armónica y monotónica de todas las medidas
  const rawMeasurements: BodyMeasurements = {
    chest_circumference_mm:
      explicit.chest_circumference_mm ?? Math.round(base.chest_circumference_mm * scaleChest),
    waist_circumference_mm:
      explicit.waist_circumference_mm ?? Math.round(base.waist_circumference_mm * scaleWaist),
    hip_circumference_mm:
      explicit.hip_circumference_mm ?? Math.round(base.hip_circumference_mm * scaleHip),
    neck_circumference_mm:
      explicit.neck_circumference_mm ??
      Math.round(base.neck_circumference_mm * (1.0 + (scaleChest - 1.0) * 0.6)),
    shoulder_to_shoulder_mm:
      explicit.shoulder_to_shoulder_mm ??
      Math.round(base.shoulder_to_shoulder_mm * (1.0 + (scaleChest - 1.0) * 0.65)),
    shoulder_slope_deg: explicit.shoulder_slope_deg ?? base.shoulder_slope_deg,
    back_length_mm:
      explicit.back_length_mm ?? Math.round(base.back_length_mm * scaleVertical),
    front_length_mm:
      explicit.front_length_mm ??
      (explicit.back_length_mm !== undefined
        ? Math.round(
            explicit.back_length_mm * (base.front_length_mm / base.back_length_mm)
          )
        : Math.round(base.front_length_mm * scaleVertical)),
    sleeve_length_mm:
      explicit.sleeve_length_mm ??
      Math.round(
        base.sleeve_length_mm *
          (1.0 + (scaleVertical - 1.0) * 0.85 + (scaleChest - 1.0) * 0.15)
      ),
    bicep_circumference_mm:
      explicit.bicep_circumference_mm ??
      Math.round(base.bicep_circumference_mm * (1.0 + (scaleChest - 1.0) * 0.85)),
    wrist_circumference_mm:
      explicit.wrist_circumference_mm ??
      Math.round(base.wrist_circumference_mm * (1.0 + (scaleChest - 1.0) * 0.55)),
    head_circumference_mm:
      explicit.head_circumference_mm ??
      Math.round(base.head_circumference_mm * (1.0 + (scaleChest - 1.0) * 0.3)),
    waist_to_floor_mm:
      explicit.waist_to_floor_mm ?? Math.round(base.waist_to_floor_mm * scaleVertical),
    crotch_depth_mm:
      explicit.crotch_depth_mm ??
      Math.round(
        base.crotch_depth_mm *
          (1.0 + (scaleHip - 1.0) * 0.4 + (scaleVertical - 1.0) * 0.4)
      ),
    inseam_mm: explicit.inseam_mm ?? Math.round(base.inseam_mm * scaleVertical),
    thigh_circumference_mm:
      explicit.thigh_circumference_mm ??
      Math.round(base.thigh_circumference_mm * (1.0 + (scaleHip - 1.0) * 0.85)),
    knee_circumference_mm:
      explicit.knee_circumference_mm ??
      Math.round(base.knee_circumference_mm * (1.0 + (scaleHip - 1.0) * 0.6)),
    ankle_circumference_mm:
      explicit.ankle_circumference_mm ??
      Math.round(base.ankle_circumference_mm * (1.0 + (scaleHip - 1.0) * 0.45)),
    bust_span_mm:
      explicit.bust_span_mm ??
      Math.round(base.bust_span_mm * (1.0 + (scaleChest - 1.0) * 0.5)),
    underbust_circumference_mm:
      explicit.underbust_circumference_mm ??
      Math.round(base.underbust_circumference_mm * (1.0 + (scaleChest - 1.0) * 0.9)),
    waist_to_hip_mm:
      explicit.waist_to_hip_mm ?? Math.round(base.waist_to_hip_mm * scaleVertical),
    skirt_length_mm:
      explicit.skirt_length_mm ?? Math.round(base.skirt_length_mm * scaleVertical),
  };

  // 4. Clamping final de seguridad anatómica en todas las dimensiones
  const finalMeasurements: BodyMeasurements = {} as BodyMeasurements;
  for (const [k, v] of Object.entries(rawMeasurements)) {
    const key = k as keyof BodyMeasurements;
    finalMeasurements[key] = clampMeasurement(key, v);
  }

  return finalMeasurements;
}
