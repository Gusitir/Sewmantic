# PLAN v1.0 - Foundation Spikes para Motor Semantico y Patronista Conversacional

Status: active; execution authorized through stack selection
Goal: seleccionar con evidencia las fundaciones tecnicas minimas para Motor v2 sin integrar dependencias ni modificar el motor de producto actual.
Assurance: Standard para la decision de arquitectura; gates deterministas por spike.

## Approval record

- Decision ID: `D-2026-08-23-V1`
- Approved by: Humano (Usuario), quien solicito trasladar la sesion y adoptar las recomendaciones el 2026-08-23.
- Source commit: `1a9e748`
- Canonical approval statement: `V1|semantic-pattern-kernel|persistent-patternist-harness|capability-registry|recipe-dsl|rag-local|versioned-extension-workshop|foundation-spikes:T-41,T-42,T-43,T-44|no-product-code-authorized|decision:D-2026-08-23-V1`
- Approval SHA-256: `9955801c27df9cc1e37a9eb67f9074765ade549fcb403565339865c466f45160`
- Authority boundary: esta aprobacion autoriza documentar y preparar la ruta; no autoriza implementar ni ejecutar los spikes.
- Invalidation: cambiar el north star, permitir coordenadas arbitrarias del modelo, reemplazar el pipeline comercial o incorporar GPLv3 invalida esta aprobacion.

### Execution authorization

- Decision ID: `D-2026-08-23-V1-EXEC`
- Authorized by: Humano (Usuario), 2026-08-23.
- Canonical execution statement: `EXEC|PLAN-v1.0|T-41,T-42,T-43,T-44|automatic-until-stack-selection|stop-before-engine-integration|fireworks-budget:USD10|decision:D-2026-08-23-V1-EXEC`
- Execution SHA-256: `a68bdfed622a4d3dab73303baef88d329d5b29c4dfcac24df4af7518a893bac0`
- Boundary: ejecutar T-41 a T-44, seleccionar el stack y hacer STOP. La integracion del Motor v2 requiere nueva confirmacion humana.

## Scope and non-goals

- In scope: cuatro experimentos aislados, comparacion reproducible, artefactos diagnosticos y recomendacion de dependencias.
- Non-goals: modificar `src/`, migrar prendas, corregir defectos de Fase 9, crear UI final, entrenar modelos, integrar simulacion pesada o publicar capacidades.
- Workspace futuro: `experiments/` exclusivamente, mas scripts/gates y archivos de paquete estrictamente necesarios.
- Product compatibility: el codigo existente permanece autoridad y baseline; ningun spike se promueve automaticamente.
- Open predecessor: `PLAN_v0.9-3d-geometry-and-meshing-calibration.md` sigue sin CLOSE por `H-03` NO APTO.

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|---|:---:|
| **T-41** | Comparar kernel geometrico 2D con fixtures textiles | Autorizacion de ejecucion | `V1-GEO-01` | APTO |
| **T-42** | Probar modelo semantico Edge/Panel/Interface/StitchPair | T-41 APTO | `V1-SEM-01` | APTO |
| **T-43** | Probar harness persistente, tools, revisiones y Fireworks | Autorizacion de ejecucion | `V1-HAR-01` | APTO |
| **T-44** | Probar RAG local full-text/hibrido sobre reglas textiles | Autorizacion de ejecucion | `V1-RAG-01` | READY |

Los spikes se serializan si comparten `package.json` o lockfile. El Ingeniero puede paralelizar como maximo dos Obreros DeepSeek V4 Flash 0731 solo con workspaces y staging disjuntos.

## `[T-41]` Geometry Adapter Spike

- Objective: comparar `Flatten.js` y las capacidades pertinentes de `Maker.js` con fixtures reales de patronaje.
- Allowed future scope: `experiments/geometry-kernel/**`; archivos de paquete raiz solo si son indispensables y estan incluidos en el brief del Ingeniero.
- Non-goals: reemplazar `geometry.ts`, exportar Etsy o adoptar una dependencia durante el spike.
- Acceptance criteria:
  - Fixtures de poligono concavo, agujero, corte por curva, booleano y margen offset operan en milimetros.
  - Corte/booleano preserva area con error relativo `< 0.1%` donde aplique.
  - Offsets no contienen autointersecciones ni orientacion invalida en los casos aprobados.
  - Serializacion round-trip es determinista.
  - Informe compara API, bundle/dependencias, licencia, mantenimiento, tolerancias y latencia.
- Expected evidence: tests, SVG diagnosticos, benchmark pequeno, diff, commit `[T-41]` y Audit Capsule.
- Deterministic gate to create and run: `npm run experiment:geometry && npm run build && npm test`.
- Audit trigger: error de area, offset inestable, dependencia nativa o comportamiento distinto Windows/Node.
- Risks: tolerancias flotantes, semantica de arcos y offsets no textiles.
- STOP: ninguna libreria satisface los fixtures sin parches sustanciales; volver al Arquitecto.

## `[T-42]` Semantic Kernel Spike

