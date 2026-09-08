# PLAN v1.5 - Phase 13: Conversational Patternist Harness

Status: active; execution authorized
Goal: construir el Patternist Harness de producto: sesiones conversacionales con estado canonico persistente, tools de dominio generadas desde el Capability Registry (Phase 12), revisiones con undo/redo, ejecucion acotada con aprobacion humana y reproducibilidad completa de la conversacion.
Assurance: Standard; gates deterministas por tarea; auditoria de fase independiente al cierre via sesion de auditorias dedicada.

## Approval record

- Decision ID: `D-2026-09-07-P13`
- Approved by: Humano (Usuario), orden "si procede, pero usa obreros deepseekv4flash" del 2026-09-07 tras el cierre de Phase 12 (savepoint `savepoint-v1-phase12-operators-registry-20260907`, suite 707/707).
- Base: Phase 12 cerrada (Registry + Operator SDK + Recipes).
- Boundary: el harness es una capa NUEVA (`src/harness/`); no modifica el kernel v2, el pipeline comercial, el ADN legacy ni proveedores existentes. v2 sigue sin ser autoridad de exportacion (eso es Phase 15/17).

## Contratos arquitectonicos

1. **Estado canonico fuera del modelo:** la sesion persiste id, turns, decisiones, documento canonico serializado y revisiones como JSON versionado. El LLM nunca es la fuente de verdad.
2. **Operaciones tipadas y reversibles:** toda mutacion del documento pasa por capabilities del Registry (T-52) y crea una revision snapshot con undo/redo.
3. **Ejecucion acotada:** max pasos por turno, gate de aprobacion humana por operacion (callback), fallo = rechazo tipado sin corromper la sesion.
4. **Reproducibilidad:** sesion -> JSON -> sesion preserva turns, decisiones, revisiones y documento byte-identico (serializeDocument).
5. **Provider-agnostic:** el loop de IA consume cualquier `LanguageModel` de Vercel AI SDK (`ai@7.0.77` ya en deps; `@ai-sdk/fireworks` para DeepSeek). Los tests usan modelos scripted/mock sin red.
6. Tools de IA derivadas del Registry (mismo contrato de derivacion que T-52).

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|:---:|:---:|
| **T-54** | Session store + revision manager (undo/redo, snapshot canonico, round-trip) | Aprobacion P13 | `P13-SES-01` | APTO |
| **T-55** | Capability tools bridge + bounded executor con aprobacion humana | T-54 APTO | `P13-EXE-01` | APTO |
| **T-56** | AI tool loop (Vercel AI SDK) + reproducibilidad de conversacion + modelo scripted | T-55 APTO | `P13-LOOP-01` | APTO |

Cierre de Phase 13: auditoria de fase independiente (sesion dedicada), savepoint y STOP antes de Phase 14.

## `[T-54]` Session Store + Revision Manager

- Objective: estado canonico de la sesion y pila de revisiones con undo/redo sobre el PatternDocument.
- Allowed scope: `src/harness/session.ts` (NUEVO), `src/harness/revisions.ts` (NUEVO), `src/harness/index.ts` (NUEVO), `tests/harness_session_v2.test.ts` (NUEVO).
- Non-goals: loop de IA, tools, UI, pipeline, kernel v2.
- Acceptance criteria:
  - Session: `{ id, createdAt, turns[], decisions[], currentDoc }` con turn tipado (user/assistant/tool con contenido y revisionId opcional).
  - Revisions: pila de snapshots (`serializeDocument`) con label y metadata; `undo()` y `redo()` restauran byte-identico; limites de pila configurables.
  - Round-trip: session -> JSON -> session preserva todo (ids, decisiones, revisiones, doc byte-identico).
  - Determinista; sin `any`; sin red; sin dependencia de .env.
- Gate: `npx vitest run tests/harness_session_v2.test.ts && npm run build && npm test`.
- STOP: requiere tocar kernel v2 o pipeline.

## `[T-55]` Capability Tools Bridge + Bounded Executor

- Objective: convertir capabilities del Registry en tools del harness y ejecutarlas de forma acotada con revisiones automaticas y gate de aprobacion.
- Allowed scope: `src/harness/tools.ts` (NUEVO), `src/harness/executor.ts` (NUEVO), `src/harness/index.ts`, `tests/harness_executor_v2.test.ts` (NUEVO).
- Non-goals: loop de IA real (modelo scripted en tests), UI, pipeline.
- Acceptance criteria:
  - `capabilityToTool(registry, id)` genera tool definition (id, description, paramsSchema, execute) desde el Registry.
  - Executor: `executeTurn(session, steps[], options)` aplica pasos via `runCapability`, crea una revision por paso exitoso, y respeta `maxSteps` y `requireApproval` callback (rechazo = sin cambio).
  - Fallo tipado sin corromper sesion; undo/redo funcionan tras la ejecucion.
- Gate: `npx vitest run tests/harness_executor_v2.test.ts && npm run build && npm test`.

## `[T-56]` AI Tool Loop + Reproducibilidad

- Objective: loop conversacional con Vercel AI SDK consumiendo las tools del harness, con sesion reproducible.
- Allowed scope: `src/harness/loop.ts` (NUEVO), `src/harness/index.ts`, `tests/harness_loop_v2.test.ts` (NUEVO).
- Non-goals: exponer endpoint HTTP, UI, cambiar proveedores existentes, llamadas pagadas en tests.
- Acceptance criteria:
  - `runConversationalTurn(session, userMessage, { model, registry, maxSteps, requireApproval })` ejecuta el loop de tool calling y registra turns/decisiones/revisiones.
  - Reproducibilidad: serializar la sesion tras la conversacion y restaurarla produce el mismo estado canonico y el mismo historial.
  - Tests con modelo scripted (sin red) que ejercitan: respuesta sin tools, secuencia de tool calls, rechazo por maxSteps y por approval.
  - Live opcional documentado, no requerido por las puertas.
- Gate: `npx vitest run tests/harness_loop_v2.test.ts && npm run build && npm test`.

## Closure evidence

- T-54/T-55/T-56 APTO con Audit Capsules y commits enfocados.
- Gates finales frescos.
- Auditoria de fase independiente (sesion de auditorias dedicada).
- Savepoint `savepoint-v1-phase13-conversational-harness-20260907` (local/remoto/artefactos Drive).
- STOP antes de Phase 14; nueva autorizacion humana.
