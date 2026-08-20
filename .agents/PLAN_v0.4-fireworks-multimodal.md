# PLAN v0.4 - Fase 4: Integración Multimodal Fireworks AI (Qwen 3.7 Plus) y Diagnóstico Transparente en Vivo

Status: active
Goal: Integrar y blindar el flujo de generación paramétrica multimodal mediante Fireworks AI (Qwen 3.7 Plus / DirectApiProvider), permitiendo generar moldería a partir de imágenes/bocetos, con diagnóstico transparente en terminal y reporte de errores detallado en Web Studio.
Assurance: Lean

## Matriz de Tareas y Asignación de Roles

| Tarea | Descripción | Rol Principal | Rol Secundario | Puerta Determinista | Estado |
|---|---|---|---|---|:---:|
| **T-17** | Diagnóstico y Aislamiento de Fireworks API con Qwen 3.7 Plus | Ingeniero | Obrero | `node scripts/test_fireworks_call.js` | ✅ DONE |
| **T-18** | Servidor REST Logging Transparente y Reporte de Errores en `/api/generate` | Ingeniero | Obrero | `npm test` | 🟡 READY |
| **T-19** | Integración Multimodal de Imágenes en Web Studio & Pipeline DirectAPI | Obrero | Ingeniero | `npm test` | ⚪ QUEUED |
| **T-20** | Verificación End-to-End en Vivo de Generación por Imagen & Auditoría | Arquitecto | Ingeniero | `npm test && node dist/index.js` | ⚪ QUEUED |

---

## Detalle de Tareas

### T-17 - Diagnóstico y Aislamiento de Fireworks API con Qwen 3.7 Plus

- Status: done
- Depends on: none
- Scope: `scripts/test_fireworks_call.js`, `.env`
- Rol: Ingeniero (Diagnóstico empírico y verificación de conectividad).
- Acceptance:
  - [x] Script aislado `scripts/test_fireworks_call.js` que lea `.env` con `dotenv`.
  - [x] Realice una llamada de prueba a `https://api.fireworks.ai/inference/v1/chat/completions` con `accounts/fireworks/models/qwen3p7-plus`.
  - [x] Imprima en terminal: estado HTTP, latencia, modelo activo y respuesta JSON sanitizada o mensaje de error exacto (401, 400, 429).
- Gates: `node scripts/test_fireworks_call.js`
- Human checks: none
- Risk triggers: Clave inválida, falta de créditos en Fireworks o nombre de modelo incorrecto.
- STOP when: La API devuelva error 401/403/404 sin diagnosticar la causa raíz.

---

### T-18 - Servidor REST Logging Transparente y Reporte de Errores en `/api/generate`

- Status: ready
- Depends on: T-17
- Scope: `src/server/routes.ts`, `src/server/app.ts`, `src/ai/direct_api_provider.ts`
- Rol: Ingeniero (Observabilidad y trazabilidad en servidor).
- Acceptance:
  - [ ] Logs explícitos en consola en cada petición `/api/generate` (`[API INCOMING]`, `[AI CALL]`, `[PIPELINE SUCCESS]`, `[ERROR DETAILS]`).
  - [ ] Captura de errores con traza completa y envío de `error.details` estructurado en la respuesta JSON HTTP 400/500.
  - [ ] Visualización en el frontend de la causa real del fallo en el modal/alerta (no texto genérico).
- Gates: `npm test`
- Human checks: none
- Risk triggers: Logs verbosos con secretos de API (sanitizar `FIREWORKS_API_KEY` en logs).
- STOP when: El servidor oculte una excepción sin mostrarla en la terminal.

---

### T-19 - Integración Multimodal de Imágenes en Web Studio & Pipeline DirectAPI

- Status: queued
- Depends on: T-18
- Scope: `src/server/public/app.js`, `src/server/public/index.html`, `src/ai/direct_api_provider.ts`, `src/pipeline.ts`
- Rol: Obrero (Frontend & Drag and Drop) / Ingeniero (Pipeline Multimodal).
- Acceptance:
  - [ ] Procesamiento fluido de imágenes arrastradas o seleccionadas (PNG, JPG, WEBP).
  - [ ] Admisión de generación solo con imagen (prompt opcional sin requerimiento forzado).
  - [ ] Inyección de `images: [dataUrl]` y `image_url` en el payload de Fireworks.
  - [ ] Desactivación de caché de navegador (`Cache-Control: no-cache`) garantizada en todos los assets estáticos.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Imágenes de gran tamaño superando límites de payload HTTP.
- STOP when: El envío de imágenes falle por problemas de serialización Base64.

---

### T-20 - Verificación End-to-End en Vivo de Generación por Imagen & Auditoría

- Status: queued
- Depends on: T-17, T-18, T-19
- Scope: `output/`, `src/server/`, `start_web_studio.bat`
- Rol: Arquitecto (Lead & Auditoría General).
- Acceptance:
  - [ ] Generación exitosa en vivo de un patrón completo a partir de una imagen de referencia usando `api` (Fireworks AI).
  - [ ] Renderizado inmediato en el Visor 2D, Ficha Técnica y pestaña Etsy.
  - [ ] 369/369 tests unitarios pasando al 100% en Vitest.
  - [ ] Empaquetado comercial ZIP generado y verificado.
- Gates: `npm test && node dist/index.js`
- Human checks: Verificación visual del patrón en pantalla.

---

## Closure gate

- [ ] Diagnóstico de Fireworks API verificado con evidencia empírica.
- [ ] Servidor con trazabilidad total en consola y frontend.
- [ ] Generación multimodal funcional sin errores.
- [ ] Veredicto APTO emitido por el Arquitecto.
