/**
 * src/schema/pattern_schema.ts
 * Esquemas Zod y validadores para ADN Paramétrico de Moldería
 * pattern-ai-core
 */

import { z } from "zod";
import type { PatternDna } from "../types/pattern.js";

/**
 * Esquema de tallas estándar
 */
export const StandardSizeSchema = z.enum([
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
]);

/**
 * Esquema de holguras textiles (Ease) en mm con límites físicos de seguridad
 */
export const EaseSettingsSchema = z.object({
  chest_ease_mm: z
    .number()
    .min(0, "Chest ease (chest_ease_mm) cannot be negative")
    .max(500, "Chest ease exceeds realistic apparel threshold (max 500mm)")
    .optional()
    .default(0),
  bicep_ease_mm: z
    .number()
    .min(0, "Bicep ease cannot be negative")
    .max(300, "Bicep ease exceeds threshold (max 300mm)")
    .optional(),
  waist_ease_mm: z
    .number()
    .min(0, "Waist ease cannot be negative")
    .max(400, "Waist ease exceeds threshold (max 400mm)")
    .optional(),
  hip_ease_mm: z
    .number()
    .min(0, "Hip ease cannot be negative")
    .max(400, "Hip ease exceeds threshold (max 400mm)")
    .optional(),
  shoulder_ease_mm: z
    .number()
    .min(0, "Shoulder ease cannot be negative")
    .max(200, "Shoulder ease exceeds threshold (max 200mm)")
    .optional(),
  crotch_ease_mm: z
    .number()
    .min(0, "Crotch ease cannot be negative")
    .max(200, "Crotch ease exceeds threshold (max 200mm)")
    .optional(),
  thigh_ease_mm: z
    .number()
    .min(0, "Thigh ease cannot be negative")
    .max(300, "Thigh ease exceeds threshold (max 300mm)")
    .optional(),
  knee_ease_mm: z
    .number()
    .min(0, "Knee ease cannot be negative")
    .max(300, "Knee ease exceeds threshold (max 300mm)")
    .optional(),
  ankle_ease_mm: z
    .number()
    .min(0, "Ankle ease cannot be negative")
    .max(300, "Ankle ease exceeds threshold (max 300mm)")
    .optional(),
});

/**
 * Esquema de modificaciones de escote y cuello
 */
export const NecklineModSchema = z.object({
  type: z.enum(
    [
      "crew",
      "v_neck",
      "crossover_hood",
      "hood",
      "scoop",
      "boat",
      "high_neck",
      "collar",
      "square",
      "sweetheart",
      "custom",
    ],
    {
      errorMap: () => ({
        message: "Invalid neckline type",
      }),
    }
  ),
  depth_mm: z
    .number()
    .min(0, "Neckline depth cannot be negative")
    .max(400, "Neckline depth exceeds maximum limit (400mm)")
    .optional(),
  width_mm: z
    .number()
    .min(0, "Neckline width cannot be negative")
    .max(300, "Neckline width exceeds maximum limit (300mm)")
    .optional(),
  drop_mm: z
    .number()
    .min(0, "Neckline drop cannot be negative")
    .max(300, "Neckline drop exceeds maximum limit (300mm)")
    .optional(),
  band_height_mm: z
    .number()
    .min(0, "Band height cannot be negative")
    .max(150, "Band height exceeds maximum limit (150mm)")
    .optional(),
  collar_height_mm: z
    .number()
    .min(0, "Collar height cannot be negative")
    .max(200, "Collar height exceeds maximum limit (200mm)")
    .optional(),
});

/**
 * Esquema de modificaciones de manga
 */