- Objective: demostrar un kernel TypeScript minimo inspirado en GarmentCode, sin portar su stack completo.
- Allowed future scope: `experiments/semantic-kernel/**`; atribuciones de algoritmos reutilizados.
- Non-goals: recetas completas, UI, 3D, grading o integracion con `modifier.ts`.
- Acceptance criteria:
  - Modelar `Edge`, `EdgeSequence`, `Panel`, `Interface`, `StitchPair` y diagnosticos.
  - Emparejar dos interfaces con distinta segmentacion sin perder longitud total.
  - Detectar diferencia de costura `> 3 mm` y orientacion incompatible.
  - Insertar un corte o pinza manteniendo actualizadas las interfaces afectadas.
  - Serializar/deserializar sin cambiar IDs, semantica ni medidas.
- Expected evidence: tests, SVG de dos paneles cosibles, JSON round-trip, commit `[T-42]` y Audit Capsule.
- Deterministic gate to create and run: `npm run experiment:semantic && npm run build && npm test`.
- Audit trigger: mutaciones no trazables, referencias rotas o necesidad de copiar el framework Python completo.
- Risks: modelo demasiado grande, identidad de vertices y deriva entre geometria y semantica.
- STOP: la seleccion geometrica T-41 no soporta operaciones requeridas o el contrato no puede mantenerse pequeno.

## `[T-43]` Patternist Harness Spike

- Objective: comparar Vercel AI SDK y OpenAI Agents SDK para un agente Fireworks persistente con tools de dominio.
- Allowed future scope: `experiments/agent-harness/**`; fixtures locales sin acceso arbitrario al repositorio.
- Non-goals: chat final, multiagente, shell, escritura libre de archivos o integracion al motor actual.
- Tools minimas: `get_current_pattern`, `list_capabilities`, `apply_pattern_patch`, `validate_pattern`, `create_revision`, `undo_revision`.
- Acceptance criteria:
  - La sesion conserva decisiones en al menos cinco turnos y sobrevive reinicio local.
  - Cada mutacion crea revision provisional; undo restaura exactamente el estado anterior.
  - Argumentos se validan con Zod y tools inexistentes no se ejecutan.
  - El transcript registra input, tool call, resultado, revision y parada.
  - Prueba offline mock es obligatoria; el presupuesto Fireworks de USD 10 esta aprobado y la prueba real usa maximo 8 llamadas y 48k tokens.
  - Informe compara compatibilidad, complejidad, streaming, sesiones, HITL, licencia y lock-in.
- Expected evidence: transcript reproducible, tests mock, costo real declarado si aplica, commit `[T-43]` y Audit Capsule.
- Deterministic gate to create and run: `npm run experiment:harness && npm run build && npm test`.
- Audit trigger: perdida de estado, tool loop no acotado, parche no reversible o divergencia mock/Fireworks.
- Risks: semantica OpenAI-compatible incompleta, consumo API y dependencia excesiva del framework.
- STOP: saldo insuficiente, mas de ocho llamadas, tres fallos del mismo root cause o necesidad de shell.

## `[T-44]` Local RAG Spike

- Objective: comparar Orama full-text/hibrido con Vectra solo si el benchmark demuestra necesidad vectorial.
- Allowed future scope: `experiments/rag-retrieval/**` y corpus sintetico/versionado sin datos personales.
- Non-goals: crawler web, base remota, conocimiento no trazable o dependencia de embeddings externos obligatoria.
- Acceptance criteria:
  - Indexar al menos 20 reglas con metadatos de prenda, operador, tejido, estado y fuente.
  - Ejecutar al menos 12 consultas con expected sources versionadas.
  - Medir recall@k, precision basica, latencia, persistencia y filtros.
  - Full-text es baseline; hibrido se recomienda solo con mejora demostrable.
  - Toda respuesta conserva IDs/fuentes; el retrieval no almacena estado de sesion ni ADN.
- Expected evidence: corpus, benchmark, reporte, commit `[T-44]` y Audit Capsule.
- Deterministic gate to create and run: `npm run experiment:rag && npm run build && npm test`.
- Audit trigger: fuentes incorrectas, indice no reproducible, dependencia externa o costo sin aprobar.
- Risks: corpus demasiado pequeno, metricas artificiales y embeddings innecesarios.
- STOP: full-text ya satisface todas las consultas; no ampliar a vector por curiosidad.

## Closure evidence

- Cuatro Audit Capsules y commits enfocados.
- Gates finales frescos y worktree sin mezclar cambios ajenos.
- `H-04`: revision humana de SVGs, transcript conversacional y recomendaciones.
- Decision Record seleccionando Geometry Adapter, modelo semantico, harness y retrieval.
- Lista explicita de dependencias rechazadas y razones.
- Ningun cambio en `src/` ni promocion automatica desde `experiments/`.

## Next authorization

La ejecucion T-41 a T-44 esta autorizada. El Ingeniero comienza por T-41 y responde al Arquitecto antes de abrir T-42. Tras seleccionar el stack se ejecuta STOP antes de integrar Motor v2.
