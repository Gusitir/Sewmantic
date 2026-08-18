# AGENTS - Generador Paramétrico de Patrones IA (pattern-ai-core)

## Operating mode

- Assurance: Lean (default)
- Product plane owner: executor (Ingeniero / Obrero)
- Control plane owner: planner/auditor (Arquitecto)
- Local Git: required
- Backup: local-only
- Sibling systems outside scope: MyPetCreature 3D/AR WebGL viewer (Fase 2)

## Roles y Jerarquia de Agentes

1. **Arquitecto (Lead / Planner / Auditor General)**:
   - Dueno exclusivo del plano de control (.agents/).
   - Planifica hitos, desglosa tareas y gestiona el flujo global del proyecto.
   - Orquesta la asignacion de tareas a **Ingeniero** y **Obrero**.
   - Realiza auditorias de fase y emite veredictos finales (APTO, NO APTO, BLOCKED).
   - Realiza commits de control con prefijo [STATE] ....

2. **Ingeniero (Subagente de Razonamiento, Geometria y Auditoria Tecnica)**:
   - Resuelve problemas de alta complejidad logica, formulas matematicas y patronaje computacional en FreeSewing v3.
   - Disena contratos de datos (Zod schemas, interfaces TypeScript) y arquitecturas de modulos.
   - Ejecuta mini-auditorias localizadas por tarea y genera Audit Capsules con evidencia verificada.
   - Especifica directivas tecnicas precisas para la implementacion por parte del Obrero.

3. **Obrero (Subagente de Codigo y Ejecucion)**:
   - Implementa codigo fuente TypeScript/Node.js de manera directa, limpia y eficiente siguiendo las especificaciones.
   - Realiza tareas de refactorizacion y adicion de archivos.
   - Ejecuta pruebas locales y comandos de compilacion (npm run build, npm test).

4. **Automatizacion Mecanica (Scripts)**:
   - Todas las tareas repetitivas o mecanicas (generacion de esqueletos, ejecucion de matrices de pruebas, formateo, empaquetado) se ejecutan mediante scripts versionados en scripts/ (PowerShell / Node.js).

## Verification surface

- Gate command: npm test
- Covers: TypeScript compilation, AI JSON schema validation, FreeSewing pattern generation, SVG/PDF tiling and calibration test box generation.
- Does not cover: Human inspection of physical garment assembly, test printing measurement validation (10x10 cm square calibration). Link to TESTING.md.
- Risk triggers requiring model audit: Modifying geometric calculation formulas, FreeSewing base block changes, export layer corruption, licensing/IP checks.

## Workflow

1. El Arquitecto selecciona la tarea activa y despacha el brief.
2. El Ingeniero disena la solucion logica / matematica si la tarea involucra complejidad o diseno de tipos.
3. El Obrero (o scripts mecanicos) codifica e implementa la solucion y verifica que pase las puertas deterministas (npm run build, npm test).
4. El Ingeniero realiza una mini-auditoria localizada y prepara el Audit Capsule (criterios, commits [T-NN], diff, puertas, riesgos).
5. El Arquitecto audita la evidencia, emite veredicto (APTO/NO APTO) y actualiza el plano de control ([STATE]).

Lean batches low-risk audits at a phase boundary. Deterministic gates still run per commit.

## Durable rules

- Use repository-relative paths in persistent files.
- Selective staging only. Preserve unrelated changes.
- Evidence before claims. Declare checks that could not run.
- No credentials, tokens, private keys, personal data, or valued .env files.
- CONTEXT is append-only except during explicit MAINTAIN/COMPACT with traceability.
- A Git remote is optional; never assume it exists.
- Tool commands belong in versioned, dated local recipes and must be re-verified.
- Export root DOCUMENTATION.md on demand for a human; it is a dated snapshot, not living docs.

## Environment

- OS/shell: Windows (PowerShell)
- Runtime/tool versions: Node.js (TypeScript), FreeSewing v3+
- Build/test quirks: Output PDFs must be tested against 100% scale rendering.
- Ignored/generated directories: node_modules/, dist/, output/, .env

## Learned safeguards

- Always include a 10cm x 10cm calibration test square on Page 1 of paginated PDFs.
- Ensure grainline direction and notch alignment are computed geometrically on all generated pattern pieces.
