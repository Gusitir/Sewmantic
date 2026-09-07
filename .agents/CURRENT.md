# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-09-07T13:05:00-05:00
source_commit: 8e41cb1 [T-49] fix free blueprint anchor enums to match Zod schema
assurance: Standard; deterministic gates per task and independent Architect audit
active_job: none
active_plan: PLAN_v1.2-free-blueprint-anchor.md (T-49 APTO; cerrado) / PLAN_v1.1-semantic-kernel-mvp.md (T-47 pausada)
active_task: none
last_verdict: APTO T-49 (Free Blueprint Anchor)
orchestration_model: GLM 5.3 Flash (Arquitecto/Ingeniero, opencode); Obrero: deepseek-v4-flash-0731
backup: private GitHub + Google Drive bundle/snapshot (artefactos v2 listos, subida humana pendiente)
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Validación en vivo del blueprint `free`** con Gemini 3.8 Flash (smoke test: `node dist/index.js generate "<prompt creativo>" -p gemini -b free` si existe flag CLI, o via Web Studio) y verificación visual del Humano.
2. **Humano:** Subir los artefactos de Drive a `Mi unidad/backups/` (`sewmantic-savepoint-v1-gemini-oauth-20260907.bundle` y `.zip` en `C:\Users\OnlyH\AppData\Local\Temp\opencode\backups\`).
3. Decidir entre reanudar Phase 11 (T-47) o nuevas features del blueprint libre (ampliar alfabeto de modificaciones).

## Blockers

- Phase 9 CLOSE bloqueado por `H-03-F` (orientacion anatomica de `back_leg`) y `H-03-H` (deriva `pull_over` entre prompt y Zod).
- Phase 11 T-47 pausada por decisión humana (prioridad: blueprint libre).
- Dirty state preservado y fuera de todo scope: `scripts/build_vest_blender.py`, `scripts/render_4_views_blender.py`, `IMAGENES/`, `scripts/run_mcp_bridge.py`.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **23/23 suites, 625/625 tests en verde** (build + test frescos tras T-49).
- **T-49 APTO (Opcion 1):** blueprint ancla libre `free`/`libre`/`creative` en `buildBlueprintContext()` — el agente compone como PURE PARAMETRIC COMPOSER con la paleta completa (20 base_blocks, todas las modificaciones y enums exactos del esquema Zod, rangos reales) + opcion `free` en el selector del Web Studio. Commits `3b6e09a` y correccion `8e41cb1`.
- **Modelo de análisis: Gemini 3.8 Flash High** sustituyó a Qwen 3.8 Max/Fireworks (commit `721bd63`):
  - `src/ai/gemini_provider.ts` con `@google/genai@2.21.0`; ID oficial `gemini-3.8-flash` + `thinkingLevel: HIGH`.
  - Autenticación: **OAuth/ADC** (gcloud CLI 583.0.0, quota project `gen-lang-client-0257394877`); soporta también API key (Developer o enterprise).
  - Configuración verificada en vivo: `GOOGLE_GENAI_USE_ENTERPRISE=true`, `GOOGLE_CLOUD_LOCATION=global`.
  - Facturación: los $40 de crédito AI Plus aplican vía billing del proyecto GCP.
- **Savepoint v2:** tag `savepoint-v1-gemini-oauth-20260907` publicado en `Gusitir/Sewmantic`; bundle + ZIP generados y verificados localmente.
- **Phase 11 T-45/T-46 APTO** (contratos v2 congelados; GeometryAdapter miter-only). T-47 READY pero pausada.
- **North Star v1 aprobado:** Motor Semantico + Patronista Conversacional persistente + Capability Registry/Workshop + RAG local.
- **Módulos Paramétricos Extendidos:** Cuellos técnicos, bolsillos cargo 3D con fuelle y solapa, blueprint ancla `utility_vest`, moldería industrial y despiece 3D WebGL.

## Open findings

- Salida del LLM ocasionalmente fuera de rango Zod (ej. `modifications.pocket.height_mm < 30`) rechaza el ADN completo; el prompt `free` mitiga con la frontera explícita; opciones pendientes: clamp de reparación determinista o reintento.
- `P11-GEO-01` riesgo residual: miter sin limite puede crear picos en angulos agudos.
- `H-03-F`: pernera trasera 3D espejada con tiro orientado hacia afuera.
- `H-03-H`: el prompt ofrece `pull_over`, pero el esquema de cierre lo rechaza (corregido solo en el anchor `free`; los demás anchors no lo mencionan).

## Human actions

- `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm. [VERIFICADO OK]
- `H-02`: Ensamble físico/digital de las hojas A4/Letter para validar continuidad de corte con PDFStitcher. [VERIFICADO OK]
- `H-03`: Inspeccion visual del patron en Web Studio. [NO APTO; DOS HALLAZGOS ABIERTOS]
- `H-04`: Stack fundacional confirmado mediante autorizacion de Phase 11. [APTO]
- `H-05`: Migración de análisis a Gemini 3.8 Flash High con OAuth/ADC. [APTO — verificado en vivo]
- `H-06`: Aprobación de la Opción 1 (blueprint libre) — `D-2026-09-07-FREE`. [APTO]

Keep this concise. History belongs in CONTEXT and Git.
