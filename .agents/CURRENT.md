# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-20T21:48:00-05:00
source_commit: [T-29] implement industrial pattern closures, buttonholes, facings and matched seam notches
assurance: Lean
active_plan: PLAN_v0.7-industrial-blueprints-and-3d-assembly.md
active_task: T-30 (Selector de Bloques Base FreeSewing & Inyección Estructural al LLM)
last_verdict: APTO
backup: local-only
```

## Jerarquía Multi-Agente Activa

- **Arquitecto (Lead / Planner / Auditor General)**: Planificación, control plane (`.agents/`), auditorías de fase, commits `[STATE]`.
- **Ingeniero (Subagente de Razonamiento & Diagnóstico)**: Diagnóstico empírico de APIs, FreeSewing, Zod/TS, mini-auditorías de tarea, Audit Capsules.
- **Obrero (Subagente de Código)**: Implementación TypeScript/HTML/CSS/JS, scripts de prueba, ejecución de tests.

## Next action

1. **Despachar Tarea `T-30` al Ingeniero / Obrero (Selector de Bloques Base FreeSewing & Inyección Estructural al LLM):**
   - Incorporar en el panel izquierdo del Web Studio el selector de los 7 bloques base de FreeSewing (`Wahid`, `Simon`, `Brian`, `Bella`, `Paco`, `Sandy`, `Shin`).
   - Inyectar en el `PromptBuilder` de Qwen 3.8 Max la anatomía, piezas base y parámetros modificables específicos del bloque base seleccionado.
   - Probar con `scripts/test_fireworks_call.js` y tests en `tests/ai_provider.test.ts`.
2. **Proceder con `T-31` & `T-32`:** Guía Visual de Ensamble 3D Despiezada con slider y Ficha Técnica de Confección.

## Blockers

- Ninguno. 527/527 tests pasando al 100% en Vitest (19/19 suites).

## Current facts

- **Tarea `T-29` Completada y Auditada con Veredicto APTO:**
  - Cruces de botonadura frontal (+20 mm), marcas vectoriales de botones/ojales, piezas de vistas interiores con entretela (`front_facing`, `armhole_facing`, `back_neck_facing`) y piquetes pareados.
  - 14 tests unitarios en `tests/industrial_patterns.test.ts`.
- **Suite Determinista:** **19/19 suites passing (527/527 tests en verde)**.

## Open findings

- Ninguno.

## Human actions

- [x] Validación de ensamble y continuidad de líneas con PDFStitcher (`H-02`). [VERIFICADO OK]
- [x] Verificación de escala 1:1 y cuadro de calibración 10x10 cm (`H-01`). [VERIFICADO OK]
- [x] Corrección visual 2D de hombro y escote V (`H-03`). [VERIFICADO OK]
- [ ] Inspección de cruces de botones, vistas y despiece 3D tras Fase 7.0. [PENDIENTE T-32]

Keep this concise. History belongs in CONTEXT and Git.
