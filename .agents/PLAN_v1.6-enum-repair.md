# PLAN v1.6 - Schema Repair Pass 2: Enum Recovery (H-03-H)

Status: active; execution authorized
Goal: extender la pasada de reparacion determinista de `sanitizeAndParseLlmJson` para cubrir `invalid_enum_value` (valores de enum alucinados por el LLM, ej. `closure.type: "wrap"`), cerrando el hallazgo `H-03-H` y la clase de fallo que sigue rechazando generaciones completas.
Assurance: Standard; gates deterministas por tarea.

## Approval record

- Decision ID: `D-2026-09-07-ENUM`
- Approved by: Humano (Usuario), reporte del segundo fallo en vivo del mismo patron (2026-09-07) siguiendo la linea del clamp aprobado en `D-2026-09-07-REPAIR`.
- Boundary: solo `src/schema/pattern_schema.ts` y `tests/schema.test.ts`. Proveedores, prompts, pipeline y motor intactos.

## Estrategia de reparacion (determinista, trazable)

1. **Normalizacion de sinonimos conocidos** para `modifications.closure.type` (caso H-03-H): mapeo curado case/underscore-insensitive aplicado antes de validar — `wrap|wrapped|pullover|pull_over|pull-over` y similares al valor semantico mas cercano del enum (`wrap→ties`, `pullover→none`, `zip→zipper`, `button→buttons`, `snap→snaps`).
2. **Deletion-trial generico** para cualquier `invalid_enum_value` restante: intentar eliminar el valor en `issue.path`; si sigue invalido, eliminar progresivamente hacia arriba (el padre opcional, ej. `modifications.closure`) hasta que valide. Si nada funciona, propagar el ZodError original.
3. Todo con log `[schema-repair] path: original -> resolucion` (igual que T-50). `parsePatternDna` permanece estricto. Max 3 pasadas totales combinadas con el clamp numerico.

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|:---:|:---:|
| **T-58** | Enum recovery: sinonimos + deletion-trial + tests | Aprobacion ENUM | `P14-ENM-01` | READY |

## `[T-58]` Enum Recovery

- Objective: cubrir `invalid_enum_value` en la repair pass sin debilitar la validacion.
- Allowed scope: `src/schema/pattern_schema.ts`, `tests/schema.test.ts`.
- Non-goals: prompts, proveedores, pipeline, cambios de enums reales, motor.
- Acceptance criteria:
  - `closure.type: "wrap"` → reparado a `"ties"` con log; `"pullover"` → `"none"`; `"ZIP"` case-insensitive → `"zipper"`.
  - Enum invalido sin sinonimo (ej. `neckline.type: "laser"`) → deletion-trial elimina el campo/padre opcional y el ADN valida.
  - Errores no reparables propagan el ZodError original; `parsePatternDna` sigue estricto; clamps numericos de T-50 intactos.
- Gate: `npx vitest run tests/schema.test.ts && npm run build && npm test`.
- STOP: requiere tocar prompts o enums reales; retornar NO APTO.

## Closure evidence

- T-58 APTO con Audit Capsule; gates frescos; CURRENT/CONTEXT actualizados.
