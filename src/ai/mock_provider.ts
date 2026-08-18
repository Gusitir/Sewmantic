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
