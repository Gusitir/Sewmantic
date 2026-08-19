# CONTEXT - chronological log

Normal operation is append-only. Add new entries at the bottom.
Only explicit MAINTAIN or COMPACT may summarize old entries; preserve dates,
decisions, unresolved risks, task/commit references, and an archive pointer.

## 2026-08-17T23:20:00-05:00 - INIT (agents-workflow)

# CONTEXT - chronological log

Normal operation is append-only. Add new entries at the bottom.
Only explicit MAINTAIN or COMPACT may summarize old entries; preserve dates,
decisions, unresolved risks, task/commit references, and an archive pointer.

## 2026-08-17T23:20:00-05:00 - INIT (agents-workflow)

- Changed: Inicialización del plano de control `.agents/` y registro de la skill `agents-workflow` en modo LEAN.
- Decision and reason: Se adoptó el perfil de aseguramiento LEAN y la arquitectura técnica definida en `project_blueprint.md` para el desarrollo del MVP de Generador Paramétrico de Patrones IA (Node.js + FreeSewing + TypeScript + AI Provider Factory).
- Evidence: Inicialización de Git local (`git init`), creación de `AGENTS.md`, `APPCORE.md`, `CURRENT.md`, `INDEX.md`, `TESTING.md`, `PLAN_v0.1-mvp.md`.
- Unresolved: Ninguno.
- Next: Despachar T-01.

## 2026-08-17T23:30:00-05:00 - MULTI-AGENT ORCHESTRATION & REFINED PLAN (Arquitecto)

- Changed: Definición formal de la jerarquía de roles (Arquitecto, Ingeniero, Obrero, Scripts mecánicos) y refinamiento exhaustivo de `PLAN_v0.1-mvp.md` (desglose ampliado de 8 tareas con contratos claros).
- Decision and reason: El Arquitecto mantiene la visión global y auditorías; el Ingeniero asume la complejidad lógica/geométrica de FreeSewing y mini-auditorías; el Obrero implementa el código directo; las tareas mecánicas se delegan a scripts en `scripts/`.
- Evidence: Registro de subagentes en el sistema, actualización de `AGENTS.md`, `APPCORE.md`, `CURRENT.md`, `INDEX.md`, `PLAN_v0.1-mvp.md`.
- Unresolved: Ninguno.
- Next: Despachar T-01 al Obrero / Scripts con supervisión del Ingeniero.

## 2026-08-17T23:43:00-05:00 - TASK T-01 VERDICT APTO (Arquitecto / Ingeniero)

- Changed: Implementación de infraestructura base, configuración TypeScript ESM/NodeNext, dependencias de FreeSewing v3, scripts en `scripts/` y documento de reglas de patronaje `rules_pattern_making.md`.
- Decision and reason: El Obrero implementó el scaffolding y el Ingeniero ejecutó la mini-auditoría con evidencia empírica (`npm run build` exit code 0). Arquitecto emite veredicto APTO y realiza commit `[T-01]`.
- Evidence: Commit `[T-01] setup typescript project, build scripts and pattern making rules` (hash: `66d2ef8`).
- Unresolved: Ninguno.
- Next: Despachar T-02 al Ingeniero (Esquemas Zod y Contratos de Datos Paramétricos).

## 2026-08-17T23:46:00-05:00 - TASK T-02 VERDICT APTO (Arquitecto / Ingeniero)

- Changed: Definición de tipos estáticos TypeScript (`src/types/pattern.ts`), esquemas de validación Zod con límites físicos textiles (`src/schema/pattern_schema.ts`), desinfectador/sanitizador de salidas LLM y suite de 31 pruebas unitarias (`tests/schema.test.ts`).
- Decision and reason: El Ingeniero diseñó e implementó los esquemas Zod con validaciones de límites de holguras y sanitización de markdown LLM. Puerta determinista `npm test` superada al 100% (31/31 tests pasando en 13ms). Arquitecto emite veredicto APTO y realiza commit `[T-02]`.
- Evidence: Commit `[T-02] define parametric DNA TypeScript contracts, Zod schema validation and LLM sanitization suite` (hash: `3e1207e`).
- Unresolved: Ninguno.
- Next: Despachar T-03 al Ingeniero / Obrero (AI Provider Subsystem & Factory con Agy CLI, Gemini 3.7 Flash, OpenCode y Direct API).

