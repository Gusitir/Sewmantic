# PLAN v0.1 - MVP Generador Paramétrico de Patrones IA

Status: active
Goal: Construir el MVP CLI de generación paramétrica de patrones textiles con FreeSewing v3 y AI Provider Factory, exportando PDF paginado A4/Letter con cuadro de calibración de 10x10 cm, capas por talla y ficha técnica de corte.
Assurance: Lean

## Matriz de Tareas y Asignación de Roles

| Tarea | Descripción | Rol Principal | Rol Secundario | Puerta Determinista |
|---|---|---|---|---|
| **T-01** | Setup del entorno TypeScript, scripts y reglas textiles | Obrero / Script | Ingeniero (Review) | `npm run build` |
| **T-02** | Contrato de datos, tipos TypeScript y validación Zod | Ingeniero | Obrero | `npm test` |
| **T-03** | AI Provider Subsystem (OpenCode CLI, Direct API, Factory) | Ingeniero | Obrero | `npm test` |
| **T-04** | Integración de Slopers Base FreeSewing v3 | Ingeniero | Obrero | `npm test` |
| **T-05** | Motor de Modificación Paramétrica (Ease, Notches, Grainline) | Ingeniero | Obrero | `npm test` |
| **T-06** | Motor de Tiling (A4/Letter), Cruces y Cuadro de Calibración | Ingeniero | Obrero | `npm test` |
| **T-07** | Generador de Fichas Técnicas de Confección y Consumo | Obrero | Ingeniero | `npm test` |
| **T-08** | CLI Entrypoint y Pipeline de Generación End-to-End | Obrero | Ingeniero (Audit) | `npm test` |

---

## Detalle de Tareas

### T-01 - Setup del proyecto TypeScript, automatizaciones y reglas de patronaje

- Status: done
- Depends on: none
- Scope: `package.json`, `tsconfig.json`, `.gitignore`, `rules_pattern_making.md`, `scripts/build.ps1`, `scripts/test_gate.ps1`, `src/index.ts`
- Rol: Obrero (Scaffolding y dependencias) con supervisión de Ingeniero.
- Acceptance:
  - [x] Proyecto Node.js/TypeScript inicializado con dependencias: `@freesewing/core`, `zod`, `commander`, `pdfkit`, `svg-to-pdfkit`, `dotenv`, `vitest`, `typescript`, `@types/node`.
  - [x] `tsconfig.json` configurado estrictamente (`strict: true`, `target: ES2022`, `moduleResolution: NodeNext`).
  - [x] `rules_pattern_making.md` creado con las reglas textiles maestras (holguras de confort vs diseño, marcas técnicas, piquetes, márgenes, proporciones).
  - [x] Scripts mecánicos en `scripts/` para compilación (`build.ps1`) y verificación de puertas (`test_gate.ps1`).
  - [x] `npm run build` compila limpiamente sin advertencias.
- Gates: `npm run build`
- Human checks: none
- Risk triggers: none
- STOP when: Errores en resolución de módulos o dependencias incompatibles con Node.

---

### T-02 - Contrato de datos y validador de ADN Paramétrico (Zod + TypeScript)

- Status: done
- Depends on: T-01
- Scope: `src/types/pattern.ts`, `src/schema/pattern_schema.ts`, `tests/schema.test.ts`
- Rol: Ingeniero (Diseño de tipos y validación exhaustiva).
- Acceptance:
  - [x] Definición de tipos estáticos TypeScript para `PatternDna`, `EaseSettings`, `ModificationTree`, `SizeGrading` y `TechSpecs`.
  - [x] Esquema Zod robusto con validaciones de límites numéricos (ej: holguras mínimas/máximas válidas, márgenes tolerables).
  - [x] Función sanitizadora y parseadora que acepte respuestas JSON de LLMs, limpie bloques markdown y valide la estructura.
  - [x] Suite de pruebas unitarias cubriendo casos válidos, casos límites y rechazo explícito de esquemas inválidos.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Definición incompleta de modificaciones requeridas por los slopers.
- STOP when: El validador rechaza esquemas válidos o no reporta errores detallados en fallos.

---

### T-03 - AI Provider Subsystem & Factory (Agy CLI, OpenCode CLI, Direct API)

