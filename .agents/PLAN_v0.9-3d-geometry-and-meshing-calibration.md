# PLAN v0.9 - Fase 9: Calibracion Geometrica 3D, Despiece y Triangulacion Homogenea

Status: approved
Goal: Corregir las cuatro anomalias geometricas y visuales observadas en Web Studio sin alterar los contratos de ADN parametrico ni la geometria 2D industrial ya sellada.
Assurance: Standard para cierre de fase (puertas deterministas por tarea y auditoria independiente del hito)

## Approval record

- Decision ID: `D-2026-08-23-P9`
- Approved by: Humano (Usuario), autorizacion explicita en la sesion del Arquitecto el 2026-08-23.
- Source commit: `9fd427e`
- Canonical approval statement: `PLAN-v0.9|phase-9.0|serial:T-35>T-36>T-37>T-38|gate:npm-run-build+npm-test|closure:H-03+independent-audit|approved-by:human|decision:D-2026-08-23-P9`
- Approval SHA-256: `5d71a4e71b38e10a880f32061b70a67abf3216f6a7357d04d01c5c61256b3d57`
- Invalidation: cualquier cambio material de contratos, alcance permitido, orden de dependencias, criterios de aceptacion o puerta determinista exige retorno al Arquitecto y nueva aprobacion.

## Scope and closure

- In scope: robustez Ear-Clipping, proyeccion 3D de bolsillos cargo, subdivision cilindrica de cuellos y calibracion de guias/capas Z del visor.
- Non-goals: redisenar slopers, cambiar el esquema `PatternDna`, incorporar nuevos blueprints, sustituir el pipeline glTF, modificar exportacion PDF/Etsy o intervenir scripts Blender ajenos actualmente modificados.
- Execution order: `T-35 -> T-36 -> T-37 -> T-38`. `T-36` y `T-37` se serializan porque comparten `src/engine/blender_bridge.ts`; `T-38` integra el resultado visual de las anteriores.
- Commit policy: un commit de producto enfocado `[T-NN]` por tarea APTO; cambios de control separados en commits `[STATE]`; staging selectivo obligatorio.
- Required gate per product commit: `npm run build && npm test` ejecutado despues del cambio final.
- Closure evidence: cuatro Audit Capsules, diffs y commits enfocados, puertas frescas por tarea, auditoria independiente de fase, GLB/visor representativos y validacion humana `H-03`.

## Task matrix

| Tarea | Objetivo | Dependencia | Owner / Delegate | TESTING IDs | Estado |
|---|---|---|---|---|:---:|
| **T-35** | Ear-Clipping robusto sin fallback en abanico invalido | Ninguna | Ingeniero / Obrero Luna MAX | `P9-T35`, `P9-GATE` | APTO |
| **T-36** | Bolsillos cargo con fuelle 3D integrado y simetria x2 | T-35 APTO | Ingeniero / Obrero Luna MAX | `P9-T36`, `P9-GATE` | APTO |
| **T-37** | Cuellos 3D con subdivision cilindrica continua | T-36 APTO | Ingeniero / Obrero Luna MAX | `P9-T37`, `P9-GATE` | NO APTO |
| **T-38** | Guias de ensamble y orden de capas Z deterministas | T-37 APTO | Ingeniero / Obrero Luna MAX | `P9-T38`, `P9-GATE`, `H-03` | READY |

El Ingeniero puede usar como maximo dos agentes Obrero Luna simultaneos con esfuerzo MAX, pero este plan serializa los writes. No se autoriza trabajo paralelo sobre los archivos permitidos de estas tareas.

## `[T-35]` Ear-Clipping robusto en curvas densas

- Objective: eliminar triangulos en abanico invalidos en poligonos concavos densos conservando determinismo y area.
- Allowed scope: `src/engine/triangulator.ts`, `tests/triangulator.test.ts`.
- Non-goals: cambiar la API publica del triangulador, introducir una libreria de triangulacion o modificar consumidores 3D.
- Acceptance criteria:
  - Todo poligono simple valido de `n` vertices produce exactamente `n - 2` triangulos no degenerados.
  - La suma de areas conserva el area del poligono con error relativo menor a `0.1%`.
  - Winding y orientacion son consistentes; no hay aristas internas cruzadas ni indices fuera de rango.
  - Fixtures concavos densos, colineales y con escote V no activan un abanico desde el vertice 0 que cruce el exterior.
- Expected evidence: tests focalizados nuevos, diff, commit `[T-35]`, salida literal de `npm run build && npm test` y Audit Capsule con base/head.
- Audit trigger: cualquier fallback nuevo, cambio de tolerancia geometrica o caso degenerado omitido.
- Risks: precision flotante, vertices duplicados, colinealidad y regresion de winding.
- STOP: poligonos no simples requeridos por producto, necesidad de dependencia externa o cambio de contrato.

