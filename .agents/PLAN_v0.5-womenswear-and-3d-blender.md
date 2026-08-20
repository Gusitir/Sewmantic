# PLAN v0.5 - Fase 5: Slopers Femeninos / Vestidos, Catálogo Cosplay y Simulación 3D Blender (.glb)

Status: active
Goal: Extender la biblioteca geométrica con slopers femeninos anatómicos (bodice con pinzas de busto, falda evase/plisada y vestidos), presets de siluetas anime/cosplay avanzadas y generación headless de modelos 3D (.glb) mediante Blender para visualización en Web Studio.
Assurance: Lean

## Matriz de Tareas y Asignación de Roles

| Tarea | Descripción | Rol Principal | Rol Secundario | Puerta Determinista | Estado |
|---|---|---|---|---|:---:|
| **T-21** | Sloper Base Femenino con Pinzas de Busto y Falda (`womenswear_bodice`, `skirt`) | Ingeniero | Obrero | `npm test` | 🟡 READY |
| **T-22** | Modificador de Vestidos, Kimonos Anime/Haori y Faldas en ADN | Ingeniero | Obrero | `npm test` | ⚪ QUEUED |
| **T-23** | Puente Automatizado Blender Headless para Malla 3D y Exportación `.glb` | Ingeniero / Scripts | Obrero | `node scripts/test_blender_export.js` | ⚪ QUEUED |
| **T-24** | Integración del Visor 3D WebGL en Web Studio y Empaquetado de Assets 3D | Obrero | Ingeniero | `npm test && node dist/index.js` | ⚪ QUEUED |

---

## Detalle de Tareas

### T-21 - Sloper Base Femenino con Pinzas de Busto y Falda (`womenswear_bodice`, `skirt`)

- Status: ready
- Depends on: T-16, T-20
- Scope: `src/engine/base_blocks/womens_bodice.ts`, `src/engine/base_blocks/skirt.ts`, `src/engine/base_blocks/measurements.ts`, `src/engine/base_blocks/index.ts`, `tests/womenswear.test.ts`
- Rol: Ingeniero (Geometría con pinzas de busto y copa A-D).
- Acceptance:
  - [ ] Implementar `getWomensBodiceSloper` con pinza de costado/pecho paramétrica y curvatura anatómica de cintura.
  - [ ] Implementar `getSkirtSloper` (recta, evase y tablas plisadas).
  - [ ] Ampliar tabla de medidas antropométricas femeninas (`bust_span_mm`, `underbust_circumference_mm`, `high_bust_mm`).
  - [ ] Tests en Vitest verificando geometría cerrada en tallas XS-3XL y ecualización de costuras de costado.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Pinzas de busto no cerrando el perímetro o desfase en sisa.
- STOP when: Las costuras de costado delantero y espalda difieran en $> 2\text{ mm}$.

---

### T-22 - Modificador de Vestidos, Kimonos Anime/Haori y Faldas en ADN

- Status: queued
- Depends on: T-21
- Scope: `src/types/pattern.ts`, `src/schema/pattern_schema.ts`, `src/engine/modifier.ts`, `src/ai/mock_provider.ts`, `tests/dresses.test.ts`
- Rol: Ingeniero (Modelado paramétrico de prendas enteras y batas).
- Acceptance:
  - [ ] Soportar `garment_category: 'dress'` combinando bodice + falda en una sola prenda coordinada.
  - [ ] Modificador de Kimono/Haori tradicional y anime (mangas cuadradas de gran caída *furisode*, cuello cruzado plano).
  - [ ] Presets oficiales: `anime_water_goddess_dress` y `demon_slayer_haori_kimono`.
- Gates: `npm test`
- Human checks: none

---

### T-23 - Puente Automatizado Blender Headless para Malla 3D y Exportación `.glb`

- Status: queued
- Depends on: T-22
- Scope: `scripts/build_vest_blender.py`, `scripts/export_glb_headless.py`, `src/engine/blender_bridge.ts`
- Rol: Ingeniero / Scripts (Pipeline de simulación 3D headless).
- Acceptance:
  - [ ] Script de Python/Blender ejecutable en modo headless (`blender -b -P ...`) que tome las curvas SVG del patrón, extruya/costure los paneles y exporte un archivo `.glb` optimizado (< 3MB).
  - [ ] Verificación de texturas y materiales (Lino, Denim, Seda).
- Gates: `node scripts/test_blender_export.js`
- Human checks: none

---

### T-24 - Integración del Visor 3D WebGL en Web Studio y Empaquetado de Assets 3D

- Status: queued
- Depends on: T-23
- Scope: `src/server/public/index.html`, `src/server/public/app.js`, `src/server/public/viewer3d.js`, `src/engine/etsy_bundler.ts`
- Rol: Obrero (Frontend Three.js / Model Viewer) / Ingeniero.
- Acceptance:
  - [ ] Pestaña "Visor 3D Interactivo" en Web Studio cargando el `.glb` generado con rotación 360°, zoom e iluminación de estudio.
  - [ ] Inclusión del archivo `.glb` en el ZIP comercial de Etsy dentro de `07_3D_Interactive_Model/`.
- Gates: `npm test && node dist/index.js`
- Human checks: Verificación visual del modelo 3D en navegador.

---

## Closure gate

- [ ] Slopers femeninos, vestidos y kimonos verificados con 100% de tests en verde.
- [ ] Pipeline 3D Blender exportando `.glb` automáticamente.
- [ ] Visor 3D WebGL integrado y funcional en Web Studio.
- [ ] Veredicto APTO emitido por el Arquitecto.