- Status: done
- Depends on: T-02
- Scope: `src/ai/base_provider.ts`, `src/ai/agy_cli_provider.ts`, `src/ai/opencode_cli_provider.ts`, `src/ai/direct_api_provider.ts`, `src/ai/prompt_builder.ts`, `src/ai/factory.ts`, `src/ai/mock_provider.ts`, `tests/ai_provider.test.ts`
- Rol: Ingeniero (Lógica de proveedor y prompts) / Obrero (Implementación SDK/CLI).
- Acceptance:
  - [x] Interfaz `IAiProvider` con método `generatePatternDna(prompt: string, imagePath?: string): Promise<PatternDna>`.
  - [x] `PromptBuilder` que inyecta automáticamente `rules_pattern_making.md` y restringe la respuesta a JSON puro sin alucinaciones.
  - [x] `AgyCliProvider` para ejecución directa usando `agy.exe -p ... --model "gemini-3.7-flash"` para tareas de razonamiento y análisis visual.
  - [x] `OpencodeCliProvider` para ejecución desacoplada invocando el CLI de OpenCode / ChatGPT.
  - [x] `DirectApiProvider` para integración directa con OpenAI / Anthropic Claude.
  - [x] `MockProvider` para pruebas deterministas sin consumo de cuota ni dependencia de internet.
  - [x] `AiProviderFactory` que selecciona el proveedor vía `process.env.AI_PROVIDER` (por defecto `agy` durante pruebas).
- Gates: `npm test`
- Human checks: none
- Risk triggers: Manejo de errores en CLI externo y sanitización de salida LLM.
- STOP when: Fallos en timeout o parsing de respuesta de los proveedores.

---

### T-04 - Slopers Base de FreeSewing v3 (Torso, Manga, Capucha, Bolsillo)

- Status: done
- Depends on: T-02
- Scope: `src/engine/base_blocks/torso.ts`, `src/engine/base_blocks/sleeve.ts`, `src/engine/base_blocks/hood.ts`, `src/engine/base_blocks/pocket.ts`, `src/engine/base_blocks/index.ts`, `tests/base_blocks.test.ts`
- Rol: Ingeniero (Cálculos de FreeSewing y puntos de anclaje paramétricos).
- Acceptance:
  - [x] Implementación o adaptación de slopers base usando la API de FreeSewing v3 (delantero, espalda, manga, capucha de 2/3 piezas, bolsillo canguro).
  - [x] Definición clara de puntos geométricos de anclaje (`neck`, `shoulder`, `armhole`, `sideSeam`, `wrist`, `hem`).
  - [x] Tablas de medidas estándar (XS a 3XL) en milímetros integradas.
  - [x] Tests unitarios que verifiquen que los bloques base generen geometría cerrada y válida.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Incompatibilidades con métodos internos de FreeSewing.
- STOP when: Curvas bezier abiertas o geometrías con errores de auto-intersección.

---

### T-05 - Motor de Modificación Paramétrica (Modifier Engine)

- Status: done
- Depends on: T-04
- Scope: `src/engine/modifier.ts`, `src/engine/geometry_utils.ts`, `tests/modifier.test.ts`
- Rol: Ingeniero (Cálculos geométricos, rediseño de sisas/copas, holguras y notches).
- Acceptance:
  - [x] Aplicación determinista de modificaciones del JSON sobre los slopers base (hombro caído, escote profundo, silueta oversize, dobladillo curvo).
  - [x] Algoritmo de ajuste armónico sisa-manga: el perímetro de la copa de manga se recalcula y ajusta automáticamente a la sisa modificada.
  - [x] Generación automática de **Línea de Hilo (*grainline*)** en el 100% de las piezas.
  - [x] Cálculo geométrico de **Piquetes de Coincidencia (*notches*)** con distancias exactas de ensamblado.
  - [x] Inclusión de márgenes de costura parametrizables (10 mm estándar, 25-30 mm en bajos).
  - [x] Tests unitarios que validen la consistencia de perímetros de unión antes y después de modificar.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Deformación de curvatura en copas de manga o incompatibilidad de perímetros.
- STOP when: La diferencia de longitud entre costuras que deben unirse supera los 3 mm de tolerancia.

