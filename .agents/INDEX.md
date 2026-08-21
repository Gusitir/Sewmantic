# INDEX - `.agents/`

- `AGENTS.md`: roles de orquestación (Humano, Arquitecto, Ingeniero, Obrero), modo LEAN, reglas de aseguramiento y entorno.
- `APPCORE.md`: propósito, invariantes textiles inmutables, pipeline de FreeSewing v3, arquitectura y contrato de datos ADN.
- `CURRENT.md`: estado activo del proyecto, jerarquía de subagentes, veredicto y siguiente acción inmediata.
- `CONTEXT.md`: registro cronológico inmutable de decisiones, auditorías y eventos.
- `PLAN.md`: puntero al estado de planes del proyecto.
- `TESTING.md`: matriz de pruebas automatizadas (19 suites Vitest, 538 tests), pruebas humanas y verificación de APIs.
- `archive/`: directorio para planes cerrados e histórico archivado:
  - `archive/PLAN_v0.1-mvp.md`: Fase 1.0 (MVP Geometría Base, Tiling y PDFs paginados).
  - `archive/PLAN_v0.2-features.md`: Fase 2.0 (Slopers de Pantalón, Medidas a Medida y Empaquetador Etsy).
  - `archive/PLAN_v0.3-web-ui.md`: Fase 3.0 (Servidor REST, Visor 2D y Conjuntos de 2 Piezas).
  - `archive/PLAN_v0.4-fireworks-multimodal.md`: Fase 4.0 (Integración Multimodal Fireworks AI, Diagnóstico Transparente y Generación por Imagen).
  - `archive/PLAN_v0.5-womenswear-and-3d-blender.md`: Fase 5.0 (Womenswear Bodice & Skirt Slopers, Anime Dresses/Kimonos & Headless Blender 3D Bridge / WebGL Viewer).
  - `archive/PLAN_v0.6-true-to-pattern-3d-meshing.md`: Fase 6.0 (True-to-Pattern 3D Meshing, 2D Ear-Clipping Triangulation, Smooth Normals & Multi-Material glTF).
  - `archive/PLAN_v0.7-industrial-blueprints-and-3d-assembly.md`: Fase 7.0 (FreeSewing Base Blueprints Architecture, Industrial Patterns with Button Overlaps/Facings/Notches & Exploded 3D Assembly Guide).

## Important product paths

- `rules_pattern_making.md`: Reglas de patronaje técnico textil inyectadas al LLM.
- `start_web_studio.bat`: Launcher de 1 clic con build automático y servicio en puerto 3030.
- `scripts/`: Scripts de prueba y automatización (`test_fireworks_call.js`, `test_fireworks_e2e_image.js`, `test_blender_export.js`, `export_glb_headless.py`).
- `src/index.ts`: Entrypoint del CLI y subcomandos (`generate`, `bundle`, `serve`, `export-3d`).
- `src/pipeline.ts`: Orquestador principal del pipeline end-to-end (2D + 3D + Bundling).
- `src/ai/`: Proveedores de IA (`DirectApiProvider` para Fireworks AI con Qwen 3.8 Max, `MockAiProvider`, `PromptBuilder`, `AiProviderFactory`).
- `src/schema/`: Esquema Zod y validador de ADN paramétrico.
- `src/engine/`: Motor geométrico FreeSewing v3 (slopers base, modifier, exporter, tech_sheet, etsy_bundler, blender_bridge, triangulator).
- `src/utils/tiler.ts`: Motor de corte y paginado vectorial A4/Letter con cruces de ensamble.
- `src/server/`: Servidor HTTP REST y frontend Web Studio (HTML, CSS, JS, Visor 2D, Visor 3D WebGL con Exploded View Slider).
- `output/`: PDFs, SVGs, Modelos .glb 3D, Fichas técnicas y paquetes comerciales ZIP generados.

Last reindexed: 2026-08-21 at reindex-v3 (commit f39ddc1).
