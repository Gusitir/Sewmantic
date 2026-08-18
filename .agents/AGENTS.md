# AGENTS - Generador Paramétrico de Patrones IA (pattern-ai-core)

## Operating mode

- Assurance: Lean (default)
- Product plane owner: executor (Ingeniero / Obrero)
- Control plane owner: planner/auditor (Arquitecto)
- Local Git: required
- Backup: local-only
- Sibling systems outside scope: MyPetCreature 3D/AR WebGL viewer (Fase 2)

## Roles y Jerarquía de Agentes (Modelo: Gemini 3.7 Flash High)

1. **Arquitecto (Lead / Planner / Auditor General)**:
   - Modelo: **Gemini 3.7 Flash High**
   - Dueño exclusivo del plano de control (`.agents/`).
   - Planifica hitos, desglosa tareas y gestiona el flujo global del proyecto.
   - Orquesta la asignación de tareas a **Ingeniero** y **Obrero**.
   - Realiza auditorías de fase y emite veredictos finales (APTO, NO APTO, BLOCKED).
   - Realiza commits de control con prefijo `[STATE] ...`.

2. **Ingeniero (Subagente de Razonamiento, Geometría y Auditoría Técnica)**:
   - Modelo: **Gemini 3.7 Flash High** (`Model: inherit`)
   - Resuelve problemas de alta complejidad lógica, fórmulas matemáticas y patronaje computacional en FreeSewing v3.
   - Diseña contratos de datos (Zod schemas, interfaces TypeScript) y arquitecturas de módulos.
   - Ejecuta mini-auditorías localizadas por tarea y genera Audit Capsules con evidencia verificada.
   - Especifica directivas técnicas precisas para la implementación por parte del Obrero.

3. **Obrero (Subagente de Código y Ejecución)**:
   - Modelo: **Gemini 3.7 Flash High** (`Model: inherit`)
   - Implementa código fuente TypeScript/Node.js de manera directa, limpia y eficiente siguiendo las especificaciones.
   - Realiza tareas de refactorización y adición de archivos.
   - Ejecuta pruebas locales y comandos de compilación (`npm run build`, `npm test`).

4. **Automatización Mecánica (Scripts)**:
   - Todas las tareas repetitivas o mecánicas (generación de esqueletos, ejecución de matrices de pruebas, formateo, empaquetado) se ejecutan mediante scripts versionados en `scripts/` (PowerShell / Node.js).

## Verification surface & Puertas por Fase

- **Política Zero-Trust (Evidencia Empírica Obligatoria):**
  - Ninguna afirmación verbal de ningún agente (incluido el Arquitecto) es válida por sí misma.
  - Todo resultado se verifica exclusivamente contra el código fuente, ejecución real de comandos y diffs de Git.
  - El Ingeniero debe adjuntar la salida literal de los comandos de prueba en el Audit Capsule.

- **Puertas Deterministas por Tarea y Fase:**
  - **Fase 1.1 (Setup, Contratos y AI Provider: T-01 a T-03):**
    - *Gate:* `npm run build && npm test`
    - *Criterio:* Compilación estricta sin errores, esquemas Zod al 100% de cobertura en tests unitarios, `AgyCliProvider` y Factory funcionales.
  - **Fase 1.2 (Motor Geométrico FreeSewing: T-04 y T-05):**
    - *Gate:* `npm test`
    - *Criterio:* Slopers generan geometría cerrada; el modifier recalcula sisa-manga con tolerancia $< 3\text{ mm}$; 100% de piezas con *grainline* y *notches* emparejados.
  - **Fase 1.3 (Tiling, Calibración y Ficha Técnica: T-06 y T-07):**
    - *Gate:* `npm test`
    - *Criterio:* Cuadro de 100x100 mm ($283.465\text{ pt}$) en Página 1 verificado vectorialmente; grilla A4/Letter con cruces A1-An; capas PDF por talla (XS-3XL); cálculo de tela con merma $\ge 10\%$.
  - **Fase 1.4 (CLI y Pipeline End-to-End: T-08):**
    - *Gate:* `npm test && powershell scripts/gen_sample.ps1`
    - *Criterio:* Generación de entregables completos en `output/`.

- **Barrera de Parada Humana (Stop Condition Obligatorio):**
  - El loop autónomo se ejecuta de forma continua hasta alcanzar pruebas físicas indispensables:
    - `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm.
    - `H-02`: Ensamble físico de las hojas A4/Letter para validar continuidad de corte.
  - Al llegar a este punto, el Arquitecto emite veredicto `BLOCKED: Awaiting Human Verification` y solicita la confirmación del usuario antes de cerrar el hito.

## Workflow

1. El **Arquitecto** selecciona la tarea activa y despacha el brief.
2. El **Ingeniero** diseña la solución lógica / matemática si la tarea involucra complejidad o diseño de tipos.
3. El **Obrero** (o scripts mecánicos) codifica e implementa la solución y verifica que pase las puertas deterministas (`npm run build`, `npm test`).
4. El **Ingeniero** realiza una mini-auditoría localizada y prepara el **Audit Capsule** (criterios, commits `[T-NN]`, diff, puertas, riesgos).
5. El **Arquitecto** audita la evidencia empírica, emite veredicto (APTO/NO APTO) y actualiza el plano de control (`[STATE]`).
6. Al finalizar cada fase, el Arquitecto realiza una sincronización integral de todos los `.md` de `.agents/` y genera un commit de fase `[STATE] close phase X.Y`.

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