---

### T-06 - Motor de Tiling (A4/Letter), Cruces de Registro y Cuadro de Calibración 10x10 cm

- Status: done
- Depends on: T-05
- Scope: `src/utils/tiler.ts`, `src/engine/exporter.ts`, `src/engine/calibration_box.ts`, `tests/tiler.test.ts`
- Rol: Ingeniero (Matemática de grilla vectorial) / Obrero (Generación PDF).
- Acceptance:
  - [x] Algoritmo de Tiling que proyecta el patrón completo sobre una grilla paginada para A4 (210x297 mm) y US Letter (215.9x279.4 mm) con márgenes de impresión seguros.
  - [x] Generación de cruces de registro con coordenadas de ensamble (ej: Fila A, Columna 1 -> A1, A2... B1, B2).
  - [x] **Requisito Crítico:** Cuadro de calibración de **100 mm x 100 mm (10 cm x 10 cm)** en la **Página 1** con escala milimétrica/pulgadas y advertencia explícita "100% SCALE - DO NOT FIT TO PAGE".
  - [x] Soporte para exportación en capas PDF por talla (XS a 3XL).
  - [x] Exportación simultánea a SVG/PDF continuo A0 (para plotter y corte láser).
- Gates: `npm test`
- Human checks: H-01, H-02
- Risk triggers: Desfase de escala en rasterizado o márgenes incorrectos en PDFKit.
- STOP when: El cuadro de calibración no mida exactamente 100x100 mm en el espacio vectorial del PDF.

---

### T-07 - Generador de Fichas Técnicas de Armado y Consumo de Tela

- Status: ready
- Depends on: T-05
- Scope: `src/engine/tech_sheet.ts`, `tests/tech_sheet.test.ts`
- Rol: Obrero (Plantilla y maquetación de ficha) / Ingeniero (Cálculo de consumo).
- Acceptance:
  - [ ] Cálculo matemático de consumo de tela estimado en metros (ancho 1.50 m estándar) según el área total de las piezas con márgenes.
  - [ ] Generación de ficha técnica en PDF/Markdown con:
    - Lista de piezas de corte (cantidades y material: tela principal, rib, entretela).
    - Lista de avíos y materiales requeridos (*notions*).
    - Guía secuencial de pasos de confección y orden de costura.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Subestimación de consumo de tela por no contemplar desperdicio de acomodo.
- STOP when: El cálculo de tela no incluya al menos un 10% de margen de holgura de corte.

---

### T-08 - CLI Entrypoint, Automatizaciones y Pipeline End-to-End

- Status: ready
- Depends on: T-03, T-06, T-07
- Scope: `src/index.ts`, `scripts/gen_sample.ps1`, `tests/e2e.test.ts`
- Rol: Obrero (Comandos CLI y scripts) / Ingeniero (Auditoría final y pruebas e2e).
- Acceptance:
  - [ ] CLI implementado con subcomandos:
    - `pattern generate -p "hoodie oversize con capucha cruzada" --format a4,letter,a0 --sizes S,M,L,XL`
    - `pattern calibrate --format a4` (exporta hoja de prueba rápida).
    - `pattern inspect <dna.json>` (valida y previsualiza).
  - [ ] Pipeline end-to-end probado: Concepto/Prompt -> ADN JSON validado -> Sloper modificado -> PDF A4 paginado con calibrador + PDF A0 + Ficha técnica en `output/`.
  - [ ] Script automatizado `scripts/gen_sample.ps1` que genera un set de prueba completo con un solo comando.
- Gates: `npm test`
- Human checks: H-01, H-02, H-03, H-04
- Risk triggers: Error de integración general entre módulos.
- STOP when: El CLI falle en cualquier etapa del pipeline o no genere los archivos esperados en `output/`.

---

## Closure gate

- [ ] Todas las tareas (`T-01` a `T-08`) con veredicto APTO.
- [ ] Pruebas humanas (`H-01`, `H-02`, `H-03`, `H-04`) completadas y documentadas en `TESTING.md`.
- [ ] Barrido de coherencia de fase y estado completado.
- [ ] `CURRENT.md`, `INDEX.md`, `APPCORE.md`, `TESTING.md` y Git en perfecto acuerdo.
