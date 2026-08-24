# CONTEXT - Crónica de Decisiones y Estado (`pattern-ai-core`)

```yaml
version: 1.1.0
compacted_at: 2026-08-23T00:05:00-05:00
archive_snapshot: .agents/archive/CONTEXT_pre_compact_snapshot.md
assurance: Lean
active_model: accounts/fireworks/models/qwen3p8-max (Fireworks AI Direct API)
suites_passing: 21/21 (548/548 tests PASS)
```

---

## 1. Arquitectura Inmutable y Verdad Técnica Actual

- **Motor Geométrico Paramétrico:** Node.js (TypeScript) con FreeSewing Core v3. Genera slopers base de torso (masculino/femenino), mangas, capuchas, pantalones/bermudas, faldas (recta/evasé/plisada), vestidos y kimonos/haoris con mangas *Furisode*.
- **Invariantes Textiles:** Coincidencia de sisa-manga ($< 3\text{ mm}$), entrepierna de pantalón ($\Delta \le 0.05\text{ mm}$), costuras de costado de corpiño ($\Delta \le 0.01\text{ mm}$), cuadro de calibración de $10\text{ cm} \times 10\text{ cm}$ en Página 1 de PDFs paginados.
- **Inferencia IA:** `DirectApiProvider` nativo conectando a Fireworks AI (`https://api.fireworks.ai/inference/v1/chat/completions`) con **Qwen 3.8 Max** (`accounts/fireworks/models/qwen3p8-max`). Inferencia multimodal nativa de 1 solo paso con payload `image_url` y parámetros `max_tokens: 4000`, `top_k: 40`, `presence_penalty: 0`, `frequency_penalty: 0`.
- **Plataforma Web Studio:** Servidor HTTP REST nativo (`node:http`) en puerto 3030 con Visor 2D interactivo (zoom centrado, pan, capas XS-3XL, cuadrícula A4) y **Visor 3D WebGL** interactivo con Three.js, rotación 360°, iluminación de estudio y materiales PBR textiles.
- **Canal Comercial Etsy:** Empaquetador automatizado `.zip` estructurado en **7 carpetas comerciales** (`01_Print_At_Home_A4`, `02_Print_At_Home_US_Letter`, `03_Copy_Shop_Plotter_A0`, `04_Vector_Layers_SVG`, `05_Sewing_Guide_And_TechPack`, `06_Dna_Parameters`, `07_3D_Interactive_Model`) y metadatos SEO con exactamente 13 tags.

---

## 2. Hitos y Fases Completadas (Trazabilidad de Commits)

### 📌 Fase 1.0: MVP Core Geometry & Tiling (`T-01` a `T-08`)
- **Objetivo:** Slopers base de FreeSewing v3, validador Zod de ADN paramétrico, exportador SVG continuo, motor de tiling A4/Letter con cruces de corte y cuadro de calibración 10x10 cm en Pág 1, Ficha técnica industrial (PDF/MD/JSON).
- **Evidencia & Veredicto:** 193 tests PASS. Commits `50fbdf3` a `2e7a0a0`. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.1-mvp.md`.

### 📌 Fase 2.0: Pantalones, Medidas a Medida & Etsy ZIP (`T-09` a `T-12`)
- **Objetivo:** Slopers paramétricos de pantalón/bermuda con aplomo y entrepierna igualada ($\Delta \le 0.05\text{ mm}$), motor de interpolación de medidas exactas del cliente con clamping anatómico, y empaquetador comercial `.zip` para Etsy con 13 tags SEO.
- **Evidencia & Veredicto:** 309 tests PASS. Commits `faaa7b8` a `32f05a9`. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.2-features.md`.

