# PLAN v1.9 - Back Leg Self-Intersection (wide_baggy + bermuda)

Status: active; execution authorized
Goal: garantizar que cualquier ADN valido por esquema produzca contornos de pernera simples (no auto-intersectados) — corregir la geometria del bloque de pantalon para la combinacion `wide_baggy` + bermuda corta + puño, que hoy produce contornos cruzados (patron 2D inutilizable y fallo de triangulacion 3D).
Assurance: Standard; gates deterministas por tarea.

## Approval record

- Decision ID: `D-2026-09-08-LEG`
- Approved by: Humano (Usuario), reporte con captura del patron 2D auto-intersectado (2026-09-08) tras la degradacion elegante de T-61.
- Evidence del fallo: `output/pirate_captain_denim_bermuda/pirate_captain_denim_bermuda_dna.json` (base_block pants_sloper; wide_baggy + bermuda inseam 340mm + cuffed 45mm + hip_ease 70mm).

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|:---:|:---:|
| **T-62** | Corregir auto-interseccion de pernera para wide_baggy+bermuda+cuff con test de regresion del ADN real | Aprobacion LEG | `P16-LEG-01` | READY |

## `[T-62]` Back Leg Self-Intersection Fix

- Objective: el contorno de front/back leg debe ser poligono simple para cualquier combinacion de parametros validos por esquema.
- Allowed scope: `src/engine/base_blocks/trousers.ts` y/o `src/engine/modifier.ts` (segun donde resida la correccion), `tests/trousers.test.ts` o el archivo que cubra pantalones.
- Non-goals: triangulator, blender_bridge, exporters, ADN/pattern_schema, UI.
- Acceptance criteria:
  - El ADN exacto del fallo reproduce el bug (contorno auto-intersectado detectable) y tras la correccion produce contornos simples (verificacion determinista: segments no se cruzan entre si salvo extremos compartidos).
  - Test de regresion con el ADN real (inline o fixture) para front y back leg.
  - Parametros limites: probar combos extremos (inseam min 100/max, wide_baggy + shorts/cropped, cuffs) — contornos simples siempre.
  - Suite completa verde; sin regresion en 770+ tests existentes.
- Gate: `npx vitest run <tests de pantalon> && npm run build && npm test`.
- STOP: requiere tocar triangulator o ADN; retornar NO APTO.

## Closure evidence

- T-62 APTO con Audit Capsule; gates frescos; CURRENT/CONTEXT actualizados; verificacion visual humana.
