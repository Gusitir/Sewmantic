# INDEX - `.agents/`

- `AGENTS.md`: roles (Arquitecto, Ingeniero, Obrero), modo LEAN, reglas de aseguramiento y entorno.
- `APPCORE.md`: propósito, invariantes textiles inmutables, pipeline de FreeSewing y contrato de datos ADN.
- `CURRENT.md`: estado activo del proyecto, jerarquía de subagentes y siguiente acción inmediata.
- `CONTEXT.md`: registro cronológico inmutable de decisiones y eventos.
- `PLAN_v0.1-mvp.md`: hito activo (MVP de 8 tareas: T-01 a T-08) con matriz de roles y criterios de aceptación.
- `TESTING.md`: matriz de pruebas humanas, calibración física (10x10 cm) e impresión de patrones.
- `archive/`: directorio para planes cerrados e histórico archivado.

## Important product paths

- `project_blueprint.md`: Blueprint técnico y estratégico maestro del proyecto.
- `rules_pattern_making.md`: Reglas de patronaje técnico textil inyectadas al LLM.
- `scripts/`: Scripts de automatización mecánica (`build.ps1`, `test_gate.ps1`, etc.).
- `src/index.ts`: Entrypoint del CLI.
- `src/ai/`: Proveedores de IA (OpenCode CLI, API directa, Mock, Factory, PromptBuilder).
- `src/schema/`: Esquema Zod y validador de ADN paramétrico.
- `src/engine/`: Motor geométrico FreeSewing v3 (slopers base, modifier, exporter, tech_sheet).
- `src/utils/tiler.ts`: Utilidad de paginado vectorial A4/Letter con cruces de corte y calibración.

Last reindexed: 2026-08-17 at multiagent-orchestration.