### 📌 Fase 3.0: Web Studio 2D & Conjuntos de 2 Piezas (`T-13` a `T-16`)
- **Objetivo:** Servidor HTTP REST nativo modular con CORS, Visor Vectorial 2D interactivo (zoom, pan, capas XS-3XL y cuadrícula A4), y generador de conjuntos coordinados de 2 piezas (Luffy Pirate Set: chaleco lino + bermuda denim).
- **Evidencia & Veredicto:** 375 tests PASS. Commits `563f4dc` a `bcb7fae`. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.3-web-ui.md`.

### 📌 Fase 4.0: Fireworks AI Multimodal (Qwen 3.8 Max) & Diagnóstico (`T-17` a `T-20`)
- **Objetivo:** Inferencia multimodal directa con Fireworks AI, eliminación de dependencias CLI bash obsoletas, script de diagnóstico (`scripts/test_fireworks_call.js`), logging transparente en consola del servidor, manejo de errores detallados (`error.details`), Drag & Drop con canvas resizing y generación a partir de imágenes de referencia (`scripts/test_fireworks_e2e_image.js`).
- **Evidencia & Veredicto:** 373 tests PASS, generación E2E en 15s generando los 11 entregables en disco. Commits `ed85ce8` a `2942d9d`. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.4-fireworks-multimodal.md`.

### 📌 Fase 5.0: Slopers Femeninos, Cosplay & Visor 3D WebGL (`T-21` a `T-24`)
- **Objetivo:**
  - `T-21` (Commit `b7b420a`): Sloper femenino con pinzas de busto al apex (`womenswear_bodice.ts`) y falda (`skirt.ts`).
  - `T-22` (Commit `a0c2ed4`): Modificador de vestidos coordinados, kimonos/haoris con mangas *Furisode*, faldas con pretina y presets oficiales (`anime_water_goddess_dress`, `demon_slayer_haori_kimono`).
  - `T-23` (Commit `176f724`): Generador binario nativo glTF 2.0 (`.glb`) con curvatura anatómica 3D, normales suaves, UVs y materiales PBR textiles, con soporte headless de Blender (`scripts/export_glb_headless.py`).
  - `T-24` (Commit `a0410d7`): Pestaña 'Visor 3D Interactivo' en Web Studio con Three.js 360°, streaming REST `/api/patterns/:concept/glb`, y ampliación del paquete Etsy a 7 carpetas comerciales con modelos `.glb`.
- **Evidencia & Veredicto:** 468 tests PASS across 17 suites. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.5-womenswear-and-3d-blender.md`.

### 📌 Fase 6.0: Triangulación 2D-a-3D Exacta y Siluetas Reales en Motor 3D (`T-25` a `T-28`)
- **Objetivo:** Implementación del motor de triangulación 2D por corte de orejas (*Ear Clipping*), proyector anatómico envolvente 3D para polígonos complejos (escotes en V, huecos de sisa, dobladillos en pico, mangas Furisode y piernas de pantalón), ensamblado multi-pieza y visualización fotorrealista fiel a la moldería 2D en el Web Studio.
- `T-25` (Commit `b315f5b`): Motor de triangulación `triangulator.ts` con Ear-Clipping CCW, validación de área analítica ($< 0.1\%$) y 25 tests unitarios. Veredicto **APTO**.
- `T-26` (Commit `e8d2380`): Proyector anatómico 3D `generateTrueToPatternMesh` que convierte contornos 2D en siluetas tridimensionales reales (escote V, sisas, picos, mangas Furisode, faldas y pantalones) con normales suaves y mapeo UV. Veredicto **APTO**.
- `T-27` (Commit `87d39c1`): Ensamblado multi-pieza y multi-material glTF 2.0 (`GarmentPrimitive3D`, `buildGlbBuffer` multi-primitiva, Lino Rojo + Denim Azul en sets) optimizado para WebGL. Veredicto **APTO**.
- `T-28` (Commit `67d7e65`): Visor 3D WebGL multi-primitiva en Web Studio y acumulador de geometrías. 513 tests PASS. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.6-true-to-pattern-3d-meshing.md`.

