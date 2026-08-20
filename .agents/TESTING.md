# TESTING — Matriz de Pruebas y Verificación (`pattern-ai-core`)

Guía completa de pruebas automatizadas, semi-automatizadas y verificación humana/funcional para las Fases 1.0, 2.0, 3.0 y 4.0.

---

## 1. Suite de Pruebas Automatizadas (369/369 PASS — 13 Suites Vitest)

Para ejecutar la suite completa de pruebas deterministas:
```powershell
npm test
```

### Desglose por Capa y Módulo

| Suite de Test | Módulo / Archivo | Tests | Qué valida |
| :--- | :--- | :---: | :--- |
| `tests/schema.test.ts` | `src/schema/pattern_schema.ts` | 41 | Contratos Zod para ADN paramétrico, límites antropométricos, sub-prendas, telas y árboles de modificación. |
| `tests/ai_provider.test.ts` | `src/ai/` | 22 | AI Provider Factory, `DirectApiProvider` (Fireworks AI / Qwen 3.7 Plus) y `MockAiProvider`. |
| `tests/base_blocks.test.ts` | `src/engine/base_blocks/` | 51 | Slopers FreeSewing de Torso, Mangas, Capucha y Bolsillo; curvas Bézier y polígonos cerrados. |
| `tests/trousers.test.ts` | `src/engine/base_blocks/trousers.ts` | 35 | Slopers de Pantalón y Bermuda; aplomo central y ecualización de entrepierna ($\Delta \le 0.05\text{ mm}$). |
| `tests/modifier.test.ts` | `src/engine/modifier.ts` | 67 | Modificaciones superiores e inferiores; recálculo sisa-manga ($< 3\text{ mm}$); pretinas, bolsillos y dobladillos. |
| `tests/custom_measurements.test.ts` | `src/engine/base_blocks/measurements.ts` | 24 | Escalado antropométrico continuo a partir de medidas exactas del usuario; interpolación armónica y clamping. |
| `tests/two_piece_set.test.ts` | `src/engine/modifier.ts` | 28 | Generador de conjuntos coordinados de 2 piezas (`straw_pirate_full_set`); continuidad de costuras y layout compuesto. |
| `tests/tech_sheet.test.ts` | `src/engine/tech_sheet.ts` | 16 | Ficha técnica industrial (PDF, Markdown y JSON); cálculo de mermas ($\ge 10\%$), desglose multi-tela y BOM. |
| `tests/tiler.test.ts` | `src/utils/tiler.js` | 19 | Paginación vectorial A4 / US Letter; Cuadro de Calibración 10x10 cm en Pág 1; cruces de registro. |
| `tests/bundler.test.ts` | `src/engine/etsy_bundler.ts` | 17 | Empaquetador comercial Etsy; estructura de 6 carpetas dentro del `.zip`, 13 tags SEO y guía PDF. |
| `tests/server.test.ts` | `src/server/app.ts` | 16 | Servidor HTTP REST nativo; CORS universal, streaming JSON seguro y endpoints de API. |
| `tests/viewer.test.ts` | `src/server/public/viewer.js` | 22 | Visor Vectorial 2D; transformaciones matemáticas (Zoom, Pan, Fit View), capas XS-3XL y cuadrícula A4. |
| `tests/e2e.test.ts` | `src/pipeline.ts` | 11 | Pipeline End-to-End generando físicamente todos los entregables en disco. |
| **TOTAL** | **13 suites** | **369** | **100% PASS (0 errores)** |

---

## 2. Pruebas de Diagnóstico y Conectividad Externa (Fase 4)

### Test de Aislamiento de Fireworks AI
Para verificar que la clave `FIREWORKS_API_KEY` en `.env` y el modelo `accounts/fireworks/models/qwen3p7-plus` responden correctamente de forma aislada:
```powershell
node scripts/test_fireworks_call.js
```
**Resultado esperado:**
- Lee `.env` localmente.
- Realiza una llamada HTTP de prueba.
- Imprime: Status 200 OK, Latencia (ms), y respuesta estructurada de la IA (o código y mensaje de error exacto en caso de fallo).

---

## 3. Guía de Pruebas Manuales y de Experiencia de Usuario

### Test 1: Inicio en 1 Clic con el Launcher `.bat`
1. Haz doble clic en `start_web_studio.bat`.
2. **Resultado esperado:** Recompila `src/` automáticamente, sincroniza assets a `dist/server/public/` y abre `http://127.0.0.1:3030`.
- **Estado:** ✅ [VERIFICADO OK]

### Test 2: Subida y Análisis de Imagen de Prenda
1. En el Web Studio, arrastra un archivo PNG/JPG de un boceto o prenda al área de "Imagen de Referencia".
2. Selecciona proveedor `api (Fireworks AI • Qwen 3.7 Plus / Direct API)`.
3. Haz clic en "⚡ Generar Patrón Paramétrico".
4. **Resultado esperado:**
   - La terminal muestra los logs transparentes del proceso.
   - El visor 2D se actualiza con el patrón generado a escala real.
   - Las pestañas "Ficha Técnica" y "Metadatos Etsy" se cargan de inmediato.

---

## 4. Verificaciones Físicas Indispensables (Stop Conditions)

| Código | Descripción de la Prueba | Criterio de Aceptación | Estado |
| :--- | :--- | :--- | :---: |
| **H-01** | Impresión física de Página 1 a escala 100% (Sin ajustar a página). | Medición con regla métrica del recuadro exterior: exactamente $10.0\text{ cm} \times 10.0\text{ cm}$ ($100\text{ mm} \times 100\text{ mm}$). | ✅ [VERIFICADO OK] |
| **H-02** | Continuidad de ensamble de hojas A4/Letter. | Las líneas de corte y curvas Bézier entre páginas contiguas (`A1` con `A2`, etc.) empalman sin escalones ni desfases. | ✅ [VERIFICADO OK] |
| **H-03** | Verificación visual de patrón generado por imagen en Visor 2D. | Las proporciones de sisa, escote y largos coinciden con el boceto subido. | 🟡 [PENDIENTE DE PRUEBA EN VIVO T-20] |

---

## 5. Resumen de Estado del Sistema

- **Versión del Motor:** `pattern-ai-core v0.1.0`
- **Ambiente:** Node.js v24+ (ESM) / Windows 11 (PowerShell / CMD)
- **Veredicto Global de Auditoría:** **APTO (Fases 1.0, 2.0 y 3.0 Archivadas | Fase 4.0 Activa)**
