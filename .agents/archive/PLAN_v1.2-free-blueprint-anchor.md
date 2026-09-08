# PLAN v1.2 - Free Blueprint Anchor (Composición Creativa Libre)

Status: active; execution authorized
Goal: permitir al agente (Gemini 3.8 Flash High) componer el ADN paramétrico con la paleta completa de modificaciones y rangos amplios, sin las restricciones anatómicas de los anchors específicos (wahid/simon/brian/...), manteniendo el esquema Zod como frontera dura y el motor geométrico legacy como autoridad de dibujo.
Assurance: Standard; gates deterministas por tarea y auditoria del Ingeniero/Arquitecto.

## Approval record

- Decision ID: `D-2026-09-07-FREE`
- Approved by: Humano (Usuario), orden explicita "Opcion 1 ... crea el plan, los briefs e implementa" del 2026-09-07.
- Base: checkpoint v2 `savepoint-v1-gemini-oauth-20260907` (commit `721bd63`, suite 624/624).
- Boundary: solo el anchor de prompt libre + selector Web Studio + tests. No cambia Zod, modifier.ts, exporters ni legacy outputs.

## Arquitectura del cambio

1. `PromptBuilder.buildBlueprintContext()` agrega el caso `free` (alias `libre`, `creative`):
   - El agente actua como **PURE PARAMETRIC COMPOSER** (no MODIFIER de un sloper fijo).
   - Paleta completa: cualquier `base_block` soportado, `garment_category`, holguras con rangos amplios y **todas** las modificaciones implementadas (escotes, mangas, dobladillos, bolsillos, capuchas, cuellos, cierres, pinzas, pantalones, faldas, vestidos, kimonos).
   - Reglas de coherencia textil en lugar de restricciones: consistencia anatomica (manga <-> sisa, capucha <-> escote, cierre <-> cruce frontal, medidas coherentes entre piezas), todas las medidas en mm, y advertencia explicita de que valores fuera del rango del esquema son rechazados (Zod).
   - No enumera "Admitted Modifications" cerrados ni fuerza `base_block`/categoría.
2. Web Studio (`src/server/public/index.html`): nueva opcion `value="free"` en el selector `baseBlockSelect` (etiqueta de composicion creativa), sin cambiar el resto.
3. Tests: cobertura de `buildBlueprintContext` para `free`/`libre`/`creative` (contenido creativo, no vacio), y que `auto`/`none`/`""` sigan devolviendo `""`.

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|:---:|:---:|
| **T-49** | Free blueprint anchor en prompt + selector Web Studio + tests | Aprobacion FREE | `FREE-01` | APTO |

## `[T-49]` Free Blueprint Anchor

- Objective: implementar el anchor libre de composicion creativa sin tocar Zod ni el motor geometrico.
- Allowed scope: `src/ai/prompt_builder.ts`, `src/server/public/index.html`, `tests/ai_provider.test.ts`.
- Non-goals: cambios en `pattern_schema.ts`, `modifier.ts`, exporters, pipeline, respuesta API o ADN.
- Acceptance criteria:
  - `buildBlueprintContext("free")`, `"libre"` y `"creative"` devuelven instrucciones de composicion creativa (no vacio, mencionan paleta completa, coherencia anatomica y frontera Zod mm).
  - `buildBlueprintContext("auto")`, `"none"`, `""` y `undefined` siguen devolviendo `""`.
  - El selector `baseBlockSelect` del Web Studio incluye la opcion `free` sin romper las existentes.
  - Suite completa verde: `npm run build && npm test` (624 existentes + nuevos).
- Evidence: diff enfocado, tests nuevos, salida literal de las puertas, commit `[T-49]`, Audit Capsule.
- Gate: `npm run build && npm test`.
- Audit trigger: modificacion fuera de scope, contenido ambiguo del prompt, selector roto o suite con fallos.
- STOP: requiere tocar Zod, modifier.ts o salidas legacy; retornar NO APTO.

## Closure evidence

- T-49 APTO con Audit Capsule y commit enfocado.
- Gate final `npm run build && npm test` fresco.
- CURRENT/CONTEXT actualizados; veredicto registrado.
