# CURRENT - Generador Paramétrico de Patrones IA

```yaml
updated_at: 2026-08-20T14:02:00-05:00
source_commit: [FIX] Auto-sync static public assets during build and start_web_studio.bat
assurance: Lean
active_plan: PLAN_v0.4-fireworks-multimodal.md
active_task: T-17 (Diagnóstico y Aislamiento de Fireworks API con Qwen 3.7 Plus)
last_verdict: APTO
backup: local-only
```

## Jerarquía Multi-Agente Activa

- **Arquitecto (Lead / Planner / Auditor General)**: Planificación, control plane (`.agents/`), auditorías de fase, commits `[STATE]`.
- **Ingeniero (Subagente de Razonamiento & Diagnóstico)**: Diagnóstico empírico de APIs, FreeSewing, Zod/TS, mini-auditorías de tarea, Audit Capsules.
- **Obrero (Subagente de Código)**: Implementación TypeScript/HTML/CSS/JS, scripts de prueba, ejecución de tests.

## Next action

1. **Despachar Tarea `T-17` (Diagnóstico y Aislamiento de Fireworks API):**
   - Crear y ejecutar `scripts/test_fireworks_call.js` para probar en vivo la API Key del usuario contra el endpoint de Fireworks con `accounts/fireworks/models/qwen3p7-plus`.
   - Capturar e imprimir la respuesta real (código de estado, latencia, contenido o mensaje de error exacto).
2. **Proceder con `T-18`:** Agregar observabilidad y logs explícitos en `/api/generate` (`src/server/routes.ts`) para que la consola muestre exactamente cada paso y el frontend reciba `error.details`.

## Blockers

- Ninguno técnico interno (369/369 tests pasando en Vitest).
- En espera de diagnóstico empírico de la llamada real a Fireworks API (`T-17`).

## Current facts

- **Fases 1, 2 y 3 cerradas y archivadas** en `.agents/archive/` con veredicto APTO.
- **Arquitectura de IA simplificada:** Se eliminaron las implementaciones legacy de CLI por bash (`agy`, `opencode`) y se consolidaron **Direct API** (`api` con Fireworks AI) y **Mock Offline** (`mock`).
- **Modelo por defecto:** `accounts/fireworks/models/qwen3p7-plus` (Visión Multimodal Nativa).
- **Frontend Web Studio:** Sincronización automática de archivos estáticos en `dist/server/public/`, soporte Drag & Drop de imágenes (PNG/JPG/WEBP), visualización de Ficha Técnica, Metadatos Etsy, capas por talla (XS-3XL) y descarga directa de paquetes ZIP.
- **Suite Determinista:** **13/13 suites passing (369/369 tests en verde)**.

## Open findings

- En pruebas de usuario en vivo, el endpoint `/api/generate` capturó un fallo interno devolviendo el mensaje genérico *"Falló la ejecución del pipeline de moldería"* sin traza en terminal. Esto motivó la activación del Plan v0.4 (`T-17` a `T-20`) para aislar la API y dotar al servidor de trazabilidad absoluta.

## Human actions

- [x] Validación de ensamble y continuidad de líneas con PDFStitcher (`H-02`). [VERIFICADO OK]
- [x] Verificación de escala 1:1 y cuadro de calibración 10x10 cm (`H-01`). [VERIFICADO OK]

Keep this concise. History belongs in CONTEXT and Git.
