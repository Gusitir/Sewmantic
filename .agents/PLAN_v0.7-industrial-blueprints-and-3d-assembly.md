# PLAN v0.7 - Fase 7: Arquitectura por Bloques Ancla FreeSewing, Moldería Industrial Confeccionable y Guía Visual de Ensamble 3D

Status: active
Goal: Transformar el flujo de generación para que el usuario seleccione un Bloque Base Ancla de FreeSewing (Wahid, Simon, Brian, Bella, Paco, Sandy, Shin), inyectar su anatomía al LLM para que actúe como modificador puro, generar moldería industrial confeccionable con cruces de botonadura, marcas de ojales/botones, vistas interiores y piquetes, y transformar el visor 3D en una Guía Visual de Ensamble y Doblado Despiezada (Exploded Assembly View) con slider interactivo.
Assurance: Lean

## Matriz de Tareas y Asignación de Roles

| Tarea | Descripción | Rol Principal | Rol Secundario | Puerta Determinista | Estado |
|---|---|---|---|---|:---:|
| **T-29** | Moldería Industrial: Cruces de Botones, Ojales, Vistas Interiores y Piquetes | Ingeniero | Obrero | `npm test` | 🟡 READY |
| **T-30** | Selector de Bloques Base FreeSewing & Inyección Estructural al LLM | Ingeniero | Obrero | `node scripts/test_fireworks_call.js && npm test` | ⚪ QUEUED |
| **T-31** | Guía Visual de Ensamble 3D Despiezada (*Exploded Assembly View*) con Slider | Ingeniero | Obrero | `node scripts/test_blender_export.js && npm test` | ⚪ QUEUED |
| **T-32** | Ficha Técnica de Confección Paso a Paso & Auditoría de Fase 7.0 | Arquitecto | Ingeniero | `npm test && node dist/index.js` | ⚪ QUEUED |

---

## Detalle de Tareas

### T-29 - Moldería Industrial: Cruces de Botones, Ojales, Vistas Interiores y Piquetes Coincidentes

- Status: ready
- Depends on: T-28
- Scope: `src/types/pattern.ts`, `src/schema/pattern_schema.ts`, `src/engine/modifier.ts`, `src/engine/base_blocks/`, `tests/industrial_patterns.test.ts`
- Rol: Ingeniero (Patronaje industrial computacional y geometría de confección).
- Acceptance:
  - [ ] **Cruces de Botonadura (*Button Overlap / Placket*):**
    - En prendas con botonadura frontal (`closure.type === 'buttons'`), extender el borde del centro delantero en $+15\text{ mm}$ a $+25\text{ mm}$ para solape.
  - [ ] **Marcado Vectorial de Botones y Ojales:**
    - Calcular y dibujar marcas de ojal (líneas de 12-16 mm) y centros de botón (cruces $\times$) distribuidos uniformemente según `button_count` y largo del pecho.
  - [ ] **Vistas Interiores (*Facings*):**
    - Generar piezas de corte complementarias para remate de bordes limpios:
      - `front_facing` (Vista delantera para botonadura y escote).
      - `armhole_facing` / `back_neck_facing` (Vistas de sisa y cuello en prendas sin mangas).
  - [ ] **Piquetes de Unión Emparejados (*Seam Notches*):**
    - Piquetes con cotas de correspondencia exacta entre costuras de hombro (delantero $\leftrightarrow$ espalda) y costados (sisa a bajo).
  - [ ] Suite completa de pruebas en `tests/industrial_patterns.test.ts`.
- Gates: `npm test`
- Human checks: none

---

### T-30 - Selector de Bloques Base FreeSewing & Inyección Estructural al LLM

