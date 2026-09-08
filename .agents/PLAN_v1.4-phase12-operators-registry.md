# PLAN v1.4 - Phase 12: Operators, Capability Registry & Recipe DSL

Status: active; execution authorized
Goal: convertir los operadores del kernel semantico v2 en **capacidades versionadas** registradas en una fuente unica (Capability Registry), con derivacion automatica de artefactos (fragmento de prompt, esquema de tool, documentacion) sin deriva contractual, y un DSL de recetas declarativas que compone operadores atomicamente. Habilita que "agregar partes nuevas" sea registrar capacidades, no editar el kernel.
Assurance: Standard; gates deterministas por tarea; auditoria de fase independiente al cierre via sesion de auditorias dedicada.

## Approval record

- Decision ID: `D-2026-09-07-P12`
- Approved by: Humano (Usuario), orden "perfecto, continua" del 2026-09-07 tras el cierre tecnico de Phase 11 (savepoint `savepoint-v1-phase11-semantic-kernel-20260907`, suite 657/657).
- Base: checkpoint v2 + T-49/T-50 + Phase 11 cerrada.
- Boundary: solo capa kernel v2 y su derivacion. NO tocar pipeline comercial, ADN legacy, prompts de anchors existentes, UI. v2 NO se promueve a autoridad (eso es Phase 15).

## Contratos arquitectonicos

1. **Registry fuente unica:** toda capability declara `id` (namespace estable `kernel.<nombre>`), `version` semver, `status` (`draft|experimental|stable`), schema Zod de params, referencia a su operador y documentacion de prompt.
2. **Operadores puros:** `(doc, params) -> Result<doc, diagnostics>`; nunca mutan la entrada; rechazo tipado; deterministas; mm.
3. **Derivacion sin deriva:** el fragmento de prompt y el JSON Schema de tools se **generan** del Registry; un test de drift compara la salida generada contra snapshot versionado.
4. **Recipes:** JSON declarativo con pasos `{ capability, params }`; el executor aplica atomicamente y ante fallo retorna el documento original intacto + diagnostics.
5. **Promocion:** `draft -> experimental -> stable` exige tests verdes de la capability y aprobacion humana registrada. Una recipe solo puede usar capabilities `experimental`/`stable` por defecto.
6. Un pedido de capability inexistente produce `CAPABILITY_GAP` (nunca exito ficticio).

## Task matrix

| Tarea | Objetivo | Dependencia | Evidence ID | Estado |
|---|---|---|:---:|:---:|
| **T-51** | Capability Registry core: registro, versionado, estados y promocion con gate | Aprobacion P12 | `P12-REG-01` | APTO |
| **T-52** | Operator SDK + registro de capacidades base (splitEdge/insertDart/cut/constraints) + derivacion prompt/tool con test de drift | T-51 APTO | `P12-SDK-01` | APTO |
| **T-53** | Recipe DSL + executor atomico + 2 recetas de ejemplo + documentacion generada | T-52 APTO | `P12-RCP-01` | BLOCKED |

Cierre de Phase 12: auditoria de fase independiente (sesion de auditorias dedicada), savepoint y STOP antes de Phase 13.

## `[T-51]` Capability Registry Core

- Objective: nucleo del Registry con registro, consulta, versionado y promocion de capabilities.
- Allowed scope: `src/engine/v2/registry.ts` (NUEVO), `src/engine/v2/index.ts` (exports), `tests/semantic_registry_v2.test.ts` (NUEVO).
- Non-goals: registrar capacidades concretas (eso es T-52), recipes, prompts, pipeline, UI.
- Acceptance criteria:
  - `registerCapability(entry)` valida estructura (id namespace `kernel.`, semver, status, schema Zod de params presente, operador callable) y rechaza duplicados de id+version.
  - `getCapability(id, version?)`, `listCapabilities(filterStatus?)`, `promoteCapability(id, from, to)` con gate: solo `draft->experimental` y `experimental->stable`; promocion a `stable` exige flag de aprobacion humana (`approvedBy`) en la entrada.
  - Capability inexistente → error tipado `CAPABILITY_GAP` (id + version solicitada).
  - Determinista e inmutable: el registry no muta entradas registradas (updates por copia).
  - Tests de exito/fallo/promocion/copia-inmutable.
- Gate: `npx vitest run tests/semantic_registry_v2.test.ts && npm run build && npm test`.
- STOP: requiere modificar contracts.ts, serialization.ts o el pipeline.

## `[T-52]` Operator SDK + Base Capabilities + Derivacion

- Objective: SDK de operadores bajo el contrato de capabilities; registrar las 4 capacidades base del kernel (splitEdge, insertDart, cut, evaluateConstraints como constraint-capability); derivar fragmento de prompt y JSON Schema de tools desde el Registry con test de drift contra snapshot.
- Allowed scope: `src/engine/v2/capabilities/` (NUEVO), `src/engine/v2/registry.ts` (extensiones minimas), `src/engine/v2/index.ts`, `tests/semantic_capabilities_v2.test.ts` (NUEVO), snapshot de derivacion versionado dentro de tests/.
- Non-goals: nuevos operadores geometricos, recipes, prompts legacy, pipeline.
- Acceptance criteria:
  - Las 4 capacidades base registradas con params Zod coherentes con T-47 y status inicial definido.
  - `generateToolSchemas()` y `generatePromptFragment()` producidos 100% desde el Registry.
  - Test de drift: la salida generada coincide con el snapshot versionado; cualquier cambio no aprobado falla.
  - Ejecucion de una capability via `runCapability(id, doc, params)` produce el mismo resultado que el operador directo.
- Gate: `npx vitest run tests/semantic_capabilities_v2.test.ts && npm run build && npm test`.

## `[T-53]` Recipe DSL + Executor + Ejemplos

- Objective: DSL declarativo JSON de recetas y executor atomico sobre el Registry.
- Allowed scope: `src/engine/v2/recipes.ts` (NUEVO), `src/engine/v2/index.ts`, `tests/semantic_recipes_v2.test.ts` (NUEVO), `fixtures/recipes/` (2 recetas JSON).
- Non-goals: recetas de prendas completas (eso es Phase 15), UI, pipeline.
- Acceptance criteria:
  - Recipe: `{ id, version, steps: [{ capability, params }] }` validada contra el Registry.
  - Executor: aplica pasos en orden sobre clon profundo; fallo en cualquier paso → documento original intacto + diagnostics del paso fallido; exito → doc final + diagnostics consolidados.
  - Recipe que referencia capability `draft` → rechazo por defecto (flag explicito para permitirlo en desarrollo).
  - 2 recetas de ejemplo versionadas en `fixtures/recipes/` que componen las capacidades base y pasan deterministamente.
- Gate: `npx vitest run tests/semantic_recipes_v2.test.ts && npm run build && npm test`.

## Closure evidence

- T-51/T-52/T-53 APTO con Audit Capsules y commits enfocados.
- Gates finales frescos.
- **Auditoria de fase independiente** via sesion de auditorias dedicada (capsula de fase completa).
- Savepoint `savepoint-v1-phase12-operators-registry-20260907` (local/remoto/artefactos Drive).
- STOP antes de Phase 13; nueva autorizacion humana.
