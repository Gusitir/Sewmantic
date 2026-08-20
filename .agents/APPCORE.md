# APPCORE - Generador Paramétrico de Patrones IA

Verified: 2026-08-20 at phase-4-reindex

## Purpose and users

- **Problema:** La generación visual directa de patrones por IA (alucinación vectorial pura) produce prendas físicamente imposibles de confeccionar. Este sistema resuelve el problema desacoplando la creatividad de la IA de la precisión geométrica mediante un motor de patronaje determinista (FreeSewing v3).
- **Usuarios Objetivo:**
  - *Diseñador / Prototipador:* Generación de prendas de autor y siluetas streetwear de alta costura conceptual para el universo **MyPetCreature** adaptadas a medidas biométricas exactas o a partir de bocetos/imágenes.
  - *Comercialización Digital (Etsy):* Exportación automatizada de paquetes comerciales de patrones en PDF (A4/Letter con capas por talla y A0 Plotter) empaquetados en un archivo `.zip` con guía de impresión y metadatos SEO listos para publicar.
- **Non-goals:**
  - Exportación de curvas vectoriales directas no parametrizadas ni ancladas a slopers base.
  - Infraestructura SaaS multi-usuario pesada (foco en aplicación local de alto rendimiento y Web Studio 2D nativo).

## Invariantes y Reglas Técnicas Inmutables

1. **Determinismo Geométrico:** La IA jamás genera coordenadas SVG arbitrarias. La IA únicamente produce un **JSON Paramétrico de ADN** que parametriza bloques base (slopers) pre-validados.
2. **Separación de Holguras (*Ease Allocation*):**
   - *Holgura de confort:* +2 a +4 cm mínimos sobre el contorno anatómico para permitir movilidad y respiración.
   - *Holgura de diseño (oversize/streetwear):* +12 a +25 cm adicionales según la silueta conceptual.
3. **Calibración Obligatoria de Impresión:** La Página 1 de todo PDF paginado incluye obligatoriamente un recuadro de calibración de **10 cm x 10 cm (4 in x 4 in)** a escala 100% con advertencia visual de no aplicar escala ("Do not scale / Print at 100%").
4. **Marcado Técnico Paramétrico:**
   - Línea de hilo de tela (*grainline*) en el 100% de las piezas de corte.
   - Piquetes de coincidencia (*notches*) calculados geométricamente por longitud de arco en uniones críticas (sisa-manga, costados, tiros, rodillas).
   - Márgenes de costura (*seam allowances*) configurables (10 mm estándar, 25-30 mm en dobladillos).
5. **Estratificación por Capas (*PDF & SVG Layers*):** Exportación con tallas separadas en capas (XS a 3XL) para permitir impresión y visualización selectiva sin saturación.
6. **Blindaje Legal de Propiedad Intelectual:** Los metadatos y nombres generados usan exclusivamente terminología descriptiva sin marcas registradas de terceros.
7. **Escala Vectorial de Impresión Exacta:** Factor de conversión estricto $1\text{ mm} = 72 / 25.4 \approx 2.834645669\text{ pt}$. El recuadro de calibración de $100\text{ mm}$ se genera con exactamente $283.465\text{ pt}$ sin distorsiones de márgenes.
8. **Módulos ESM / NodeNext:** Configuración TypeScript obligatoria en `NodeNext` para compatibilidad completa con `@freesewing/core` v3.
9. **Factor de Merma Textil:** Todo cálculo de consumo de tela debe incluir un factor de merma y desperdicio de corte de al menos un 10% a 15% sobre el área neta.
10. **Tolerancia Matemática de Entrepierna y Sisa:** $\Delta \le 3\text{ mm}$ estricto en costuras de emparejamiento (tiro delantero vs espalda, copa de manga vs sisa de torso).

## Mapa de Arquitectura

