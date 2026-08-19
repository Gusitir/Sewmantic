/**
 * src/ai/mock_provider.ts
 * Proveedor determinista offline de ADN Paramétrico para desarrollo, CI/CD y pruebas unitarias
 * pattern-ai-core
 */

import type { IAiProvider } from "./base_provider.js";
import type { PatternDna } from "../types/pattern.js";
import { parsePatternDna } from "../schema/pattern_schema.js";

/**
 * Plantillas pre-validadas de ADN Paramétrico
 */
export const MOCK_PRESETS: Record<string, PatternDna> = {
  hoodie: {
    concept_name: "streetwear_oversize_hoodie",
    description: "Streetwear oversized drop-shoulder hoodie with crossover hood and kangaroo pocket",
    base_block: "menswear_torso_oversize",
    ease: {
      chest_ease_mm: 150,
      bicep_ease_mm: 70,
      waist_ease_mm: 130,
      hip_ease_mm: 110,
      shoulder_ease_mm: 40,
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
    sizing: {
      size: "L",
      chest_circ_mm: 1040,
      target_layers: ["S", "M", "L", "XL", "2XL"],
    },
    tech_specs: {
      notions: ["1x cordón 120cm", "2x ojetes metálicos 8mm", "30cm elástico puños"],
      estimated_fabric_meters: 1.9,
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
      fabric_type: "french_terry_380gsm",
      fabric_width_mm: 1500,
    },
    notions: ["1x cordón 120cm", "2x ojetes metálicos 8mm", "30cm elástico puños"],
    estimated_fabric_meters: 1.9,
  },

  tshirt: {
    concept_name: "classic_crew_tee",
    description: "Classic crew neck regular fit t-shirt",
    base_block: "tshirt_sloper",
    ease: {
      chest_ease_mm: 35,
      bicep_ease_mm: 25,
      waist_ease_mm: 30,
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
      size: "M",
      chest_circ_mm: 980,
    },
    tech_specs: {
      notions: ["hilo poliéster 100%"],
      estimated_fabric_meters: 1.1,
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
      fabric_type: "cotton_jersey_180gsm",
      fabric_width_mm: 1500,
    },
    notions: ["hilo poliéster 100%"],
    estimated_fabric_meters: 1.1,
  },

  dress: {
    concept_name: "priestess_crossover_robe_dress",
    description: "Anime fantasy priestess ceremonial crossover robe dress",
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
    notions: ["1x cremallera invisible 50cm", "hilo poliester 100%"],
    estimated_fabric_meters: 3.4,
  },

  vest: {
    concept_name: "cyberpunk_shinobi_tactical_vest",
    description: "Futuristic tactical sleeveless vest with cargo pockets",
    base_block: "menswear_torso_oversize",
    ease: {
      chest_ease_mm: 100,
      waist_ease_mm: 90,
      hip_ease_mm: 85,
    },
    modifications: {
      neckline: {
        type: "v_neck",
        depth_mm: 45,
      },
      sleeves: {
        type: "sleeveless",
      },
      hem: {
        type: "straight",
        allowance_mm: 20,
      },
      pocket: {
        type: "cargo",
        width_mm: 160,
        height_mm: 180,
        placement_y_mm: 280,
        flap: true,
      },
    },
    sizing: {
      size: "L",
      chest_circ_mm: 1060,
    },
    tech_specs: {
      notions: ["2x broches tácticos", "cinta reflectante 2m"],
      estimated_fabric_meters: 1.3,
      seam_allowance_mm: 10,
      hem_allowance_mm: 20,
      fabric_type: "cordura_nylon",
      fabric_width_mm: 1500,
    },
    notions: ["2x broches tácticos", "cinta reflectante 2m"],
    estimated_fabric_meters: 1.3,
  },

  pirate_vest: {
    concept_name: "straw_pirate_adventurer_vest",
    description: "Anime pirate captain sleeveless red waistcoat vest with deep V-neck, 3-button front closure, and pointed hem",
    base_block: "menswear_torso_fitted",
    ease: {
      chest_ease_mm: 50,
      waist_ease_mm: 40,
      hip_ease_mm: 35,
      shoulder_ease_mm: 0,
    },
    modifications: {
      neckline: {
        type: "v_neck",
        depth_mm: 130,
        width_mm: 35,
      },
      sleeves: {
        type: "sleeveless",
      },
      hem: {
        type: "curved_tail",
        drop_mm: 45,
        back_drop_mm: 0,
      },
    },
    sizing: {
      size: "M",
      chest_circ_mm: 980,
      target_layers: ["S", "M", "L", "XL", "2XL"],
    },
    tech_specs: {
      notions: ["3x botones negros 20mm", "0.4m entretela termoadhesiva para vistas"],
      estimated_fabric_meters: 0.85,
      seam_allowance_mm: 10,
      hem_allowance_mm: 20,
      fabric_type: "rustic_red_linen_canvas_260gsm",
      fabric_width_mm: 1500,
    },
    notions: ["3x botones negros 20mm", "0.4m entretela termoadhesiva para vistas"],
    estimated_fabric_meters: 0.85,
  },

  straw_pirate_full_set: {

    concept_name: "straw_pirate_full_set",
    description: "Conjunto Cosplay Pirata de Luffy: Chaleco Rojo de Lino + Bermuda Denim Deshilachada con Dobladillo Vuelto",
    garment_category: "set",
    base_block: "two_piece_set",
    ease: {
      chest_ease_mm: 50,
      waist_ease_mm: 35,
      hip_ease_mm: 50,
      thigh_ease_mm: 60,
      shoulder_ease_mm: 0,
    },
    modifications: {
      neckline: {
        type: "v_neck",
        depth_mm: 130,
        width_mm: 35,
      },
      sleeves: {
        type: "sleeveless",
      },
      hem: {
        type: "curved_tail",
        drop_mm: 45,
        back_drop_mm: 0,
      },
      trouser: {
        style: "bermuda",
        length_mm: 550,
        waist_height: "natural",
        fit_type: "relaxed",
        leg_opening_mm: 480,
        pleats_count: 0,
        has_cuff: true,
        cuff_height_mm: 45,
        pocket_type: "jeans_5pocket",
        front_pocket_type: "curved",
        back_pocket_type: "patch",
      },
    },
    fabric_details: {
      main_fabric: {
        name: "Lino Rústico Rojo Escarlata / Scarlet Red Linen Canvas (260 gsm)",
        type: "rustic_red_linen_canvas",
        description: "Lino rústico 100% transpirable para el chaleco pirata",
        width_mm: 1500,
        weight_gsm: 260,
        color: "Rojo Escarlata / Scarlet Red",
        composition: "100% Lino / Linen",
        estimated_meters: 0.9,
      },
      secondary_fabric: {
        name: "Denim Azul Índigo Lavado 12oz / 12oz Washed Blue Denim",
        type: "blue_indigo_denim_12oz",
        description: "Denim de algodón resistente 12oz con acabado deshilachado para las bermudas",
        width_mm: 1500,
        weight_gsm: 380,
        color: "Azul Índigo Lavado / Washed Indigo Blue",
        composition: "100% Algodón / Cotton Denim",
        estimated_meters: 1.2,
      },
    },
    sub_garments: {
      top: {
        concept_name: "straw_pirate_adventurer_vest",
        description: "Chaleco Rojo de Lino Sin Mangas",
        garment_category: "top",
        base_block: "menswear_torso_fitted",
        ease: {
          chest_ease_mm: 50,
          waist_ease_mm: 40,
          hip_ease_mm: 35,
          shoulder_ease_mm: 0,
        },
        modifications: {
          neckline: {
            type: "v_neck",
            depth_mm: 130,
            width_mm: 35,
          },
          sleeves: {
            type: "sleeveless",
          },
          hem: {
            type: "curved_tail",
            drop_mm: 45,
            back_drop_mm: 0,
          },
        },
        tech_specs: {
          fabric_type: "rustic_red_linen_canvas_260gsm",
          fabric_width_mm: 1500,
          seam_allowance_mm: 10,
          hem_allowance_mm: 20,
          estimated_fabric_meters: 0.9,
          notions: ["3x botones dorados 25mm", "0.4m entretela termoadhesiva"],
        },
      },
      bottom: {
        concept_name: "straw_pirate_denim_shorts",
        description: "Bermuda Denim Azul Deshilachada",
        garment_category: "bottom",
        base_block: "pants_sloper",
        ease: {
          chest_ease_mm: 0,
          waist_ease_mm: 35,
          hip_ease_mm: 50,
          thigh_ease_mm: 60,
        },
        modifications: {
          trouser: {
            style: "bermuda",
            length_mm: 550,
            waist_height: "natural",
            fit_type: "relaxed",
            leg_opening_mm: 480,
            pleats_count: 0,
            has_cuff: true,
            cuff_height_mm: 45,
            pocket_type: "jeans_5pocket",
            front_pocket_type: "curved",
            back_pocket_type: "patch",
          },
        },
        tech_specs: {
          fabric_type: "blue_indigo_denim_12oz",
          fabric_width_mm: 1500,
          seam_allowance_mm: 12,
          hem_allowance_mm: 25,
          estimated_fabric_meters: 1.2,
          notions: ["1x botón metálico jeans 17mm", "1x cremallera YKK 15cm", "4x remaches"],
        },
      },

    },
    sizing: {
      size: "M",
      chest_circ_mm: 980,
      waist_circ_mm: 840,
      hip_circ_mm: 980,
      target_layers: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    },
    tech_specs: {
      notions: [
        "3x botones dorados 25mm para chaleco",
        "1x botón metálico jeans 17mm",
        "1x cremallera metálica YKK 15cm",
        "0.5m entretela termoadhesiva",
      ],
      estimated_fabric_meters: 2.1,
      seam_allowance_mm: 10,
      hem_allowance_mm: 20,
      fabric_type: "Conjunto 2 Piezas: Lino Rojo + Denim Azul",
      fabric_width_mm: 1500,
    },
    notions: [
      "3x botones dorados 25mm para chaleco",
      "1x botón metálico jeans 17mm",
      "1x cremallera metálica YKK 15cm",
      "0.5m entretela termoadhesiva",
    ],
    estimated_fabric_meters: 2.1,
  },
};

/**
 * Proveedor simulado instantáneo sin llamadas de red
 */
export class MockAiProvider implements IAiProvider {
  public getProviderName(): string {
    return "mock";
  }

  public async generatePatternDna(prompt: string, _imagePath?: string): Promise<PatternDna> {
    const query = (prompt || "").toLowerCase();

    let selectedPreset: PatternDna;

    if (
      query.includes("straw_pirate_full_set") ||
      query.includes("full set") ||
      query.includes("conjunto") ||
      query.includes("2 piezas") ||
      query.includes("two piece") ||
      query.includes("set pirata") ||
      query.includes("chaleco + bermuda") ||
      query.includes("chaleco y bermuda") ||
      (query.includes("set") && (query.includes("pirat") || query.includes("luffy") || query.includes("sombrero"))) ||
      (query.includes("completo") && (query.includes("pirat") || query.includes("luffy") || query.includes("sombrero")))
    ) {
      selectedPreset = MOCK_PRESETS.straw_pirate_full_set;
    } else if (
      query.includes("luffy") ||
      query.includes("lufi") ||
      query.includes("pirata") ||
      query.includes("straw_pirate") ||
      query.includes("sombrero de paja") ||
      query.includes("one piece")
    ) {
      selectedPreset = MOCK_PRESETS.pirate_vest;
    } else if (
      query.includes("hoodie") ||
      query.includes("sudadera") ||
      query.includes("capucha") ||
      query.includes("canguro")
    ) {
      selectedPreset = MOCK_PRESETS.hoodie;
    } else if (
      query.includes("tshirt") ||
      query.includes("t-shirt") ||
      query.includes("camiseta") ||
      query.includes("remera") ||
      query.includes("playera") ||
      query.includes("tee")
    ) {
      selectedPreset = MOCK_PRESETS.tshirt;
    } else if (
      query.includes("dress") ||
      query.includes("vestido") ||
      query.includes("robe") ||
      query.includes("toga") ||
      query.includes("kimono") ||
      query.includes("priestess")
    ) {
      selectedPreset = MOCK_PRESETS.dress;
    } else {
      selectedPreset = MOCK_PRESETS.vest;
    }

    // Retorna una copia profunda validada mediante Zod
    const cloned = JSON.parse(JSON.stringify(selectedPreset));
    return parsePatternDna(cloned);
  }
}

