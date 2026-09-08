# TESTING — Matriz de Pruebas y Verificación (`pattern-ai-core`)

Guía completa de pruebas automatizadas, semi-automatizadas y verificación humana/funcional para las Fases 1.0 a 13.0.

---

## 1. Suite de Pruebas Automatizadas (776/776 PASS — 31 Suites Vitest)

Para ejecutar la suite completa de pruebas deterministas:
```powershell
npm test
```

### Desglose por Capa y Módulo

| Suite de Test | Módulo / Archivo | Tests | Qué valida |
| :--- | :--- | :---: | :--- |
| `tests/collars.test.ts` | `src/engine/modifier.ts` | 5 | Módulos de cuellos técnicos: cuello chimenea/alzado (`stand_collar`) con curvatura anatómica y piquetes de hombro/centro, y cuello camisero (`collar_stand` + `collar_fall`) con entretela y validación Zod. |
| `tests/cargo_pockets.test.ts` | `src/engine/modifier.ts` | 5 | Módulos de bolsillos cargo 3D con fuelle perimetral en tira U (`cargo_pocket_bellows`), cuerpo principal (`cargo_pocket_body`), solapas con broches (`cargo_pocket_flap`), y blueprint ancla `utility_vest`. |
| `tests/industrial_patterns.test.ts` | `src/engine/modifier.ts` | 15 | Moldería industrial: cruces de botonadura (+20mm), marcas vectoriales de botones y ojales, vistas interiores con entretela (`front_facing`, `armhole_facing`, `back_neck_facing`), piquetes pareados en hombros/costados y bajo en doble pico de chaleco (`hem: pointed`). |
| `tests/triangulator.test.ts` | `src/engine/triangulator.ts` | 27 | Motor de Triangulación 2D Ear-Clipping; polígonos cóncavos, escotes en V, bajo en pico, mangas, perneras y faldas; área analítica ($\Delta < 0.1\%$) y orientación CCW. |
| `tests/schema.test.ts` | `src/schema/pattern_schema.ts` | 65 | Contratos Zod para ADN paramétrico, límites antropométricos, sub-prendas, vestidos, kimonos, telas y árboles de modificación; repair pass determinista (clamp numérico T-50, enum recovery T-58, union recovery T-60). |
| `tests/ai_provider.test.ts` | `src/ai/` | 40 | AI Provider Factory, `DirectApiProvider` (Fireworks AI / Qwen 3.8 Max `max_tokens: 6000` y DeepSeek, inyección de Blueprints FreeSewing libres, Data URLs, visión, `<think>` sanitization), `GeminiProvider` (Google Cloud Gemini 3.8 Flash High) y `MockAiProvider`. |
| `tests/base_blocks.test.ts` | `src/engine/base_blocks/` | 51 | Slopers FreeSewing de Torso, Mangas, Capucha y Bolsillo; curvas Bézier y polígonos cerrados. |
| `tests/womenswear.test.ts` | `src/engine/base_blocks/womens_bodice.ts` | 45 | Sloper femenino con pinza de busto al apex y falda recta/evasé/plisada ($\Delta \le 0.01\text{ mm}$). |
| `tests/trousers.test.ts` | `src/engine/base_blocks/trousers.ts` | 37 | Slopers de Pantalón y Bermuda; aplomo central, ecualización de entrepierna ($\Delta \le 0.05\text{ mm}$) e `inseam_mm` explícito. |
| `tests/modifier.test.ts` | `src/engine/modifier.ts` | 69 | Modificaciones superiores e inferiores; invariantes anatómicos de hombro y escote V ($\text{shoulderSpan} \ge 40\text{mm}$, $\text{shoulderDrop} \ge 18\text{mm}$); recálculo sisa-manga ($< 3\text{ mm}$). |
| `tests/dresses.test.ts` | `src/engine/modifier.ts` | 29 | Modificador de vestidos coordinados, kimonos/haoris con mangas Furisode y faldas con pretina. |
| `tests/custom_measurements.test.ts` | `src/engine/base_blocks/measurements.ts` | 24 | Escalado antropométrico continuo a partir de medidas exactas del usuario; interpolación armónica y clamping. |
| `tests/two_piece_set.test.ts` | `src/engine/modifier.ts` | 28 | Generador de conjuntos coordinados de 2 piezas (`straw_pirate_full_set`); continuidad de costuras y layout compuesto. |
| `tests/tech_sheet.test.ts` | `src/engine/tech_sheet.ts` | 17 | Ficha técnica industrial (PDF, Markdown y JSON); cálculo de mermas ($\ge 10\%$), desglose multi-tela, BOM y guía de confección paso a paso de 4 etapas. |
| `tests/tiler.test.ts` | `src/utils/tiler.js` | 19 | Paginación vectorial A4 / US Letter; Cuadro de Calibración 10x10 cm en Pág 1; cruces de registro. |
| `tests/blender.test.ts` | `src/engine/blender_bridge.ts` | 31 | True-to-Pattern 3D Mesh Generator, ensamblador binario glTF 2.0 (`.glb`), metadatos `explodeOffset`, normales suaves, mapeo UV y multi-material PBR; despiece anatómico de mangas (H-03-F) y limpieza de polígonos pre-ear-clipping (dedupe/colineales). |
| `tests/viewer3d.test.ts` | `src/server/public/viewer3d.js` | 19 | Visor 3D WebGL nativo con Exploded Assembly Slider (0-100%), streaming `/api/patterns/:concept/glb`, líneas de unión de costura y controles orbitales 360°. |
| `tests/bundler.test.ts` | `src/engine/etsy_bundler.ts` | 19 | Empaquetador comercial Etsy; estructura de 7 carpetas dentro del `.zip`, 13 tags SEO, guía PDF con características industriales, degradación elegante 3D (T-61) y modelo 3D. |
| `tests/server.test.ts` | `src/server/app.ts` | 20 | Servidor HTTP REST nativo; CORS universal, soporte para selección de `blueprint`, logging estructurado y respuestas de error con `details`. |
| `tests/viewer.test.ts` | `src/server/public/viewer.js` | 22 | Visor Vectorial 2D; transformaciones matemáticas (Zoom, Pan, Fit View), capas XS-3XL y cuadrícula A4. |
| `tests/e2e.test.ts` | `src/pipeline.ts` | 11 | Pipeline End-to-End generando físicamente todos los 12 entregables (2D + 3D + ZIP) en disco. |
| `tests/semantic_v2.test.ts` | `src/engine/v2/contracts.ts`, `serialization.ts` | 40 | Contratos v2, curvas discriminadas, IDs/referencias, serializacion y coherencia StitchPair. |
| `tests/semantic_geometry_v2.test.ts` | `src/engine/v2/geometry/` | 20 | GeometryAdapter, booleans, cortes de cuatro curvas, winding y offset miter 3/10/25mm. |
| `tests/semantic_constraints_v2.test.ts` | `src/engine/v2/constraints.ts` | 19 | `resolveStitchPair`, `evaluateConstraints` y diagnósticos tipados (SEAM_DELTA_LIMIT, ORIENTATION_INCOMPATIBLE, BROKEN_REFERENCE, NON_POSITIVE_LENGTH). |
| `tests/semantic_shadow_v2.test.ts` | `src/engine/v2/adapters/legacy-shadow.ts`, `shadow.ts` | 7 | Shadow runner T-48: diagnósticos en memoria sin escritura y entregables byte-idénticos con `SEMANTIC_SHADOW` OFF vs ON. |
| `tests/semantic_registry_v2.test.ts` | `src/engine/v2/registry.ts` | 23 | Capability Registry (Phase 12): registro y descubrimiento de operadores, validación de firmas y resolución de dependencias. |
| `tests/semantic_capabilities_v2.test.ts` | `src/engine/v2/capabilities/` | 18 | Operator SDK y derivación de capacidades (`base`, `derivation`, `operator-sdk`). |
| `tests/semantic_recipes_v2.test.ts` | `src/engine/v2/recipes.ts` | 9 | Recipe DSL: composición declarativa de operadores atómicos del kernel v2. |
| `tests/harness_session_v2.test.ts` | `src/harness/session.ts`, `revisions.ts` | 20 | Sesión conversacional del Patronista (Phase 13): turnos, historial y revisiones de documento con recuperación de estados. |
| `tests/harness_executor_v2.test.ts` | `src/harness/tools.ts`, `executor.ts` | 14 | Herramientas del harness y executor seguro de acciones sobre el documento semántico. |
| `tests/harness_loop_v2.test.ts` | `src/harness/loop.ts` | 8 | Loop conversacional completo del Patronista (Phase 13). |
| **TOTAL** | **31 suites** | **776** | **100% PASS (0 errores)** |

