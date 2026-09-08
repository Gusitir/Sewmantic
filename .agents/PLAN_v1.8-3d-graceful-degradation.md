# PLAN v1.8 - 3D Graceful Degradation (no bloquear entregables 2D)

Status: active; execution authorized
Goal: que un fallo de triangulacion 3D (ear clipping sobre poligonos auto-intersectados generados por combinaciones extremas de modificaciones del LLM) NO cancele la generacion: degradar con elegancia, conservar los entregables 2D (PDFs/SVG/techpack/ADN) y registrar advertencia clara.
Assurance: Standard; gates deterministas por tarea.

## Approval record

- Decision ID: `D-2026-09-08-3D`
- Approved by: Humano (Usuario), reporte del fallo en vivo (2026-09-08) "Unable to triangulate polygon with ear clipping" que cancelo la generacion completa de "straw pirate denim shorts" DESPUES de validar el ADN.
- Boundary: pipeline (seam 3D), blender_bridge (limpieza previa de poligono), tests. NO tocar triangulator (algoritmo), exporters, ADN, prompts, proveedores.

## Estrategia

1. **Degradacion elegante en el pipeline:** `generate3DGarmentModel` se ejecuta en try/catch; si falla, `console.warn` claro (pieza/piezas y causa), `files.glb` queda `undefined` y el flujo continua con los 9 entregables restantes.
2. **Limpieza previa del poligono (rescate):** antes de `triangulatePolygon`, deduplicar puntos consecutivos duplicados (tolerancia 0.01mm) y eliminar puntos colineales casi exactos; reintentar la triangulacion con el poligono limpio antes de propagar el fallo. Rescata la mayoria de los casos por precision flotante.
3. `PipelineFiles.glb` ya es opcional (`glb?: string`) — sin cambio de contrato publico.

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|:---:|:---:|
| **T-61** | Degradacion elegante del 3D + limpieza previa de poligono | Aprobacion 3D | `P16-3D-01` | READY |

## `[T-61]` 3D Graceful Degradation + Polygon Cleanup

- Objective: el fallo de triangulacion 3D no cancela los entregables 2D; limpieza previa rescata casos por precision flotante.
- Allowed scope: `src/pipeline.ts` (try/catch del seam 3D), `src/engine/blender_bridge.ts` (helper de limpieza previa a `triangulatePolygon`), `tests/pipeline.test.ts` o el archivo de tests que cubra el pipeline, `tests/blender.test.ts`.
- Non-goals: cambiar el algoritmo ear clipping en `triangulator.ts`, ADN, prompts, proveedores, exporters.
- Acceptance criteria:
  - Pipeline con ADN que produce poligono no triangulable: genera TODOS los entregables 2D, `files.glb === undefined`, `console.warn` con causa. El pipeline NO lanza.
  - Limpieza previa: poligono con puntos duplicados consecutivos/colineales triangula correctamente tras limpieza (test unitario del helper).
  - Suite completa verde; tests E2E existentes intactos.
- Gate: `npx vitest run tests/blender.test.ts && npm run build && npm test`.
- STOP: requiere tocar triangulator.ts o ADN; retornar NO APTO.

## Closure evidence

- T-61 APTO con Audit Capsule; gates frescos; CURRENT/CONTEXT actualizados.
