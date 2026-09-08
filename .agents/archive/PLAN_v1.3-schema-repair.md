# PLAN v1.3 - Schema Repair Pass (Clamp Determinista)

Status: active; execution authorized
Goal: evitar que salidas del LLM con valores numericos fuera de rango rechacen el ADN completo; recortarlos deterministicamente a los limites del propio esquema Zod con registro trazable, revalidando hasta 3 pasadas.
Assurance: Standard; gates deterministas por tarea y auditoria del Ingeniero/Arquitecto.

## Approval record

- Decision ID: `D-2026-09-07-REPAIR`
- Approved by: Humano (Usuario), eleccion "Clamp de reparacion (Recomendado)" del 2026-09-07 tras el segundo fallo en vivo (`pocket.height_mm < 30`).
- Base: checkpoint v2 `savepoint-v1-gemini-oauth-20260907` + T-49 APTO (commit `33f50af`, suite 625/625).
- Boundary: solo la capa de sanitizacion de salida LLM y sus tests. No cambia proveedores, prompts, pipeline, modifier ni exporters.

## Arquitectura del cambio

1. `sanitizeAndParseLlmJson()` (src/schema/pattern_schema.ts) agrega una pasada de reparacion:
   - `PatternDnaSchema.safeParse` sobre el JSON parseado (hasta 3 intentos).
   - Por cada issue `too_small`/`too_big` con `minimum`/`maximum` numericos: recortar el numero en `issue.path` al limite (precision mm 0.001).
   - Log trazable por valor corregido: `[schema-repair] <path>: <valor> -> <limite>`.
   - Si una pasada no reparo nada: propagar el ZodError original (sin debilidar la validacion).
2. `parsePatternDna()` permanece estricto (validacion de ADN manual/directDna sin reparacion).
3. Beneficia a todos los proveedores (Gemini ADC, Fireworks/Qwen, futuros): la reparacion vive en la capa de esquema, no en el proveedor.

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|:---:|:---:|
| **T-50** | Repair pass con clamp a limites Zod + tests | Aprobacion REPAIR | `REPAIR-01` | APTO |

## `[T-50]` Schema Repair Pass

- Objective: implementar el clamp de reparacion determinista en `sanitizeAndParseLlmJson` con cobertura de tests del caso real.
- Allowed scope: `src/schema/pattern_schema.ts`, `tests/schema.test.ts`.
- Non-goals: proveedores IA, prompts, `parsePatternDna` (sigue estricto), pipeline, modifier, exporters, UI.
- Acceptance criteria:
  - `sanitizeAndParseLlmJson` repara `too_small` (ej. `modifications.pocket.height_mm: 10` -> 30) y `too_big` (ej. `ease.chest_ease_mm: 800` -> 500) con log trazable.
  - Errores no reparables (estructura, enums, strings) propagan el mensaje Zod original.
  - `parsePatternDna` sigue rechazando sin reparacion (tests existentes intactos).
  - Suite completa verde: `npm run build && npm test` (625 existentes + nuevos).
- Evidence: diff enfocado, tests nuevos (caso real del fallo en vivo), salida literal de puertas, commit `[T-50]`, Audit Capsule.
- Gate: `npm run build && npm test`.
- Audit trigger: reparacion silenciosa sin log, cambio de semantica de `parsePatternDna`, alcance excedido o suite con fallos.
- STOP: requiere cambiar proveedores, prompts o motor geometrico; retornar NO APTO.

## Closure evidence

- T-50 APTO con Audit Capsule y commit enfocado.
- Gate final `npm run build && npm test` fresco.
- CURRENT/CONTEXT actualizados; veredicto registrado.