export const SleeveModSchema = z.object({
  type: z.enum(
    [
      "set_in",
      "drop_shoulder",
      "raglan",
      "kimono",
      "sleeveless",
      "oversized",
      "bishop",
      "puff",
      "custom",
    ],
    {
      errorMap: () => ({
        message: "Invalid sleeve type",
      }),
    }
  ),
  drop_mm: z
    .number()
    .min(0, "Sleeve shoulder drop cannot be negative")
    .max(300, "Sleeve shoulder drop exceeds maximum limit (300mm)")
    .optional(),
  length_type: z
    .enum(["sleeveless", "short", "three_quarter", "full", "custom"])
    .optional(),
  length_mm: z
    .number()
    .min(0, "Sleeve length cannot be negative")
    .max(1200, "Sleeve length exceeds maximum limit (1200mm)")
    .optional(),
  bicep_ease_mm: z
    .number()
    .min(0, "Sleeve bicep ease cannot be negative")
    .max(300, "Sleeve bicep ease exceeds maximum limit (300mm)")
    .optional(),
  cuff_elastic: z.boolean().optional(),
  cuff_rib_mm: z
    .number()
    .min(0, "Cuff rib height cannot be negative")
    .max(200, "Cuff rib height exceeds maximum limit (200mm)")
    .optional(),
  cuff_width_mm: z
    .number()
    .min(0, "Cuff width cannot be negative")
    .max(500, "Cuff width exceeds maximum limit (500mm)")
    .optional(),
});

/**
 * Esquema de modificaciones de bajo / dobladillo
 */
export const HemModSchema = z.object({
  type: z.enum(
    [
      "straight",
      "curved_tail",
      "split",
      "ribbed",
      "cropped",
      "drawstring",
      "asymmetric",
      "flared",
      "custom",
    ],
    {
      errorMap: () => ({
        message: "Invalid hem type",
      }),
    }
  ),
  drop_mm: z
    .number()
    .min(0, "Hem drop cannot be negative")
    .max(350, "Hem drop exceeds maximum limit (350mm)")
    .optional(),
  back_drop_mm: z
    .number()
    .min(0, "Hem back drop cannot be negative")
    .max(350, "Hem back drop exceeds maximum limit (350mm)")
    .optional(),
  split_height_mm: z
    .number()
    .min(0, "Split height cannot be negative")
    .max(400, "Split height exceeds maximum limit (400mm)")
    .optional(),
  rib_height_mm: z
    .number()
    .min(0, "Rib height cannot be negative")
    .max(200, "Rib height exceeds maximum limit (200mm)")
    .optional(),
  allowance_mm: z
    .number()
    .min(5, "Hem allowance must be at least 5mm")
    .max(100, "Hem allowance exceeds maximum limit (100mm)")
    .optional(),
});

/**
 * Esquema de modificaciones de bolsillo
 */
export const PocketModSchema = z.object({
  type: z.enum(
    [
      "kangaroo",
      "welt",
      "patch",
      "seam",
      "cargo",
      "flap",
      "hidden",
      "none",
      "custom",
    ],
    {
      errorMap: () => ({
        message: "Invalid pocket type",
      }),
    }
  ),
  width_mm: z
    .number()
    .min(30, "Pocket width must be at least 30mm")
    .max(600, "Pocket width exceeds maximum limit (600mm)")
    .optional(),
  height_mm: z
    .number()
    .min(30, "Pocket height must be at least 30mm")
    .max(600, "Pocket height exceeds maximum limit (600mm)")
    .optional(),
  placement_y_mm: z
    .number()
    .min(0, "Pocket placement Y cannot be negative")
    .max(1000, "Pocket placement Y exceeds maximum limit")
    .optional(),
  placement_x_mm: z
    .number()
    .min(0, "Pocket placement X cannot be negative")
    .max(1000, "Pocket placement X exceeds maximum limit")
    .optional(),
  flap: z.boolean().optional(),
  zip: z.boolean().optional(),
});

/**
 * Esquema de modificaciones de capucha
 */
export const HoodModSchema = z.object({
  type: z.enum(
    [
      "standard",
      "crossover",
      "ninja",
      "oversized",
      "three_piece",
      "scuba",
      "pointed",
      "none",
      "custom",
    ],
    {
      errorMap: () => ({
        message: "Invalid hood type",
      }),
    }
  ),
  height_mm: z
    .number()
    .min(150, "Hood height must be at least 150mm")
    .max(700, "Hood height exceeds maximum limit (700mm)")
    .optional(),
  depth_mm: z
    .number()
    .min(100, "Hood depth must be at least 100mm")
    .max(600, "Hood depth exceeds maximum limit (600mm)")
    .optional(),
  overlap_mm: z
    .number()
    .min(0, "Hood overlap cannot be negative")
    .max(250, "Hood overlap exceeds maximum limit (250mm)")
    .optional(),
  center_panel_width_mm: z
    .number()
    .min(0, "Center panel width cannot be negative")
    .max(250, "Center panel width exceeds maximum limit (250mm)")
    .optional(),
  drawcord: z.boolean().optional(),
  eyelets: z.boolean().optional(),
});