## 2026-08-17T23:49:00-05:00 - TASK T-03 VERDICT APTO & CLOSE PHASE 1.1 (Arquitecto / Ingeniero)

- Changed: Implementación completa de la capa de proveedores IA (`src/ai/`): `IAiProvider`, `AgyCliProvider` con streaming `stdin` y Gemini 3.7 Flash, `OpencodeCliProvider`, `DirectApiProvider`, `MockAiProvider`, `PromptBuilder` y `AiProviderFactory`. Suite de 28 tests en `tests/ai_provider.test.ts`.
- Decision and reason: El Ingeniero implementó y auditó la capa de proveedores. Puerta determinista `npm test` superada al 100% (59/59 tests unitarios totales pasando). Fase 1.1 (Setup, Contratos y AI Provider) completada satisfactoriamente.
- Evidence: Commit `[T-03] implement AI provider subsystem with Agy CLI, OpenCode, Direct API, Mock and Factory` (hash: `df6a672`).
- Unresolved: Ninguno.
- Next: Despachar T-04 al Ingeniero (Fase 1.2: Slopers Base de FreeSewing v3).

## 2026-08-17T23:52:00-05:00 - TASK T-04 VERDICT APTO (Arquitecto / Ingeniero)

- Changed: Implementación de slopers base anatómicos (`src/engine/base_blocks/`): tablas antropométricas estándar XS a 3XL (`measurements.ts`), bloque de torso delantero y espalda con escotes/sisas anatómicas (`torso.ts`), bloque de manga con copa y ancho de bíceps (`sleeve.ts`), capucha estándar y cruzada (`hood.ts`), bolsillos canguro y parche (`pocket.ts`) y motor geométrico 2D (`geometry.ts`). Suite de 51 tests en `tests/base_blocks.test.ts`.
- Decision and reason: El Ingeniero implementó y auditó los slopers base. Puerta determinista `npm test` superada al 100% (110/110 tests pasando en 618ms). Geometría cerrada válida y anclajes consistentes. Arquitecto emite veredicto APTO y realiza commit `[T-04]`.
- Evidence: Commit `[T-04] implement base sloper blocks for torso, sleeve, hood and pockets with standard size tables` (hash: `a9f729a`).
- Unresolved: Ninguno.
- Next: Despachar T-05 al Ingeniero (Motor de Modificación Paramétrica y Ajuste Sisa-Manga).

## 2026-08-17T23:55:00-05:00 - TASK T-05 VERDICT APTO & CLOSE PHASE 1.2 (Arquitecto / Ingeniero)

- Changed: Implementación del motor de modificación paramétrica (`src/engine/modifier.ts`): transformaciones de holgura, escotes (crossover hood, crew, v_neck), mangas (drop shoulder, set_in), dobladillos (curved tail, straight, cropped, split, ribbed), integración de bolsillos y algoritmo de armonización sisa-manga con tolerancia $\le 3\text{ mm}$. Generación de grainlines, notches pareados y márgenes de costura. Suite de 37 tests en `tests/modifier.test.ts`.
- Decision and reason: El Ingeniero implementó y auditó el motor de modificación. Puerta determinista `npm test` superada al 100% (147/147 tests unitarios totales pasando). Fase 1.2 (Motor Geométrico FreeSewing) completada satisfactoriamente.
- Evidence: Commit `[T-05] implement parametric pattern modifier with harmonic armhole-sleeve adjustment and technical markings` (hash: `2e9e947`).
- Unresolved: Ninguno.
- Next: Despachar T-06 al Ingeniero / Obrero (Fase 1.3: Motor de Tiling A4/Letter y Calibrador 10x10 cm).

## 2026-08-17T23:58:00-05:00 - TASK T-06 VERDICT APTO (Arquitecto / Ingeniero)

