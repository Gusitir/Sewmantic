# AGENTS - Generador Paramétrico de Patrones IA (pattern-ai-core)

## Operating mode

- Assurance: Lean (default: deterministic gates per commit, fresh-context self-audit at milestone boundaries)
- Product plane owner: Worker (`[T-NN]` commits)
- Control plane owner: Architect / Engineer (`[STATE]` commits)
- Local Git: required
- Backup: private GitHub remote + Google Drive bundle/snapshot
- Sibling systems outside scope: MyPetCreature 3D/AR WebGL viewer (Fase 2)

## Roles y Jerarquía de Orquestación (agents-workflow v3)

1. **Humano (Usuario)**:
   - Aprobación de alcance material, decisiones irreversibles, evaluación visual y validación física.

2. **Arquitecto (Lead / Planner / Milestone Closure)**:
   - Modelo principal: **GLM 5.3 Flash** (opencode).
   - Puede orquestar **1 asistente persistente Luna (mismo modelo)** para mantenimiento acotado de `.agents/`, auditorias enfocadas y micro-correcciones de bajo riesgo.
   - Dueño de INIT, PLAN (preflight de diseño y descomposición de tareas), mantenimiento principal de `.agents/`, coherencia de arquitectura, auditoria independiente de fase y CLOSE.
   - Genera planes aprobados y diseño modular. Nunca escribe personalmente codigo de producto.
   - Controla los commits `[STATE]`, emite veredictos finales y autoriza cada avance de tarea.

3. **Ingeniero (Loop Orchestration, Technical Audit & Control State)**:
   - Modelo principal: **GLM 5.3 Flash** (opencode).
   - Dueño de RUN THE LOOP, auditoria localizada de Obreros, REINDEX, COMPACT, HANDOFF y EXPORT DOCUMENTATION bajo el plan activo.
   - Resuelve problemas de alta complejidad lógica, contratos de datos (Zod schemas, TypeScript), matemáticas y patronaje FreeSewing v3.
   - Puede orquestar como maximo **2 Obreros DeepSeek V4 Flash 0731** mediante OpenCode y Fireworks AI.
   - Despacha briefs de tareas al Obrero, ejecuta mini-auditorías localizadas y evalúa Audit Capsules con evidencia empírica verificada.
   - Responde obligatoriamente al Arquitecto con evidencia y no avanza de tarea sin nueva autorizacion. Propone cambios de control; el Arquitecto conserva el checkpoint `[STATE]` final.

4. **Obrero (Implementación Acotada & Puertas Deterministas)**:
   - Modelo fijado: `fireworks-ai/accounts/fireworks/models/deepseek-v4-flash-0731`.
   - Dueño del plano de producto: implementa código fuente TypeScript/Node.js/HTML/CSS/JS estrictamente dentro del alcance de su brief `[T-NN]`.
   - Ejecuta puertas deterministas locales (`npm run build`, `npm test`) y genera la Cápsula de Auditoría (Audit Capsule).
   - Nunca expande el alcance por iniciativa propia ni se auto-aprueba.

5. **Automatización Mecánica (Scripts)**:
   - Todas las tareas repetitivas o mecánicas (generación de esqueletos, matrices de pruebas, formateo, empaquetado) se ejecutan mediante scripts versionados en `scripts/` (Node.js / PowerShell).

## Orquestacion de modelos y presupuesto

- **Asistente Luna del Arquitecto:** se reserva para correcciones rapidas donde involucrar al Ingeniero seria burocracia desproporcionada, auditorias enfocadas y mantenimiento pequeno. Una micro-correccion no puede cambiar arquitectura, contratos publicos, dependencias, migraciones ni alcance material; si aparece cualquiera de esas condiciones, se escala al Ingeniero.
- **Evidencia para micro-correcciones:** diff enfocado, gate pertinente, commit de producto separado y revision del Arquitecto. Luna nunca se autoaprueba.
- **Cambio de modelo de orquestacion (2026-09-07):** Arquitecto/Ingeniero migraron de GPT-5.6 Sol/Terra a **GLM 5.3 Flash** (opencode). El Obrero permanece en DeepSeek V4 Flash 0731 (Fireworks).
- **Obreros del Ingeniero:** maximo dos sesiones DeepSeek simultaneas y solo con scopes de escritura disjuntos. Archivos compartidos, schemas, lockfiles y contratos fuerzan serializacion.
- **Modelo Fireworks fijado:** usar `deepseek-v4-flash-0731`; el alias no versionado `deepseek-v4-flash` no esta desplegado para la cuenta verificada.
- **Presupuesto Fireworks:** tramo operativo de **USD 10**, compartido entre los dos Obreros y pruebas internas de API. El Humano realiza recarga manual cuando se agota.
- **Control de consumo:** cada brief declara limite de llamadas/tokens cuando use API. Reintentos pagos son acotados; saldo insuficiente o error de facturacion produce `BLOCKED`, sin cambiar silenciosamente a otro modelo pago.
- Nunca persistir credenciales, tokens ni datos de facturacion en Git.