```
pattern-ai-core/
├── .agents/                           # Plano de Control (Arquitecto)
│   ├── archive/                       # Planes y registros históricos archivados
│   └── skills/                        # Skills de orquestación y desarrollo
├── scripts/                           # Automatizaciones mecánicas (build, test, verify)
├── rules_pattern_making.md            # Reglas textiles maestras inyectadas al LLM
├── start_web_studio.bat               # Launcher de inicio rápido en 1 clic
├── src/
│   ├── index.ts                       # Entrypoint del CLI (Commander) y subcomandos
│   ├── pipeline.ts                    # Orquestador del pipeline end-to-end de moldería
│   ├── ai/                            # Capa de Proveedores de Inteligencia Artificial
│   │   ├── base_provider.ts           # Interfaz común IAiProvider
│   │   ├── direct_api_provider.ts     # Integración Direct API Fireworks AI (Qwen 3.7 Plus)
│   │   ├── prompt_builder.ts          # Inyector de reglas textiles y system prompts
│   │   ├── mock_provider.ts           # Proveedor Mock para tests offline deterministas
│   │   └── factory.ts                 # Factory según variable AI_PROVIDER ('api' o 'mock')
│   ├── types/                         # Definiciones de tipos TypeScript del ADN
│   │   └── pattern.ts                 # Interfaces del JSON de ADN, medidas y bloques
│   ├── schema/                        # Validación de Esquemas en Runtime (Zod)
│   │   └── pattern_schema.ts          # Validador determinista de modificaciones y sanitizador
│   ├── engine/                        # Motor Geométrico de Patronaje (FreeSewing)
│   │   ├── base_blocks/               # Slopers base (torso, sleeve, hood, pocket, trousers)
│   │   ├── modifier.ts                # Modificador paramétrico (prendas superiores, inferiores y sets)
│   │   ├── calibration_box.ts         # Generador del recuadro de calibración 10x10 cm
│   │   ├── exporter.ts                # Renderizado SVG y conversión a PDF continuo/paginado
│   │   ├── tech_sheet.ts              # Generador de ficha técnica industrial (PDF, MD, JSON)
│   │   └── etsy_bundler.ts            # Empaquetador de ZIP comercial y metadatos Etsy
│   ├── utils/
│   │   └── tiler.ts                   # Motor de corte vectorial en grilla A4/Letter con cruces
│   └── server/                        # Servidor API REST Local y Web Studio Dashboard
│       ├── app.ts                     # Servidor HTTP nativo con CORS y servicio de estáticos
│       ├── routes.ts                  # Endpoints REST (/api/generate, /api/patterns, etc.)
│       └── public/                    # Frontend Web Studio (HTML, CSS, JS, Visor 2D)
└── output/                            # PDFs, SVGs, Fichas técnicas y ZIPs generados
```

## Interfaces y Contrato de Datos (JSON de ADN Paramétrico)

```typescript
interface PatternDna {
  concept_name: string;
  garment_category?: "top" | "bottom" | "dress" | "set";
  base_block: "menswear_torso_oversize" | "trousers_sloper" | "straw_pirate_vest" | string;
  ease: {
    chest_ease_mm: number;
    bicep_ease_mm: number;
    waist_ease_mm?: number;
    hip_ease_mm?: number;
  };
  modifications: {
    neckline?: { type: "crossover_hood" | "crew" | "v_neck"; depth_mm: number; width_mm?: number };
    sleeves?: { type: "drop_shoulder" | "raglan" | "set_in" | "sleeveless"; drop_mm?: number };
    hem?: { type: "curved_tail" | "straight" | "cropped" | "fringed_pirate" | "double_point"; drop_mm?: number };
    waistband?: { type: "elastic" | "fitted" | "drawstring" | "rib"; height_mm?: number };
    trouser_legs?: { type: "straight" | "wide_baggy" | "slim"; length_type?: "full" | "shorts" | "bermuda" };
    pockets?: { type: "kangaroo" | "welt" | "patch" | "cargo" | "slash"; width_mm?: number; height_mm?: number };
    [key: string]: any;
  };
  sizing: {
    target_sizes: Array<"XS" | "S" | "M" | "L" | "XL" | "2XL" | "3XL">;
    custom_measurements?: Partial<Record<string, number>>;
  };
  notions: string[];
  estimated_fabric_meters: number;
}
```

## External Systems y Dependencias

- **FreeSewing Core v3:** Motor de patronaje paramétrico basado en Node.js.
- **Zod:** Validación de esquemas en runtime.
- **PDFKit / svg-to-pdfkit:** Ensamblado y renderizado de archivos PDF vectoriales con capas y tiling.
- **Fireworks AI API:** Proveedor de inferencia para modelos multimodales (`accounts/fireworks/models/qwen3p7-plus`).
- **Etsy:** Canal de comercialización digital de patrones empaquetados en ZIP.

Only verified, durable facts belong here. Changing state belongs in CURRENT.
