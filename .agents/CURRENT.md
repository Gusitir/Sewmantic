# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-09-07T16:05:00-05:00
source_commit: d6279fa [T-48] legacy adapter and read-only shadow mode
assurance: Standard; deterministic gates per task and independent Architect audit
active_job: none
active_plan: PLAN_v1.1-semantic-kernel-mvp.md (T-45..T-48 APTO; cierre tecnico de Phase 11)
active_task: none
last_verdict: APTO T-48 (Legacy Adapter & Shadow Mode) — Phase 11 cerrada tecnicamente
orchestration_model: GLM 5.3 Flash (Arquitecto/Ingeniero, opencode); Obrero: deepseek-v4-flash-0731
backup: private GitHub + Google Drive bundle/snapshot (artefactos v2 listos, subida humana pendiente)
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Humano:** Aprobar el cierre formal (CLOSE) de Phase 11 y autorizar el plan de **Phase 12 (Operators, Registry & Recipe DSL)** — es la fase donde "agregar partes nuevas" (cierres, bolsillos, etc.) se vuelve composición de capacidades versionadas.
2. **Humano:** Subir los artefactos de Drive a `Mi unidad/backups/` (`sewmantic-savepoint-v1-gemini-oauth-20260907.bundle` y `.zip` en `C:\Users\OnlyH\AppData\Local\Temp\opencode\backups\`).

## Blockers

- Phase 9 CLOSE bloqueado por `H-03-F` (orientacion anatomica de `back_leg`) y `H-03-H` (deriva `pull_over` entre prompt y Zod).
- Dirty state preservado y fuera de todo scope: `scripts/build_vest_blender.py`, `scripts/render_4_views_blender.py`, `IMAGENES/`, `scripts/run_mcp_bridge.py`.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **25/25 suites, 657/657 tests en verde** (OFF y con SEMANTIC_SHADOW=on; gates frescos tras T-48).
- **Phase 11 CERRADA TECNICAMENTE:** T-45 (contratos), T-46 (GeometryAdapter), T-47 (constraints & operadores atomicos), T-48 (adapter legacy + shadow mode read-only con `SEMANTIC_SHADOW=on`, byte-identico OFF/ON) — todas APTO con Audit Capsules. Kernel v2 documentado en APPCORE. Commit T-48 `d6279fa`.
- **T-50 APTO:** repair pass determinista en `sanitizeAndParseLlmJson` — clamp a límites Zod de issues `too_small`/`too_big` numéricos (máx. 3 pasadas, log trazable `[schema-repair]`, precisión mm 0.001). `parsePatternDna` sigue estricto. Commit `9d19248`.
- **T-49 APTO (Opcion 1):** blueprint ancla libre `free`/`libre`/`creative` — PURE PARAMETRIC COMPOSER con paleta completa (20 base_blocks, enums exactos Zod, rangos reales) + opcion `free` en Web Studio. Commits `3b6e09a`/`8e41cb1`.
- **Modelo de análisis: Gemini 3.8 Flash High** (`721bd63`): `@google/genai@2.21.0`, OAuth/ADC (gcloud 583.0.0, quota project `gen-lang-client-0257394877`), `GOOGLE_GENAI_USE_ENTERPRISE=true`, `GOOGLE_CLOUD_LOCATION=global`. Créditos AI Plus vía billing GCP.
- **Savepoint v2:** tag `savepoint-v1-gemini-oauth-20260907` publicado; bundle + ZIP generados y verificados localmente.
- **North Star v1 aprobado:** Motor Semantico + Patronista Conversacional persistente + Capability Registry/Workshop + RAG local. Siguiente fase: 12 (Operators, Registry & Recipe DSL).
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
