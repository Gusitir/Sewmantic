# APPCORE - Generador Paramétrico de Patrones IA

Verified: 2026-09-07 at Phase 11 Technical Closure (commit d6279fa, 657 tests PASS across 25 suites)

## Semantic Pattern Kernel v2 (integrado en shadow mode, T-45 a T-48)

- **Superficie pública:** `src/engine/v2/` — `contracts.ts` (Vertex, 4 curvas tipadas, Edge, EdgeSequence, Panel, Component, Interface, StitchPair, ConstraintDiagnostic, PatternDocument con type guards), `serialization.ts` (validate/serialize/deserialize versionados), `geometry/` (adapter Flatten.js, sampler de arco, offset miter-only propio), `constraints.ts` (`resolveStitchPair`, `evaluateConstraints` con diagnostics tipados: SEAM_DELTA_LIMIT 3mm, ORIENTATION_INCOMPATIBLE, BROKEN_REFERENCE, NON_POSITIVE_LENGTH), `operators.ts` (`splitEdge`/`insertDart`/`cut` puros y atómicos, rechazo con estado byte-idéntico), `adapters/legacy-shadow.ts` + `shadow.ts`.
- **Shadow mode (T-48):** `SEMANTIC_SHADOW=on` (default OFF) ejecuta en `src/pipeline.ts` un único seam de solo lectura: convierte las piezas legacy a snapshot semántico y calcula diagnósticos en memoria. Cero escritura, cero deriva byte en entregables OFF vs ON (verificado en tests de integración). El pipeline legacy es la única autoridad.
- **Unidad canónica:** mm con tolerancia serializada `<= 0.001` (`MM_TOLERANCE`). Los IDs estables y la serialización versionada (`SEMANTIC_V2_SCHEMA_VERSION = 1`) son parte del contrato.

## Purpose and users

- **Problema:** La generación visual directa de patrones por IA (alucinación vectorial pura) produce prendas físicamente imposibles de confeccionar. Este sistema resuelve el problema desacoplando la creatividad de la IA de la precisión geométrica mediante un motor de patronaje determinista (FreeSewing v3).
- **Usuarios Objetivo:**
  - *Diseñador / Prototipador:* Generación de prendas de autor y siluetas streetwear de alta costura conceptual para el universo **MyPetCreature** adaptadas a medidas biométricas exactas o a partir de bocetos/imágenes.
  - *Comercialización Digital (Etsy):* Exportación automatizada de paquetes comerciales de patrones en PDF (A4/Letter con capas por talla y A0 Plotter) empaquetados en un archivo `.zip` con guía de impresión, fichas técnicas y modelos 3D interactivos (.glb) listos para publicar.
- **Non-goals:**
  - Exportación de curvas vectoriales directas no parametrizadas ni ancladas a slopers base.
  - Infraestructura SaaS multi-usuario pesada (foco en aplicación local de alto rendimiento y Web Studio 2D/3D nativo).

## Invariantes y Reglas Técnicas Inmutables

1. **Determinismo Geométrico:** La IA jamás genera coordenadas SVG arbitrarias. La IA únicamente produce un **JSON Paramétrico de ADN** que parametriza bloques base (slopers) pre-validados.
2. **Separación de Holguras (*Ease Allocation*):**
   - *Holgura de confort:* +2 a +4 cm mínimos sobre el contorno anatómico para permitir movilidad y respiración.
   - *Holgura de diseño (oversize/streetwear):* +12 a +25 cm adicionales según la silueta conceptual.
3. **Calibración Obligatoria de Impresión:** La Página 1 de todo PDF paginado incluye obligatoriamente un recuadro de calibración de **10 cm x 10 cm (4 in x 4 in)** a escala 100% con advertencia visual de no aplicar escala ("Do not scale / Print at 100%"). Factor de conversión estricto $1\text{ mm} = 72 / 25.4 \approx 2.834645669\text{ pt}$.
4. **Marcado Técnico Paramétrico:**
   - Línea de hilo de tela (*grainline*) en el 100% de las piezas de corte.
   - Piquetes de coincidencia (*notches*) calculados geométricamente por longitud de arco en uniones críticas (sisa-manga, costados, tiros, rodillas).
   - Márgenes de costura (*seam allowances*) configurables (10 mm estándar, 25-30 mm en dobladillos).
   - Cruces de botonadura (+20 mm) y marcas vectoriales de ojales/botones paramétricos.
   - Vistas interiores de refuerzo (`front_facing`, `back_neck_facing`, `armhole_facing`) con material de entretela (`requiresInterfacing: true`).
