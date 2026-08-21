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
  anime_water_goddess_dress: {
    concept_name: "anime_water_goddess_dress",
    description: "Vestido cosplay de Diosa del Agua (Aqua): Corpiño entallado con escote corazón, falda evasé y detalles de lazo",
    garment_category: "dress",
    base_block: "dress_sloper",
    ease: {
      chest_ease_mm: 30,
      waist_ease_mm: 20,
      hip_ease_mm: 50,
      shoulder_ease_mm: 0,
      bicep_ease_mm: 35,
    },
    dress_details: {
      silhouette: "a_line",
      skirt_length_mm: 550,
      waist_seam: true,
    },
    modifications: {
      neckline: {
        type: "sweetheart",
        depth_mm: 45,
        width_mm: 25,
      },
      sleeves: {
        type: "set_in",
        length_type: "short",
        length_mm: 200,
      },
      hem: {
        type: "flared",
        drop_mm: 0,
      },
      dress_details: {
        silhouette: "a_line",
        skirt_length_mm: 550,
        waist_seam: true,
      },
    },
    sizing: {
      size: "M",
      chest_circ_mm: 920,
      waist_circ_mm: 700,
      hip_circ_mm: 960,
      target_layers: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    },
    tech_specs: {
      notions: [
        "1x cremallera invisible 50cm azul",
        "2m cinta de satén azul oscuro para lazada",
        "hilo poliéster azul celeste",
      ],
      estimated_fabric_meters: 2.8,
      seam_allowance_mm: 10,
      hem_allowance_mm: 20,
      fabric_type: "satin_crepe_blue",
      fabric_width_mm: 1500,
    },
    notions: [
      "1x cremallera invisible 50cm azul",
      "2m cinta de satén azul oscuro para lazada",
      "hilo poliéster azul celeste",
    ],
    estimated_fabric_meters: 2.8,
  },

  demon_slayer_haori_kimono: {
    concept_name: "demon_slayer_haori_kimono",
    description: "Haori / Kimono oversize tradicional con paneles rectos, mangas cuadradas Furisode y cuello en banda plana",
    garment_category: "haori",
    base_block: "haori_sloper",
    ease: {
      chest_ease_mm: 180,
      waist_ease_mm: 160,
      hip_ease_mm: 160,
      shoulder_ease_mm: 60,
    },
    kimono_details: {
      sleeve_style: "furisode_square",
      collar_width_mm: 60,
      obi_belt: true,
    },
    modifications: {
      sleeves: {
        type: "kimono",
        length_type: "full",
      },
      kimono_details: {
        sleeve_style: "furisode_square",
        collar_width_mm: 60,
        obi_belt: true,
      },
    },
    sizing: {
      size: "L",
      chest_circ_mm: 1040,
      waist_circ_mm: 880,
      hip_circ_mm: 1020,
      target_layers: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    },
    tech_specs: {
      notions: [
        "1x cordón Haori-himo blanco",
        "0.8m entretela ligera para cuello",
        "hilo poliéster negro y verde",
      ],
      estimated_fabric_meters: 3.2,
      seam_allowance_mm: 12,
      hem_allowance_mm: 30,
      fabric_type: "cotton_linen_check_canvas",
      fabric_width_mm: 1500,
    },
    notions: [
      "1x cordón Haori-himo blanco",
      "0.8m entretela ligera para cuello",
      "hilo poliéster negro y verde",
    ],
    estimated_fabric_meters: 3.2,
  },
  pirate_shorts: {
    concept_name: "straw_pirate_denim_shorts",
    description: "Anime pirate captain denim bermuda shorts with rolled cuffs and knee length",
    base_block: "pants_sloper",
    garment_category: "bottom",
    ease: {
      chest_ease_mm: 0,
      waist_ease_mm: 25,
      hip_ease_mm: 45,
      crotch_ease_mm: 20,
      knee_ease_mm: 60,
    },
    modifications: {
      trouser_legs: {
        type: "straight",
        length_type: "shorts",
      },
      trouser_hem: {
        type: "cuffed",
        cuff_height_mm: 35,
      },
      waistband: {
        type: "fitted",
        height_mm: 40,
      },
    },
    sizing: {
      size: "M",
      waist_circ_mm: 820,
      hip_circ_mm: 980,
      target_layers: ["S", "M", "L", "XL", "2XL"],
    },
    tech_specs: {
      notions: ["1x botón metálico jeans 17mm", "1x cremallera metálica 15cm", "hilo torzal contrastante"],
      estimated_fabric_meters: 1.1,
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
      fabric_type: "denim_12oz_blue",
      fabric_width_mm: 1500,
    },
    notions: ["1x botón metálico jeans 17mm", "1x cremallera metálica 15cm", "hilo torzal contrastante"],
    estimated_fabric_meters: 1.1,
  },

  sandy_skirt: {
    concept_name: "sandy_flared_skirt",
    description: "A-line flared skirt with fitted waistband and invisible zip",
    base_block: "skirt_sloper",
    garment_category: "bottom",
    ease: {
      chest_ease_mm: 0,
      waist_ease_mm: 20,
      hip_ease_mm: 60,
    },
    modifications: {
      hem: {
        type: "flared",
        allowance_mm: 25,
      },
      waistband: {
        type: "fitted",
        height_mm: 40,
      },
    },
    sizing: {
      size: "M",
      waist_circ_mm: 700,
      hip_circ_mm: 960,
      target_layers: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    },
    tech_specs: {
      notions: ["1x cremallera invisible 20cm", "hilo poliéster"],
      estimated_fabric_meters: 1.2,
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
      fabric_type: "cotton_twill",
      fabric_width_mm: 1500,
    },
    notions: ["1x cremallera invisible 20cm", "hilo poliéster"],
    estimated_fabric_meters: 1.2,
  },

  simon_shirt: {
    concept_name: "simon_classic_shirt",
    description: "Classic button-down shirt with collar and cuffs",
    base_block: "menswear_torso",
    garment_category: "top",
    ease: {
      chest_ease_mm: 60,
      waist_ease_mm: 50,
      hip_ease_mm: 45,
      shoulder_ease_mm: 10,
      bicep_ease_mm: 35,
    },
    modifications: {
      neckline: {
        type: "collar",
        collar_height_mm: 38,
      },
      sleeves: {
        type: "set_in",
        length_type: "full",
        cuff_width_mm: 60,
      },
      hem: {
        type: "curved_tail",
        drop_mm: 30,
      },
      closure: {
        type: "buttons",
        button_count: 7,
        overlap_mm: 25,
      },
    },
    sizing: {
      size: "M",
      chest_circ_mm: 1000,
      target_layers: ["S", "M", "L", "XL", "2XL"],
    },
    tech_specs: {
      notions: ["8x botones nacarados 12mm", "0.5m entretela cuello y puños"],
      estimated_fabric_meters: 1.6,
      seam_allowance_mm: 10,
      hem_allowance_mm: 15,
      fabric_type: "cotton_poplin",
      fabric_width_mm: 1500,
    },
    notions: ["8x botones nacarados 12mm", "0.5m entretela cuello y puños"],
    estimated_fabric_meters: 1.6,
  },
};

