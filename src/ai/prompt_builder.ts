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

=============================================================================
HIGH-PRECISION MULTI-GARMENT VISUAL FEATURE EXTRACTION MATRIX (IMAGE ANALYSIS)
=============================================================================
When analyzing an inspiration image or reference garment photo, you MUST perform a meticulous 6-point anatomical inspection:

1. 📐 HEM GEOMETRY & LOWER BASELINE (DOBLADILLO / BAJO):
   - Inspect the bottom edge shape: Is it straight, curved shirt-tail, or DOUBLE-POINTED PEAKS?
   - For Waistcoats, Vests, Corsets, and Pirate / Sastrería Bodices with triangular downward points:
     MUST set 'hem': { 'type': 'pointed', 'drop_mm': 45-65, 'peak_drop_mm': 45-65, 'peak_position_ratio': 0.35-0.42 }.
   - For Classic Shirts: 'hem': { 'type': 'curved_tail', 'drop_mm': 30-45 }.
   - For T-Shirts / Boxy Tees: 'hem': { 'type': 'straight' }.
   - For Hoodies / Sweatshirts: 'hem': { 'type': 'ribbed', 'rib_height_mm': 50-70 }.

2. 🔘 CLOSURES, BUTTONS & FASTENERS (BOTONADURA Y CRUCE):
   - Count the EXACT number of visible buttons (e.g., 3, 4, 5, 6 buttons).
   - Check placket overlap: Does the front overlap by +20mm to +25mm?
   - Check inverted-V opening: On pointed vests, does the hem open below the bottom button?
   - MUST set 'closure': { 'type': 'buttons', 'button_count': N, 'overlap_mm': 20-25, 'button_diameter_mm': 18-24 }.

3. ✂️ NECKLINE, COLLARS & HOODS (ESCOTE Y CUELLO):
   - Measure depth visually: Crew neck (high), V-neck (shallow 80-110mm, medium 120-150mm, deep 160-220mm), Scoop, Sweetheart, Shirt collar with stand, Mao band, or Kimono band.

4. 🧥 SLEEVES & ARMHOLE SILHOUETTES (MANGAS Y SISAS):
   - Identify: Sleeveless ('sleeveless' with armhole facings), Set-in ('set_in'), Drop-shoulder ('drop_shoulder'), or Japanese Furisode square sleeve ('furisode_square').

5. 🧍 SILHOUETTE, FIT & DARTS (SILUETA Y ENTALLE):
   - Fitted / Tailored: Comfort ease +20-40mm, waist shaping.
   - Streetwear / Relaxed: Chest ease +120-220mm.
   - Dress / Skirt: A-line flare, straight pencil, or pleated accordion folds.

6. 🎨 TEXTILE WEAVE, TEXTURE & COLOR (TELA Y COLOR):
   - Identify fabric: Linen (lino), Denim (mezclilla), Cotton (algodón), Silk (seda), Leather (cuero), Wool (lana).
   - Extract RGB/Hex color factor and surface roughness.