- Changed: Implementación del motor de Tiling y Exportación vectorial (`src/engine/calibration_box.ts`, `src/utils/tiler.ts`, `src/engine/exporter.ts`). Cuadro de calibración de 100x100 mm (283.465 pt exactos) inyectado obligatoriamente en Página 1. Tiling de hojas A4 y US Letter con cruces alfanuméricas A1-An, solapes y mapa de ensamble. Exportación continua SVG y PDF A0/Plotter y multipágina por tallas. Suite de 19 tests en `tests/tiler.test.ts`.
- Decision and reason: El Ingeniero implementó y auditó el motor de exportación y tiling. Puerta determinista `npm test` superada al 100% (166/166 tests unitarios totales pasando). Cumple al 100% la regla textil de calibración y paginación. Arquitecto emite veredicto APTO y realiza commit `[T-06]`.
- Evidence: Commit `[T-06] implement A4/Letter vector tiling engine with 10x10cm calibration box on page 1 and PDF/SVG exporter` (hash: `2162ffd`).
- Unresolved: Pruebas físicas de impresión H-01 y ensamble H-02 pendientes para barrera humana final en Phase 1.4.
- Next: Despachar T-07 al Ingeniero (Generador de Fichas Técnicas de Confección y Consumo).

## 2026-08-18T00:02:00-05:00 - TASK T-07 VERDICT APTO & CLOSE PHASE 1.3 (Arquitecto / Ingeniero)

- Changed: Implementación del generador de fichas técnicas industriales (`src/engine/tech_sheet.ts`): fórmulas de consumo textil en metros lineales con merma $\ge 10\%$ (15% default), lista detallada de piezas de corte con orientación de grainline y márgenes, lista BOM de avíos/mercería, guía de confección en 9 pasos con maquinaria y puntadas ISO, tabla de medidas terminadas POM para tallas XS-3XL, y exportadores a Markdown, JSON y PDF. Suite de 16 tests en `tests/tech_sheet.test.ts`.
- Decision and reason: El Ingeniero implementó y auditó la ficha técnica. Puerta determinista `npm test` superada al 100% (182/182 tests unitarios totales pasando). Fase 1.3 (Tiling, Calibración y Ficha Técnica) completada satisfactoriamente.
- Evidence: Commit `[T-07] implement tech pack generator with fabric consumption costing, assembly guide and PDF/Markdown/JSON export` (hash: `cce7482`).
- Unresolved: Ninguno.
- Next: Despachar T-08 al Obrero / Ingeniero (Fase 1.4: CLI y Pipeline End-to-End).

## 2026-08-18T00:06:00-05:00 - TASK T-08 VERDICT APTO & ENTER HUMAN VERIFICATION BARRIER (Arquitecto / Ingeniero)

- Changed: Implementación del orquestador del pipeline end-to-end (`src/pipeline.ts`), CLI Commander completo con 5 comandos (`src/index.ts`), script de automatización (`scripts/gen_sample.ps1`) y suite de pruebas e2e (`tests/e2e.test.ts`). Generación y verificación de 8 entregables en `output/streetwear_oversize_hoodie/`.
- Decision and reason: El Ingeniero implementó y auditó el pipeline end-to-end. Puerta determinista `npm test` superada con 193/193 tests (100% éxito) y `scripts/gen_sample.ps1` verificado. Todas las tareas de ingeniería y código del MVP (`T-01` a `T-08`) han concluido con éxito. Se activa la BARRERA DE PARADA HUMANA obligatoria para pruebas físicas (`H-01` y `H-02`).
- Evidence: Commit `[T-08] implement unified CLI, end-to-end pattern pipeline and sample automation` (hash: `bd16a53`).
- Unresolved: Pruebas físicas de impresión H-01 y ensamble H-02 pendientes de ejecución por el usuario.
- Next: Veredicto BLOCKED: Awaiting Human Verification. Esperar confirmación manual del usuario para cierre formal del hito MVP.

## 2026-08-18T00:18:00-05:00 - TILING ENHANCEMENT & ASSEMBLY GUIDES REFINEMENT (Arquitecto / Ingeniero)

- Changed: Rediseño y enriquecimiento visual de las marcas de ensamble en todas las hojas paginadas A4 y Letter (`src/utils/tiler.ts`, `src/engine/exporter.ts`).
- Enhancements:
  1. Marco perimetral sólido de alto contraste con franja punteada de solape.
  2. Diamantes de alineación $\blacktriangleright$, $\blacktriangleleft$, $\blacktriangledown$, $\blacktriangle$ en los 4 bordes para ensamble emparejado con etiquetas claras (`▲ UNIR CON [A1]`, etc.).
  3. Dianas ópticas con doble círculo y cruces de registro de 16pt en las 4 esquinas con etiqueta en negrita `[ A1 ]`.
  4. Marca de agua central grande y Brújula de Cuadrícula en cada hoja indicando posición (`HOJA A2`) y sus 4 vecinos (`▲ A1`, `◄ A1`, `A3 ►`, `▼ B2`).
  5. Banner superior e instrucción inferior explícita de corte y solape.
  6. Filtrado de intersección de piezas y etiquetas sobreimpresas con badge blanco para eliminar texto flotante en hojas adyacentes.