5. **Estratificación por Capas (*PDF & SVG Layers*):** Exportación con tallas separadas en capas (XS a 3XL) para permitir impresión y visualización selectiva sin saturación.
6. **Geometría Anatómica 3D True-to-Pattern:**
   - Triangulación 2D determinista con algoritmo *Ear-Clipping* (`triangulator.ts`) con preservación de área ($\text{error} < 0.1\%$).
   - Exportación nativa glTF 2.0 binaria (.glb) con multi-primitivas, multi-materiales PBR textiles y Guía de Despiece 3D (*Exploded Assembly View*).
7. **Blindaje Legal de Propiedad Intelectual:** Los metadatos y nombres generados usan exclusivamente terminología descriptiva sin marcas registradas de terceros.
8. **Módulos ESM / NodeNext:** Configuración TypeScript obligatoria en `NodeNext` para compatibilidad completa con `@freesewing/core` v3.
9. **Tolerancia Matemática de Emparejamiento:** $\Delta \le 3\text{ mm}$ estricto en costuras de emparejamiento (tiro delantero vs espalda, copa de manga vs sisa de torso, costados de corpiño).

## Catálogo Oficial de Blueprints Ancla FreeSewing

| Blueprint | Prenda Base | Piezas Clave Generadas | Modificaciones Típicas Soportadas |
|---|---|---|---|
| **`wahid`** | 🦺 Chaleco Sastre / Cosplay Vest | Delantero (corte x2), Espalda, Vistas interiores (front/armhole/back_neck facing) | Escotes en V profundos, cruce de botonadura +20mm, bajo en doble pico (`hem: pointed`), ojales/botones. |
| **`simon`** | 👔 Camisa Clásica / Casual | Delantero, Espalda, Manga camisera, Pie de cuello (`collar_stand`), Pala (`collar_fall`), Puños | Cuello camisero con tirilla, tapeta de botones, canesú, puños dobles. |
| **`brian`** | 👕 Camiseta / Hoodie / Streetwear | Torso del/esp oversize, Mangas (set-in/drop-shoulder/raglan), Capucha (crossover), Bolsillo canguro | Siluetas streetwear, hombro caído, bajos curvados, cordones y ojetes. |
| **`bella`** | 👗 Corpiño / Top / Vestido Femenino | Corpiño entallado (front/back bodice con pinza de busto al apex), Falda coordinada (recta/evasé/plisada) | Pinzas anatómicas de busto ($\Delta \le 0.01\text{ mm}$ en costados), escotes corazón/sweetheart/scoop/cuadrado. |
| **`paco`** | 👖 Pantalón / Bermuda / Shorts | Pernera delantera (`front_leg`), Pernera trasera (`back_leg`), Pretina (`waistband`), Bolsillos jeans | Aplomo central, entrepierna igualada ($\Delta \le 0.05\text{ mm}$), dobladillo vuelto con vuelta (`has_cuff`). |
| **`sandy`** | 🥻 Falda (Falda Evasé / Recta / Tablas) | Falda delantera (`front_skirt`), Falda trasera (`back_skirt`), Pretina (`waistband`) | Siluetas acampanadas (A-line), tubo/recta o plisada, con pinzas de entalle en cintura. |
| **`shin`** | 👘 Kimono Tradicional / Haori Anime | Paneles rectos del/esp (*maemigoro/ushiro migoro*), Mangas cuadradas *Furisode*, Cuello en banda (*eri*), Cinturón *Obi* | Caída recta sin curvas de sisa, mangas Furisode de 400-500mm con abertura de muñeca, cuello plano continuo. |
| **`utility_vest`** | 🦺 Chaleco Táctico / Safari / Cargo | Torso recto sin mangas, Cuello chimenea alzado (`stand_collar`), Bolsillos cargo 3D con fuelle (`cargo_bellows`) y solapas | Cuello alzado de 40-60mm, cremallera frontal, bolsillos con fuelle en tira U y solapas con broches. |

## Mapa de Arquitectura del Repositorio

