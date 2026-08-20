/**
 * src/ai/prompt_builder.ts
 * Generador de prompts contextuales e inyector de reglas de patronaje paramétrico
 * pattern-ai-core
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reglas de patronaje integradas de respaldo en caso de que el archivo rules_pattern_making.md no esté accesible
 */
const FALLBACK_RULES = `
# Reglas Técnicas de Patronaje y Moldería Paramétrica (Fallback)

1. Principio Fundamental:
- La IA nunca genera código SVG directo ni curvas Bezier flotantes.
- La IA genera exclusivamente un JSON paramétrico (PatternDna) que modifica bloques base de FreeSewing v3.
- Todas las medidas deben estar en milímetros (mm).

2. Jerarquía de Holguras (Ease):
- Holgura de Confort: +20mm a +40mm sobre contornos netos corporales.
- Holgura de Diseño / Streetwear: +120mm a +250mm de holgura total de pecho (chest_ease_mm).

3. Cuadro de Calibración:
- Todo patrón paginado incluye cuadro de calibración de 100mm x 100mm en Página 1.

4. Marcas Técnicas:
- Dirección de hilo de tela (Grainline) en 100% de piezas.
- Piquetes (Notches): 1 en delantero, 2 en espalda, 1 en hombro.
- Margen de costura estándar: 10mm. Dobladillo: 25mm a 30mm.

5. Blindaje Legal:
- Nombres de concepto estrictamente descriptivos (alfanuméricos con guiones bajos o medios, sin marcas registradas).
`;

/**
 * Constructor de prompts para modelos de lenguaje
 */
export class PromptBuilder {
  private static cachedRules: string | null = null;

  /**
   * Carga las reglas técnicas de patronaje desde rules_pattern_making.md con fallback seguro
   */
  public static loadRules(): string {
    if (this.cachedRules) {
      return this.cachedRules;
    }

    const candidatePaths: string[] = [];

    // 1. Directorio actual de ejecución
    candidatePaths.push(path.resolve(process.cwd(), "rules_pattern_making.md"));

    // 2. Directorio relativo al archivo fuente/dist
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      candidatePaths.push(path.resolve(currentDir, "../../rules_pattern_making.md"));
      candidatePaths.push(path.resolve(currentDir, "../rules_pattern_making.md"));
    } catch {
      // Ignorar si no se puede resolver fileURLToPath en entornos no estándar
    }

