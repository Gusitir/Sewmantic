# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-09-07T18:20:00-05:00
source_commit: beb095c [T-56] conversational AI tool loop
assurance: Standard; deterministic gates per task + independent phase audit (dedicated session)
active_job: none
active_plan: PLAN_v1.5-phase13-conversational-harness.md (T-54..T-56 APTO + auditoria de fase APTO; cierre formal de Phase 13)
active_task: none
last_verdict: APTO fase (auditoria independiente Phase 13)
orchestration_model: GLM 5.3 Flash (Arquitecto/Ingeniero, opencode); Obrero: deepseek-v4-flash-0731
backup: private GitHub + Google Drive bundle/snapshot (artefactos v2/v3/v4 listos, subida humana pendiente)
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Humano:** Aprobar la apertura de **Phase 14 — Pattern Knowledge RAG** (reglas textiles locales con retrieval filtrado y trazable; corpus versionado) con nuevo plan del Arquitecto. STOP de Phase 13 cumplido.
2. **Humano:** Subir TODOS los artefactos de Drive a `Mi unidad/backups/` en `C:\Users\OnlyH\AppData\Local\Temp\opencode\backups\`: gemini-oauth, phase11, phase12 y phase13 (bundle+zip de cada uno).

## Blockers

- Phase 9 CLOSE bloqueado por `H-03-F` (orientacion anatomica de `back_leg`) y `H-03-H` (deriva `pull_over` entre prompt y Zod).
- Dirty state preservado y fuera de todo scope: `scripts/build_vest_blender.py`, `scripts/render_4_views_blender.py`, `IMAGENES/`, `scripts/run_mcp_bridge.py`.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **31/31 suites, 749/749 tests en verde** (gates frescos tras T-56).
- **Phase 13 CERRADA TECNICAMENTE (auditoria independiente APTO):** T-54 session store + revision manager (`ab0da5a`), T-55 capability tools bridge + bounded executor atomico (`75a9018`), T-56 AI tool loop con Vercel AI SDK y round-trip reproducible (`beb095c`). 42 tests nuevos. Barrera de salida "Conversacion reproducible sin perdida de decisiones" CONFIRMADA.
- **Phase 12 CERRADA TECNICAMENTE (auditoria independiente APTO):** T-51 Capability Registry core (`5625c16`), T-52 Operator SDK + 4 capacidades base `kernel.*` + derivacion prompt/tools con drift gate (`276be1a`), T-53 Recipe DSL + executor atomico + fixtures (`ee75ff1`). Barrera de salida verificada: "Prompt/tipos/Zod/tools generados sin deriva contractual".
- **Phase 11 CERRADA TECNICAMENTE:** T-45 a T-48 APTO. Kernel v2 en shadow mode read-only (`SEMANTIC_SHADOW=on`, byte-identico).
- **T-50 APTO:** repair pass determinista en `sanitizeAndParseLlmJson` (clamp a limites Zod, log `[schema-repair]`). Commit `9d19248`.
- **T-49 APTO:** blueprint ancla libre `free`/`libre`/`creative` + opcion Web Studio. Commits `3b6e09a`/`8e41cb1`.
- **Modelo de análisis: Gemini 3.8 Flash High** (`721bd63`): OAuth/ADC, `GOOGLE_GENAI_USE_ENTERPRISE=true`, `GOOGLE_CLOUD_LOCATION=global`. Créditos AI Plus vía billing GCP.
- **Savepoints publicados:** v1 gemini-oauth, phase11, phase12, phase13 — tags publicados; bundles/ZIPS para Drive pendientes de subida humana.
- **North Star v1 aprobado:** Patronista Conversacional (Phase 13 ✅), RAG (14), Migración de familias (15), Workshop (16), Product Readiness (17).
- **Módulos Paramétricos Extendidos:** Cuellos técnicos, bolsillos cargo 3D con fuelle y solapa, blueprint ancla `utility_vest`, moldería industrial y despiece 3D WebGL.

## Open findings

- Hallazgos menores de la auditoria Phase 13 (no bloqueantes): preflight de resolucion de capacidades en loop.ts (un tool call alucinado registra historial honesto antes de fallar), `currentDoc` redundante en el payload de sesion, `restoreRevisionManager` sin recorte hasta proximo commit, pinning de version por paso en recipes.
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
- `H-08`: Apertura de Phase 12 y Phase 13 con Obreros DeepSeek — `D-2026-09-07-P12` / `D-2026-09-07-P13`. [APTO — auditorias de fase APTO]

Keep this concise. History belongs in CONTEXT and Git.