/**
 * Esquema de modificaciones de pretina
 */
export const WaistbandModSchema = z.object({
  type: z.enum(["elastic", "fitted", "drawstring", "rib"], {
    errorMap: () => ({ message: "Invalid waistband type" }),
  }),
  height_mm: z
    .number()
    .min(10, "Waistband height must be at least 10mm")
    .max(200, "Waistband height exceeds maximum limit (200mm)")
    .optional(),
});

/**
 * Esquema de modificaciones de bajo / dobladillo de pantalón
 */
export const TrouserHemModSchema = z.object({
  type: z.enum(["straight", "cuffed", "elastic", "fringed_pirate", "raw"], {
    errorMap: () => ({ message: "Invalid trouser hem type" }),
  }),
  cuff_height_mm: z
    .number()
    .min(10, "Cuff height must be at least 10mm")
    .max(200, "Cuff height exceeds maximum limit (200mm)")
    .optional(),
});

/**
 * Esquema de modificaciones de pernera / silueta de pantalón
 */
export const TrouserLegsModSchema = z.object({
  type: z.enum(["straight", "wide_baggy", "slim", "flare", "tapered"], {
    errorMap: () => ({ message: "Invalid trouser legs type" }),
  }),
  length_type: z.enum(["full", "shorts", "bermuda", "cropped"]).optional(),
  inseam_mm: z
    .number()
    .min(100, "Inseam length must be at least 100mm")
    .max(1200, "Inseam length exceeds maximum limit (1200mm)")
    .optional(),
});

/**
 * Esquema de modificaciones de bolsillo de pantalón
 */
export const TrouserPocketModSchema = z.object({
  type: z.enum(["in_seam", "slash", "cargo", "patch_back"], {
    errorMap: () => ({ message: "Invalid trouser pocket type" }),
  }),
  count: z
    .number()
    .int("Pocket count must be an integer")
    .min(1, "Pocket count must be at least 1")
    .max(8, "Pocket count exceeds maximum limit (8)")
    .optional(),
  width_mm: z.number().min(30).max(400).optional(),
  height_mm: z.number().min(30).max(400).optional(),
  placement_y_mm: z.number().min(0).max(1200).optional(),
});

/**
 * Esquema de categoría de prenda
 */
export const GarmentCategorySchema = z.enum([
  "top",
  "bottom",
  "dress",
  "set",
  "kimono",
  "haori",
]);

/**
 * Esquema de detalles específicos de vestidos
 */
export const DressDetailsSchema = z.object({
  silhouette: z.enum(["a_line", "straight", "pleated"]).optional(),
  skirt_length_mm: z.number().min(100).max(2000).optional(),
  waist_seam: z.boolean().optional(),
});

/**
 * Esquema de detalles específicos de kimonos y haoris
 */
export const KimonoDetailsSchema = z.object({
  sleeve_style: z.enum(["furisode_square", "standard", "cropped"]).optional(),
  collar_width_mm: z.number().min(20).max(300).optional(),
  obi_belt: z.boolean().optional(),
});

/**
 * Esquema de configuración de estilo y tipología de pantalón / bermuda
 */
export const TrouserConfigSchema = z.object({
  style: z.string().optional(),
  length_mm: z.number().optional(),
  waist_height: z.string().optional(),
  fit_type: z.string().optional(),
  leg_opening_mm: z.number().optional(),
  pleats_count: z.number().optional(),
  has_cuff: z.boolean().optional(),
  cuff_height_mm: z.number().optional(),
  pocket_type: z.string().optional(),
  front_pocket_type: z.string().optional(),
  back_pocket_type: z.string().optional(),
});

