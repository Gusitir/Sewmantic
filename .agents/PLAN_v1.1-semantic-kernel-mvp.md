# PLAN v1.1 - Phase 11 Semantic Pattern Kernel MVP

Status: active; execution authorized
Goal: convertir la evidencia de Foundation Spikes en un kernel semantico TypeScript productivo, aislado por adapters y ejecutado en shadow mode sin cambiar las salidas comerciales legacy.
Assurance: Standard; gates deterministas por tarea y auditoria independiente del Arquitecto.

## Approval record

- Decision ID: `D-2026-08-23-P11`
- Approved by: Humano (Usuario), orden explicita "Empieza en automatico la Phase 11" del 2026-08-23.
- Foundation decision: `DECISION_v1-foundation-stack.md` en savepoint `5abf95a`.
- Canonical statement: `P11|semantic-kernel-mvp|T45-contracts>T46-geometry-adapter>T47-constraints-operators>T48-legacy-shadow|units-mm|curve-kinds:line,arc,quadratic,cubic|shadow-opt-in-read-only|legacy-output-authority|stop-after-savepoint|decision:D-2026-08-23-P11`
- Approval SHA-256: `b329e034a02127f62f93f79441bab79ef35eb233c52fc695cc35d427d94880f9`
- Boundary: ejecutar T-45 a T-48, auditar, cerrar tecnicamente Phase 11 y crear savepoint. No migrar familias de prendas ni reemplazar legacy.

## Architectural contracts

1. Unidad canonica: milimetros; tolerancia serializada `<= 0.001 mm`.
2. Curvas semanticas: `line | circularArc | quadraticBezier | cubicBezier`; el dominio no expone tipos de terceros.
3. Entidades minimas: `Vertex`, `Edge`, `EdgeSequence`, `Panel`, `Component`, `Interface`, `StitchPair`, `ConstraintDiagnostic`.
4. IDs estables y serializacion versionada son parte del contrato; coordenadas solas no definen identidad.
5. `GeometryAdapter` encapsula Flatten.js y cualquier proveedor de offset.
6. Legacy `PatternPart` y sus artefactos siguen siendo autoridad durante Phase 11.
7. Shadow mode es opt-in, read-only, no escribe archivos, no altera resultados ni modifica `modifier.ts`/exporters.

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|---|:---:|
| **T-45** | Contratos TypeScript y serializacion versionada | Aprobacion P11 | `P11-CON-01` | APTO |
| **T-46** | GeometryAdapter Flatten y seleccion de offset | T-45 APTO | `P11-GEO-01` | APTO |
| **T-47** | Constraints y operadores con mutacion atomica | T-45/T-46 APTO | `P11-OPS-01` | READY |
| **T-48** | Adapter legacy y shadow mode sin deriva | T-45..T-47 APTO | `P11-SHD-01` | BLOCKED |

Secuencia obligatoria `T-45 -> T-46 -> T-47 -> T-48`. T-46 es el unico dueño de cambios de dependencias/lockfile. Un Obrero DeepSeek V4 Flash 0731 por tarea; Luna MAX solo para micro-correcciones del Arquitecto.

## `[T-45]` Domain Contracts & Serialization

- Objective: establecer contratos TypeScript productivos y JSON versionado sin dependencias geometricas externas.
- Allowed scope: `src/engine/v2/contracts.ts`, `src/engine/v2/serialization.ts`, `src/engine/v2/index.ts`, `tests/semantic_v2.test.ts`.
- Non-goals: algoritmos Flatten, constraints, operadores, pipeline o port directo del spike ESM.
- Acceptance criteria:
  - Tipos discriminados para vertices, cuatro curvas, edges, sequences, panels, components, interfaces, stitch pairs y diagnosticos.
  - Todas las medidas documentadas en mm y todos los IDs no vacios/unicos dentro del agregado.
  - Schema version explicita; deserialize rechaza versiones desconocidas y referencias rotas.
  - Round-trip preserva IDs, semantica, orden, referencias y medidas con error `<=0.001 mm`.
  - Cero importaciones de Flatten/Maker/GarmentCode y cero `any` en superficie publica.
- Evidence: tests contractuales, fixture JSON estable, diff, commit `[T-45]`, Audit Capsule.
- Gate: `npx vitest run tests/semantic_v2.test.ts && npm run build && npm test`.
- Audit trigger: contrato ambiguo, dependencia circular, ID recreado o tolerancia no explicita.
- STOP: requiere cambiar `PatternPart`, schema ADN o contratos publicos legacy.

## `[T-46]` GeometryAdapter & Offset Gate

