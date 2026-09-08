# PLAN v1.7 - Schema Repair Pass 3: Union Recovery

Status: active; execution authorized
Goal: extender la repair pass para cubrir `invalid_union` (campos que aceptan objeto o array, ej. `modifications.trouser_pockets`), cuyos issues anidados (`invalid_enum_value`, `invalid_type`) hoy se saltan la reparacion y rechazan el ADN completo.
Assurance: Standard; gates deterministas por tarea.

## Approval record

- Decision ID: `D-2026-09-07-UNION`
- Approved by: Humano (Usuario), reporte del fallo en vivo "straw pirate denim shorts" (2026-09-07) — `trouser_pockets.type: "slash_with_coin"` rechazado.
- Boundary: solo `src/schema/pattern_schema.ts` y `tests/schema.test.ts`. Proveedores, prompts, pipeline, motor y enums reales intactos.

## Estrategia de reparacion (determinista, trazable)

1. **Sinonimos para `modifications.trouser_pockets.type`:** `slash_with_coin|slash_with_coin_pocket|coin_pocket` → `slash` (estilo jeans con bolsillo de moneda sobre la Slash).
2. **Union recovery generico:** para issues `invalid_union`, iterar `unionErrors[].issues` y aplicar a los `invalid_enum_value` anidados la misma estrategia de T-58 (sinonimo si hay mapa para esa ruta, sino deletion-trial del valor y progresivo hacia arriba). Los `invalid_type` anidados (array vs object) se resuelven implicitamente al reparar el enum en la rama de objeto.
3. **Fallback:** si el union no es reparable, deletion-trial de la ruta del union (eliminar `modifications.trouser_pockets` completo, campo opcional) y re-parsear; sino, ZodError original.
4. Log trazable `[schema-repair]` por reparacion. Max 3 pasadas globales compartidas con T-50/T-58. `parsePatternDna` estricto.

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|:---:|:---:|
| **T-60** | Union recovery: sinonimos trouser_pockets + manejo de invalid_union con deletion-trial | Aprobacion UNION | `P15-UNI-01` | READY |

## `[T-60]` Union Recovery

- Objective: cubrir `invalid_union` en la repair pass.
- Allowed scope: `src/schema/pattern_schema.ts`, `tests/schema.test.ts`.
- Non-goals: prompts, proveedores, enums reales, motor, pipeline.
- Acceptance criteria:
  - `trouser_pockets: { type: "slash_with_coin", ... }` → reparado a `"slash"` con log y ADN valida.
  - Enum desconocido sin sinonimo en `trouser_pockets.type` → deletion-trial elimina `trouser_pockets` y el ADN valida.
  - Clamps numericos (T-50), enum recovery de closure (T-58) y `parsePatternDna` estricto intactos.
- Gate: `npx vitest run tests/schema.test.ts && npm run build && npm test`.
- STOP: requiere tocar prompts o enums reales; retornar NO APTO.

## Closure evidence

- T-60 APTO con Audit Capsule; gates frescos; CURRENT/CONTEXT actualizados.
