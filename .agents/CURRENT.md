# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-20T18:18:00-05:00
source_commit: [FIX] Increase max_tokens to 6000 and add reasoning_content fallback for Qwen 3.8 Max image inference
assurance: Lean
active_plan: none (All 5 Phases Completed & Verified)
active_task: none (All Tasks Verified APTO)
last_verdict: APTO
backup: local-only
```

## Jerarquía Multi-Agente Activa

- **Arquitecto (Lead / Planner / Auditor General)**: Planificación, control plane (`.agents/`), auditorías de fase, commits `[STATE]`.
- **Ingeniero (Subagente de Razonamiento & Diagnóstico)**: Diagnóstico empírico de APIs, FreeSewing, Zod/TS, mini-auditorías de tarea, Audit Capsules.
- **Obrero (Subagente de Código)**: Implementación TypeScript/HTML/CSS/JS, scripts de prueba, ejecución de tests.

## Next action

1. **Bugfix Qwen 3.8 Max Resuelto y Verificado:** Presupuesto de tokens elevado a `max_tokens: 6000` + fallback de extracción en `reasoning_content` + optimización de system prompt para razonamiento conciso.
2. Iniciar el Web Studio con `start_web_studio.bat` para generar en vivo a partir de imágenes de referencia.

## Blockers

- Ninguno. 470/470 tests pasando al 100% en Vitest (17/17 suites). Inferencia con imagen verificada con `finish_reason: stop`.

## Current facts

- **Corrección de Inferencia Qwen 3.8 Max:**
  - `max_tokens` ajustado a `6000` para acomodar los tokens de razonamiento interno (~2200-3000 tokens) + el JSON final.
  - Fallback automático sobre `reasoning_content` en `DirectApiProvider` para evitar errores si el proveedor no separa los campos.
  - System prompt enriquecido con directivas de razonamiento conciso.
  - Tests unitarios en `tests/ai_provider.test.ts` (27 tests en suite).
- **Suite Determinista:** **17/17 suites passing (470/470 tests en verde)**.

## Open findings

- Ninguno.

## Human actions

- [x] Validación de ensamble y continuidad de líneas con PDFStitcher (`H-02`). [VERIFICADO OK]
- [x] Verificación de escala 1:1 y cuadro de calibración 10x10 cm (`H-01`). [VERIFICADO OK]
- [ ] Inspección visual de patrones 2D y modelos 3D en el Web Studio (`H-03`). [LISTO PARA PROBAR]

Keep this concise. History belongs in CONTEXT and Git.
