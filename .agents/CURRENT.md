# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-20T17:35:00-05:00
source_commit: [FEAT] Upgrade default Fireworks AI model to Qwen 3.8 Max with full multimodal support
assurance: Lean
active_plan: none (Phase 4.0 Completed & Upgraded to Qwen 3.8 Max)
active_task: none (Phase 4.0 Verified APTO)
last_verdict: APTO
backup: local-only
```

## Jerarquía Multi-Agente Activa

- **Arquitecto (Lead / Planner / Auditor General)**: Planificación, control plane (`.agents/`), auditorías de fase, commits `[STATE]`.
- **Ingeniero (Subagente de Razonamiento & Diagnóstico)**: Diagnóstico empírico de APIs, FreeSewing, Zod/TS, mini-auditorías de tarea, Audit Capsules.
- **Obrero (Subagente de Código)**: Implementación TypeScript/HTML/CSS/JS, scripts de prueba, ejecución de tests.

## Next action

1. **FASE 4.0 ACTUALIZADA CON ÉXITO A QWEN 3.8 MAX (`accounts/fireworks/models/qwen3p8-max`):**
   - Inferencia multimodal en 1 solo paso verificada en vivo.
   - Parámetros exactos aplicados (`top_k: 40`, `presence_penalty: 0`, `frequency_penalty: 0`, `Accept: application/json`).
2. Proceder a la **inspección visual humana (`H-03`)** abriendo el Web Studio con `start_web_studio.bat`.

## Blockers

- Ninguno. 373/373 tests deterministas en verde. Pipeline E2E validado empíricamente.

## Current facts

- **Modelo Insignia Activo:** **Qwen 3.8 Max** (`accounts/fireworks/models/qwen3p8-max`).
- **Verificación en Vivo con Qwen 3.8 Max:**
  - Script de diagnóstico `scripts/test_fireworks_call.js`: Status 200 OK con respuesta estructurada completa.
  - Script E2E `scripts/test_fireworks_e2e_image.js`: Generación de los 11 entregables comerciales en disco a partir de `IMAGENES/luficosplai.png`.
- **Frontend Web Studio:** Selector actualizado con `api (Fireworks AI • Qwen 3.8 Max / Direct API)`.
- **Suite Determinista:** **13/13 suites passing (373/373 tests en verde)**.

## Open findings

- Ninguno.

## Human actions

- [x] Validación de ensamble y continuidad de líneas con PDFStitcher (`H-02`). [VERIFICADO OK]
- [x] Verificación de escala 1:1 y cuadro de calibración 10x10 cm (`H-01`). [VERIFICADO OK]
- [ ] Inspección visual del patrón generado por imagen en el Visor 2D del Web Studio (`H-03`). [LISTO PARA PROBAR]

Keep this concise. History belongs in CONTEXT and Git.
