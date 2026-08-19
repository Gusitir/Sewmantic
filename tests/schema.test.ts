/**
 * tests/schema.test.ts
 * Suite de pruebas unitarias para validación de ADN Paramétrico y desinfección de LLM JSON
 * pattern-ai-core
 */

import { describe, it, expect } from "vitest";
import {
  parsePatternDna,
  sanitizeAndParseLlmJson,
  extractJsonFromText,
  PatternDnaSchema,
  EaseSettingsSchema,
  NecklineModSchema,
  SleeveModSchema,
  HemModSchema,
  PocketModSchema,
  HoodModSchema,
  WaistbandModSchema,
  TrouserHemModSchema,
  TrouserLegsModSchema,
  TrouserPocketModSchema,
  GarmentCategorySchema,
  StandardSizeSchema,
} from "../src/schema/pattern_schema.js";
import type { PatternDna, StandardSize } from "../src/types/pattern.js";

describe("PatternDna Zod Schema & Validators", () => {
  describe("1. Casos Válidos (Happy Paths)", () => {
    it("debe validar un hoodie oversize estilo streetwear con todas sus especificaciones", () => {
      const hoodieDna = {
        concept_name: "water_priestess_hoodie",
        description: "Streetwear anime-inspired oversized crossover hoodie",
        base_block: "menswear_torso_oversize",
        ease: {
          chest_ease_mm: 140,
          bicep_ease_mm: 60,
          waist_ease_mm: 120,
          hip_ease_mm: 100,
        },
        modifications: {
          neckline: {
            type: "crossover_hood",
            depth_mm: 40,
            width_mm: 30,
          },
          sleeves: {
            type: "drop_shoulder",
            drop_mm: 60,
            length_type: "full",
            cuff_elastic: true,
            cuff_rib_mm: 50,
          },
          hem: {
            type: "curved_tail",
            drop_mm: 35,
            back_drop_mm: 45,
            rib_height_mm: 60,
          },
          pocket: {
            type: "kangaroo",
            width_mm: 320,
            height_mm: 220,
            placement_y_mm: 350,
          },
          hood: {
            type: "crossover",
            height_mm: 380,
            depth_mm: 280,
            overlap_mm: 35,
            drawcord: true,
            eyelets: true,
          },
        },
        notions: [
          "1x cordón 120cm",
          "2x ojetes metálicos 8mm",
          "30cm elástico puños",
        ],
        estimated_fabric_meters: 1.85,
      };

      const result = parsePatternDna(hoodieDna);
      expect(result.concept_name).toBe("water_priestess_hoodie");
      expect(result.base_block).toBe("menswear_torso_oversize");
      expect(result.ease.chest_ease_mm).toBe(140);
      expect(result.modifications.sleeves?.type).toBe("drop_shoulder");
      expect(result.modifications.hood?.type).toBe("crossover");
      expect(result.estimated_fabric_meters).toBe(1.85);
    });

    it("debe validar una camiseta regular con holguras de confort estándar", () => {
      const tshirtDna: PatternDna = {
        concept_name: "classic_crew_tee",
        base_block: "tshirt_sloper",
        ease: {
          chest_ease_mm: 30, // Confort base
          bicep_ease_mm: 25,
        },
        modifications: {
          neckline: {
            type: "crew",
            depth_mm: 20,
            band_height_mm: 25,
          },
          sleeves: {
            type: "set_in",
            length_type: "short",
            length_mm: 220,
          },
          hem: {
            type: "straight",
            allowance_mm: 25,
          },
        },
        sizing: {
          size: "L",
          chest_circ_mm: 1040,
        },
      };

      const result = parsePatternDna(tshirtDna);
      expect(result.concept_name).toBe("classic_crew_tee");
      expect(result.ease.chest_ease_mm).toBe(30);
      expect(result.modifications.neckline?.type).toBe("crew");
      expect(result.sizing?.size).toBe("L");
    });

    it("debe validar un vestido anime/cosplay con capucha cruzada y ficha técnica completa", () => {
      const dressDna = {
        concept_name: "priestess_crossover_robe_dress",
        description: "Anime water goddess ceremonial robe dress",
        base_block: "dress_sloper",
        ease: {
          chest_ease_mm: 50,
          waist_ease_mm: 40,
          hip_ease_mm: 80,
        },
        modifications: {
          neckline: {
            type: "crossover_hood",
            depth_mm: 60,
          },
          sleeves: {
            type: "kimono",
            length_type: "full",
            length_mm: 650,
          },
          hem: {
            type: "flared",
            drop_mm: 150,
          },
          hood: {
            type: "oversized",
            height_mm: 420,
            depth_mm: 320,
          },
        },
        sizing: {
          size: "M",
          height_mm: 1680,
          target_layers: ["S", "M", "L"],
        },
        tech_specs: {
          notions: ["1x cremallera invisible 50cm", "hilo poliester 100%"],
          estimated_fabric_meters: 3.4,
          seam_allowance_mm: 10,
          hem_allowance_mm: 30,
          fabric_type: "satin_crepe",
          fabric_width_mm: 1500,
        },
      };

      const result = parsePatternDna(dressDna);
      expect(result.concept_name).toBe("priestess_crossover_robe_dress");
      expect(result.tech_specs?.fabric_type).toBe("satin_crepe");
      expect(result.tech_specs?.seam_allowance_mm).toBe(10);
      expect(result.sizing?.target_layers).toEqual(["S", "M", "L"]);
    });

    it("debe aceptar todas las tallas estándar del enum StandardSize", () => {
      const sizes: StandardSize[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
      sizes.forEach((size) => {
        const parsed = StandardSizeSchema.parse(size);
        expect(parsed).toBe(size);
      });
    });

    it("debe validar un ADN de bermuda pirata de Luffy con bajo deshilachado y pretina con cordón", () => {
      const luffyPirateDna = {
        concept_name: "luffy_pirate_shorts",
        description: "Bermuda pirata anime de Luffy con dobladillo de flecos y pretina con cordon",
        garment_category: "bottom",
        base_block: "bermuda_sloper",
        ease: {
          waist_ease_mm: 30,
          hip_ease_mm: 50,
          crotch_ease_mm: 20,
          knee_ease_mm: 70,
        },
        modifications: {
          waistband: {
            type: "drawstring",
            height_mm: 45,
          },
          trouser_hem: {
            type: "fringed_pirate",
            cuff_height_mm: 35,
          },
          trouser_legs: {
            type: "wide_baggy",
            length_type: "bermuda",
            inseam_mm: 320,
          },
          trouser_pockets: {
            type: "slash",
            count: 2,
          },
        },
        tech_specs: {
          notions: ["1x cordon de algodon crudo 120cm", "2x ojetes metalicos"],
          estimated_fabric_meters: 1.2,
          seam_allowance_mm: 10,
          hem_allowance_mm: 20,
          fabric_type: "denim_washed",
        },
      };

      const result = parsePatternDna(luffyPirateDna);
      expect(result.concept_name).toBe("luffy_pirate_shorts");
      expect(result.garment_category).toBe("bottom");
      expect(result.base_block).toBe("bermuda_sloper");
      expect(result.modifications.trouser_hem?.type).toBe("fringed_pirate");
      expect(result.modifications.waistband?.type).toBe("drawstring");
      expect(result.modifications.trouser_legs?.type).toBe("wide_baggy");
    });

    it("debe validar un pantalón cargo streetwear con bolsillos fuelle y pretina elástica", () => {
      const cargoDna = {
        concept_name: "streetwear_baggy_cargo",
        garment_category: "bottom",
        base_block: "pants_sloper",
        ease: {
          waist_ease_mm: 60,
          hip_ease_mm: 90,
          crotch_ease_mm: 30,
          thigh_ease_mm: 80,
          knee_ease_mm: 120,
          ankle_ease_mm: 100,
        },
        modifications: {
          waistband: {
            type: "elastic",
            height_mm: 50,
          },
          trouser_legs: {
            type: "wide_baggy",
            length_type: "full",
            inseam_mm: 780,
          },
          trouser_pockets: [
            {
              type: "cargo",
              count: 2,
              width_mm: 180,
              height_mm: 210,
              placement_y_mm: 420,
            },
          ],
          trouser_hem: {
            type: "elastic",
            cuff_height_mm: 30,
          },
        },
        tech_specs: {
          notions: ["elastico 40mm para cintura", "velcro para tapas de bolsillo"],
          estimated_fabric_meters: 2.1,
          seam_allowance_mm: 10,
          hem_allowance_mm: 25,
        },
      };

      const result = parsePatternDna(cargoDna);
      expect(result.concept_name).toBe("streetwear_baggy_cargo");
      expect(result.ease.waist_ease_mm).toBe(60);
      expect(result.modifications.waistband?.type).toBe("elastic");
    });

    it("debe validar un pantalón sastre recto con pretina fitted y bolsillos traseros", () => {
      const tailoredDna = {
        concept_name: "tailored_straight_trousers",
        garment_category: "bottom",
        base_block: "trousers_sloper",
        ease: {
          waist_ease_mm: 20,
          hip_ease_mm: 35,
          crotch_ease_mm: 15,
        },
        modifications: {
          waistband: {
            type: "fitted",
            height_mm: 35,
          },
          trouser_legs: {
            type: "straight",
            length_type: "full",
          },
          trouser_hem: {
            type: "cuffed",
            cuff_height_mm: 40,
          },
          trouser_pockets: {
            type: "patch_back",
            count: 2,
            width_mm: 140,
            height_mm: 150,
          },
        },
        tech_specs: {
          notions: ["1x cremallera pantalon 18cm", "1x boton sastre"],
          estimated_fabric_meters: 1.6,
          seam_allowance_mm: 10,
          hem_allowance_mm: 40,
        },
      };

      const result = parsePatternDna(tailoredDna);
      expect(result.concept_name).toBe("tailored_straight_trousers");
      expect(result.modifications.trouser_hem?.type).toBe("cuffed");
      expect(result.modifications.trouser_legs?.type).toBe("straight");
    });
  });

  describe("2. Desinfección de Markdown y Extracción LLM", () => {
    const validJsonSample = JSON.stringify({
      concept_name: "cyberpunk_shinobi_vest",
      base_block: "menswear_torso_oversize",
      ease: {
        chest_ease_mm: 100,
      },
      modifications: {
        sleeves: {
          type: "sleeveless",
        },
        hem: {
          type: "straight",
        },
      },
      notions: ["2x cremallera 20cm", "cinta reflectante 2m"],
      estimated_fabric_meters: 1.2,
    });

    it("debe parsear JSON puro sin formato markdown", () => {
      const result = sanitizeAndParseLlmJson(validJsonSample);
      expect(result.concept_name).toBe("cyberpunk_shinobi_vest");
      expect(result.ease.chest_ease_mm).toBe(100);
    });

    it("debe desinfectar bloques con ```json ... ``` y saltos de línea", () => {
      const rawOutput = `\`\`\`json\n${validJsonSample}\n\`\`\``;
      const result = sanitizeAndParseLlmJson(rawOutput);
      expect(result.concept_name).toBe("cyberpunk_shinobi_vest");
    });

    it("debe desinfectar bloques ``` ... ``` sin identificador de lenguaje", () => {
      const rawOutput = `\`\`\`\n${validJsonSample}\n\`\`\``;
      const result = sanitizeAndParseLlmJson(rawOutput);
      expect(result.concept_name).toBe("cyberpunk_shinobi_vest");
    });

    it("debe limpiar preámbulo conversacional y texto posterior generado por LLMs", () => {
      const rawOutput = `
¡Hola! Aquí tienes el ADN paramétrico para la prenda solicitada:

\`\`\`json
${validJsonSample}
\`\`\`

Espero que este patrón sea perfecto para tu confección. ¡Avisa si requieres ajustes!
`;
      const result = sanitizeAndParseLlmJson(rawOutput);
      expect(result.concept_name).toBe("cyberpunk_shinobi_vest");
      expect(result.modifications.sleeves?.type).toBe("sleeveless");
    });

    it("debe extraer JSON rodeado de texto sin bloques de código markdown", () => {
      const rawOutput = `El resultado del análisis geométrico es: ${validJsonSample} verificado exitosamente.`;
      const result = sanitizeAndParseLlmJson(rawOutput);
      expect(result.concept_name).toBe("cyberpunk_shinobi_vest");
    });

    it("extractJsonFromText debe lanzar error claro si el texto no tiene objeto JSON", () => {
      expect(() => extractJsonFromText("Solo texto sin ningun json")).toThrow(
        "No valid JSON object structure found in LLM output"
      );
    });

    it("sanitizeAndParseLlmJson debe fallar si se pasa un string vacío o no-string", () => {
      expect(() => sanitizeAndParseLlmJson("")).toThrow(
        "Input to sanitizeAndParseLlmJson must be a non-empty string"
      );
      // @ts-expect-error testing invalid runtime input
      expect(() => sanitizeAndParseLlmJson(null)).toThrow(
        "Input to sanitizeAndParseLlmJson must be a non-empty string"
      );
    });

    it("sanitizeAndParseLlmJson debe fallar si el JSON está sintácticamente corrupto", () => {
      const brokenSyntaxJson = "```json\n{ concept_name: 'broken', base_block: invalid }\n```";
      expect(() => sanitizeAndParseLlmJson(brokenSyntaxJson)).toThrow(
        /Failed to parse sanitized JSON/
      );
    });

    it("sanitizeAndParseLlmJson debe fallar si el bloque JSON no está cerrado", () => {
      const unclosedJson = "```json\n{ concept_name: 'broken', base_block: \n```";
      expect(() => sanitizeAndParseLlmJson(unclosedJson)).toThrow(
        /No valid JSON object structure found/
      );
    });
  });

  describe("3. Casos Límites y Restricciones Numéricas Textiles", () => {
    it("debe aceptar holgura de pecho mínima en límite 0mm (segunda piel)", () => {
      const zeroEase = EaseSettingsSchema.parse({ chest_ease_mm: 0 });
      expect(zeroEase.chest_ease_mm).toBe(0);
    });

    it("debe aceptar límites superiores válidos de holgura (500mm)", () => {
      const maxEase = EaseSettingsSchema.parse({ chest_ease_mm: 500 });
      expect(maxEase.chest_ease_mm).toBe(500);
    });

    it("debe rechazar holgura de pecho negativa", () => {
      expect(() =>
        EaseSettingsSchema.parse({ chest_ease_mm: -10 })
      ).toThrow(/cannot be negative/);
    });

    it("debe rechazar holgura de bíceps negativa", () => {
      expect(() =>
        EaseSettingsSchema.parse({
          chest_ease_mm: 50,
          bicep_ease_mm: -5,
        })
      ).toThrow(/cannot be negative/);
    });

    it("debe rechazar holgura superior al límite máximo físico (500mm)", () => {
      expect(() =>
        EaseSettingsSchema.parse({ chest_ease_mm: 800 })
      ).toThrow(/exceeds realistic apparel threshold/);
    });

    it("debe validar márgenes de costura y dobladillos en rangos permitidos", () => {
      const dnaWithTech = {
        concept_name: "oversize_tee",
        base_block: "tshirt_sloper",
        ease: { chest_ease_mm: 80 },
        tech_specs: {
          notions: [],
          estimated_fabric_meters: 1.0,
          seam_allowance_mm: 10,
          hem_allowance_mm: 25,
        },
      };
      const parsed = parsePatternDna(dnaWithTech);
      expect(parsed.tech_specs?.seam_allowance_mm).toBe(10);
      expect(parsed.tech_specs?.hem_allowance_mm).toBe(25);
    });

    it("debe rechazar margen de costura negativo", () => {
      const badTech = {
        concept_name: "bad_seam",
        base_block: "tshirt_sloper",
        ease: { chest_ease_mm: 50 },
        tech_specs: {
          notions: [],
          estimated_fabric_meters: 1.0,
          seam_allowance_mm: -5,
        },
      };
      expect(() => parsePatternDna(badTech)).toThrow(/Seam allowance cannot be negative/);
    });
  });

  describe("4. Casos de Rechazo (Estructura y Tipos Inválidos)", () => {
    it("debe rechazar un tipo de escote desconocido", () => {
      expect(() =>
        NecklineModSchema.parse({ type: "laser_collar" })
      ).toThrow(/Invalid neckline type/);
    });

    it("debe rechazar un tipo de manga desconocido", () => {
      expect(() =>
        SleeveModSchema.parse({ type: "hover_wing" })
      ).toThrow(/Invalid sleeve type/);
    });

    it("debe rechazar un tipo de bajo / dobladillo desconocido", () => {
      expect(() =>
        HemModSchema.parse({ type: "zigzag_cut_future" })
      ).toThrow(/Invalid hem type/);
    });

    it("debe rechazar un tipo de bolsillo desconocido", () => {
      expect(() =>
        PocketModSchema.parse({ type: "quantum_pocket" })
      ).toThrow(/Invalid pocket type/);
    });

    it("debe rechazar un tipo de capucha desconocido", () => {
      expect(() =>
        HoodModSchema.parse({ type: "space_helmet" })
      ).toThrow(/Invalid hood type/);
    });

    it("debe rechazar si falta concept_name", () => {
      const invalid = {
        base_block: "menswear_torso_oversize",
        ease: { chest_ease_mm: 100 },
      };
      expect(() => parsePatternDna(invalid)).toThrow(/concept_name is required/);
    });

    it("debe rechazar concept_name con caracteres especiales no permitidos", () => {
      const invalid = {
        concept_name: "bad concept name with spaces!",
        base_block: "menswear_torso_oversize",
        ease: { chest_ease_mm: 100 },
      };
      expect(() => parsePatternDna(invalid)).toThrow(
        /concept_name must contain only alphanumeric characters/
      );
    });

    it("debe rechazar si falta base_block", () => {
      const invalid = {
        concept_name: "test_hoodie",
        ease: { chest_ease_mm: 100 },
      };
      expect(() => parsePatternDna(invalid)).toThrow(/base_block is required/);
    });

    it("debe rechazar si falta ease", () => {
      const invalid = {
        concept_name: "test_hoodie",
        base_block: "menswear_torso_oversize",
      };
      expect(() => parsePatternDna(invalid)).toThrow();
    });

    it("debe rechazar tallas estándar no válidas", () => {
      expect(() => StandardSizeSchema.parse("XXXXL")).toThrow();
      expect(() => StandardSizeSchema.parse("SMALL")).toThrow();
    });

    it("debe rechazar metraje de tela menor al umbral mínimo físico", () => {
      const invalid = {
        concept_name: "zero_fabric_tee",
        base_block: "tshirt_sloper",
        ease: { chest_ease_mm: 50 },
        estimated_fabric_meters: 0.01, // Demasiado bajo (< 0.05)
      };
      expect(() => parsePatternDna(invalid)).toThrow(/Fabric meters must be at least/);
    });

    it("debe validar y rechazar tipos inválidos de pretina (WaistbandModSchema)", () => {
      expect(WaistbandModSchema.parse({ type: "elastic", height_mm: 40 })).toEqual({
        type: "elastic",
        height_mm: 40,
      });
      expect(WaistbandModSchema.parse({ type: "drawstring" })).toEqual({
        type: "drawstring",
      });
      // @ts-expect-error tipo inválido
      expect(() => WaistbandModSchema.parse({ type: "zipper_only" })).toThrow(/Invalid waistband type/);
      expect(() => WaistbandModSchema.parse({ type: "elastic", height_mm: 5 })).toThrow(/Waistband height must be at least 10mm/);
      expect(() => WaistbandModSchema.parse({ type: "elastic", height_mm: 250 })).toThrow(/Waistband height exceeds maximum limit/);
    });

    it("debe validar y rechazar tipos inválidos de bajo de pantalón (TrouserHemModSchema)", () => {
      expect(TrouserHemModSchema.parse({ type: "fringed_pirate" })).toEqual({
        type: "fringed_pirate",
      });
      expect(TrouserHemModSchema.parse({ type: "cuffed", cuff_height_mm: 50 })).toEqual({
        type: "cuffed",
        cuff_height_mm: 50,
      });
      // @ts-expect-error tipo inválido
      expect(() => TrouserHemModSchema.parse({ type: "bell_bottom_ultra" })).toThrow(/Invalid trouser hem type/);
      expect(() => TrouserHemModSchema.parse({ type: "cuffed", cuff_height_mm: 5 })).toThrow(/Cuff height must be at least 10mm/);
    });

    it("debe validar y rechazar tipos inválidos de pierna (TrouserLegsModSchema)", () => {
      expect(TrouserLegsModSchema.parse({ type: "wide_baggy", length_type: "shorts", inseam_mm: 350 })).toEqual({
        type: "wide_baggy",
        length_type: "shorts",
        inseam_mm: 350,
      });
      // @ts-expect-error tipo inválido
      expect(() => TrouserLegsModSchema.parse({ type: "ultra_skinny" })).toThrow(/Invalid trouser legs type/);
      expect(() => TrouserLegsModSchema.parse({ type: "straight", inseam_mm: 50 })).toThrow(/Inseam length must be at least 100mm/);
    });

    it("debe validar y rechazar tipos y conteo de bolsillos de pantalón (TrouserPocketModSchema)", () => {
      expect(TrouserPocketModSchema.parse({ type: "cargo", count: 4, width_mm: 180, height_mm: 200 })).toEqual({
        type: "cargo",
        count: 4,
        width_mm: 180,
        height_mm: 200,
      });
      // @ts-expect-error tipo inválido
      expect(() => TrouserPocketModSchema.parse({ type: "front_hoodie" })).toThrow(/Invalid trouser pocket type/);
      expect(() => TrouserPocketModSchema.parse({ type: "cargo", count: 0 })).toThrow(/Pocket count must be at least 1/);
      expect(() => TrouserPocketModSchema.parse({ type: "cargo", count: 10 })).toThrow(/Pocket count exceeds maximum limit/);
    });

    it("debe validar categoría de prenda (GarmentCategorySchema)", () => {
      expect(GarmentCategorySchema.parse("top")).toBe("top");
      expect(GarmentCategorySchema.parse("bottom")).toBe("bottom");
      expect(GarmentCategorySchema.parse("set")).toBe("set");
      // @ts-expect-error categoría inválida
      expect(() => GarmentCategorySchema.parse("accessory")).toThrow();
    });
  });
});
