# INDEX - `.agents/`

- `AGENTS.md`: roles (Arquitecto, Ingeniero, Obrero), modo LEAN, reglas de aseguramiento y entorno.
- `APPCORE.md`: propósito, invariantes textiles inmutables, pipeline de FreeSewing v3, arquitectura y contrato de datos ADN.
- `CURRENT.md`: estado activo del proyecto, jerarquía de subagentes y siguiente acción inmediata (`T-17`).
- `CONTEXT.md`: registro cronológico inmutable de decisiones, auditorías y eventos.
- `PLAN.md`: puntero al hito activo.
- `PLAN_v0.4-fireworks-multimodal.md`: hito activo (Fase 4: Integración Multimodal Fireworks AI, Diagnóstico Transparente y Generación por Imagen).
- `TESTING.md`: matriz de pruebas automatizadas (13 suites Vitest), pruebas humanas y verificación de APIs.
- `archive/`: directorio para planes cerrados e histórico archivado:
  - `archive/PLAN_v0.1-mvp.md`: Fase 1.0 (MVP Geometría Base, Tiling y PDFs paginados).
  - `archive/PLAN_v0.2-features.md`: Fase 2.0 (Slopers de Pantalón, Medidas a Medida y Empaquetador Etsy).
  - `archive/PLAN_v0.3-web-ui.md`: Fase 3.0 (Servidor REST, Visor 2D y Conjuntos de 2 Piezas).

## Important product paths

- `rules_pattern_making.md`: Reglas de patronaje técnico textil inyectadas al LLM.
- `start_web_studio.bat`: Launcher de 1 clic con build automático y servicio en puerto 3030.
- `scripts/`: Scripts de prueba y automatización (`test_fireworks_call.js`, `build.ps1`, `test_gate.ps1`).
- `src/index.ts`: Entrypoint del CLI y subcomandos (`generate`, `bundle`, `serve`).
- `src/pipeline.ts`: Orquestador principal del pipeline end-to-end.
- `src/ai/`: Proveedores de IA (`DirectApiProvider` para Fireworks AI, `MockAiProvider`, `PromptBuilder`, `AiProviderFactory`).
- `src/schema/`: Esquema Zod y validador de ADN paramétrico.
- `src/engine/`: Motor geométrico FreeSewing v3 (slopers base, modifier, exporter, tech_sheet, etsy_bundler).
- `src/utils/tiler.ts`: Motor de corte y paginado vectorial A4/Letter con cruces de ensamble.
- `src/server/`: Servidor HTTP REST y frontend Web Studio (HTML, CSS, JS, Visor 2D).
- `output/`: PDFs, SVGs, Fichas técnicas y paquetes comerciales ZIP generados.

Last reindexed: 2026-08-20 at phase-4-reindex.