- Evidence: Commit `[T-06] upgrade tiling registration marks with edge alignment diamonds, high-contrast frames, and central orientation compass` (hash: `41e9ae6`), 193 tests PASS, `gen_sample.ps1` regenerado.

## 2026-08-18T00:30:00-05:00 - FIX PDF TILED LETTER & A4 AUTO PAGE BREAKS (Arquitecto / Ingeniero)

- Changed: Corrección del cálculo de intersección de piezas en `calculateTileGrid` y resolución del salto automático de página (`PDFDocument.continueOnNewPage`) en PDFKit.
- Root Cause:
  1. En `calculateTileGrid`, se sumaba incorrectamente `piece.offsetX_mm` a `piece.bounds_mm.minX` (que ya estaba en coordenadas globales), desplazando erróneamente piezas como capucha y bolsillo fuera de la grilla y causando omisiones erróneas.
  2. En `exportTiledPdf`, al dibujar el texto de etiqueta de pieza con coordenadas $Y > 800\text{ pt}$ dentro de `doc.translate()`, el `LineWrapper` interno de PDFKit detectaba desbordamiento vertical e insertaba páginas en blanco intercaladas.
- Solution:
  1. Se corrigió el cálculo de límites globales en `calculateTileGrid` (`pMinX = piece.bounds_mm.minX`).
  2. Se trasladó el dibujo de etiquetas a coordenadas locales de página no transformadas con `lineBreak: false`, eliminando el 100% de los saltos de página espurios.
  3. Resultados exactos verificados: A4 = 24 páginas exactas (1 Portada + 23 Hojas con moldería activa), Letter = 27 páginas exactas (1 Portada + 26 Hojas con moldería activa), 0 páginas en blanco intercaladas.
- Evidence: Commits `[T-06]` (hashes `f5feecf`, `ef5a55c`), 193 tests PASS, `gen_sample.ps1` regenerado.

## 2026-08-18T00:50:00-05:00 - CLOSE PHASE 1.0 (MVP SAVEPOINT ENTREGADO Y VALIDADO) (Arquitecto)

- Decision and reason: Cierre formal del hito MVP Fase 1 (`T-01` a `T-08`). El usuario realizó la verificación digital completa del ensamble de hojas A4 mediante **PDFStitcher**, confirmando continuidad geométrica absoluta de curvas Bézier en todas las piezas (delantero, espalda, manga, capucha y bolsillo), alineación precisa de notches y grainlines, y exactitud de escala 1:1.
- Deliverables Verified:
  1. `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_tiled_a4.pdf` (Multi-página A4 con portada comercial, 5 pasos de ensamble y cuadro de calibración de 10x10 cm).
  2. `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_tiled_letter.pdf` (Multi-página US Letter).
  3. `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_plotter_a0.pdf` (Plano continuo A0 con reglas métricas continuas y cartela técnica).
  4. `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_continuous.svg` (SVG vectorial por capas de tallas).
  5. `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_techpack.pdf` (Ficha técnica de corte y confección en PDF editorial).
  6. `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_techpack.md` (Ficha técnica estructurada en Markdown).
  7. `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_dna.json` (ADN paramétrico validado con Zod).
  8. `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_techpack.json` (Datos de consumo, BOM y medidas POM en JSON).
- Verdict: **APTO (Fase 1 MVP Cerrada con Éxito - 193/193 Tests PASS)**.
- Evidence: Verificación visual y funcional en PDFStitcher. Commit `[STATE] close phase 1.0 (MVP Generador Paramétrico de Patrones IA - 100% Verified)`.
- Next: Planificación y diseño de Fase 2 (Personalización de medidas cliente, UI Web / visor 3D de patronaje).

## 2026-08-18T02:10:00-05:00 - PHASE 2 KICKOFF: EXPANDED SLOPERS, CUSTOM SIZING & ETSY BUNDLER (Arquitecto)

