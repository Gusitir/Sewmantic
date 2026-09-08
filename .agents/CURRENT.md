# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-09-07T15:10:00-05:00
source_commit: 8618951 [T-47] constraints and atomic operators
assurance: Standard; deterministic gates per task and independent Architect audit
active_job: none
active_plan: PLAN_v1.1-semantic-kernel-mvp.md (T-47 APTO; T-48 READY) / PLAN_v1.3-schema-repair.md (cerrado)
active_task: T-48 (READY, ultima de Phase 11)
last_verdict: APTO T-47 (Constraints & Atomic Operators)
orchestration_model: GLM 5.3 Flash (Arquitecto/Ingeniero, opencode); Obrero: deepseek-v4-flash-0731
backup: private GitHub + Google Drive bundle/snapshot (artefactos v2 listos, subida humana pendiente)
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Ingeniero:** Despachar **T-48** (Legacy Adapter & Read-only Shadow Mode, ultima tarea de Phase 11) al Obrero DeepSeek; sin deriva byte en salidas legacy.
2. **Humano:** Subir los artefactos de Drive a `Mi unidad/backups/` (`sewmantic-savepoint-v1-gemini-oauth-20260907.bundle` y `.zip` en `C:\Users\OnlyH\AppData\Local\Temp\opencode\backups\`).
3. Tras T-48 APTO: crear savepoint Phase 11 y decidir apertura de Phase 12 (Operators, Registry & Recipe DSL) con nueva autorizacion humana.

## Blockers

- Phase 9 CLOSE bloqueado por `H-03-F` (orientacion anatomica de `back_leg`) y `H-03-H` (deriva `pull_over` entre prompt y Zod).
- Phase 11 T-47 pausada por decisión humana.
- Dirty state preservado y fuera de todo scope: `scripts/build_vest_blender.py`, `scripts/render_4_views_blender.py`, `IMAGENES/`, `scripts/run_mcp_bridge.py`.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **24/24 suites, 650/650 tests en verde** (gates frescos tras T-47).
- **T-47 APTO:** constraints y operadores atomicos del kernel v2 — `resolveStitchPair` (matching por arco, tiling ordenado, tolerancia 0.001mm), `evaluateConstraints` (diagnostics tipados: delta>3mm parametrizable, orientacion, refs rotas, longitudes<=0), operadores puros `splitEdge`/`insertDart`/`cut` con rechazo atomico y estado byte-identico. Commits `8618951`. 19 tests nuevos.
- **T-50 APTO:** repair pass determinista en `sanitizeAndParseLlmJson` — clamp a límites Zod de issues `too_small`/`too_big` numéricos (máx. 3 pasadas, log trazable `[schema-repair]`, precisión mm 0.001). `parsePatternDna` sigue estricto. Commit `9d19248`.
- **T-49 APTO (Opcion 1):** blueprint ancla libre `free`/`libre`/`creative` — PURE PARAMETRIC COMPOSER con paleta completa (20 base_blocks, enums exactos Zod, rangos reales) + opcion `free` en Web Studio. Commits `3b6e09a`/`8e41cb1`.
- **Modelo de análisis: Gemini 3.8 Flash High** (`721bd63`): `@google/genai@2.21.0`, OAuth/ADC (gcloud 583.0.0, quota project `gen-lang-client-0257394877`), `GOOGLE_GENAI_USE_ENTERPRISE=true`, `GOOGLE_CLOUD_LOCATION=global`. Créditos AI Plus vía billing GCP.
- **Savepoint v2:** tag `savepoint-v1-gemini-oauth-20260907` publicado; bundle + ZIP generados y verificados localmente.
- **Phase 11:** T-45/T-46/T-47 APTO. **T-48 READY** (ultima tarea: adapter legacy + shadow mode read-only).
- **North Star v1 aprobado:** Motor Semantico + Patronista Conversacional persistente + Capability Registry/Workshop + RAG local. Tras Phase 11 sigue Phase 12 (Operators, Registry & Recipe DSL).
- **Módulos Paramétricos Extendidos:** Cuellos técnicos, bolsillos cargo 3D con fuelle y solapa, blueprint ancla `utility_vest`, moldería industrial y despiece 3D WebGL.

## Open findings

- `P11-GEO-01` riesgo residual: miter sin limite puede crear picos en angulos agudos.
- `H-03-F`: pernera trasera 3D espejada con tiro orientado hacia afuera.
- `H-03-H`: el prompt ofrece `pull_over`, pero el esquema de cierre lo rechaza (corregido solo en el anchor `free`).

## Human actions

- `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm. [VERIFICADO OK]
- `H-02`: Ensamble físico/digital de las hojas A4/Letter para validar continuidad de corte con PDFStitcher. [VERIFICADO OK]
- `H-03`: Inspeccion visual del patron en Web Studio. [NO APTO; DOS HALLAZGOS ABIERTOS]
- `H-04`: Stack fundacional confirmado mediante autorizacion de Phase 11. [APTO]
- `H-05`: Migración de análisis a Gemini 3.8 Flash High con OAuth/ADC. [APTO — verificado en vivo]
- `H-06`: Aprobación de la Opción 1 (blueprint libre) — `D-2026-09-07-FREE`. [APTO]
- `H-07`: Aprobación del clamp de reparación — `D-2026-09-07-REPAIR`. [APTO — implementado en T-50]

Keep this concise. History belongs in CONTEXT and Git.
