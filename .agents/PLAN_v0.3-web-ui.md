# PLAN v0.3 - Fase 3: Web Studio Local, Visor 2D Interactivo y Generador de Conjuntos Multi-Pieza

Status: active
Goal: Desarrollar el Web Studio interactivo local para pattern-ai-core (servidor API, visor vectorial 2D en tiempo real, personalizador visual de medidas) y soporte nativo para generacion de conjuntos completos de 2 piezas (Top + Bottom).
Assurance: Lean

## Matriz de Tareas y Asignacion de Roles

| Tarea | Descripcion | Rol Principal | Rol Secundario | Puerta Determinista |
|---|---|---|---|---|
| **T-13** | Servidor API REST Local y Endpoints del Motor (`src/server/`) | Ingeniero | Obrero | `npm test` |
| **T-14** | Visor Vectorial 2D Interactivo (Zoom, Pan, Capas XS-3XL y Cuadricula A4) | Obrero | Ingeniero | `npm test` |
| **T-15** | Dashboard Web Studio (Prompt IA, Sliders Antropometricos y Descarga ZIP) | Obrero | Arquitecto | `npm test` |
| **T-16** | Generador de Conjuntos Completos de 2 Piezas (Top + Bottom / Set Pirata) | Ingeniero | Obrero | `npm test` |

---

## Detalle de Tareas

### T-13 - Servidor API REST Local y Endpoints del Motor

- Status: active
- Depends on: T-12
- Scope: `src/server/app.ts`, `src/server/routes.ts`, `src/index.ts`, `tests/server.test.ts`
- Rol: Ingeniero (Diseno de API y endpoints HTTP nativos).
- Acceptance:
  - [ ] Servidor HTTP ligero sin dependencias pesadas (Node.js `http` nativo o Express/Fastify).
  - [ ] Endpoint `POST /api/generate`: Recibe prompt, proveedor, medidas personalizadas y genera el set.
  - [ ] Endpoint `GET /api/patterns`: Lista todos los patrones generados en `output/`.
  - [ ] Endpoint `GET /api/patterns/:concept/svg`: Devuelve el SVG vectorial continuo para visualizacion web.
  - [ ] Endpoint `GET /api/patterns/:concept/bundle`: Descarga directa del ZIP comercial para Etsy.
  - [ ] Endpoint `GET /api/presets`: Devuelve el catalogo de presets preconfigurados (hoodie, tshirt, vest, shorts, dress).
- Gates: `npm test`
- Human checks: none
- Risk triggers: Puertos ocupados o rutas de archivos bloqueadas.
- STOP when: El servidor no responda con JSON valido o fallen los endpoints de descarga.

---

### T-14 - Visor Vectorial 2D Interactivo

- Status: pending
- Depends on: T-13
- Scope: `src/server/public/viewer.js`, `src/server/public/viewer.css`, `tests/viewer.test.ts`
- Rol: Obrero (Frontend vectorial interactivo).
- Acceptance:
  - [ ] Renderizado SVG interactivo con soporte de Zoom in/out, Pan y Reset View.
  - [ ] Selector de visibilidad de capas por talla (XS, S, M, L, XL, 2XL, 3XL).
  - [ ] Superposicion de cuadricula de paginacion A4 / US Letter con visualizacion de hojas activas.
  - [ ] Medidor metrico interactivo (regla virtual en mm y verificacion de cuadro 10x10 cm).
- Gates: `npm test`

---

### T-15 - Dashboard Web Studio

- Status: pending
- Depends on: T-14
- Scope: `src/server/public/index.html`, `src/server/public/app.js`, `src/server/public/style.css`
- Rol: Obrero (Interfaz de usuario moderna y responsiva).
- Acceptance:
  - [ ] Panel de generacion por Prompt de lenguaje natural o seleccion de catalogo.
  - [ ] Sliders biometricos interactivos en tiempo real para medidas a medida (pecho, cintura, cadera, largo).
  - [ ] Visualizacion instantanea de la Ficha Tecnica, desglose de piezas, consumo de tela y BOM de avios.
  - [ ] Botones de descarga con 1 clic para: PDF A4, Letter, A0, SVG, TechPack PDF y ZIP Etsy.
- Gates: `npm test`

---

### T-16 - Generador de Conjuntos Completos de 2 Piezas (Top + Bottom)

- Status: pending
- Depends on: T-10, T-12
- Scope: `src/engine/modifier.ts`, `src/ai/mock_provider.ts`, `src/pipeline.ts`, `tests/two_piece_set.test.ts`
- Rol: Ingeniero (Orquestacion de molderia compuesta).
- Acceptance:
  - [ ] Preset `straw_pirate_full_set`: Genera simultaneamente el Chaleco Rojo + Bermuda Denim Deshilachada.
  - [ ] Ficha tecnica consolidada con consumo total de telas (Lino rojo + Denim azul) y avios (botones + ojetes + cordon).
  - [ ] Empaquetado comercial unificado en un solo ZIP de Etsy (`01_Tiled_A4_Vest`, `02_Tiled_A4_Shorts`, etc.).
- Gates: `npm test`

---

## Closure gate

- [ ] Todas las tareas (`T-13` a `T-16`) completadas y auditadas con veredicto APTO.
- [ ] Servidor web local operativo ejecutable via `npm start` o `pattern-ai-core serve`.
- [ ] Suite completa de pruebas automatizadas en verde.