### Phase 11.0 - IDs de verificacion

| ID | Superficie | Estado |
| :--- | :--- | :---: |
| `P11-CON-01` | Contratos TypeScript y serializacion v2 | APTO T-45 |
| `P11-GEO-01` | GeometryAdapter, curvas y offset miter-only | APTO T-46 |
| `P11-OPS-01` | Constraints y operadores atomicos | APTO T-47 |
| `P11-SHD-01` | Legacy adapter y shadow mode | APTO T-48 |

### Phase 12.0 - IDs de verificacion

| ID | Superficie | Estado |
| :--- | :--- | :---: |
| `P12-REG-01` | Capability Registry (`src/engine/v2/registry.ts`) | APTO T-51 |
| `P12-SDK-01` | Operator SDK y capabilities (`src/engine/v2/capabilities/`) | APTO T-52 |
| `P12-RCP-01` | Recipe DSL (`src/engine/v2/recipes.ts`) | APTO T-53 |

### Phase 13.0 - IDs de verificacion

| ID | Superficie | Estado |
| :--- | :--- | :---: |
| `P13-SES-01` | Session y revisions (`src/harness/session.ts`, `revisions.ts`) | APTO T-54 |
| `P13-EXE-01` | Tools y executor (`src/harness/tools.ts`, `executor.ts`) | APTO T-55 |
| `P13-LOOP-01` | Loop conversacional (`src/harness/loop.ts`) | APTO T-56 |