- Decision and reason: Activación formal del plan de trabajo `PLAN_v0.2-features.md` tras recibir aprobación (OK) del usuario.
- Scope:
  - T-09: Sloper Base de Pantalón / Shorts Paramétrico (Delantero y Espalda).
  - T-10: Integración de Pantalones/Bermudas en Modifier Engine y ADN.
  - T-11: Motor de Personalización Antropométrica por Medidas Exactas.
  - T-12: Empaquetador Comercial Automatizado para Etsy (ZIP Bundler & Assets).
- Active Task: `[T-09] Sloper Base de Pantalón / Shorts Paramétrico`. Asignado al subagente Ingeniero.

## 2026-08-18T02:16:00-05:00 - TASK T-09 AUDIT: TROUSER & SHORTS SLOPER (Arquitecto / Ingeniero)

- Decision and reason: El Ingeniero completó la implementación del sloper paramétrico de pantalón y shorts (`src/engine/base_blocks/trousers.ts`), tablas antropométricas de tren inferior (`src/engine/base_blocks/measurements.ts`) y registro en la fábrica unificada.
- Verification:
  - 35 nuevos tests en `tests/trousers.test.ts` (Total: 228/228 tests passing al 100% en Vitest).
  - Invariante matemático de entrepierna: longitud entrepierna delantera vs trasera igualada con precisión $< 0.05\text{ mm}$ ($\Delta \le 3\text{ mm}$) en todas las tallas XS a 3XL.
  - Soporte de variantes `full`, `shorts` / `bermuda` y `cropped`.
  - Grainline vertical en línea de aplomo y piquetes simples/dobles en el 100% de las piezas.
- Evidence: Commit `[T-09] implement parametric trouser and shorts sloper base block` (hash: `be3f4b9`).
- Verdict: **APTO**.
- Next: Tarea `[T-10] Integración de Pantalones/Bermudas en Modifier Engine y ADN`.

## 2026-08-18T23:35:00-05:00 - TASK T-10 AUDIT: TROUSER MODIFIER INTEGRATION (Arquitecto / Ingeniero)

- Decision and reason: Integración completa de modificaciones paramétricas de prendas inferiores (pantalones, bermudas, shorts) en el Modifier Engine (`src/engine/modifier.ts`), esquemas Zod (`src/schema/pattern_schema.ts`) y tipos (`src/types/pattern.ts`).
- Verification:
  - 38 nuevos tests (Total: 266/266 tests passing al 100% en Vitest).
  - Soporte de pretinas (`elastic`, `fitted`, `drawstring`, `rib`), dobladillos (`straight`, `cuffed`, `fringed_pirate`), bolsillos (`cargo`, `patch_back`, `slash`, `in_seam`) y siluetas (`wide_baggy`, `straight`, `slim`).
  - Ecualización de entrepierna probada y garantizada ($\Delta \le 3.0\text{ mm}$) en todas las tallas modificadas.
  - 100% de piezas con grainlines normalizados y piquetes emparejados.
- Evidence: Commit `[T-10] integrate trousers and shorts into modifier engine and pattern DNA` (hash: `ddf3e46`).
- Verdict: **APTO**.
- Next: Tarea `[T-11] Motor de Personalización Antropométrica por Medidas Exactas`.

## 2026-08-18T23:45:00-05:00 - TASK T-11 AUDIT: ANTHROPOMETRIC CUSTOM MEASUREMENTS (Arquitecto / Ingeniero)

- Decision and reason: Implementación del motor de graduación y escalado continuo a partir de medidas antropométricas personalizadas del cliente (`src/engine/base_blocks/measurements.ts`), validación Zod (`src/schema/pattern_schema.ts`), integración CLI con flag `-m, --measurements` (`src/pipeline.ts`, `src/index.ts`) y renderizado en Ficha Técnica (`src/engine/tech_sheet.ts`).
- Verification:
  - 26 nuevos tests (Total: 292/292 tests passing al 100% en Vitest).
  - Fórmulas de escala armónica monotónica y clamping de seguridad anatómica en 18 cotas.
  - Comparativa de medidas cliente vs base en Ficha Técnica Markdown, JSON y PDF.
