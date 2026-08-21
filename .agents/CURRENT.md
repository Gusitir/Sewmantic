# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-20T21:55:00-05:00
source_commit: [T-30] add FreeSewing blueprint selector in Web Studio and structural prompt injection for LLM
assurance: Lean
active_plan: PLAN_v0.7-industrial-blueprints-and-3d-assembly.md
active_task: T-31 (Guía Visual de Ensamble 3D Despiezada con Slider)
last_verdict: APTO
backup: local-only
```

## Jerarquía Multi-Agente Activa

- **Arquitecto (Lead / Planner / Auditor General)**: Planificación, control plane (`.agents/`), auditorías de fase, commits `[STATE]`.
- **Ingeniero (Subagente de Razonamiento & Diagnóstico)**: Diagnóstico empírico de APIs, FreeSewing, Zod/TS, mini-auditorías de tarea, Audit Capsules.
- **Obrero (Subagente de Código)**: Implementación TypeScript/HTML/CSS/JS, scripts de prueba, ejecución de tests.

## Next action

1. **Despachar Tarea `T-31` al Ingeniero (Guía Visual de Ensamble 3D Despiezada con Slider):**
   - Implementar en `src/engine/blender_bridge.ts` y `src/server/public/viewer3d.js` el modo de despiece espacial (*Exploded Assembly View*):
     - Posicionamiento frontal ($+Z$), dorsal ($-Z$), vistas interiores y mangas laterales semi-cilíndricas.
     - Líneas 3D vectoriales punteadas de costura (*seam indicators*) en hombros y costados.
     - Slider interactivo de despiece / armado (0% ensamblado $\leftrightarrow$ 100% despiezado) en el HUD del visor 3D.
   - Probar con `scripts/test_blender_export.js` y `tests/viewer3d.test.ts`.
2. **Proceder con `T-32`:** Ficha técnica de confección paso a paso y auditoría final de Fase 7.0.

## Blockers

- Ninguno. 534/534 tests pasando al 100% en Vitest (19/19 suites).

## Current facts

- **Tareas `T-29` y `T-30` Completadas y Auditadas con Veredicto APTO:**
  - `T-29`: Moldería industrial (cruces $+20\text{ mm}$, marcas de ojales/botones, vistas interiores con entretela `front_facing`, `armhole_facing`, `back_neck_facing` y piquetes pareados).
  - `T-30`: Selector de los 7 bloques base FreeSewing (`Wahid`, `Simon`, `Brian`, `Bella`, `Paco`, `Sandy`, `Shin`) e inyección contextual al LLM.
- **Suite Determinista:** **19/19 suites passing (534/534 tests en verde)**.

## Open findings

- Ninguno.

## Human actions

- [x] Validación de ensamble y continuidad de líneas con PDFStitcher (`H-02`). [VERIFICADO OK]
- [x] Verificación de escala 1:1 y cuadro de calibración 10x10 cm (`H-01`). [VERIFICADO OK]
- [x] Corrección visual 2D de hombro y escote V (`H-03`). [VERIFICADO OK]
- [ ] Inspección de cruces de botones, vistas y despiece 3D tras Fase 7.0. [PENDIENTE T-32]

Keep this concise. History belongs in CONTEXT and Git.
