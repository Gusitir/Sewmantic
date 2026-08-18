# PLAN v0.1 - MVP Generador Paramétrico de Patrones IA

Status: active
Goal: Construir el MVP CLI de generación paramétrica de patrones textiles con FreeSewing y AI Provider Factory, exportando PDF paginado A4/Letter con cuadro de calibración y marcas de corte.
Assurance: Lean

## Tasks

### T-01 - Setup del proyecto TypeScript y reglas de patronaje

- Status: ready
- Depends on: none
- Scope: package.json, 	sconfig.json, .gitignore, 
ules_pattern_making.md, src/
- Acceptance:
  - [ ] Proyecto Node.js/TypeScript inicializado con dependencias base y scripts (uild, 	est, start).
  - [ ] 
ules_pattern_making.md creado con las reglas textiles fundamentales (holguras confort vs diseño, marcas técnicas, piquetes, márgenes).
  - [ ] Estructura de carpetas src/ai, src/engine, src/utils creada.
- Gates: 
pm run build
- Human checks: none
- Risk triggers: none
- STOP when: Errores en configuración de TypeScript o compilación.

### T-02 - Contrato de datos y validador de ADN Paramétrico

- Status: ready
- Depends on: T-01
- Scope: src/types/pattern.ts, src/schema/pattern_schema.ts
- Acceptance:
  - [ ] Tipos TypeScript y esquema de validación (Zod) para el JSON paramétrico de ADN (concept_name, ase_block, ease, modifications, 
otions, estimated_fabric_meters).
  - [ ] Tests unitarios que validen entradas conformes y rechacen esquemas inválidos.
- Gates: 
pm test
- Human checks: none
- Risk triggers: none
- STOP when: Esquema no cubre todas las modificaciones requeridas por los bloques base.

### T-03 - AI Provider Factory (OpenCode CLI & Direct API)

- Status: ready
- Depends on: T-02
- Scope: src/ai/base_provider.ts, src/ai/opencode_cli_provider.ts, src/ai/direct_api_provider.ts, src/ai/factory.ts
- Acceptance:
  - [ ] Interfaz IAiProvider implementada.
  - [ ] Proveedor OpencodeCliProvider para ejecución local con ChatGPT.
  - [ ] Proveedor DirectApiProvider para llamadas directas a APIs (Claude/OpenAI).
  - [ ] AiProviderFactory que instancia el proveedor adecuado según variable de entorno AI_PROVIDER.
- Gates: 
pm test
- Human checks: none
- Risk triggers: Integración con procesos CLI externos.
- STOP when: Fallos en parsing de salida de LLM o variables no configuradas.

### T-04 - Motor geométrico FreeSewing y aplicación de modificaciones

- Status: ready
- Depends on: T-02
- Scope: src/engine/base_blocks/, src/engine/modifier.ts
- Acceptance:
  - [ ] Integración de slopers base de FreeSewing (torso, manga, falda/pantalón).
  - [ ] Aplicación determinista de modificaciones de holguras (ease), cortes de cuello, hombros caídos y dobladillos sobre los slopers.
  - [ ] Inclusión automática de piquetes de coincidencia (notches) y línea de hilo (grainline).
- Gates: 
pm test
- Human checks: none
- Risk triggers: Modificaciones geométricas que rompan la topología de las piezas.
- STOP when: Incompatibilidad entre versiones de FreeSewing o cálculo geométrico inválido.

### T-05 - Módulo de Tiling y Exportación SVG / PDF Paginado

- Status: ready
- Depends on: T-04
- Scope: src/utils/tiler.ts, src/engine/exporter.ts
- Acceptance:
  - [ ] Algoritmo de tiling que divide el patrón continuo en hojas A4 y Letter con solapes, cruces de registro y numeración (A1, A2...).
  - [ ] Inclusión obligatoria en Página 1 del recuadro de calibración de 10 cm x 10 cm (4 in x 4 in) a escala 100%.
  - [ ] Soporte para exportación en capas PDF por talla (XS a 3XL).
  - [ ] Generación de PDF A0 continuo para corte láser / plotter.
- Gates: 
pm test
- Human checks: H-01, H-02
- Risk triggers: Desajuste de escala o márgenes en generación PDF.
- STOP when: Dimensiones de exportación no coincidan con las unidades en milímetros.

### T-06 - CLI Entrypoint y Pipeline de Generación End-to-End

- Status: ready
- Depends on: T-03, T-05
- Scope: src/index.ts
- Acceptance:
  - [ ] Comando CLI interactivo para generar un patrón pasando imagen o prompt de diseño.
  - [ ] Pipeline completo: Prompt/Imagen -> LLM Provider -> ADN JSON -> FreeSewing Modifier -> Exporter -> Archivos en output/.
  - [ ] Generación de ficha técnica de armado y resumen de consumo de tela.
- Gates: 
pm test
- Human checks: H-03, H-04
- Risk triggers: Flujo completo end-to-end.
- STOP when: El pipeline falle en alguna de las etapas intermedias.

## Closure gate

- [ ] All tasks APTO.
- [ ] Required human checks complete.
- [ ] Phase coherence and stale-state sweep complete.
- [ ] CURRENT, INDEX, APPCORE, TESTING, and Git agree.