/**
 * Esquema de tipos de cierre
 */
export const ClosureTypeSchema = z.enum(
  ["buttons", "zipper", "snaps", "ties", "none", "custom"],
  {
    errorMap: () => ({
      message: "Invalid closure type",
    }),
  }
);

/**
 * Esquema de modificaciones de cierre, botonadura y cruces
 */
export const ClosureModSchema = z.object({
  type: ClosureTypeSchema,
  overlap_mm: z
    .number()
    .min(0, "Closure overlap cannot be negative")
    .max(200, "Closure overlap exceeds maximum limit (200mm)")
    .optional(),
  button_count: z
    .number()
    .int("Button count must be an integer")
    .min(0, "Button count cannot be negative")
    .max(50, "Button count exceeds maximum limit (50)")
    .optional(),
  button_diameter_mm: z
    .number()
    .min(5, "Button diameter must be at least 5mm")
    .max(100, "Button diameter exceeds maximum limit (100mm)")
    .optional(),
  buttonhole_orientation: z.enum(["vertical", "horizontal"]).optional(),
  placement_y_mm: z.number().min(0).max(2000).optional(),
  zip_length_mm: z.number().min(0).max(2000).optional(),
});

/**
 * Esquema de árbol de modificaciones
 */
export const ModificationTreeSchema = z.object({
  neckline: NecklineModSchema.optional(),
  sleeves: SleeveModSchema.optional(),
  hem: HemModSchema.optional(),
  pocket: PocketModSchema.optional(),
  pockets: z.array(PocketModSchema).optional(),
  hood: HoodModSchema.optional(),
  waistband: WaistbandModSchema.optional(),
  trouser_hem: TrouserHemModSchema.optional(),
  trouser_legs: TrouserLegsModSchema.optional(),
  trouser_pockets: z.union([TrouserPocketModSchema, z.array(TrouserPocketModSchema)]).optional(),
  trouser: TrouserConfigSchema.optional(),
  dress_details: DressDetailsSchema.optional(),
  kimono_details: KimonoDetailsSchema.optional(),
  closure: ClosureModSchema.optional(),
  custom: z.record(z.unknown()).optional(),
});


/**
 * Esquema de validación para medidas corporales exactas / personalizadas
 */
export const CustomMeasurementsSchema = z.object({
  chest_circumference_mm: z
    .number()
    .min(500, "Chest circumference must be at least 500mm")
    .max(2500, "Chest circumference exceeds 2500mm")
    .optional(),
  waist_circumference_mm: z
    .number()
    .min(400, "Waist circumference must be at least 400mm")
    .max(2500, "Waist circumference exceeds 2500mm")
    .optional(),
  hip_circumference_mm: z
    .number()
    .min(500, "Hip circumference must be at least 500mm")
    .max(2500, "Hip circumference exceeds 2500mm")
    .optional(),
  neck_circumference_mm: z
    .number()
    .min(200, "Neck circumference must be at least 200mm")
    .max(800, "Neck circumference exceeds 800mm")
    .optional(),
  shoulder_to_shoulder_mm: z
    .number()
    .min(250, "Shoulder width must be at least 250mm")
    .max(900, "Shoulder width exceeds 900mm")
    .optional(),
  shoulder_slope_deg: z
    .number()
    .min(0, "Shoulder slope must be positive")
    .max(45, "Shoulder slope exceeds 45 degrees")
    .optional(),
  back_length_mm: z
    .number()
    .min(350, "Back length must be at least 350mm")
    .max(1300, "Back length exceeds 1300mm")
    .optional(),
  front_length_mm: z
    .number()
    .min(350, "Front length must be at least 350mm")
    .max(1350, "Front length exceeds 1350mm")
    .optional(),
  sleeve_length_mm: z
    .number()
    .min(300, "Sleeve length must be at least 300mm")
    .max(1100, "Sleeve length exceeds 1100mm")
    .optional(),
  bicep_circumference_mm: z
    .number()
    .min(150, "Bicep circumference must be at least 150mm")
    .max(750, "Bicep circumference exceeds 750mm")
    .optional(),
  wrist_circumference_mm: z
    .number()
    .min(100, "Wrist circumference must be at least 100mm")
    .max(400, "Wrist circumference exceeds 400mm")
    .optional(),
  head_circumference_mm: z
    .number()
    .min(350, "Head circumference must be at least 350mm")
    .max(850, "Head circumference exceeds 850mm")
    .optional(),
  waist_to_floor_mm: z
    .number()
    .min(500, "Waist to floor must be at least 500mm")
    .max(1800, "Waist to floor exceeds 1800mm")
    .optional(),
  crotch_depth_mm: z
    .number()
    .min(150, "Crotch depth must be at least 150mm")
    .max(600, "Crotch depth exceeds 600mm")
    .optional(),
  inseam_mm: z
    .number()
    .min(400, "Inseam must be at least 400mm")
    .max(1300, "Inseam exceeds 1300mm")
    .optional(),
  thigh_circumference_mm: z
    .number()
    .min(250, "Thigh circumference must be at least 250mm")
    .max(1300, "Thigh circumference exceeds 1300mm")
    .optional(),
  knee_circumference_mm: z
    .number()
    .min(200, "Knee circumference must be at least 200mm")
    .max(850, "Knee circumference exceeds 850mm")
    .optional(),
  ankle_circumference_mm: z
    .number()
    .min(120, "Ankle circumference must be at least 120mm")
    .max(550, "Ankle circumference exceeds 550mm")
    .optional(),
});

