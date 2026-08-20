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
   - Implementa código fuente TypeScript/Node.js/HTML/CSS/JS de manera directa, limpia y eficiente siguiendo las especificaciones.
   - Realiza tareas de refactorización y adición de archivos.
   - Ejecuta pruebas locales y comandos de compilación (`npm run build`, `npm test`).

4. **Automatización Mecánica (Scripts)**:
   - Todas las tareas repetitivas o mecánicas (generación de esqueletos, ejecución de matrices de pruebas, formateo, empaquetado) se ejecutan mediante scripts versionados en `scripts/` (Node.js / PowerShell).

## Verification surface & Puertas por Fase

- **Política Zero-Trust (Evidencia Empírica Obligatoria):**
  - Ninguna afirmación verbal de ningún agente (incluido el Arquitecto) es válida por sí misma.
  - Todo resultado se verifica exclusivamente contra el código fuente, ejecución real de comandos y diffs de Git.
  - El Ingeniero debe adjuntar la salida literal de los comandos de prueba en el Audit Capsule.

- **Puertas Deterministas por Tarea y Fase:**
  - **Fase 1.0 (MVP Core Geometry & Tiling: T-01 a T-08):**
    - *Gate:* `npm run build && npm test`
    - *Criterio:* Compilación estricta sin errores, cuadro de calibración 10x10cm verificado, 193 tests PASS.
  - **Fase 2.0 (Slopers de Pantalón, Medidas a Medida & Etsy ZIP: T-09 a T-12):**
    - *Gate:* `npm test`
    - *Criterio:* Coincidencia de entrepiernas $< 0.05\text{ mm}$, paquetes ZIP generados, 309 tests PASS.
  - **Fase 3.0 (Web Studio 2D & Conjuntos de 2 Piezas: T-13 a T-16):**
    - *Gate:* `npm test`
    - *Criterio:* Servidor REST nativo, Visor 2D interactivo, preset multi-tela de Luffy, 375 tests PASS.
  - **Fase 4.0 (Integración Multimodal Fireworks AI & Diagnóstico en Vivo: T-17 a T-20):**
    - *Gate:* `node scripts/test_fireworks_call.js && npm test`
    - *Criterio:* Diagnóstico empírico exitoso con Fireworks API (Qwen 3.7 Plus), logs transparentes en consola del servidor, manejo de errores detallados en Web Studio y generación end-to-end por imagen.

- **Barrera de Parada Humana (Stop Condition Obligatorio):**
  - El loop autónomo se ejecuta de forma continua hasta alcanzar pruebas físicas indispensables:
    - `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm. [VERIFICADO OK]
    - `H-02`: Ensamble físico/digital de las hojas A4/Letter para validar continuidad de corte con PDFStitcher. [VERIFICADO OK]
    - `H-03`: Inspección visual del patrón generado a partir de una imagen de referencia en el Visor 2D del Web Studio.

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
- Always include explicit `console.log` / `console.error` and structured error responses in server API endpoints.
- Auto-sync static frontend files to `dist/` during build and launcher execution.