### Fase 9.0 - IDs de verificacion

| ID | Superficie | Evidencia requerida |
| :--- | :--- | :--- |
| `P9-T35` | Ear-Clipping robusto | `n - 2` triangulos, area `< 0.1%`, winding consistente, sin cruces ni abanico invalido. |
| `P9-T36` | Bolsillos cargo 3D | Fuelle perimetral, solapa, simetria x2, normales/materiales y GLB finitos. |
| `P9-T37` | Cuellos 3D | `16..24` segmentos, radio `90..100 mm`, continuidad e indices validos. |
| `P9-T38` | Guias y capas Z | Anclajes geometricos, precedencia Z, slider `0..100%` y desktop/movil. |
| `P9-GATE` | Puerta por tarea | Salida fresca de `npm run build && npm test` despues del cambio final. |

---

## 2. Pruebas de Diagnóstico y Generación 3D

### A. Test de Validación glTF 2.0 y Guía Visual de Ensamble 3D
Para verificar la generación binaria de modelos `.glb`, materiales textiles PBR y vectores de despiece `explodeOffset`:
```powershell
node scripts/test_blender_export.js
```
**Resultado verificado:** Chaleco Pirata (15.33 KB), Bermuda Denim (14.18 KB), Kimono de Seda (12.55 KB) y Set Completo Coordinado (30.88 KB / 2 materiales PBR / 7 primitivas) generados y validados con metadatos de despiece `explodeOffset`.

### B. Test E2E de Generación con Imagen Real (Fireworks AI)
```powershell
node scripts/test_fireworks_e2e_image.js
```
**Resultado verificado:** 11/11 entregables generados en disco en 15 segundos con Qwen 3.8 Max (`max_tokens: 6000`).