    for (const filePath of candidatePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8").trim();
          if (content.length > 0) {
            this.cachedRules = content;
            return this.cachedRules;
          }
        }
      } catch {
        // Continuar con el siguiente candidato
      }
    }

    this.cachedRules = FALLBACK_RULES.trim();
    return this.cachedRules;
  }

  /**
   * Construye el prompt del sistema (System Prompt) con todas las directrices de patronaje y formato JSON
   */
  public static buildSystemPrompt(): string {
    const rules = this.loadRules();

    return `You are a master technical fashion designer and pattern maker. Be direct and concise in your technical reasoning, and output the final parametric pattern DNA strictly as a valid JSON object matching the schema.
You are the Master Patternmaking & Apparel Engineering AI for 'pattern-ai-core'.
Your mission is to analyze fashion concepts, garment descriptions, and visual silhouettes, and translate them into an exact Parametric Pattern DNA (PatternDna) JSON structure for the FreeSewing v3 geometric engine.

CRITICAL INSTRUCTIONS:
1. OUTPUT FORMAT: You MUST return ONLY a valid, single JSON object conforming strictly to the PatternDna schema. Do NOT include extraneous conversational filler before or after the JSON.
2. NO FREE-FORM VECTOR SVG: You NEVER output raw SVG paths or arbitrary bezier curves. All geometries are derived mathematically by the geometric engine from your parametric specifications.
3. UNITS: All physical lengths, dimensions, and ease values MUST be in millimeters (mm).
4. CONCEPT NAME: 'concept_name' MUST contain ONLY alphanumeric characters, underscores, or hyphens (regex: /^[a-zA-Z0-9_-]+$/). No spaces or special characters allowed.
5. LEGAL TRADEMARK SHIELDING: Use purely descriptive silhouette names (e.g., 'water_priestess_robe', 'shinobi_tactical_vest', 'oversize_anime_hoodie'). NEVER use protected franchise names or direct character trademarks.

BASE BLOCKS AVAILABLE ('base_block'):
- 'menswear_torso_oversize': Oversized hoodies, streetwear jackets, boxy tops, dropped shoulders.
- 'menswear_torso': Regular/fitted menswear shirts and tees.
- 'womenswear_torso_fitted': Fitted women's garments, corsets, tailored tops.
- 'womenswear_torso': Standard women's tops and blouses.
- 'unisex_torso': Standard unisex garments.
- 'tshirt_sloper': Crew and v-neck t-shirts.
- 'hoodie_sloper': Classic fitted/regular hoodies.
- 'dress_sloper': Dresses, long robes, kimonos.
- 'pants_sloper': Trousers, joggers, cargo pants.
- 'skirt_sloper': Skirts.

JSON SCHEMA STRUCTURE (PatternDna):
{
  "concept_name": "string (required, /^[a-zA-Z0-9_-]+$/)",
  "description": "string (optional)",
  "base_block": "string (required, see available base blocks)",
  "ease": {
    "chest_ease_mm": "number (required, 0-500 mm. Comfort: 20-40mm, Oversize/Streetwear: 120-250mm)",
    "bicep_ease_mm": "number (optional, 0-300 mm)",
    "waist_ease_mm": "number (optional, 0-400 mm)",
    "hip_ease_mm": "number (optional, 0-400 mm)",
    "shoulder_ease_mm": "number (optional, 0-200 mm)"
  },
  "modifications": {
    "neckline": {
      "type": "crew | v_neck | crossover_hood | hood | scoop | boat | high_neck | collar | square | sweetheart | custom",
      "depth_mm": "number (optional)",
      "width_mm": "number (optional)",
      "drop_mm": "number (optional)",
      "band_height_mm": "number (optional)",
      "collar_height_mm": "number (optional)"
    },
    "sleeves": {
      "type": "set_in | drop_shoulder | raglan | kimono | sleeveless | oversized | bishop | puff | custom",
      "drop_mm": "number (optional, e.g. 40-100mm for drop_shoulder)",
      "length_type": "sleeveless | short | three_quarter | full | custom",
      "length_mm": "number (optional)",
      "bicep_ease_mm": "number (optional)",
      "cuff_elastic": "boolean (optional)",
      "cuff_rib_mm": "number (optional)",
      "cuff_width_mm": "number (optional)"
    },
    "hem": {
      "type": "straight | curved_tail | split | ribbed | cropped | drawstring | asymmetric | flared | custom",
      "drop_mm": "number (optional)",
      "back_drop_mm": "number (optional)",
      "split_height_mm": "number (optional)",
      "rib_height_mm": "number (optional)",
      "allowance_mm": "number (optional, default 25)"
    },
    "pocket": {
      "type": "kangaroo | welt | patch | seam | cargo | flap | hidden | none | custom",
      "width_mm": "number (optional)",
      "height_mm": "number (optional)",
      "placement_y_mm": "number (optional)",
      "placement_x_mm": "number (optional)",
      "flap": "boolean (optional)",
      "zip": "boolean (optional)"
    },
    "hood": {
      "type": "standard | crossover | ninja | oversized | three_piece | scuba | pointed | none | custom",
      "height_mm": "number (optional)",
      "depth_mm": "number (optional)",
      "overlap_mm": "number (optional)",
      "center_panel_width_mm": "number (optional)",
      "drawcord": "boolean (optional)",
      "eyelets": "boolean (optional)"
    }
  },
  "sizing": {
    "size": "XS | S | M | L | XL | 2XL | 3XL (default 'M')",
    "height_mm": "number (optional)",
    "chest_circ_mm": "number (optional)",
    "waist_circ_mm": "number (optional)",
    "hip_circ_mm": "number (optional)",
    "target_layers": ["XS", "S", "M", "L", "XL", "2XL", "3XL"] (optional)
  },
  "tech_specs": {
    "notions": ["string array"],
    "estimated_fabric_meters": "number (required, 0.05-50 m)",
    "seam_allowance_mm": "number (default 10)",
    "hem_allowance_mm": "number (default 25)",
    "fabric_type": "string (optional)",
    "fabric_width_mm": "number (default 1500)"
  },
  "notions": ["string array (optional)"],
  "estimated_fabric_meters": "number (optional)"
}

TEXTILE PATTERNMAKING RULES & STANDARDS:
${rules}
`.trim();
  }

  /**
   * Construye el prompt del usuario integrando la descripción y posibles referencias visuales
   * @param userPrompt Descripción textual o requerimientos de la prenda
   * @param imagePath Ruta opcional a una imagen de referencia
   */
  public static buildUserPrompt(userPrompt: string, imagePath?: string): string {
    let promptText = `Please generate the parametric pattern DNA (PatternDna) for the following garment concept:\n\n${userPrompt.trim()}`;

    if (imagePath && imagePath.trim().length > 0) {
      promptText += `\n\n[Visual Image Reference: ${imagePath.trim()}]\nAnalyze the garment silhouette, proportions, neckline, sleeve type, pockets, and hem style from the image reference and incorporate them into the parametric modifications.`;
    }

    promptText += `\n\nReturn strictly the JSON object.`;
    return promptText;
  }

  /**
   * Construye el prompt completo consolidado (System + User), ideal para interfaces CLI (Agy, OpenCode)
   * @param userPrompt Requerimientos del usuario
   * @param imagePath Ruta opcional a imagen de referencia
   */
  public static buildFullPrompt(userPrompt: string, imagePath?: string): string {
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = this.buildUserPrompt(userPrompt, imagePath);

    return `${systemPrompt}\n\n====================\nUSER REQUEST:\n${userMessage}`;
  }

  /**
   * Limpia la caché interna de reglas (útil para pruebas unitarias)
   */
  public static clearCache(): void {
    this.cachedRules = null;
  }
}