- Objective: encapsular Flatten.js y seleccionar una estrategia productiva de offset/margen mediante evidencia.
- Allowed scope: `src/engine/v2/geometry/**`, `tests/semantic_geometry_v2.test.ts`, `package.json`, `package-lock.json`.
- Non-goals: exponer objetos Flatten, integrar exporters o usar Maker.js como kernel.
- Acceptance criteria:
  - Adapter convierte curvas/loops semanticos a geometria interna y retorna contratos propios.
  - Poligonos concavos, agujeros, booleanos, intersecciones y cortes curvos preservan area `<0.1%` y winding valido.
  - Comparar `@flatten-js/polygon-offset` contra offset propio minimo para 3/10/25 mm; seleccionar solo una estrategia.
  - Fixtures de esquina convexa/concava y curva no producen autointersecciones; resultado determinista en dos ejecuciones.
  - Licencia/version/adopcion documentadas y dependencias fijadas exactamente.
- Evidence: tests, SVG diagnosticos, decision de offset, diff, commit `[T-46]`, Audit Capsule.
- Gate: `npx vitest run tests/semantic_geometry_v2.test.ts && npm run experiment:geometry && npm run build && npm test`.
- Audit trigger: offset inestable, tipos de tercero filtrados, dependencia nativa o error topologico.
- STOP: ninguna estrategia pasa los fixtures; retornar al Arquitecto sin integrar offset.

## `[T-47]` Constraints & Atomic Operators

- Objective: implementar matching/constraints y operadores que actualicen interfaces atomica y trazablemente.
- Allowed scope: `src/engine/v2/constraints.ts`, `src/engine/v2/operators.ts`, `tests/semantic_constraints_v2.test.ts`, exports v2 estrictamente necesarios.
- Non-goals: recetas de prendas, UI, pipeline, 3D o mutacion legacy.
- Acceptance criteria:
  - Matching de interfaces con segmentaciones distintas preserva longitud `<=0.001 mm`.
  - Detecta seam delta `>3 mm`, orientacion incompatible, referencias rotas y longitudes `<=0`.
  - Split conserva longitud; dart agrega `2*depth +/-0.001 mm`; rechazo deja estado byte-identico.
  - Cut/dart actualizan todas las interfaces afectadas o fallan atomicamente.
  - Diagnosticos tipados contienen constraint ID, entidades, severidad y medidas, sin strings heuristicas como autoridad.
- Evidence: tests de exito/fallo/rollback, diff, commit `[T-47]`, Audit Capsule.
- Gate: `npx vitest run tests/semantic_constraints_v2.test.ts && npm run experiment:semantic && npm run build && npm test`.
- Audit trigger: mutacion parcial, arista degenerada, diagnostico no trazable o tolerancia inconsistente.
- STOP: tres fallos del mismo root cause o necesidad de modificar geometria legacy.

## `[T-48]` Legacy Adapter & Read-only Shadow Mode

- Objective: convertir `PatternPart` legacy a snapshot semantico y ejecutar validacion shadow opt-in sin alterar outputs.
- Allowed scope: `src/engine/v2/adapters/legacy-shadow.ts`, `src/engine/v2/shadow.ts`, un unico seam acotado en `src/pipeline.ts`, `tests/semantic_shadow_v2.test.ts`, exports necesarios.
- Non-goals: modificar `modifier.ts`, exporters, bundler, ADN, respuesta API o promover v2 como autoridad.
- Acceptance criteria:
  - Adapter cubre fixtures top, bottom y dress en dos tallas; preserva nombres, cutCount, onFold, grainline, notches y contornos.
  - Shadow default OFF; ON solo calcula diagnosticos en memoria y no escribe archivos.
  - Manifest de entregables, nombres, bytes y resultado publico es identico OFF vs ON para fixtures E2E.
  - Cualquier error v2 se registra como diagnostico no bloqueante; legacy continua y permanece autoridad.
  - Overhead medido y documentado; ningun secreto/ADN se persiste fuera del flujo actual.
- Evidence: comparación OFF/ON, tests E2E, diff, commit `[T-48]`, Audit Capsule.
- Gate: `npx vitest run tests/semantic_shadow_v2.test.ts && npm run build && npm test` con shadow OFF y ON.
- Audit trigger: byte drift, archivo nuevo, cambio de API, side effect o excepcion v2 que bloquea legacy.
- STOP: cualquier salida difiere; revertir el seam shadow y retornar NO APTO.

## Closure evidence

- Cuatro tareas APTO con Audit Capsules y commits enfocados.
- Gate final `npm run build && npm test` y gates focalizados frescos.
- APPCORE actualizado solo con arquitectura realmente integrada y verificada.
- Legacy artifacts byte-equivalent en shadow OFF/ON.
- Savepoint local/remoto/Google Drive despues del cierre tecnico.
- STOP antes de Phase 12; el siguiente plan requiere nueva autorizacion humana.