---

## 3. Verificaciones Físicas y Visuales (Stop Conditions)

| Código | Descripción de la Prueba | Criterio de Aceptación | Estado |
| :--- | :--- | :--- | :---: |
| **H-01** | Impresión física de Página 1 a escala 100% (Sin ajustar a página). | Medición con regla métrica del recuadro exterior: exactamente $10.0\text{ cm} \times 10.0\text{ cm}$ ($100\text{ mm} \times 100\text{ mm}$). | ✅ [VERIFICADO OK] |
| **H-02** | Continuidad de ensamble de hojas A4/Letter. | Las líneas perimetrales de corte coinciden de forma continua sin saltos ni escalones al empalmar las marcas de cruz entre hojas. | ✅ [VERIFICADO OK] |
| **H-03** | Verificación visual de patrones 2D y 3D en Web Studio. | Inspección interactiva del visor 2D (cruces de botonadura, marcas de ojales, vistas interiores) y rotación 360° del visor 3D WebGL con slider de despiece interactivo (0-100%). | 🟡 [PARCIAL: CLOSE de Fase 9 pendiente de re-verificación humana] |

### H-03 - Sesion de validacion del usuario (2026-08-23)

- Aplicacion: `http://127.0.0.1:3030`
- Base probada: `bb2d354` (`1b9bd0f` como ultimo commit de producto)
- Arranque verificado: servidor escuchando en `127.0.0.1:3030`, respuesta HTTP `200`.
- Estado: FINALIZADA CON VEREDICTO NO APTO. `H-03-F` y `H-03-H` requieren correccion y repeticion.
- Resolucion posterior (2026-09-08): `H-03-F` VERIFICADO OK tras correccion T-57; `H-03-H` resuelto en codigo via T-58 (enum recovery), pendiente de re-verificacion humana para cierre de Fase 9.

| ID | Comprobacion del usuario | Resultado | Observaciones |
| :--- | :--- | :---: | :--- |
| `H-03-A` | Web Studio carga, permite navegar y conserva controles utilizables. | APTO | Validado por el usuario el 2026-08-23. |
| `H-03-B` | Un patron con escote o bajo concavo se visualiza sin triangulos en abanico ni caras cruzadas. | APTO | Validado por el usuario el 2026-08-23. |
| `H-03-C` | El chaleco `utility_vest` muestra bolsillos cargo con volumen, fuelle perimetral, solapa y espejo izquierdo/derecho. | APTO | Validado por el usuario el 2026-08-23. |
| `H-03-D` | `stand_collar` y cuello camisero se ven continuos, curvos y sin superficies parpadeantes o duplicadas. | APTO | Validado por el usuario el 2026-08-23. |
| `H-03-E` | El slider 0-100% separa exterior, vistas y entretela en orden legible; las guias no forman diagonales espurias. | APTO | Validado por el usuario el 2026-08-23. |
| `H-03-F` | Pantalon o bermuda conserva orientacion anatomica y guias de ambas piernas. | APTO | Corregido en T-57 (orientación/despiece de mangas y piernas) y VERIFICADO OK por el usuario. |
| `H-03-G` | Vista movil. | N/A | Fuera de alcance: el usuario aclaro que solicito visualizacion de escritorio, no version de telefono. |
| `H-03-H` | Generacion multimodal de hoodie pullover mediante Fireworks. | RESUELTO EN CÓDIGO (T-58) | Enum recovery en schema normaliza `pull_over`; pendiente de re-verificación humana. |

### H-04 - Revision humana de Foundation Spikes v1

| Código | Descripción de la Prueba | Criterio de Aceptación | Estado |
| :--- | :--- | :--- | :---: |
| **H-04** | Revisar SVGs del kernel, transcript del harness, reporte RAG y `DECISION_v1-foundation-stack.md`. | Confirmar o ajustar el stack y autorizar/rechazar integración Motor v2. | ✅ [APTO: PHASE 11 AUTORIZADA] |
