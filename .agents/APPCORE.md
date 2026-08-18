# APPCORE - Generador Paramétrico de Patrones IA

Verified: 2026-08-17 at multiagent-init

## Purpose and users

- **Problema:** La generación visual directa de patrones por IA (alucinación vectorial pura) produce prendas físicamente imposibles de confeccionar. Este sistema resuelve el problema desacoplando la creatividad de la IA de la precisión geométrica mediante un motor de patronaje determinista (FreeSewing).
- **Usuarios Objetivo:**
  - *Diseñador / Prototipador:* Generación de prendas de autor y siluetas streetwear de alta costura conceptual para el universo **MyPetCreature** adaptadas a medidas biométricas exactas.
  - *Comercialización Digital (Etsy):* Exportación automatizada de paquetes comerciales de patrones en PDF (A4/Letter con capas por talla y A0 Plotter) con costo marginal de distribución de $0 USD y márgenes > 90%.
- **Non-goals:**
  - Exportación de curvas vectoriales directas no parametrizadas ni ancladas a slopers base.
  - Infraestructura SaaS multi-usuario o servidores pesados en Fase 1 (foco en CLI de alto rendimiento).

## Invariantes y Reglas Técnicas Inmutables

1. **Determinismo Geométrico:** La IA jamás genera coordenadas SVG arbitrarias. La IA únicamente produce un **JSON Paramétrico de ADN** que parametriza bloques base (slopers) pre-validados.
2. **Separación de Holguras (*Ease Allocation*):**
   - *Holgura de confort:* +2 a +4 cm mínimos sobre el contorno anatómico para permitir movilidad y respiración.
   - *Holgura de diseño (oversize/streetwear):* +12 a +25 cm adicionales según la silueta conceptual.
3. **Calibración Obligatoria de Impresión:** La Página 1 de todo PDF paginado incluye obligatoriamente un recuadro de calibración de **10 cm x 10 cm (4 in x 4 in)** a escala 100% con advertencia visual de no aplicar escala ("Do not scale / Print at 100%").
4. **Marcado Técnico Paramétrico:**
   - Línea de hilo de tela (*grainline*) en el 100% de las piezas de corte.
   - Piquetes de coincidencia (*notches*) calculados geométricamente por longitud de arco en uniones críticas (sisa-manga, costados, tiros).
   - Márgenes de costura (*seam allowances*) configurables (10 mm estándar, 25-30 mm en dobladillos).
5. **Estratificación por Capas (*PDF Layers*):** Exportación con tallas separadas en capas (XS a 3XL) para permitir impresión selectiva sin saturación visual.
6. **Blindaje Legal de Propiedad Intelectual:** Los metadatos y nombres generados usan exclusivamente terminología descriptiva sin marcas registradas de terceros.

## Mapa de Arquitectura

```
pattern-ai-core/
├── .agents/                           # Plano de Control (Arquitecto)
├── scripts/                           # Automatizaciones mecánicas (build, test, scaffolding)
├── rules_pattern_making.md            # Reglas textiles maestras inyectadas al LLM
├── src/
│   ├── index.ts                       # Entrypoint del CLI (Commander)
│   ├── ai/                            # Capa de Proveedores de Inteligencia Artificial
│   │   ├── base_provider.ts           # Interfaz común IAiProvider
│   │   ├── opencode_cli_provider.ts   # Integración por CLI con ChatGPT (OpenCode)
│   │   ├── direct_api_provider.ts     # Integración SDK HTTP directa (Claude, OpenAI)
│   │   ├── prompt_builder.ts          # Inyector de reglas textiles y system prompts
│   │   ├── mock_provider.ts           # Proveedor Mock para tests offline deterministas
│   │   └── factory.ts                 # Factory según variable AI_PROVIDER
│   ├── types/                         # Definiciones de tipos TypeScript del ADN
│   │   └── pattern.ts                 # Interfaces del JSON de ADN, medidas y bloques
│   ├── schema/                        # Validación de Esquemas en Runtime (Zod)
│   │   └── pattern_schema.ts          # Validador determinista de modificaciones
│   ├── engine/                        # Motor Geométrico de Patronaje (FreeSewing)
│   │   ├── base_blocks/               # Slopers fundamentales (torso, sleeve, hood, pocket)
│   │   ├── modifier.ts                # Aplica el JSON de ADN transformando los slopers
│   │   ├── exporter.ts                # Renderizado SVG y conversión a PDF continuo/paginado
│   │   └── tech_sheet.ts              # Generador de ficha técnica de armado y consumo
│   └── utils/
│       └── tiler.ts                   # Motor de corte vectorial en grilla A4/Letter con cruces
└── output/                            # PDFs, SVGs y Fichas técnicas generadas
```

## Interfaces y Contrato de Datos (JSON de ADN Paramétrico)

```typescript
interface PatternDna {
  concept_name: string;
  base_block: "menswear_torso_oversize" | "womenswear_bodice" | "unisex_hoodie" | string;
  ease: {
    chest_ease_mm: number;
    bicep_ease_mm: number;
    waist_ease_mm?: number;
    hip_ease_mm?: number;
  };
  modifications: {
    neckline?: { type: "crossover_hood" | "crew" | "v_neck"; depth_mm: number; width_mm?: number };
    sleeves?: { type: "drop_shoulder" | "raglan" | "set_in"; drop_mm?: number; cuff_elastic?: boolean };
    hem?: { type: "curved_tail" | "straight" | "cropped"; drop_mm?: number; band_elastic?: boolean };
    pockets?: { type: "kangaroo" | "welt" | "patch"; width_mm?: number; height_mm?: number };
    [key: string]: any;
  };
  sizing: {
    target_sizes: Array<"XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL">;
    grading_rule?: string;
  };
  notions: string[];
  estimated_fabric_meters: number;
}
```

## External Systems y Dependencias

- **FreeSewing Core v3:** Motor de patronaje paramétrico basado en Node.js / JavaScript.
- **Zod:** Validación de esquemas en runtime.
- **PDFKit / svg-to-pdfkit:** Ensamblado y renderizado de archivos PDF vectoriales con capas y tiling.
- **OpenCode CLI / LLM Direct APIs:** Origen del razonamiento conceptual y traducción de bocetos a parámetros textiles.
- **Etsy:** Canal comercial (proceso de subida manual de entregables en Fase 1).

Only verified, durable facts belong here. Changing state belongs in CURRENT.