## `[T-36]` Bolsillos cargo 3D integrados y espejados

- Objective: proyectar `cargo_pocket_body`, `cargo_pocket_bellows` y `cargo_pocket_flap` como un conjunto volumetrico unido al torso.
- Allowed scope: `src/engine/blender_bridge.ts`, `tests/blender.test.ts`, `tests/cargo_pockets.test.ts` solo si la evidencia exige contrato compartido.
- Non-goals: redisenar las piezas 2D, cambiar dimensiones del ADN o modificar scripts Blender actualmente fuera de alcance.
- Acceptance criteria:
  - El fuelle forma paredes perimetrales y no una tira horizontal que atraviese el torso.
  - La solapa queda sobre el cuerpo del bolsillo con inclinacion frontal determinista.
  - `cutCount === 2` produce conjuntos derecho e izquierdo espejados, con normales de doble cara y materiales consistentes.
  - Vertices, indices, `explodeOffset` y bounds de cada primitiva GLB son finitos y estructuralmente validos.
- Expected evidence: fixtures GLB/metadata, tests focalizados, diff, commit `[T-36]`, puerta completa y Audit Capsule.
- Audit trigger: cambio de layout de primitivas, materiales, normales, simetria o metadatos de despiece.
- Risks: interseccion con torso, orientacion de normales, offsets inconsistentes y duplicacion incorrecta.
- STOP: necesidad de cambiar la geometria 2D o el contrato `PatternDna`.

## `[T-37]` Subdivision cilindrica de cuellos 3D

- Objective: mapear `stand_collar`, `collar_stand` y `collar_fall` a una superficie continua alrededor del cuello.
- Allowed scope: `src/engine/blender_bridge.ts`, `tests/blender.test.ts`, `tests/collars.test.ts` solo si la evidencia exige contrato compartido.
- Non-goals: cambiar patronaje 2D de cuellos, alturas aprobadas, piquetes o contratos Zod.
- Acceptance criteria:
  - La longitud se interpola en `16..24` segmentos con orden e indices deterministas.
  - El radio objetivo permanece entre `90..100 mm`, salvo evidencia geometrica documentada que requiera retorno al Arquitecto.
  - No existen triangulos que crucen el centro del cuello, indices invalidos, vertices no finitos ni cambios abruptos de winding.
  - `collar_stand` y `collar_fall` conservan relacion espacial, materiales y offsets de ensamble verificables.
- Expected evidence: tests de conteo/bounds/continuidad, diff, commit `[T-37]`, puerta completa y Audit Capsule.
- Audit trigger: heuristica por nombre de pieza, cambio de radio/rango o alteracion de contratos 2D.
- Risks: distorsion de escala, costura abierta, triangulos largos y conflicto con piezas no-collar.
- STOP: falta de metadatos para distinguir tipos de cuello sin cambiar contrato publico.

## `[T-38]` Guias de ensamble y orden de capas Z

- Objective: anclar guias a puntos reales de paneles y aplicar un orden Z reproducible para piezas exteriores, vistas y refuerzos.
- Allowed scope: `src/server/public/viewer3d.js`, `tests/viewer3d.test.ts`.
- Non-goals: sustituir el renderer WebGL, redisenar la interfaz o modificar endpoints del servidor.
- Acceptance criteria:
  - Las guias conectan hombros y costados correspondientes sin diagonales espurias ni coordenadas hardcoded ajenas al modelo cargado.
  - El orden Z y `explodeOffset` mantienen separacion determinista entre exterior, vistas y entretela durante `0..100%` del despiece.
  - Carga, rotacion y slider continúan operativos en desktop y viewport movil.
  - El build resincroniza los estaticos y los tests verifican anclajes y precedencia de capas.
- Expected evidence: tests focalizados, diff, commit `[T-38]`, puerta completa, captura/artefacto reproducible del visor y Audit Capsule.
- Audit trigger: dependencia de geometria hardcoded, regresion responsive o divergencia entre `src` y `dist`.
- Risks: pruebas DOM insuficientes, metadatos GLB incompletos y falso positivo visual.
- STOP: `H-03` revela defecto material, metadata necesaria no existe o se requiere cambiar API/GLB.

## Milestone audit and stop conditions

- El Ingeniero no autoaprueba trabajo de sus obreros: debe devolver al Arquitecto las cuatro Audit Capsules y el resumen de fase para auditoria de cierre.
- Tres ciclos fallidos sobre la misma causa raiz detienen el loop y escalan al Arquitecto.
- Una puerta requerida no disponible produce `BLOCKED`, nunca una reduccion de alcance.
- `H-03` sigue siendo barrera humana obligatoria para el veredicto final y cierre de Fase 9.0.
