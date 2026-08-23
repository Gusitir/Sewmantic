# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-23T02:51:55-05:00
source_commit: 03b5329 [T-38] restore bounds-anchored seam guides
assurance: Standard milestone audit; deterministic gates per task
active_job: RUN THE LOOP
active_plan: PLAN_v0.9-3d-geometry-and-meshing-calibration.md
active_task: T-38
last_verdict: NO APTO
backup: local-only
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Ingeniero/Obrero:** Corregir `[T-38]` para generar guias de piernas sin exigir primitivas de torso, evitar clasificar falda/bolsillo/cuello como torso y repetir `npm run build && npm test`; responder al Arquitecto para auditoria final.

## Blockers

- `[T-38]` NO APTO: con solo `front_leg` y `back_leg`, `getSeamGuideAnchors()` retorna `[]` por el retorno temprano que exige torso.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **21/21 suites passing (555/555 tests en verde)** en `03b5329`, con regresion funcional pendiente en `[T-38]`.
- **Módulos Paramétricos Extendidos:** Cuellos técnicos (`stand_collar`, `shirt_collar_with_stand`), bolsillos cargo 3D con fuelle y solapa (`cargo_pocket_body`, `cargo_pocket_bellows`, `cargo_pocket_flap`), y blueprint ancla `utility_vest` (Chaleco Táctico / Safari / Cargo).
- **Moldería Industrial & Visor 3D:** Cruces de botonadura (+20mm), marcas de ojales/botones, vistas interiores con entretela técnica (`Interfacing_Lining`), bajo en doble pico de chaleco sastre (`hem: { type: 'pointed', peak_drop_mm: 50 }`), Matriz de Inspección Ocular Multimodal de 6 Puntos y Guía de Despiece 3D interactivo en WebGL.

## Open findings

- `P9-T38`: las guias de piernas deben calcularse independientemente del torso; la seleccion de torso debe excluir `leg`, `skirt`, `sleeve`, `pocket`, `collar`, `hood` y `waistband`.

## Human actions

- `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm. [VERIFICADO OK]
- `H-02`: Ensamble físico/digital de las hojas A4/Letter para validar continuidad de corte con PDFStitcher. [VERIFICADO OK]
- `H-03`: Inspección visual del patrón generado a partir de una imagen de referencia en el Visor 2D/3D del Web Studio. [LISTO PARA PROBAR POR EL USUARIO]

Keep this concise. History belongs in CONTEXT and Git.
