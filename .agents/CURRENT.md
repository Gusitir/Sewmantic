# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-23T23:45:49-05:00
source_commit: 293469b [T-45] v2 domain contracts and versioned JSON serialization
assurance: Standard; deterministic gates per task and independent Architect audit
active_job: RUN THE LOOP
active_plan: PLAN_v1.1-semantic-kernel-mvp.md
active_task: T-45
last_verdict: NO APTO T-45
backup: private GitHub + Google Drive verified
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Ingeniero:** Corregir T-45: cerrar arcos, serializacion, degeneraciones y coherencia StitchPair; responder al Arquitecto sin iniciar T-46.

## Blockers

- Phase 9 CLOSE bloqueado por `H-03-F` (orientacion anatomica de `back_leg`) y `H-03-H` (deriva `pull_over` entre prompt y Zod).
- T-45 NO APTO: contratos permiten arco ambiguo/inconsistente, serialize sin validacion y StitchPairs/aristas degeneradas.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **21/21 suites passing (556/556 tests en verde)** tras `[T-38]`.
- **North Star v1 aprobado:** Motor Semantico + Patronista Conversacional persistente + Capability Registry/Workshop + RAG local.
- **Foundation decision:** stack seleccionado en `DECISION_v1-foundation-stack.md`; Phase 11 autorizada y activa.
- **Orquestacion verificada:** Luna MAX accesible; DeepSeek V4 Flash operativo mediante el modelo versionado `deepseek-v4-flash-0731`.
- **Presupuesto Fireworks:** USD 10 aprobados y compartidos entre Obreros DeepSeek y pruebas internas; recarga manual a cargo del Humano.
- **T-41 APTO:** 16/16 invariantes; Flatten.js lidera para poligonos/booleanos y Maker.js queda como referencia de dibujo/offset, sin integracion aprobada.
- **T-42 APTO:** kernel ESM sin nuevas dependencias; Edge/Panel/Interface/StitchPair, matching, orientacion, cortes, pinzas y round-trip pasan 18/18 invariantes.
- **T-43 APTO:** harness offline 17/17, estado persistente y undo exacto; Fireworks live paso 1 llamada/291 tokens. Vercel AI SDK es candidato lider.
- **T-43 live definitivo:** Vercel AI SDK + `@ai-sdk/fireworks` ejecuto tool call y respuesta final en 2 pasos/855 tokens.
- **T-44 APTO:** Orama full-text, 24 reglas, 18 consultas, recall@k 1.0, fuentes directas y 14/14 invariantes.
- **Stack seleccionado:** kernel semantico TypeScript propio + Flatten adapter + Vercel AI SDK/Fireworks + Zod + JSON local versionado + Orama full-text + adapters al pipeline comercial.
- **Savepoint fundacional:** tag `savepoint-v1-foundation-stack-20260823` publicado y respaldos bundle/ZIP verificados en Google Drive.
- **Módulos Paramétricos Extendidos:** Cuellos técnicos (`stand_collar`, `shirt_collar_with_stand`), bolsillos cargo 3D con fuelle y solapa (`cargo_pocket_body`, `cargo_pocket_bellows`, `cargo_pocket_flap`), y blueprint ancla `utility_vest` (Chaleco Táctico / Safari / Cargo).
- **Moldería Industrial & Visor 3D:** Cruces de botonadura (+20mm), marcas de ojales/botones, vistas interiores con entretela técnica (`Interfacing_Lining`), bajo en doble pico de chaleco sastre (`hem: { type: 'pointed', peak_drop_mm: 50 }`), Matriz de Inspección Ocular Multimodal de 6 Puntos y Guía de Despiece 3D interactivo en WebGL.

## Open findings

- `P11-CON-01`: falta direccion CW/CCW y validacion centro/radio/sweep en circularArc.
- `P11-CON-01`: `serializeDocument` debe rechazar documentos invalidos antes de JSON.stringify.
- `P11-CON-01`: edges/StitchSegments/StitchPairs requieren longitudes/rangos/coherencia positivos.
- `P11-CON-01`: `constraintId` debe definirse como ID externo de registry o resolverse en el documento; no quedar ambiguo.
- `H-03-F`: pernera trasera 3D espejada con tiro orientado hacia afuera.
- `H-03-H`: el prompt ofrece `pull_over`, pero el esquema de cierre lo rechaza.

## Human actions

- `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm. [VERIFICADO OK]
- `H-02`: Ensamble físico/digital de las hojas A4/Letter para validar continuidad de corte con PDFStitcher. [VERIFICADO OK]
- `H-03`: Inspeccion visual del patron en Web Studio. [NO APTO; DOS HALLAZGOS ABIERTOS]
- `H-04`: Stack fundacional confirmado mediante autorizacion de Phase 11. [APTO]

Keep this concise. History belongs in CONTEXT and Git.
