# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-09-07T12:50:00-05:00
source_commit: 721bd63 [FEAT] Gemini 3.8 Flash High provider as default analysis model
assurance: Standard; deterministic gates per task and independent Architect audit
active_job: none
active_plan: PLAN_v1.1-semantic-kernel-mvp.md
active_task: T-47 (pausada)
last_verdict: Savepoint v2 (gemini-oauth) publicado; 624/624 tests
backup: private GitHub + Google Drive bundle/snapshot (artefactos listos, subida humana pendiente)
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Arquitecto:** Diseñar la Opción 1 acordada: blueprint anchor libre en `PromptBuilder.buildBlueprintContext()` (libre composición de la paleta paramétrica completa con rangos amplios), proponer PLAN, obtener aprobación humana e implementar.
2. **Humano:** Subir los artefactos de Drive a `Mi unidad/backups/` (`sewmantic-savepoint-v1-gemini-oauth-20260907.bundle` y `.zip` en `C:\Users\OnlyH\AppData\Local\Temp\opencode\backups\`).

## Blockers

- Phase 9 CLOSE bloqueado por `H-03-F` (orientacion anatomica de `back_leg`) y `H-03-H` (deriva `pull_over` entre prompt y Zod).
- Phase 11 T-47 pausada por decisión humana (prioridad: blueprint libre).
- Dirty state preservado y fuera de todo scope: `scripts/build_vest_blender.py`, `scripts/render_4_views_blender.py`, `IMAGENES/`, `scripts/run_mcp_bridge.py`.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **23/23 suites, 624/624 tests en verde** tras el checkpoint v2 (`721bd63`).
- **Modelo de análisis: Gemini 3.8 Flash High** sustituyó a Qwen 3.8 Max/Fireworks (commit `721bd63`):
  - `src/ai/gemini_provider.ts` con `@google/genai@2.21.0`; ID oficial `gemini-3.8-flash` + `thinkingLevel: HIGH`.
  - Autenticación: **OAuth/ADC** (gcloud CLI 583.0.0, `gcloud auth application-default login`, quota project `gen-lang-client-0257394877`); soporta también API key (Developer o enterprise).
  - Configuración verificada en vivo: `GOOGLE_GENAI_USE_ENTERPRISE=true`, `GOOGLE_CLOUD_LOCATION=global` (us-central1 no aloja `gemini-3.8-flash`).
  - Facturación: los $40 de crédito AI Plus aplican vía billing del proyecto GCP.
- **Savepoint v2:** tag `savepoint-v1-gemini-oauth-20260907` publicado en `Gusitir/Sewmantic`; bundle + ZIP generados y verificados localmente.
- **Phase 11 T-45/T-46 APTO** (contratos v2 congelados; GeometryAdapter miter-only). T-47 READY pero pausada.
- **North Star v1 aprobado:** Motor Semantico + Patronista Conversacional persistente + Capability Registry/Workshop + RAG local.
- **Orquestacion verificada:** Luna MAX accesible; DeepSeek V4 Flash operativo mediante el modelo versionado `deepseek-v4-flash-0731`.
- **Módulos Paramétricos Extendidos:** Cuellos técnicos, bolsillos cargo 3D con fuelle y solapa, blueprint ancla `utility_vest`, moldería industrial y despiece 3D WebGL.

## Open findings

- Salida del LLM ocasionalmente fuera de rango Zod (ej. `modifications.pocket.height_mm < 30`) rechaza el ADN completo; opciones pendientes de decisión humana: clamp de reparación determinista, endurecer prompt, o reintento.
- `P11-GEO-01` riesgo residual: miter sin limite puede crear picos en angulos agudos.
- `H-03-F`: pernera trasera 3D espejada con tiro orientado hacia afuera.
- `H-03-H`: el prompt ofrece `pull_over`, pero el esquema de cierre lo rechaza.

## Human actions

- `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm. [VERIFICADO OK]
- `H-02`: Ensamble físico/digital de las hojas A4/Letter para validar continuidad de corte con PDFStitcher. [VERIFICADO OK]
- `H-03`: Inspeccion visual del patron en Web Studio. [NO APTO; DOS HALLAZGOS ABIERTOS]
- `H-04`: Stack fundacional confirmado mediante autorizacion de Phase 11. [APTO]
- `H-05`: Migración de análisis a Gemini 3.8 Flash High con OAuth/ADC. [APTO — verificado en vivo]

Keep this concise. History belongs in CONTEXT and Git.