- Evidence: Commit `[T-11] implement anthropometric custom measurement scaling and CLI options` (hash: `8d6b46d`).
- Verdict: **APTO**.
- Next: Tarea `[T-12] Empaquetador Comercial Automatizado para Etsy (ZIP Bundler & Assets)`.

## 2026-08-18T23:55:00-05:00 - CLOSE PHASE 2.0 (EXPANDED SLOPERS, CUSTOM SIZING & ETSY BUNDLER) (Arquitecto)

- Decision and reason: Cierre formal del hito Fase 2 (`T-09` a `T-12`). Todas las tareas han sido completadas, probadas exhaustivamente y auditadas con veredicto **APTO**.
- Deliverables & Features Added in Phase 2:
  1. `src/engine/base_blocks/trousers.ts`: Sloper base paramétrico de pantalón y shorts con coincidencia sub-milimétrica de entrepierna ($\Delta \le 0.05\text{ mm}$).
  2. `src/engine/modifier.ts`: Modificador de prendas inferiores con pretinas, bolsillos cargo/parche y dobladillos con vuelta/flecos.
  3. `src/engine/base_blocks/measurements.ts`: Motor de personalización antropométrica continua por medidas del cliente con soporte CLI `-m, --measurements`.
  4. `src/engine/etsy_bundler.ts`: Empaquetador comercial automático que genera el archivo `.zip` organizado en 6 carpetas, con guía de impresión PDF y archivo `etsy_listing_metadata.json` (título SEO, 13 tags y descripción comercial completa).
  5. Subcomandos CLI nuevos y opciones: `pattern-ai-core bundle <dir>`, `pattern-ai-core generate -m <json> --bundle`.
- Verification:
  - Suite completa de **309/309 tests pasando al 100%** en Vitest.
  - Bundles comerciales generados y probados: `straw_pirate_adventurer_vest_etsy_bundle.zip` y `streetwear_oversize_hoodie_etsy_bundle.zip`.
- Verdict: **APTO (Fase 2 Cerrada con Éxito - 309/309 Tests PASS)**.
- Evidence: Commits `[T-09]` a `[T-12]`, hash `876300a`. Commit de control `[STATE] close phase 2.0`.
- Next: Planificación de Fase 3 (Visor WebGL / Web UI interactiva / Catálogo).

## 2026-08-18T23:59:00-05:00 - PHASE 3 KICKOFF: LOCAL WEB STUDIO, 2D VIEWER & MULTI-PIECE SETS (Arquitecto)

- Decision and reason: Activación del plan de trabajo `PLAN_v0.3-web-ui.md` para dotar a `pattern-ai-core` de un Web Studio visual local, servidor API REST, visor SVG 2D interactivo multi-talla y generación de conjuntos de 2 piezas (Top + Bottom).
- Scope:
  - T-13: Servidor API REST Local y Endpoints del Motor (`src/server/`).
  - T-14: Visor Vectorial 2D Interactivo (Zoom, Pan, Capas XS-3XL y Cuadrícula A4).
  - T-15: Dashboard Web Studio (Prompt IA, Sliders Antropométricos y Descarga ZIP).
  - T-16: Generador de Conjuntos Completos de 2 Piezas (Top + Bottom / Set Pirata).
- Active Task: `[T-13] Servidor API REST Local y Endpoints del Motor`.

## 2026-08-19T00:06:00-05:00 - TASK T-13 AUDIT: REST API SERVER & WEB DASHBOARD (Arquitecto / Ingeniero)

- Decision and reason: Implementación del servidor HTTP nativo (`src/server/app.ts`, `src/server/routes.ts`, `src/server/index.ts`), endpoints REST (`/api/status`, `/api/presets`, `/api/patterns`, `/api/patterns/:concept/svg`, `/api/patterns/:concept/bundle`, `/api/generate`), dashboard web HTML interactivo (`src/server/public/index.html`) y subcomando CLI `serve`.
- Verification:
  - 16 nuevos tests en `tests/server.test.ts` (Total: 325/325 tests passing al 100% en Vitest).
  - Verificación de cabeceras CORS universales, parseo streaming JSON seguro y descargas de binarios ZIP con cabeceras correctas.
- Evidence: Commit `[T-13] implement native HTTP REST API server, routes, public dashboard and CLI serve command` (hash: `e0e3fb0`).
- Verdict: **APTO**.
- Next: Tarea `[T-14] Visor Vectorial 2D Interactivo`.
