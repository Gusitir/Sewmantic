# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-20T18:05:00-05:00
source_commit: [T-24] integrate interactive WebGL 3D garment viewer in Web Studio and bundle 3D models in Etsy ZIP
assurance: Lean
active_plan: none (Phase 5.0 Completed & Verified)
active_task: none (Phase 5.0 Verified APTO)
last_verdict: APTO
backup: local-only
```

## Jerarquía Multi-Agente Activa

- **Arquitecto (Lead / Planner / Auditor General)**: Planificación, control plane (`.agents/`), auditorías de fase, commits `[STATE]`.
- **Ingeniero (Subagente de Razonamiento & Diagnóstico)**: Diagnóstico empírico de APIs, FreeSewing, Zod/TS, mini-auditorías de tarea, Audit Capsules.
- **Obrero (Subagente de Código)**: Implementación TypeScript/HTML/CSS/JS, scripts de prueba, ejecución de tests.

## Next action

1. **FASE 5.0 CERRADA CON ÉXITO:** Tareas `T-21`, `T-22`, `T-23` y `T-24` completadas y auditadas con veredicto **APTO**.
2. **Ejecutar Procedimiento `COMPACT` de `.agents/`:**
   - Archivar snapshot histórico completo en `.agents/archive/CONTEXT_pre_compact_snapshot.md`.
   - Reducir `.agents/CONTEXT.md` a un resumen de alta densidad (~5 KB) eliminando ruido y decisiones obsoletas.
3. Servir el Web Studio con `start_web_studio.bat` para inspección visual 2D y 3D en vivo por parte del usuario (`H-03`).

## Blockers

- Ninguno. 468/468 tests pasando al 100% en Vitest (17/17 suites).

## Current facts

- **Fases 1.0, 2.0, 3.0, 4.0 y 5.0 Completadas y Selladas con Veredicto APTO:**
  - **Fase 1.0 (MVP Geometría y Tiling):** Slopers base FreeSewing v3, Tiling A4/Letter con Cuadro 10x10 cm en Pág 1, Ficha técnica industrial.
  - **Fase 2.0 (Pantalones y Etsy ZIP):** Slopers de pantalón/bermuda con aplomo y entrepierna igualada, interpolación continua de medidas exactas, ZIP Etsy en 6 carpetas.
  - **Fase 3.0 (Web Studio 2D & Conjuntos):** Servidor HTTP REST, Visor 2D vectorial interactivo con zoom centrado y capas, generador de conjuntos de 2 piezas (Luffy Pirate Set).
  - **Fase 4.0 (Fireworks AI Multimodal Qwen 3.8 Max):** Inferencia multimodal nativa en 1 solo paso con Qwen 3.8 Max, diagnóstico en vivo (`scripts/test_fireworks_call.js`), logging transparente en servidor y generación a partir de imágenes de referencia.
  - **Fase 5.0 (Womenswear, Cosplay & Visor 3D WebGL):** Slopers de corpiño femenino con pinzas de busto y falda, modificador de vestidos y kimonos/haoris Furisode, puente headless de Blender y generador binario nativo glTF 2.0 (`.glb`), Visor 3D WebGL interactivo en Web Studio y paquete Etsy ampliado a 7 carpetas comerciales con modelos 3D.
- **Suite Determinista:** **17/17 suites passing (468/468 tests en verde)**.

## Open findings

- Ninguno.

## Human actions

- [x] Validación de ensamble y continuidad de líneas con PDFStitcher (`H-02`). [VERIFICADO OK]
- [x] Verificación de escala 1:1 y cuadro de calibración 10x10 cm (`H-01`). [VERIFICADO OK]
- [ ] Inspección visual de patrones 2D y modelos 3D en el Web Studio (`H-03`). [LISTO PARA PROBAR]

Keep this concise. History belongs in CONTEXT and Git.