- Status: queued
- Depends on: T-29
- Scope: `src/server/public/index.html`, `src/server/public/app.js`, `src/ai/prompt_builder.ts`, `src/ai/direct_api_provider.ts`, `src/pipeline.ts`, `tests/ai_provider.test.ts`
- Rol: Ingeniero / Obrero (Integración Frontend y Pipeline Multimodal).
- Acceptance:
  - [ ] **Selector de Bloques Base en Web Studio:**
    - Menú interactivo con iconos y descripción de los 7 bloques base de FreeSewing:
      1. `wahid`: Chaleco Sastre / Cosplay Vest (Botonadura, bajo en pico, sin mangas, vistas).
      2. `simon`: Camisa Clásica / Casual (Cuello camisero, pie de cuello, cartera, puños).
      3. `brian`: Camiseta / Sudadera / Hoodie (Cuello redondo/V, capucha, drop shoulder).
      4. `bella`: Corpiño / Top / Vestido Femenino (Pinzas de busto al apex, entalle).
      5. `paco`: Pantalón / Bermuda / Shorts (Tiro anatómico, bragueta, bolsillos).
      6. `sandy`: Falda (Recta, tubo, evasé, tablas).
      7. `shin`: Kimono / Haori Anime (Mangas Furisode cuadradas, cuello continuo).
  - [ ] **Inyección Contextual al LLM:**
    - El `PromptBuilder` inyecta a Qwen 3.8 Max la anatomía exacta y lista de parámetros modificables del bloque seleccionado, limitando la respuesta a transformaciones diferenciales sobre la base.
  - [ ] Pruebas unitarias de inyección y validación Zod.
- Gates: `node scripts/test_fireworks_call.js && npm test`
- Human checks: none

---

### T-31 - Guía Visual de Ensamble 3D Despiezada (*Exploded Assembly View*) con Slider

- Status: queued
- Depends on: T-30
- Scope: `src/engine/blender_bridge.ts`, `src/server/public/viewer3d.js`, `src/server/public/viewer3d.css`, `tests/viewer3d.test.ts`
- Rol: Ingeniero (Gráficos WebGL y visualización espacial de confección).
- Acceptance:
  - [ ] **Despiece Anatómico 3D (*Exploded View*):**
    - En lugar de cerrar forzadamente las costuras, posicionar las piezas en el espacio mostrando su orientación y doblado:
      - Delantero: Curvado suavemente al frente en $+Z$.
      - Espalda: Curvado detrás en $-Z$.
      - Vistas: Desplazadas ligeramente hacia el interior indicando cómo se voltean hacia adentro.
      - Mangas: Pre-dobladas en semi-cilindro lateral.
  - [ ] **Líneas de Guía de Costura 3D (*Seam Indicator Lines*):**
    - Líneas punteadas vectoriales en WebGL conectando los vértices de costura de hombros y costados.
  - [ ] **Slider Interactivo de Despiece (0% a 100%):**
    - Control deslizante en la barra del visor 3D para acercar las piezas a su posición ensamblada (0%) o separarlas en vista despiezada (100%).
- Gates: `node scripts/test_blender_export.js && npm test`
- Human checks: none

---

### T-32 - Ficha Técnica de Confección Paso a Paso & Auditoría de Fase 7.0

- Status: queued
- Depends on: T-31
- Scope: `src/engine/tech_sheet.ts`, `src/engine/etsy_bundler.ts`, `src/server/public/app.js`
- Rol: Arquitecto (Lead / Auditor General).
- Acceptance:
  - [ ] Guía de armado y confección paso a paso en la Ficha Técnica PDF / Markdown:
    1. Preparación y entretelado de vistas.
    2. Ensamble de botonadura y ojales.
    3. Unión de hombros y costados.
    4. Remate de sisas y dobladillos.
  - [ ] Empaquetado comercial ZIP con los patrones industriales completos y metadatos Etsy.
  - [ ] Suite completa de tests deterministas pasando al 100%.
  - [ ] Veredicto APTO emitido por el Arquitecto y commit `[STATE] close phase 7.0`.
- Gates: `npm test && node dist/index.js`
- Human checks: Inspección visual de la moldería del chaleco con cruce de botones y despiece 3D.

---

## Closure gate

- [ ] Delantero con cruce de botonadura (+20 mm) y marcas de ojal/botón generadas en 2D.
- [ ] Vistas interiores de refuerzo generadas como piezas de corte.
- [ ] Selector de los 7 bloques base de FreeSewing integrado en el Web Studio.
- [ ] Visor 3D con Guía Visual de Ensamble Despiezada y slider interactivo.
- [ ] 100% de tests deterministas en verde y veredicto APTO.