```
pattern-ai-core/
├── .agents/                           # Plano de Control (Arquitecto / Ingeniero)
│   ├── archive/                       # Planes y registros históricos archivados (Fases 1 a 8)
│   ├── skills/                        # Skills de orquestación y desarrollo (agents-workflow v3)
│   ├── AGENTS.md                      # Roles, modo Lean, reglas de aseguramiento y entorno
│   ├── APPCORE.md                     # Arquitectura verificada, contratos y catálogo de blueprints
│   ├── CURRENT.md                     # Estado activo del proyecto, veredicto y siguiente acción
│   ├── CONTEXT.md                     # Crónica de decisiones, auditorías e hitos archivados
│   ├── PLAN.md                        # Puntero al plan activo / borrador
│   └── TESTING.md                     # Matriz de pruebas (21 suites, 548 tests) y verificaciones
├── scripts/                           # Automatizaciones mecánicas (Node.js & Python)
│   ├── test_fireworks_call.js         # Diagnóstico directo de Fireworks API con Qwen 3.8 Max
│   ├── test_fireworks_e2e_image.js    # Prueba E2E de generación multimodal por imagen
│   ├── test_blender_export.js         # Prueba y validación de generación glTF 2.0 / .glb 3D
│   └── export_glb_headless.py         # Script Python bpy para Blender CLI headless
├── rules_pattern_making.md            # Reglas textiles maestras inyectadas al LLM
├── start_web_studio.bat               # Launcher de inicio rápido en 1 clic (build + serve en :3030)
├── src/
│   ├── index.ts                       # Entrypoint del CLI (generate, bundle, serve, export-3d)
│   ├── pipeline.ts                    # Orquestador del pipeline end-to-end (2D + 3D + Bundling)
│   ├── ai/                            # Capa de Proveedores de Inteligencia Artificial
│   │   ├── base_provider.ts           # Interfaz común IAiProvider
│   │   ├── direct_api_provider.ts     # Integración Direct API Fireworks AI (Qwen 3.8 Max)
│   │   ├── prompt_builder.ts          # Matriz de Inspección Ocular y Blueprints Ancla FreeSewing
│   │   ├── mock_provider.ts           # Proveedor Mock para tests offline deterministas
│   │   └── factory.ts                 # Factory según variable AI_PROVIDER ('api' o 'mock')
│   ├── types/                         # Definiciones de tipos TypeScript del ADN
│   │   └── pattern.ts                 # Interfaces del JSON de ADN, medidas, bloques y 3D
│   ├── schema/                        # Validación de Esquemas en Runtime (Zod)
│   │   └── pattern_schema.ts          # Validador determinista de modificaciones y sanitizador
│   ├── engine/                        # Motor Geométrico de Patronaje y 3D (FreeSewing)
│   │   ├── base_blocks/               # Slopers base (torso, sleeve, hood, pocket, trousers, womenswear, skirt)
│   │   ├── modifier.ts                # Modificador paramétrico (tops, bottoms, sets, kimonos, vests, facings, collars, cargo)
│   │   ├── triangulator.ts            # Motor de triangulación 2D Ear-Clipping para moldería textil
│   │   ├── blender_bridge.ts          # Motor de proyección 3D anatómica, glTF 2.0 y materiales PBR
│   │   ├── calibration_box.ts         # Generador del recuadro de calibración 10x10 cm
│   │   ├── exporter.ts                # Renderizado SVG y conversión a PDF continuo/paginado
│   │   ├── tech_sheet.ts              # Ficha técnica industrial (PDF, MD, JSON) con guía de 4 pasos
│   │   └── etsy_bundler.ts            # Empaquetador de ZIP comercial en 7 carpetas y metadatos Etsy
│   ├── utils/
│   │   └── tiler.ts                   # Motor de corte vectorial en grilla A4/Letter con cruces
│   └── server/                        # Servidor API REST Local y Web Studio Dashboard
│       ├── app.ts                     # Servidor HTTP nativo con CORS y servicio de estáticos
│       ├── routes.ts                  # Endpoints REST (/api/generate, /api/patterns, /api/patterns/:slug/glb)
│       └── public/                    # Frontend Web Studio (HTML, CSS, JS, Visor 2D, Visor 3D WebGL)
└── output/                            # Entregables físicos generados (PDFs, SVGs, GLB, ZIPs)
```

## Entregables Físicos del Pipeline End-to-End (12 Archivos por Prenda)