/**
 * Esquema de configuración de tallaje
 */
export const SizingSettingsSchema = z.object({
  size: StandardSizeSchema.default("M"),
  height_mm: z
    .number()
    .min(800, "Height must be at least 800mm")
    .max(2500, "Height exceeds 2500mm")
    .optional(),
  chest_circ_mm: z
    .number()
    .min(500, "Chest circumference must be at least 500mm")
    .max(2000, "Chest circumference exceeds 2000mm")
    .optional(),
  waist_circ_mm: z
    .number()
    .min(400, "Waist circumference must be at least 400mm")
    .max(2000, "Waist circumference exceeds 2000mm")
    .optional(),
  hip_circ_mm: z
    .number()
    .min(500, "Hip circumference must be at least 500mm")
    .max(2000, "Hip circumference exceeds 2000mm")
    .optional(),
  target_layers: z.array(StandardSizeSchema).optional(),
  custom_measurements: CustomMeasurementsSchema.optional(),
});

/**
 * Esquema de especificaciones técnicas y consumo
 */
export const TechSpecsSchema = z.object({
  notions: z.array(z.string()).default([]),
  estimated_fabric_meters: z
    .number({ required_error: "estimated_fabric_meters is required" })
    .min(0.05, "Fabric meters must be at least 0.05m")
    .max(50, "Fabric meters exceeds realistic garment threshold (max 50m)"),
  seam_allowance_mm: z
    .number()
    .min(0, "Seam allowance cannot be negative")
    .max(50, "Seam allowance exceeds standard threshold (max 50mm)")
    .default(10),
  hem_allowance_mm: z
    .number()
    .min(0, "Hem allowance cannot be negative")
    .max(100, "Hem allowance exceeds threshold (max 100mm)")
    .default(25),
  fabric_type: z.string().optional(),
  fabric_width_mm: z
    .number()
    .min(500, "Fabric width must be at least 500mm")
    .max(3000, "Fabric width exceeds 3000mm")
    .default(1500),
});

/**
 * Esquema de especificación detallada de tejido / tela
 */
export const FabricSpecSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  width_mm: z.number().min(500).max(3000).optional(),
  weight_gsm: z.number().min(30).max(1000).optional(),
  color: z.string().optional(),
  composition: z.string().optional(),
  estimated_meters: z.number().min(0.05).max(50).optional(),
});

/**
 * Esquema de sub-prendas coordinadas para conjuntos de 2 piezas
 */
export const SubGarmentsSchema: z.ZodType<any> = z.object({
  top: z.lazy(() => PatternDnaSchema).optional(),
  bottom: z.lazy(() => PatternDnaSchema).optional(),
});

