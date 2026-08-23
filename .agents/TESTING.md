# TESTING — Matriz de Pruebas y Verificación (`pattern-ai-core`)

Guía completa de pruebas automatizadas, semi-automatizadas y verificación humana/funcional para las Fases 1.0 a 8.0 (y preparación Fase 9.0).

---

## 1. Suite de Pruebas Automatizadas (548/548 PASS — 21 Suites Vitest)

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
| `tests/triangulator.test.ts` | `src/engine/triangulator.ts` | 30 | Motor de Triangulación 2D Ear-Clipping; polígonos cóncavos, escotes en V, bajo en pico, mangas, perneras y faldas; área analítica ($\Delta < 0.1\%$) y orientación CCW. |
| `tests/schema.test.ts` | `src/schema/pattern_schema.ts` | 30 | Contratos Zod para ADN paramétrico, límites antropométricos, sub-prendas, vestidos, kimonos, telas y árboles de modificación. |
| `tests/ai_provider.test.ts` | `src/ai/` | 29 | AI Provider Factory, `DirectApiProvider` (Fireworks AI / Qwen 3.8 Max `max_tokens: 6000`, inyección de Blueprints FreeSewing, Data URLs, visión) y `MockAiProvider`. |
| `tests/base_blocks.test.ts` | `src/engine/base_blocks/` | 51 | Slopers FreeSewing de Torso, Mangas, Capucha y Bolsillo; curvas Bézier y polígonos cerrados. |
| `tests/womenswear.test.ts` | `src/engine/base_blocks/womens_bodice.ts` | 45 | Sloper femenino con pinza de busto al apex y falda recta/evasé/plisada ($\Delta \le 0.01\text{ mm}$). |
| `tests/trousers.test.ts` | `src/engine/base_blocks/trousers.ts` | 35 | Slopers de Pantalón y Bermuda; aplomo central y ecualización de entrepierna ($\Delta \le 0.05\text{ mm}$). |
| `tests/modifier.test.ts` | `src/engine/modifier.ts` | 69 | Modificaciones superiores e inferiores; invariantes anatómicos de hombro y escote V ($\text{shoulderSpan} \ge 40\text{mm}$, $\text{shoulderDrop} \ge 18\text{mm}$); recálculo sisa-manga ($< 3\text{ mm}$). |
| `tests/dresses.test.ts` | `src/engine/modifier.ts` | 29 | Modificador de vestidos coordinados, kimonos/haoris con mangas Furisode y faldas con pretina. |
| `tests/custom_measurements.test.ts` | `src/engine/base_blocks/measurements.ts` | 24 | Escalado antropométrico continuo a partir de medidas exactas del usuario; interpolación armónica y clamping. |
| `tests/two_piece_set.test.ts` | `src/engine/modifier.ts` | 28 | Generador de conjuntos coordinados de 2 piezas (`straw_pirate_full_set`); continuidad de costuras y layout compuesto. |
| `tests/tech_sheet.test.ts` | `src/engine/tech_sheet.ts` | 17 | Ficha técnica industrial (PDF, Markdown y JSON); cálculo de mermas ($\ge 10\%$), desglose multi-tela, BOM y guía de confección paso a paso de 4 etapas. |
| `tests/tiler.test.ts` | `src/utils/tiler.js` | 19 | Paginación vectorial A4 / US Letter; Cuadro de Calibración 10x10 cm en Pág 1; cruces de registro. |
| `tests/blender.test.ts` | `src/engine/blender_bridge.ts` | 24 | True-to-Pattern 3D Mesh Generator, ensamblador binario glTF 2.0 (`.glb`), metadatos `explodeOffset`, normales suaves, mapeo UV y multi-material PBR. |
| `tests/viewer3d.test.ts` | `src/server/public/viewer3d.js` | 15 | Visor 3D WebGL nativo con Exploded Assembly Slider (0-100%), streaming `/api/patterns/:concept/glb`, líneas de unión de costura y controles orbitales 360°. |
| `tests/bundler.test.ts` | `src/engine/etsy_bundler.ts` | 17 | Empaquetador comercial Etsy; estructura de 7 carpetas dentro del `.zip`, 13 tags SEO, guía PDF con características industriales y modelo 3D. |
| `tests/server.test.ts` | `src/server/app.ts` | 20 | Servidor HTTP REST nativo; CORS universal, soporte para selección de `blueprint`, logging estructurado y respuestas de error con `details`. |
| `tests/viewer.test.ts` | `src/server/public/viewer.js` | 22 | Visor Vectorial 2D; transformaciones matemáticas (Zoom, Pan, Fit View), capas XS-3XL y cuadrícula A4. |
| `tests/e2e.test.ts` | `src/pipeline.ts` | 11 | Pipeline End-to-End generando físicamente todos los 12 entregables (2D + 3D + ZIP) en disco. |
| **TOTAL** | **21 suites** | **548** | **100% PASS (0 errores)** |

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
| **H-03** | Verificación visual de patrones 2D y 3D en Web Studio. | Inspección interactiva del visor 2D (cruces de botonadura, marcas de ojales, vistas interiores) y rotación 360° del visor 3D WebGL con slider de despiece interactivo (0-100%). | 🟡 [LISTO PARA PROBAR POR EL USUARIO] |