Al ejecutar `generatePatternPipeline({ bundle: true })`, se generan 12 entregables en `output/<concept>/`:
1. `<concept>_continuous.svg`: Patrón continuo 1:1 vectorial multi-capa (XS a 3XL).
2. `<concept>_tiled_a4.pdf`: PDF A4 con cuadro de calibración 10x10cm y cruces de ensamble.
3. `<concept>_tiled_letter.pdf`: PDF US Letter para mercado norteamericano.
4. `<concept>_plotter_a0.pdf`: PDF continuo gran formato A0 para copistería/plotter.
5. `<concept>_techpack.pdf`: Ficha técnica industrial en PDF.
6. `<concept>_techpack.md`: Ficha técnica en Markdown con BOM y guía de confección.
7. `<concept>_techpack.json`: Ficha técnica estructurada JSON para automatizaciones.
8. `<concept>_dna.json`: ADN paramétrico validado por Zod.
9. `<concept>.glb`: Modelo 3D interactivo glTF 2.0 binario con sombreado PBR y despiece.
10. `<concept>_etsy_bundle.zip`: Paquete comercial organizado en 7 carpetas listo para Etsy.
11. `<concept>_etsy_listing_metadata.json`: Metadatos de listing con título, descripción y 13 tags SEO.
12. `README_Etsy_Printing_Instructions.pdf`: Guía ilustrada de impresión y armado para clientes.

## Interfaces y Contrato de Datos (JSON de ADN Paramétrico)

```typescript
interface PatternDna {
  concept_name: string;
  garment_category?: "top" | "bottom" | "dress" | "set" | "kimono" | "haori";
  base_block: "menswear_torso_oversize" | "trousers_sloper" | "womenswear_bodice" | "skirt_sloper" | "wahid" | "simon" | "brian" | "bella" | "paco" | "sandy" | "shin" | "utility_vest" | string;
  ease: {
    chest_ease_mm: number;
    bicep_ease_mm?: number;
    waist_ease_mm?: number;
    hip_ease_mm?: number;
    shoulder_ease_mm?: number;
  };
  modifications: {
    neckline?: {
      type: "crossover_hood" | "crew" | "v_neck" | "collar" | "scoop" | "stand_collar" | "shirt_collar_with_stand" | "mandarin";
      depth_mm?: number;
      width_mm?: number;
      collar_height_mm?: number;
      collar_stand_height_mm?: number;
      collar_point_length_mm?: number;
    };
    sleeves?: {
      type: "drop_shoulder" | "raglan" | "set_in" | "sleeveless" | "furisode_square";
      drop_mm?: number;
      length_type?: "short" | "three_quarters" | "full" | "sleeveless";
    };
    hem?: {
      type: "curved_tail" | "straight" | "pointed" | "split" | "ribbed" | "cropped" | "flared";
      drop_mm?: number;
      peak_drop_mm?: number;
      peak_position_ratio?: number;
      allowance_mm?: number;
    };
    closure?: {
      type: "buttons" | "zipper" | "snaps" | "ties" | "none";
      button_count?: number;
      overlap_mm?: number;
      button_diameter_mm?: number;
      buttonhole_orientation?: "vertical" | "horizontal";
    };
    waistband?: { type: "elastic" | "fitted" | "drawstring" | "rib" | "obi_belt"; height_mm?: number };
    trouser_legs?: { type: "straight" | "wide_baggy" | "slim"; length_type?: "full" | "shorts" | "bermuda"; inseam_mm?: number };
    pocket?: {
      type: "kangaroo" | "welt" | "patch" | "cargo" | "cargo_bellows";
      width_mm?: number;
      height_mm?: number;
      bellows_depth_mm?: number;
      flap?: boolean;
      flap_height_mm?: number;
      count?: number;
    };
    [key: string]: any;
  };
  sizing: {
    size?: StandardSize;
    target_sizes?: Array<"XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL">;
    custom_measurements?: Partial<Record<string, number>>;
  };
  tech_specs?: {
    notions: string[];
    estimated_fabric_meters: number;
    seam_allowance_mm: number;
    hem_allowance_mm: number;
    fabric_type?: string;
  };
  notions?: string[];
  estimated_fabric_meters?: number;
}
```

## External Systems y Dependencias

- **FreeSewing Core v3:** Motor de patronaje paramétrico basado en Node.js.
- **Zod:** Validación de esquemas en runtime.
- **PDFKit / svg-to-pdfkit:** Ensamblado y renderizado de archivos PDF vectoriales con capas y tiling.
- **Fireworks AI API:** Inferencia multimodal de alta precisión (`accounts/fireworks/models/qwen3p8-max`).
- **WebGL / Three.js (con fallback nativo):** Renderizado tridimensional interactivo con sombreado PBR y despiece.
- **Blender 5.1 CLI (Opcional Headless):** Soporte complementario de renderizado y horneado.
- **Etsy:** Canal de comercialización digital de patrones empaquetados en ZIP de 7 carpetas.

Only verified, durable facts belong here. Changing state belongs in CURRENT.