/**
 * Proveedor simulado instantáneo sin llamadas de red
 */
export class MockAiProvider implements IAiProvider {
  public getProviderName(): string {
    return "mock";
  }

  public async generatePatternDna(
    prompt: string,
    _imagePath?: string,
    blueprint?: string
  ): Promise<PatternDna> {
    const query = (prompt || "").toLowerCase();
    const bp = (blueprint || "").toLowerCase().trim();

    let selectedPreset: PatternDna;

    if (bp && bp !== "auto" && bp !== "none") {
      switch (bp) {
        case "wahid":
          selectedPreset = MOCK_PRESETS.pirate_vest;
          break;
        case "simon":
          selectedPreset = MOCK_PRESETS.simon_shirt;
          break;
        case "brian":
          selectedPreset =
            query.includes("tshirt") || query.includes("camiseta") || query.includes("remera")
              ? MOCK_PRESETS.tshirt
              : MOCK_PRESETS.hoodie;
          break;
        case "bella":
          selectedPreset = MOCK_PRESETS.anime_water_goddess_dress;
          break;
        case "paco":
          selectedPreset = MOCK_PRESETS.pirate_shorts;
          break;
        case "sandy":
          selectedPreset = MOCK_PRESETS.sandy_skirt;
          break;
        case "shin":
          selectedPreset = MOCK_PRESETS.demon_slayer_haori_kimono;
          break;
        default:
          selectedPreset = MOCK_PRESETS.vest;
          break;
      }
    } else if (
      query.includes("demon_slayer") ||
      query.includes("demon slayer") ||
      query.includes("tanjiro") ||
      query.includes("haori") ||
      query.includes("furisode") ||
      query.includes("demon_slayer_haori_kimono") ||
      query.includes("shin")
    ) {
      selectedPreset = MOCK_PRESETS.demon_slayer_haori_kimono;
    } else if (
      query.includes("water_goddess") ||
      query.includes("water goddess") ||
      query.includes("aqua") ||
      query.includes("diosa del agua") ||
      query.includes("anime_water_goddess_dress") ||
      query.includes("bella")
    ) {
      selectedPreset = MOCK_PRESETS.anime_water_goddess_dress;
    } else if (
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
      query.includes("paco") ||
      query.includes("short") ||
      query.includes("bermuda") ||
      query.includes("pantalon") ||
      query.includes("pantalón")
    ) {
      selectedPreset = MOCK_PRESETS.pirate_shorts;
    } else if (
      query.includes("sandy") ||
      query.includes("falda") ||
      query.includes("skirt")
    ) {
      selectedPreset = MOCK_PRESETS.sandy_skirt;
    } else if (
      query.includes("simon") ||
      query.includes("camisa") ||
      query.includes("shirt")
    ) {
      selectedPreset = MOCK_PRESETS.simon_shirt;
    } else if (
      query.includes("wahid") ||
      query.includes("luffy") ||
      query.includes("lufi") ||
      query.includes("pirata") ||
      query.includes("straw_pirate") ||
      query.includes("sombrero de paja") ||
      query.includes("one piece")
    ) {
      selectedPreset = MOCK_PRESETS.pirate_vest;
    } else if (
      query.includes("brian") ||
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
      query.includes("sacerdotisa") ||
      query.includes("priestess") ||
      query.includes("dress") ||
      query.includes("vestido") ||
      query.includes("robe") ||
      query.includes("toga") ||
      query.includes("kimono")
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