### 📌 Fase 7.0: Bloques Ancla FreeSewing, Moldería Industrial y Guía Visual 3D (`T-29` a `T-32`)
- **Objetivo:** Transformación del flujo para seleccionar un Bloque Base Ancla (Wahid, Simon, Brian, Bella, Paco, Sandy, Shin), inyección estructural al LLM para actuar como modificador puro, generación de moldería industrial confeccionable (cruces de botonadura +20mm, marcas de ojales/botones, vistas interiores y piquetes emparejados) y Guía Visual de Ensamble y Doblado 3D Despiezada con slider de armado en WebGL.
- `T-29` (Commit `87ea073`): Moldería industrial implementada (cruce de botonadura $+20\text{ mm}$, marcas vectoriales de botones/ojales, vistas interiores `front_facing`, `armhole_facing`, `back_neck_facing` con entretela y piquetes pareados en hombros/costados). 14 tests unitarios. Veredicto **APTO**.
- `T-30` (Commit `f6d6b0d`): Selector visual de 7 Bloques Base FreeSewing en Web Studio e inyección anatómica contextual al LLM (Qwen 3.8 Max como modificador puro). 20 tests unitarios y de servidor. Veredicto **APTO**.
- `T-31` (Commit `467587d`): Guía Visual de Ensamble y Doblado 3D Despiezada (*Exploded Assembly View*) con slider interactivo 0-100%, metadatos `explodeOffset` en glTF 2.0 y líneas de unión de costura. Veredicto **APTO**.
- `T-32` (Commit `ee491d6`): Ficha Técnica Industrial con secuencia de 4 pasos de confección, enriquecimiento de metadatos Etsy con guía de armado y empaquetado ZIP comercial de 7 carpetas. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.7-industrial-blueprints-and-3d-assembly.md` (Commit `7cf0c9a`).

### 📌 Mejoras Continuas: Espejado Frontal 3D, Entretela y Bajo en Doble Pico
- Commit `176a509` (`[FIX]`): Corrección de condición de espejado en `blender_bridge.ts` (`shouldMirror = !isFullSpan || onFold || part.cutCount === 2`), generando ambos lados frontales en 3D para `CORTAR x2` y asignación de material `Interfacing_Lining` a las vistas interiores.
- Commit `f39ddc1` (`[FEAT]`): Matriz de Inspección Ocular Multimodal de 6 Puntos en `prompt_builder.ts` y geometría de bajo en doble pico (`hem: { type: 'pointed', peak_drop_mm: 50 }`) en `modifier.ts` con abertura en V invertida y vista interior coordinada. 538 tests PASS.

### 📌 Migración y Sincronización a agents-workflow v3 (3.0.0-dev)
- **Fecha:** 2026-08-21
- **Job MAINTAIN (Rol: Ingeniero):** Sincronización de roles en `AGENTS.md` (Humano, Arquitecto, Ingeniero, Obrero), perfiles de aseguramiento (Lean por defecto: puertas deterministas por commit + fresh-context self-audit en hitos), separación estricta de planos (producto `[T-NN]` vs control `[STATE]`) y eliminación de campos obsoletos.
- **Job REINDEX (Rol: Ingeniero):** Revalidación de `APPCORE.md` con 538 tests PASS, motor 3D glTF 2.0, Ear-Clipping y reconstrucción de `INDEX.md` y `CURRENT.md`.

### 📌 Fase 8.0: Módulos de Cuellos Técnicos, Bolsillos Cargo con Fuelle 3D y Blueprint Utility Vest
- **Fecha:** 2026-08-21
- **Plan:** `archive/PLAN_v0.8-technical-modules-and-outerwear.md`
- **Resultados:**
  - `T-33` (Commit `2a61b72`): Implementación de generadores paramétricos para Cuello Alzado/Chimenea (`stand_collar`) con curvatura anatómica y Cuello Camisero con Tirilla (`shirt_collar_with_stand` -> `collar_stand` + `collar_fall`). 5 tests unitarios en `tests/collars.test.ts`. Veredicto **APTO**.
  - `T-34` (Commit `8c893d6`): Implementación del juego completo de Bolsillos Cargo 3D (`cargo_pocket_body`, `cargo_pocket_bellows` en tira U, `cargo_pocket_flap` con broches y entretela), blueprint ancla `utility_vest` (Chaleco Táctico / Safari / Cargo) en selector de Web Studio y `MockAiProvider`. 5 tests unitarios en `tests/cargo_pockets.test.ts`. Veredicto **APTO**.
  - Suite determinista global: **21/21 suites PASS (548/548 tests en verde)**. Plan archivado y veredicto **APTO**.

### 📌 Sesión Cerrada: Handoff & Plan v0.9 (Calibración 3D y Triangulación)
- **Fecha:** 2026-08-21
- **Job:** `HANDOFF` (Rol: Ingeniero)
- **Diagnóstico Visual 3D Realizado:**
  1. Identificada la causa de la tira horizontal atravesada (`cargo_pocket_bellows` proyectada plana a lo largo de X).
  2. Identificada la causa de la triangulación en abanico (*starburst fan*) por falsos positivos en `isPointInTriangle` en curvas densas.
  3. Identificada la causa de la distorsión del cuello (proyección de 6 vértices en 360° sin subdivisión cilíndrica).
  4. Identificado el desajuste de líneas de costura y capas Z en `viewer3d.js`.
- **Preparación:** Diseñado y dejado en borrador `.agents/PLAN_v0.9-3d-geometry-and-meshing-calibration.md` con las tareas `T-35` a `T-38`. Código intacto sin ejecutar para que el usuario descanse.

---

## 3. Matriz de Paradas Humanas (Stop Conditions)

| Código | Descripción de la Prueba | Criterio de Aceptación | Estado |
| :--- | :--- | :--- | :---: |
| **H-01** | Impresión física de Página 1 a escala 100%. | Medición con regla: exactamente $10.0\text{ cm} \times 10.0\text{ cm}$. | ✅ [VERIFICADO OK] |
| **H-02** | Continuidad de ensamble de hojas A4/Letter. | Líneas de corte continuas con PDFStitcher sin saltos ni escalones. | ✅ [VERIFICADO OK] |
| **H-03** | Verificación visual de patrones 2D y 3D en Web Studio. | Inspección interactiva del visor 2D y rotación 360° del visor 3D WebGL. | 🟡 [LISTO PARA PROBAR POR EL USUARIO] |

## 2026-08-23 - Aprobacion humana y activacion de Fase 9.0

- El Humano aprobo explicitamente el Plan v0.9 y las recomendaciones de preflight bajo la decision `D-2026-08-23-P9`.
- El Arquitecto reforzo `T-35` a `T-38` con alcance permitido, criterios cuantitativos, dependencias seriales, Audit Capsules y puerta obligatoria `npm run build && npm test` por tarea.
- El hito adopta auditoria Standard para el cierre y conserva `H-03` como barrera humana obligatoria.
- Siguiente transicion autorizada: el Ingeniero ejecuta `RUN THE LOOP` comenzando por `T-35` y responde al Arquitecto antes de avanzar.

## 2026-08-23 - Fase 9.0 implementada, pendiente H-03

- `T-35` APTO: Ear-Clipping conserva vertices colineales, bloquea diagonales internas invalidas y elimina el fallback en abanico.
- `T-36` APTO: bolsillos cargo exportan cuerpo, fuelle volumetrico de tres paredes y solapa con espejo x2.
- `T-37` APTO: cuellos tecnicos usan una unica banda cilindrica de 20 segmentos sin superficies coincidentes.
- `T-38` APTO: guias de torso, mangas, vistas y piernas usan bounds reales; pantalones sin torso conservan sus guias y el orden de capas es determinista.
- Puerta final del Arquitecto: `npm run build && npm test` con 21/21 suites y 556/556 tests PASS.
- STOP: `H-03` requiere inspeccion humana en Web Studio antes de emitir CLOSE y archivar la fase.

## 2026-08-23 - H-03 NO APTO y nueva meta Motor Semantico v1

- El usuario valido `H-03-A` a `H-03-E` como APTO.
- `H-03-F` detecto que la pernera trasera 3D esta espejada al reves y orienta el tiro hacia afuera.
- `H-03-G` se declaro N/A: Web Studio es desktop y no se solicito una version movil.
- `H-03-H` detecto deriva contractual: `prompt_builder.ts` ofrece `closure.type: pull_over`, mientras Zod lo rechaza.
- Phase 9 no recibe CLOSE ni archivo hasta resolver y repetir los checks fallidos.

### Decision `D-2026-08-23-V1`

- El Humano aprobo la direccion estrategica: Semantic Pattern Kernel, patronista conversacional persistente, tool calling, estado/revisiones fuera del modelo, RAG local, Capability Registry, Recipe DSL y Capability Workshop versionado.
- La IA opera herramientas semanticas; nunca genera coordenadas finales ni publica capacidades nuevas en runtime.
- Las capacidades progresan `draft -> experimental -> stable` con evidencia y aprobacion humana.
- El pipeline comercial actual se conserva mediante adapters durante una migracion incremental de cinco familias vendibles.
- Approval SHA-256: `9955801c27df9cc1e37a9eb67f9074765ade549fcb403565339865c466f45160`.
- La aprobacion actual permite PLAN y documentacion; no autoriza codigo ni ejecucion de experimentos.

### Investigacion open source

- GarmentCode (MIT) valida Edge/Panel/Component/Interface/StitchRule y operadores que mantienen conectividad.
- Design2GarmentCode (MIT) valida program synthesis multimodal y modificaciones conversacionales, pero evidencia el limite de un vocabulario cerrado.
- Flatten.js (MIT), Vercel AI SDK (Apache-2.0) y Orama (Apache-2.0) son candidatos principales sujetos a spikes.
- Seamly2D (GPLv3) queda como referencia funcional, no como dependencia aprobada.
- La ruta completa esta en `ROADMAP_v1-semantic-pattern-platform.md`; T-41 a T-44 estan definidos en `PLAN_v1.0-semantic-pattern-foundation.md` y bloqueados hasta nueva autorizacion.

## 2026-08-23 - Modelos orquestados y presupuesto Fireworks

- El Humano asigno al Arquitecto un asistente persistente GPT-5.6 Luna MAX para micro-correcciones, mantenimiento pequeno y auditorias enfocadas.
- El Humano autorizo al Ingeniero hasta dos Obreros DeepSeek V4 Flash orquestados mediante OpenCode y Fireworks AI.
- Evidencia de acceso: GPT-5.6 Luna respondio `LUNA_MAX_OK` en esfuerzo MAX.
- El catalogo mostro `deepseek-v4-flash`, pero una llamada real al alias fallo como no desplegado.
- El modelo fijado `fireworks-ai/accounts/fireworks/models/deepseek-v4-flash-0731` respondio `DEEPSEEK_V4_FLASH_0731_OK`.
- El Humano aprobo un tramo de USD 10 para Obreros y pruebas internas; recargara manualmente al agotarse.
- El presupuesto T-43 deja de ser blocker. T-41 a T-44 siguen bloqueadas solo por falta de autorizacion general de ejecucion.

## 2026-08-23 - Autorizacion de Foundation Spikes

- El Humano autorizo ejecucion automatica de T-41 a T-44 y seleccion del stack definitivo.
- Execution SHA-256: `a68bdfed622a4d3dab73303baef88d329d5b29c4dfcac24df4af7518a893bac0`.
- El limite aprobado termina despues de la recomendacion de stack y `H-04`; integrar Motor v2 requiere nueva confirmacion humana.






