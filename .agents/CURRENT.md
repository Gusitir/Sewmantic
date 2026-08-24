# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-23T20:49:02-05:00
source_commit: d529f46 [T-42] synchronize semantic spike evidence
assurance: Standard for architecture selection; deterministic gates per spike
active_job: RUN THE LOOP
active_plan: PLAN_v1.0-semantic-pattern-foundation.md
active_task: T-43
last_verdict: APTO T-42; Phase 9 H-03 remains NO APTO
backup: local-only
```

## Orchestration Roles (agents-workflow v3)

- **Humano (Usuario)**: Aprobación de alcance material y decisiones irreversibles.
- **Arquitecto**: INIT, PLAN (preflight de diseño y descomposición), coherencia y CLOSE.
- **Ingeniero**: RUN THE LOOP, AUDIT, MAINTAIN, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION.
- **Obrero**: Implementación acotada de tareas en plano de producto `[T-NN]`, puertas deterministas y Cápsula de Auditoría.

## Next action

1. **Ingeniero:** Ejecutar T-43 con un Obrero DeepSeek V4 Flash 0731, respetar presupuesto/call cap, exigir gates y Audit Capsule, y responder al Arquitecto sin iniciar T-44.

## Blockers

- Phase 9 CLOSE bloqueado por `H-03-F` (orientacion anatomica de `back_leg`) y `H-03-H` (deriva `pull_over` entre prompt y Zod).
- Ninguno para T-43. La integracion Motor v2 permanece fuera de alcance hasta nueva confirmacion.

## Current facts

- **Fases 1.0 a 8.0 Completadas y Selladas en `.agents/archive/` con veredicto APTO.**
- **Suite Determinista:** **21/21 suites passing (556/556 tests en verde)** tras `[T-38]`.
- **North Star v1 aprobado:** Motor Semantico + Patronista Conversacional persistente + Capability Registry/Workshop + RAG local.
- **Open-source shortlist:** GarmentCode/Design2GarmentCode, Flatten.js, Vercel AI SDK y Orama son candidatos principales; ninguna dependencia fue seleccionada aun.
- **Orquestacion verificada:** Luna MAX accesible; DeepSeek V4 Flash operativo mediante el modelo versionado `deepseek-v4-flash-0731`.
- **Presupuesto Fireworks:** USD 10 aprobados y compartidos entre Obreros DeepSeek y pruebas internas; recarga manual a cargo del Humano.
- **T-41 APTO:** 16/16 invariantes; Flatten.js lidera para poligonos/booleanos y Maker.js queda como referencia de dibujo/offset, sin integracion aprobada.
- **T-42 APTO:** kernel ESM sin nuevas dependencias; Edge/Panel/Interface/StitchPair, matching, orientacion, cortes, pinzas y round-trip pasan 18/18 invariantes.
- **Módulos Paramétricos Extendidos:** Cuellos técnicos (`stand_collar`, `shirt_collar_with_stand`), bolsillos cargo 3D con fuelle y solapa (`cargo_pocket_body`, `cargo_pocket_bellows`, `cargo_pocket_flap`), y blueprint ancla `utility_vest` (Chaleco Táctico / Safari / Cargo).
- **Moldería Industrial & Visor 3D:** Cruces de botonadura (+20mm), marcas de ojales/botones, vistas interiores con entretela técnica (`Interfacing_Lining`), bajo en doble pico de chaleco sastre (`hem: { type: 'pointed', peak_drop_mm: 50 }`), Matriz de Inspección Ocular Multimodal de 6 Puntos y Guía de Despiece 3D interactivo en WebGL.

## Open findings

- `H-03-F`: pernera trasera 3D espejada con tiro orientado hacia afuera.
- `H-03-H`: el prompt ofrece `pull_over`, pero el esquema de cierre lo rechaza.

## Human actions

- `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm. [VERIFICADO OK]
- `H-02`: Ensamble físico/digital de las hojas A4/Letter para validar continuidad de corte con PDFStitcher. [VERIFICADO OK]
- `H-03`: Inspeccion visual del patron en Web Studio. [NO APTO; DOS HALLAZGOS ABIERTOS]
- `H-04`: Seleccion humana de fundaciones v1 tras los cuatro spikes. [NO INICIADO]

Keep this concise. History belongs in CONTEXT and Git.