=============================================================================

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
  "garment_category": "top | bottom | dress | set | kimono | haori (optional)",
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
      "type": "straight | curved_tail | pointed | split | ribbed | cropped | drawstring | asymmetric | flared | custom",
      "drop_mm": "number (optional)",
      "back_drop_mm": "number (optional)",
      "peak_drop_mm": "number (optional, 45-65mm for pointed vest hems)",
      "peak_position_ratio": "number (optional, 0.35-0.42)",
      "center_notch": "boolean (optional)",
      "split_height_mm": "number (optional)",
      "rib_height_mm": "number (optional)",
      "allowance_mm": "number (optional, default 25)"
    },
    "closure": {
      "type": "buttons | zipper | snaps | ties | wrap | pull_over | none",
      "button_count": "number (optional, e.g. 3, 4, 5, 6)",
      "overlap_mm": "number (optional, default 20)",
      "button_diameter_mm": "number (optional, default 20)",
      "buttonhole_orientation": "vertical | horizontal"
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
   * Genera el contexto estructural anatómico de la prenda base ancla FreeSewing
   * Ordena al modelo de lenguaje actuar como un MODIFICADOR PURO de dicha base.
   * @param blueprint Identificador del bloque base FreeSewing ('wahid', 'simon', 'brian', 'bella', 'paco', 'sandy', 'shin', o 'auto'/undefined)
   */
  public static buildBlueprintContext(blueprint?: string): string {
    if (!blueprint || blueprint.trim().length === 0) {
      return "";
    }

    const key = blueprint.toLowerCase().trim();
    if (key === "auto" || key === "none") {
      return "";
    }

    switch (key) {
      case "wahid":
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: WAHID (🦺 Chaleco Sastre / Cosplay Vest)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of the FreeSewing 'Wahid' sloper.\n` +
          `Anatomical Structure of Wahid:\n` +
          `- Front Torso: Tailored front panels with front button placket overlap (cruce de botones), deep V-neck and classic angled pointed hem peaks (bajo en pico triangular de chaleco / double pointed peaks).\n` +
          `- Back Torso: Fitted tailored back panel.\n` +
          `- Armholes & Sleeves: Sleeveless armholes with curved armhole facings (armhole_facing).\n` +
          `- Neckline & Facings: Deep V-neckline with interfaced front neckline facings (front_facing) and back neck facing.\n` +
          `- Closure: Front button placket with 3 to 6 buttons and buttonholes.\n` +
          `Admitted Modifications & Rules:\n` +
          `- Set 'base_block': 'menswear_torso_fitted' (or 'wahid' / 'vest_sloper').\n` +
          `- Set 'garment_category': 'top'.\n` +
          `- Set 'sleeves': { 'type': 'sleeveless' }.\n` +
          `- Set 'neckline': { 'type': 'v_neck', 'depth_mm': 90-160, 'width_mm': 25-45 }.\n` +
          `- Set 'hem': { 'type': 'pointed', 'drop_mm': 50, 'peak_drop_mm': 50, 'peak_position_ratio': 0.38 } (pointed vest front hem peaks).\n` +
          `- Set 'closure': { 'type': 'buttons', 'button_count': 3-6, 'overlap_mm': 20-30 }.\n` +
          `- Optional pockets: welt (bolsillo de ojal/ribete) or patch pockets.\n` +
          `Enforce this exact anatomical foundation in your output JSON.`
        );

      case "simon":
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: SIMON (👔 Camisa Clásica / Casual Shirt)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of the FreeSewing 'Simon' sloper.\n` +
          `Anatomical Structure of Simon:\n` +
          `- Front Torso: Front panels with full-length button placket (tapeta de botones).\n` +
          `- Back Torso: Back panel with shoulder yoke (canesú de espalda).\n` +
          `- Collar: Two-piece structured shirt collar with collar stand (pie de cuello) and collar leaf (pala de cuello).\n` +
          `- Sleeves: Set-in shirt sleeves with cuff placket (sardineta) and buttoned cuffs (puños).\n` +
          `- Hem: Curved shirt tail hem.\n` +
          `Admitted Modifications & Rules:\n` +
          `- Set 'base_block': 'menswear_torso' (or 'simon').\n` +
          `- Set 'garment_category': 'top'.\n` +
          `- Set 'neckline': { 'type': 'collar', 'collar_height_mm': 30-45 }.\n` +
          `- Set 'sleeves': { 'type': 'set_in', 'length_type': 'full', 'cuff_width_mm': 50-70 }.\n` +
          `- Set 'hem': { 'type': 'curved_tail', 'drop_mm': 25-45 }.\n` +
          `- Set 'closure': { 'type': 'buttons', 'button_count': 6-8, 'overlap_mm': 20-30 }.\n` +
          `- Optional pockets: patch chest pocket.\n` +
          `Enforce this exact anatomical foundation in your output JSON.`
        );

      case "brian":
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: BRIAN (👕 Camiseta / Hoodie / Streetwear Sweatshirt)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of the FreeSewing 'Brian' sloper.\n` +
          `Anatomical Structure of Brian:\n` +
          `- Torso: Relaxed, boxy, or oversized torso with generous chest ease (80-220mm).\n` +
          `- Sleeves: Drop shoulder or set-in sleeves with ribbed cuffs.\n` +
          `- Neckline & Hood: Crew neckline with rib neckband OR integrated crossover/standard hood (capucha cruzada o estándar).\n` +
          `- Hem & Pocket: Straight or ribbed hem with optional front kangaroo pocket (bolsillo canguro).\n` +
          `Admitted Modifications & Rules:\n` +
          `- Set 'base_block': 'menswear_torso_oversize' (or 'hoodie_sloper' / 'tshirt_sloper' / 'brian').\n` +
          `- Set 'garment_category': 'top'.\n` +
          `- Set 'ease': { 'chest_ease_mm': 100-220, 'bicep_ease_mm': 50-90 }.\n` +
          `- Set 'sleeves': { 'type': 'drop_shoulder' | 'set_in', 'drop_mm': 40-80, 'length_type': 'full' | 'short' }.\n` +
          `- Optional hood: { 'type': 'crossover' | 'standard', 'height_mm': 350-400 }.\n` +
          `- Optional pocket: { 'type': 'kangaroo' }.\n` +
          `Enforce this exact anatomical foundation in your output JSON.`
        );

      case "bella":
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: BELLA (👗 Corpiño / Top / Vestido Femenino)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of the FreeSewing 'Bella' sloper.\n` +
          `Anatomical Structure of Bella:\n` +
          `- Bodice: Fitted anatomical female bodice with bust darts and waist shaping darts (pinzas de busto y entalle).\n` +
          `- Neckline: Feminine necklines (sweetheart / escote corazón, scoop, v-neck, square).\n` +
          `- Garment Type: Fitted top, bodice, corset, or complete dress with coordinated skirt (A-line, pleated, flared).\n` +
          `Admitted Modifications & Rules:\n` +
          `- Set 'base_block': 'womenswear_torso_fitted' (or 'womenswear_bodice' / 'dress_sloper' / 'bella').\n` +
          `- Set 'garment_category': 'dress' or 'top'.\n` +
          `- Set 'ease': { 'chest_ease_mm': 20-50, 'waist_ease_mm': 15-40 }.\n` +
          `- Set 'neckline': { 'type': 'sweetheart' | 'scoop' | 'v_neck' | 'square' }.\n` +
          `- Optional dress details: 'dress_details': { 'silhouette': 'a_line' | 'straight' | 'pleated', 'skirt_length_mm': 400-900, 'waist_seam': true }.\n` +
          `Enforce this exact anatomical foundation in your output JSON.`
        );

      case "paco":
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: PACO (👖 Pantalón / Bermuda / Shorts)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of the FreeSewing 'Paco' sloper.\n` +
          `Anatomical Structure of Paco:\n` +
          `- Front Leg: Front trouser leg with front crotch curve and pocket openings.\n` +
          `- Back Leg: Back trouser leg with extended back crotch fork for anatomical fit.\n` +
          `- Waistband: Separate waistband (fitted with belt loops or elastic/drawstring).\n` +
          `- Hem: Hem with rolled cuffs (dobladillo vuelto), straight hem, or fringed.\n` +
          `Admitted Modifications & Rules:\n` +
          `- Set 'base_block': 'pants_sloper' (or 'paco').\n` +
          `- Set 'garment_category': 'bottom'.\n` +
          `- Set 'trouser_legs': { 'type': 'straight' | 'wide_baggy' | 'slim', 'length_type': 'shorts' | 'bermuda' | 'full', 'inseam_mm': 200-850 }.\n` +
          `- Set 'trouser_hem': { 'type': 'cuffed' | 'straight' | 'fringed_pirate' | 'raw', 'cuff_height_mm': 30-50 }.\n` +
          `- Set 'waistband': { 'type': 'fitted' | 'elastic', 'height_mm': 35-50 }.\n` +
          `- Optional pockets: 'trouser_pockets': jeans 5-pocket, slash, or cargo.\n` +
          `Enforce this exact anatomical foundation in your output JSON.`
        );

      case "sandy":
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: SANDY (🥻 Falda / Skirt)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of the FreeSewing 'Sandy' sloper.\n` +
          `Anatomical Structure of Sandy:\n` +
          `- Front Skirt: Front skirt panel with waist contouring.\n` +
          `- Back Skirt: Back skirt panel with waist darts and zipper opening.\n` +
          `- Waistband: Separate fitted waistband or internal waist facing.\n` +
          `- Silhouette: A-line / flared, straight / pencil, pleated, or circle.\n` +
          `Admitted Modifications & Rules:\n` +
          `- Set 'base_block': 'skirt_sloper' (or 'sandy').\n` +
          `- Set 'garment_category': 'bottom'.\n` +
          `- Set 'hem': { 'type': 'flared' | 'straight' | 'asymmetric', 'allowance_mm': 20-30 }.\n` +
          `- Set 'waistband': { 'type': 'fitted' | 'elastic', 'height_mm': 30-45 }.\n` +
          `Enforce this exact anatomical foundation in your output JSON.`
        );

      case "shin":
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: SHIN (👘 Kimono / Haori Anime)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of the FreeSewing 'Shin' sloper.\n` +
          `Anatomical Structure of Shin:\n` +
          `- Front Panels: Straight vertical front panels (maemigoro) with front overlap.\n` +
          `- Back Panel: Straight continuous back panel (ushiro migoro) without curved armholes.\n` +
          `- Sleeves: Traditional wide rectangular Furisode sleeves (sode).\n` +
          `- Collar: Continuous flat band collar / neckband (eri).\n` +
          `Admitted Modifications & Rules:\n` +
          `- Set 'base_block': 'haori_sloper' (or 'kimono_sloper' / 'shin').\n` +
          `- Set 'garment_category': 'haori' or 'kimono'.\n` +
          `- Set 'ease': { 'chest_ease_mm': 150-250, 'shoulder_ease_mm': 40-80 }.\n` +
          `- Set 'sleeves': { 'type': 'kimono', 'length_type': 'full' }.\n` +
          `- Set 'kimono_details': { 'sleeve_style': 'furisode_square', 'collar_width_mm': 50-80, 'obi_belt': true }.\n` +
          `Enforce this exact anatomical foundation in your output JSON.`
        );

      case "utility_vest":
      case "utility":
      case "outerwear":
      case "tactical_vest":
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: UTILITY VEST / OUTERWEAR (🦺 Chaleco Táctico / Safari / Cargo)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of a Tactical Utility Vest / Outerwear Jacket.\n` +
          `Anatomical Structure of Utility Vest:\n` +
          `- Front Torso: Straight-cut utility front panels with central zipper or snap placket, clean sleeveless armholes, and straight hem (bajo recto horizontal).\n` +
          `- Back Torso: Relaxed straight-cut back panel.\n` +
          `- Neckline & Collar: High stand/mandarin collar (cuello chimenea alzado) wrapping comfortably around the neck.\n` +
          `- Pockets: Multi-pocket 3D cargo setup with bellows (fuelle) and protective flaps (solapas con broches).\n` +
          `Admitted Modifications & Rules:\n` +
          `- Set 'base_block': 'menswear_torso' (or 'outerwear_jacket' / 'utility_vest').\n` +
          `- Set 'garment_category': 'top'.\n` +
          `- Set 'ease': { 'chest_ease_mm': 60-120 }.\n` +
          `- Set 'sleeves': { 'type': 'sleeveless' }.\n` +
          `- Set 'neckline': { 'type': 'stand_collar', 'collar_height_mm': 40-60 }.\n` +
          `- Set 'hem': { 'type': 'straight', 'allowance_mm': 25 }.\n` +
          `- Set 'closure': { 'type': 'zipper' | 'buttons', 'overlap_mm': 15-25 }.\n` +
          `- Set 'pocket': { 'type': 'cargo_bellows', 'width_mm': 120-160, 'height_mm': 140-180, 'bellows_depth_mm': 20-35, 'flap': true }.\n` +
          `Enforce this exact anatomical foundation in your output JSON.`
        );

      case "free":
      case "libre":
      case "creative":
        return (
          `\n\n[FREESEWING FREE BLUEPRINT: CREATIVE PARAMETRIC COMPOSITION (Composición Creativa Libre)]\n` +
          `You MUST act strictly as a PURE PARAMETRIC COMPOSER. You are NOT modifying a fixed sloper: you compose the garment freely from scratch with no anchor restrictions.\n` +
          `Composition Freedom:\n` +
          `- Choose ANY supported 'base_block' from the palette (menswear_torso_oversize, menswear_torso, womenswear_torso_fitted, womenswear_torso, womenswear_bodice, unisex_torso, tshirt_sloper, hoodie_sloper, dress_sloper, pants_sloper, skirt_sloper, kimono_sloper, haori_sloper, wahid, simon, brian, bella, paco, sandy, shin) and ANY 'garment_category' ('top' | 'bottom' | 'dress' | 'set' | 'kimono' | 'haori').\n` +
          `- Choose 'ease' freely within wide realistic textile ranges adapted to the intended silhouette, always inside the schema bounds (chest_ease_mm 0-500, bicep_ease_mm 0-300, waist_ease_mm 0-400, hip_ease_mm 0-400, shoulder_ease_mm 0-200).\n` +
          `- Compose with ALL implemented modifications: neckline (crew, v_neck, crossover_hood, hood, scoop, boat, high_neck, collar, stand_collar, shirt_collar_with_stand, mandarin, square, sweetheart, custom), sleeves (set_in, drop_shoulder, raglan, kimono, sleeveless, oversized, bishop, puff, custom), hem (straight, curved_tail, pointed, split, ribbed, cropped, drawstring, asymmetric, flared, custom), pocket (kangaroo, welt, patch, seam, cargo, cargo_bellows, flap, hidden, none, custom), hood (standard, crossover, ninja, oversized, three_piece, scuba, pointed, none, custom), waistband (elastic, fitted, drawstring, rib), closure (buttons, zipper, snaps, ties, none, custom), trouser_legs, trouser_hem, trouser_pockets, dress_details, kimono_details and technical collars.\n` +
          `Textile Coherence Rules (instead of restrictions):\n` +
          `- Anatomical coherence: set_in or drop_shoulder sleeves MUST match the armhole and shoulder ease (sleeve drop_mm 0-300); a hood MUST match the neckline it attaches to; a button closure MUST match a front placket overlap (closure overlap_mm 0-200); pocket placement MUST respect the garment silhouette.\n` +
          `- Piece coherence: all measurements MUST be mutually consistent and coherent with the selected size (sizing.size / height_mm / chest_circ_mm / waist_circ_mm / hip_circ_mm).\n` +
          `- Units: all measurements MUST be in millimeters (mm).\n` +
          `- HARD SCHEMA BOUNDARY (Zod): any value outside the PatternDna schema range is REJECTED and the generation FAILS. Keep every number strictly inside the schema bounds (e.g. chest_ease_mm 0-500, bicep_ease_mm 0-300, inseam_mm 100-1200, skirt_length_mm 100-2000, collar_height_mm 0-200, waistband height_mm 10-200, closure overlap_mm 0-200).\n` +
          `Enforce this creative parametric composition in your output JSON.`
        );

      default:
        return (
          `\n\n[FREESEWING BASE BLUEPRINT ANCHOR: ${key.toUpperCase()}]\n` +
          `You MUST act strictly as a PURE PARAMETRIC MODIFIER of the base block '${key}'. Enforce this sloper anatomy and set 'base_block': '${key}' in your output JSON.`
        );
    }
  }

  /**
   * Construye el prompt del usuario integrando la descripción, posibles referencias visuales y contexto de base ancla
   * @param userPrompt Descripción textual o requerimientos de la prenda
   * @param imagePath Ruta opcional a una imagen de referencia
   * @param blueprint Bloque base ancla FreeSewing seleccionado
   */
  public static buildUserPrompt(
    userPrompt: string,
    imagePath?: string,
    blueprint?: string
  ): string {
    let promptText = `Please generate the parametric pattern DNA (PatternDna) for the following garment concept:\n\n${userPrompt.trim()}`;

    if (imagePath && imagePath.trim().length > 0) {
      promptText += `\n\n[Visual Image Reference: ${imagePath.trim()}]\nAnalyze the garment silhouette, proportions, neckline, sleeve type, pockets, and hem style from the image reference and incorporate them into the parametric modifications.`;
    }

    const blueprintContext = this.buildBlueprintContext(blueprint);
    if (blueprintContext && blueprintContext.trim().length > 0) {
      promptText += blueprintContext;
    }

    promptText += `\n\nReturn strictly the JSON object.`;
    return promptText;
  }

  /**
   * Construye el prompt completo consolidado (System + User), ideal para interfaces CLI (Agy, OpenCode)
   * @param userPrompt Requerimientos del usuario
   * @param imagePath Ruta opcional a imagen de referencia
   * @param blueprint Bloque base ancla FreeSewing seleccionado
   */
  public static buildFullPrompt(
    userPrompt: string,
    imagePath?: string,
    blueprint?: string
  ): string {
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = this.buildUserPrompt(userPrompt, imagePath, blueprint);

    return `${systemPrompt}\n\n====================\nUSER REQUEST:\n${userMessage}`;
  }

  /**
   * Limpia la caché interna de reglas (útil para pruebas unitarias)
   */
  public static clearCache(): void {
    this.cachedRules = null;
  }
}
