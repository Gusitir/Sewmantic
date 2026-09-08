# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-09-08T05:00:00-05:00
source_commit: e6863d3 [STATE] T-62 APTO: back leg self-intersection fixed
assurance: Standard; deterministic gates per task + independent phase audits (dedicated session)
active_job: none
active_plan: PLAN_v1.5 (Phase 13 cerrada con auditoria APTO) / PLAN_v1.6, v1.7, v1.8 (correcciones cerradas) / PLAN_v1.9 (T-62 APTO, pendiente verificacion visual humana)
active_task: none
last_verdict: APTO T-62 (back leg self-intersection fix)
orchestration_model: GLM 5.3 Flash (Arquitecto/Ingeniero, opencode); Obrero: deepseek-v4-flash-0731
backup: private GitHub + Google Drive VERIFIED (4 savepoints en F:\Mi unidad\backups; el trabajo posterior a phase13 esta en GitHub pendiente de siguiente savepoint)
```
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Humano:** Ejecutar `start_web_studio.bat` y regenerar la bermuda "straw pirate denim shorts" — verificar visualmente: (a) pernera trasera limpia sin auto-intersecciones (T-62), (b) cierre wrap reparado a ties en consola `[schema-repair]` (T-58), (c) despiece simétrico de mangas en prendas con mangas (T-59).
2. **Humano/Ingeniero:** Con las verificaciones visuales OK, proceder al **CLOSE de Fase 9** (H-03-F verificado, H-03-H y síntomas asociados resueltos en código) y al **savepoint** del trabajo post-phase13.
3. **Humano:** Autorizar **Phase 14 — Pattern Knowledge RAG** con nuevo plan del Arquitecto (STOP de Phase 13 cumplido).

## Blockers

- Ninguno técnico. `H-03-F` verificado OK; `H-03-H` resuelto en código (T-58) pendiente verificación humana en vivo; síntoma de triangulación resuelto por degradación elegante (T-61) y causa raíz corregida (T-62).
- Dirty state preservado y fuera de todo scope: `scripts/build_vest_blender.py`, `scripts/render_4_views_blender.py`, `IMAGENES/`, `scripts/run_mcp_bridge.py`.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **31/31 suites, 776/776 tests en verde** (gates frescos tras T-62).
- **Sesión 2026-09-07/08 (9 tareas APTO + 3 auditorías de fase + 2 correcciones H-03):**
  - Migración de análisis a Gemini 3.8 Flash High con OAuth/ADC (`721bd63`), verificado en vivo.
  - T-49 blueprint libre `free`/`libre`/`creative` (`3b6e09a`/`8e41cb1`).
  - T-50 clamp numérico en repair pass (`9d19248`); T-58 sinónimos de closure (`86432ea`); T-60 union recovery (`0155cac`) — las 3 clases de fallo del LLM cubiertas con log `[schema-repair]`.
  - Phase 12 cerrada: T-51/T-52/T-53 Capability Registry + Operator SDK + derivación sin deriva + Recipe DSL (`5625c16`/`276be1a`/`ee75ff1`), auditoría independiente APTO.
  - Phase 13 cerrada: T-54/T-55/T-56 session store + tools bridge + AI tool loop con Vercel AI SDK (`ab0da5a`/`75a9018`/`beb095c`), auditoría independiente APTO.
  - T-57 fix `H-03-F` pernera trasera espejada (`7044daf`) — VERIFICADO OK por el Humano.
  - T-59 despiece simétrico de mangas (`7565c4f`) — pendiente verificación humana.
  - T-61 degradación elegante 3D (`30cbbbe`); T-62 causa raíz del patrón cruzado (`387c635`) — pendiente verificación humana.
- **Savepoints en Drive (SHA-256 íntegros):** v1 gemini-oauth, phase11, phase12, phase13. El trabajo posterior (T-57 a T-62) está en GitHub `master`; siguiente savepoint al cierre de Fase 9.
- **North Star v1 aprobado:** Patronista Conversacional (Phase 13 ✅), RAG (14), Migración de familias (15), Workshop (16), Product Readiness (17).
- **Módulos Paramétricos Extendidos:** Cuellos técnicos, bolsillos cargo 3D con fuelle y solapa, blueprint ancla `utility_vest`, moldería industrial y despiece 3D WebGL.
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

- Triangulación 3D: contornos genuinamente auto-intersectados ya resueltos en la causa raíz (T-62). El fallback de degradación elegante (T-61) queda como red de seguridad.
- Hallazgos menores de la auditoria Phase 13 (no bloqueantes): preflight de resolucion de capacidades en loop.ts (un tool call alucinado registra historial honesto antes de fallar), `currentDoc` redundante en el payload de sesion, `restoreRevisionManager` sin recorte hasta proximo commit, pinning de version por paso en recipes.
- `isBackSkirt` repite el patron latente de espejado (invisible hoy, falda simetrica) — corregir por coherencia en proximo touch del bridge.
- `front_leg` mesh tiene normales INWARD pre-existentes enmascaradas por material doubleSided — auditar convencion de orientacion de paneles (tarea futura).
- `P11-GEO-01` riesgo residual: miter sin limite puede crear picos en angulos agudos.
- T-58 pregunta abierta: incorporar sinónimos para otros enums (neckline/sleeve/hood) en T futuro — hoy closure.type y trouser_pockets.type normalizan.
- T-60 limitación: `too_small`/`too_big` anidados dentro de uniones no se clampan (fallback elimina el campo con log) — candidato a T futuro si se observa en producción.
- Trade-off T-62: en combos de inseam corto físicamente imposibles, el Δ de entrepierna puede exceder 3mm (contorno simple priorizado) — registrar policy si se observa en producción.

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
