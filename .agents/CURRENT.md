# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-20T22:03:00-05:00
source_commit: [T-31] implement 3D exploded assembly guide view, interactive slider and seam guide lines
assurance: Lean
active_plan: PLAN_v0.7-industrial-blueprints-and-3d-assembly.md
active_task: T-32 (Ficha Técnica de Confección Paso a Paso & Auditoría de Fase 7.0)
last_verdict: APTO
backup: local-only
```

## Jerarquía Multi-Agente Activa

- **Arquitecto (Lead / Planner / Auditor General)**: Planificación, control plane (`.agents/`), auditorías de fase, commits `[STATE]`.
- **Ingeniero (Subagente de Razonamiento & Diagnóstico)**: Diagnóstico empírico de APIs, FreeSewing, Zod/TS, mini-auditorías de tarea, Audit Capsules.
- **Obrero (Subagente de Código)**: Implementación TypeScript/HTML/CSS/JS, scripts de prueba, ejecución de tests.

## Next action

1. **Ejecutar Tarea `T-32` (Ficha Técnica de Confección Paso a Paso & Auditoría de Fase 7.0):**
   - Actualizar `src/engine/tech_sheet.ts` para que incluya en la Ficha Técnica (PDF, Markdown, JSON) la guía de armado paso a paso (1. Entretelado de vistas, 2. Ojales y botonadura, 3. Hombros y costados, 4. Remate de sisas y bajo).
   - Ejecutar `npm run build && npm test`.
   - Auditar la fase completa y emitir veredicto final APTO.
   - Archivar `PLAN_v0.7-industrial-blueprints-and-3d-assembly.md` en `archive/` y generar commit `[STATE] close phase 7.0`.

## Blockers

- Ninguno. 536/536 tests pasando al 100% en Vitest (19/19 suites).

## Current facts

- **Tareas `T-29`, `T-30` y `T-31` Completadas y Auditadas con Veredicto APTO:**
  - `T-29`: Moldería industrial (cruces $+20\text{ mm}$, marcas de ojales/botones, vistas interiores con entretela `front_facing`, `armhole_facing`, `back_neck_facing` y piquetes pareados).
  - `T-30`: Selector de los 7 bloques base FreeSewing (`Wahid`, `Simon`, `Brian`, `Bella`, `Paco`, `Sandy`, `Shin`) e inyección contextual al LLM.
  - `T-31`: Guía Visual de Ensamble 3D Despiezada (*Exploded Assembly View*) con slider interactivo 0-100%, vectores de traslación anatómica y líneas de guía de costura en WebGL.
- **Suite Determinista:** **19/19 suites passing (536/536 tests en verde)**.

## Open findings

- Ninguno.

## Human actions

- [x] Validación de ensamble y continuidad de líneas con PDFStitcher (`H-02`). [VERIFICADO OK]
- [x] Verificación de escala 1:1 y cuadro de calibración 10x10 cm (`H-01`). [VERIFICADO OK]
- [x] Corrección visual 2D de hombro y escote V (`H-03`). [VERIFICADO OK]
- [ ] Inspección de cruces de botones, vistas y despiece 3D tras Fase 7.0. [LISTO PARA PROBAR]

Keep this concise. History belongs in CONTEXT and Git.