## Verification Surface & Puertas Deterministas

- **Política Zero-Trust (Evidencia Empírica Obligatoria):**
  - Ninguna afirmación verbal es válida por sí misma.
  - Todo resultado se verifica exclusivamente contra el código fuente, ejecución real de comandos y diffs de Git.
  - El Obrero/Ingeniero adjunta la salida literal de los comandos de prueba en el Audit Capsule.

- **Puertas Deterministas por Tarea y Fase:**
  - **Fase 1.0 (MVP Core Geometry & Tiling: T-01 a T-08):** `npm run build && npm test` (193 tests PASS).
  - **Fase 2.0 (Slopers de Pantalón, Medidas a Medida & Etsy ZIP: T-09 a T-12):** `npm test` (309 tests PASS).
  - **Fase 3.0 (Web Studio 2D & Conjuntos de 2 Piezas: T-13 a T-16):** `npm test` (375 tests PASS).
  - **Fase 4.0 (Integración Multimodal Fireworks AI: T-17 a T-20):** `node scripts/test_fireworks_call.js && npm test` (404 tests PASS).
  - **Fase 5.0 (Womenswear Slopers & Headless 3D Export: T-21 a T-24):** `npm run build && npm test` (468 tests PASS).
  - **Fase 6.0 (True-to-Pattern 3D Meshing & Ear-Clipping: T-25 a T-28):** `npm run build && npm test` (513 tests PASS).
  - **Fase 7.0 (Blueprints Ancla, Moldería Industrial & Despiece 3D: T-29 a T-32):** `npm run build && npm test` (537 tests PASS).
  - **Fase 8.0 (Cuellos Técnicos, Bolsillos Cargo 3D & Utility Vest: T-33 y T-34):** `npm run build && npm test` (548 tests PASS).
  - **Fase 9.0 (Calibración Geométrica 3D & Triangulación Homogénea: T-35 a T-38):** `npm run build && npm test` (548+ tests).

- **Barrera de Parada Humana (Stop Condition Obligatorio):**
  - `H-01`: Impresión física de la Página 1 a escala 100% y medición con regla del recuadro de 10x10 cm. [VERIFICADO OK]
  - `H-02`: Ensamble físico/digital de las hojas A4/Letter para validar continuidad de corte con PDFStitcher. [VERIFICADO OK]
  - `H-03`: Inspección visual del patrón generado a partir de una imagen de referencia en el Visor 2D/3D del Web Studio. [NO APTO: orientación 3D de `back_leg` y deriva `pull_over` prompt/Zod]

## Workflow v3

1. **Humano**: Define objetivo o aprueba alcance material.
2. **Arquitecto**: Diseña solución / planifica hitos y preflight (`PLAN`).
3. **Humano**: Aprueba el plan.
4. **Arquitecto**: Autoriza una tarea `[T-NN]` y la entrega al Ingeniero.
5. **Ingeniero**: Despacha el brief aprobado al Obrero (`RUN THE LOOP`).
6. **Obrero**: Implementa en plano de producto, ejecuta puertas deterministas (`npm run build && npm test`), comitea `[T-NN]` y retorna Audit Capsule.
7. **Ingeniero**: Audita al Obrero, corrige si corresponde y responde al Arquitecto con Audit Capsule y evidencia.
8. **Arquitecto**: Audita independientemente, emite APTO / NO APTO / BLOCKED, actualiza `[STATE]`, autoriza el avance y ejecuta CLOSE al final.

## Durable rules

- Use repository-relative paths in persistent files.
- Selective staging only. Preserve unrelated changes.
- Evidence before claims. Declare checks that could not run.
- No credentials, tokens, private keys, personal data, or valued .env files.
- CONTEXT is append-only except during explicit MAINTAIN/COMPACT with traceability.
- A Git remote is optional; never assume it exists.
- Current verified remote: private repository `Gusitir/Sewmantic`; pushes remain explicit.
- Tool commands belong in versioned, dated local recipes and must be re-verified.
- Export root DOCUMENTATION.md on demand for a human; it is a dated snapshot, not living docs.

## Environment

- OS/shell: Windows (PowerShell)
- Runtime/tool versions: Node.js (TypeScript, ESM NodeNext), FreeSewing v3+
- Build/test quirks: Output PDFs must be tested against 100% scale rendering.
- Ignored/generated directories: node_modules/, dist/, output/, .env

## Learned safeguards

- Always include a 10cm x 10cm calibration test square on Page 1 of paginated PDFs.
- Ensure grainline direction and notch alignment are computed geometrically on all generated pattern pieces.
- Always include explicit `console.log` / `console.error` and structured error responses in server API endpoints.
- Auto-sync static frontend files to `dist/` during build and launcher execution.
- Maintain double-sided normals and mirrored left panels for `cutCount === 2` in 3D projection.
- Include High-Precision Visual Feature Extraction Matrix when processing inspiration images.