/**
 * Esquema alternativo de configuración multi-pieza
 */
export const MultiPieceConfigSchema: z.ZodType<any> = z.object({
  top_dna: z.lazy(() => PatternDnaSchema).optional(),
  bottom_dna: z.lazy(() => PatternDnaSchema).optional(),
});

/**
 * Esquema de desglose de telas (principal y secundaria)
 */
export const FabricDetailsSchema = z
  .object({
    main_fabric: FabricSpecSchema.optional(),
    secondary_fabric: FabricSpecSchema.optional(),
  })
  .catchall(FabricSpecSchema);

/**
 * Esquema maestro para el ADN Paramétrico (PatternDna)
 */
export const PatternDnaSchema: z.ZodType<any> = z.object({
  concept_name: z
    .string({ required_error: "concept_name is required" })
    .min(2, "concept_name must be at least 2 characters")
    .max(120, "concept_name cannot exceed 120 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "concept_name must contain only alphanumeric characters, underscores or hyphens"
    ),
  description: z.string().max(1000).optional(),
  garment_category: GarmentCategorySchema.optional(),
  base_block: z
    .string({ required_error: "base_block is required" })
    .min(2, "base_block is required"),
  ease: EaseSettingsSchema,
  modifications: ModificationTreeSchema.default({}),
  dress_details: DressDetailsSchema.optional(),
  kimono_details: KimonoDetailsSchema.optional(),
  sizing: SizingSettingsSchema.optional(),
  custom_measurements: CustomMeasurementsSchema.optional(),
  tech_specs: TechSpecsSchema.optional(),
  notions: z.array(z.string()).optional(),
  estimated_fabric_meters: z
    .number()
    .min(0.05, "Fabric meters must be at least 0.05m")
    .max(50, "Fabric meters exceeds realistic garment threshold (max 50m)")
    .optional(),
  sub_garments: z.lazy(() => SubGarmentsSchema).optional(),
  multi_piece_config: z.lazy(() => MultiPieceConfigSchema).optional(),
  fabric_details: FabricDetailsSchema.optional(),
});


/**
 * Valida un objeto desconocido contra el esquema PatternDnaSchema
 * @param input Objeto a validar
 * @returns PatternDna tipado y validado
 */
export function parsePatternDna(input: unknown): PatternDna {
  return PatternDnaSchema.parse(input) as PatternDna;
}

/**
 * Extrae y limpia el bloque JSON contenido dentro de una respuesta cruda de LLM
 * (Soporta bloques markdown ```json ... ```, preámbulos conversacionales y espacios envolventes)
 * @param rawOutput Texto crudo devuelto por el LLM
 * @returns Cadena de texto JSON limpia
 */
export function extractJsonFromText(rawOutput: string): string {
  if (typeof rawOutput !== "string" || rawOutput.trim().length === 0) {
    throw new Error("Input to sanitizeAndParseLlmJson must be a non-empty string");
  }

  let text = rawOutput.trim();

  // 0. Eliminar etiquetas de razonamiento / pensamiento (<think>...</think>) de DeepSeek R1 / Reasoning models
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 1. Extraer contenido de bloques de código markdown si existen
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  const codeBlockMatches = Array.from(text.matchAll(codeBlockRegex));

  if (codeBlockMatches.length > 0) {
    for (const match of codeBlockMatches) {
      const candidate = match[1].trim();
      if (candidate.includes("{") && candidate.includes("}")) {
        text = candidate;
        break;
      }
    }
  }

  // 2. Extraer el objeto JSON delimitado por el primer '{' y el último '}'
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No valid JSON object structure found in LLM output");
  }

  return text.substring(firstBrace, lastBrace + 1).trim();
}

/**
 * Desinfecta texto crudo de LLM, extrae el JSON y valida la estructura de ADN Paramétrico
 * @param rawOutput Respuesta de LLM con posible markdown o texto envolvente
 * @returns PatternDna tipado y validado
 */
export function sanitizeAndParseLlmJson(rawOutput: string): PatternDna {
  const jsonString = extractJsonFromText(rawOutput);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(
      `Failed to parse sanitized JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return parsePatternDna(parsed);
}
