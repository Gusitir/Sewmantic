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
backup: private GitHub + Google Drive VERIFIED (4 savepoints: gemini-oauth, phase11, phase12, phase13 — SHA-256 íntegros en F:\Mi unidad\backups)
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Humano:** Ejecutar `start_web_studio.bat` y regenerar la prenda con cierre cruzado/wrap que fallaba — `H-03-H` resuelto en código (T-58): el log mostrará `[schema-repair] modifications.closure.type: "wrap" -> "ties"` y la generación completará.
2. **Humano/Ingeniero:** Con `H-03-F` y `H-03-H` verificados, proceder al **CLOSE de Fase 9** y decidir apertura de **Phase 14 — Pattern Knowledge RAG** (STOP de Phase 13 cumplido).

## Blockers

- Phase 9 CLOSE bloqueado por `H-03-H` — RESUELTO EN CÓDIGO (T-58 `86432ea`), pendiente verificación humana en vivo.
- Dirty state preservado y fuera de todo scope: `scripts/build_vest_blender.py`, `scripts/render_4_views_blender.py`, `IMAGENES/`, `scripts/run_mcp_bridge.py`.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **31/31 suites, 758/758 tests en verde** (gates frescos tras T-58).
- **Phase 13 CERRADA TECNICAMENTE (auditoria independiente APTO):** T-54 session store + revision manager (`ab0da5a`), T-55 capability tools bridge + bounded executor atomico (`75a9018`), T-56 AI tool loop con Vercel AI SDK y round-trip reproducible (`beb095c`). 42 tests nuevos. Barrera de salida "Conversacion reproducible sin perdida de decisiones" CONFIRMADA.
- **Phase 12 CERRADA TECNICAMENTE (auditoria independiente APTO):** T-51 Capability Registry core (`5625c16`), T-52 Operator SDK + 4 capacidades base `kernel.*` + derivacion prompt/tools con drift gate (`276be1a`), T-53 Recipe DSL + executor atomico + fixtures (`ee75ff1`). Barrera de salida verificada: "Prompt/tipos/Zod/tools generados sin deriva contractual".
- **Phase 11 CERRADA TECNICAMENTE:** T-45 a T-48 APTO. Kernel v2 en shadow mode read-only (`SEMANTIC_SHADOW=on`, byte-identico).
- **T-50 APTO:** repair pass determinista en `sanitizeAndParseLlmJson` (clamp a limites Zod, log `[schema-repair]`). Commit `9d19248`.
- **T-49 APTO:** blueprint ancla libre `free`/`libre`/`creative` + opcion Web Studio. Commits `3b6e09a`/`8e41cb1`.
- **Modelo de análisis: Gemini 3.8 Flash High** (`721bd63`): OAuth/ADC, `GOOGLE_GENAI_USE_ENTERPRISE=true`, `GOOGLE_CLOUD_LOCATION=global`. Créditos AI Plus vía billing GCP.
- **Savepoints publicados:** v1 gemini-oauth, phase11, phase12, phase13 — tags publicados y **respaldos verificados en Google Drive** (`F:\Mi unidad\backups`, SHA-256 íntegros).
- **North Star v1 aprobado:** Patronista Conversacional (Phase 13 ✅), RAG (14), Migración de familias (15), Workshop (16), Product Readiness (17).
- **Módulos Paramétricos Extendidos:** Cuellos técnicos, bolsillos cargo 3D con fuelle y solapa, blueprint ancla `utility_vest`, moldería industrial y despiece 3D WebGL.

## Open findings

- `H-03-H` (T-58) y union recovery (T-60): resueltos en código — sinónimos de closure/trouser_pockets + deletion-trial + union recovery. Pendiente verificación humana en vivo (regenerar la bermuda "straw pirate denim shorts").
- Hallazgos menores de la auditoria Phase 13 (no bloqueantes): preflight de resolucion de capacidades en loop.ts (un tool call alucinado registra historial honesto antes de fallar), `currentDoc` redundante en el payload de sesion, `restoreRevisionManager` sin recorte hasta proximo commit, pinning de version por paso en recipes.
- `isBackSkirt` repite el patron latente de espejado (invisible hoy, falda simetrica) — corregir por coherencia en proximo touch del bridge.
- `front_leg` mesh tiene normales INWARD pre-existentes enmascaradas por material doubleSided — auditar convencion de orientacion de paneles (tarea futura).
- `P11-GEO-01` riesgo residual: miter sin limite puede crear picos en angulos agudos.
- T-58 pregunta abierta: incorporar sinónimos para otros enums (neckline/sleeve/hood) en T futuro — hoy closure.type y trouser_pockets.type normalizan.
- T-60 limitación: `too_small`/`too_big` anidados dentro de uniones no se clampan (fallback elimina el campo con log) — candidato a T futuro si se observa en producción.

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
