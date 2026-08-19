# TESTING — Matriz de Pruebas y Verificación (`pattern-ai-core`)

Guía completa de pruebas automatizadas, semi-automatizadas y verificación humana/funcional para las Fases 1.0, 2.0 y 3.0.

---

## 1. Suite de Pruebas Automatizadas (375/375 PASS — 13 Suites Vitest)

Para ejecutar la suite completa de pruebas deterministas:
```powershell
npm test
```

### Desglose por Capa y Módulo

| Suite de Test | Módulo / Archivo | Tests | Qué valida |
| :--- | :--- | :---: | :--- |
| `tests/schema.test.ts` | `src/schema/pattern_schema.ts` | 41 | Contratos Zod para ADN paramétrico, límites antropométricos, sub-prendas, telas y árboles de modificación. |
| `tests/ai_provider.test.ts` | `src/ai/` | 28 | AI Provider Factory, `AgyCliProvider`, `OpenCodeCliProvider`, `DirectApiProvider` y `MockAiProvider`. |
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
| **TOTAL** | **13 suites** | **375** | **100% PASS (0 errores)** |

---

## 2. Guía de Pruebas Manuales y de Experiencia de Usuario (Paso a Paso)

### Test 1: Inicio en 1 Clic con el Launcher `.bat`
1. Haz doble clic en el archivo `start_web_studio.bat` en la raíz del proyecto.
2. **Resultado esperado:**
   - La ventana de consola CMD se abre con encabezado azul/celeste.
   - Detecta Node.js y compila si es necesario.
   - Abre automáticamente el navegador en `http://127.0.0.1:3030`.

---

### Test 2: Visor Vectorial 2D Interactivo (Web Studio)
1. Con el Web Studio abierto en `http://127.0.0.1:3030`, selecciona el preset **"Straw Pirate Full Set"** en el panel izquierdo y haz clic en **"Generar Patrón Paramétrico"**.
2. **Pruebas en el visor:**
   - **Zoom:** Usa la rueda del ratón hacia adelante/atrás (el zoom debe centrarse en el cursor).
   - **Pan:** Haz clic izquierdo sostenido y arrastra para mover el lienzo.
   - **Selector de Capas:** Activa y desactiva las tallas `XS`, `M`, `3XL` con los botones de la barra superior para ver el escalado gradual.
   - **Cuadrícula A4:** Activa el botón "Cuadrícula A4" para ver las páginas numeradas (`A1`, `A2`, `B1`...) sobrepuestas en el patrón.
   - **Calibración 10x10 cm:** Pasa el cursor o haz clic en "Verificar 10x10cm" para inspeccionar el recuadro de prueba.

---

### Test 3: Personalización Antropométrica por Medidas a Medida
1. En el panel izquierdo del Web Studio, modifica los sliders:
   - **Contorno de Pecho:** Sube a `1060 mm`.
   - **Contorno de Cintura:** Ajusta a `880 mm`.
   - **Contorno de Cadera:** Ajusta a `1020 mm`.
2. Haz clic en **"Generar Patrón Paramétrico"**.
3. **Resultado esperado:**
   - El visor 2D se actualiza en tiempo real reflejando las nuevas proporciones del cliente.
   - En la pestaña **"Ficha Técnica"**, aparece la sección *"1.1 PERSONALIZACIÓN ANTROPOMÉTRICA"* comparando las medidas del cliente contra la talla base.

---

### Test 4: Descarga 1-Clic de Entregables Comerciales
1. En el panel derecho/inferior del Web Studio, prueba los botones de descarga directa:
   - `[PDF A4 Paginado]`: Descarga el archivo multi-página listo para imprimir en casa.
   - `[PDF US Letter]`: Descarga el formato para impresoras estándar americanas.
   - `[PDF Plotter A0]`: Descarga el plano continuo para copistería.
   - `[SVG Vectorial]`: Descarga el vector continuo para software CAD/Illustrator.
   - `[Ficha Técnica PDF]`: Descarga el PDF estilizado con consumo de telas y ensamble.
   - `[🛍️ Paquete Comercial Etsy (.ZIP)]`: Descarga el archivo `.zip` completo estructurado.
2. Abre el `.zip` descargado y verifica que contenga las 6 subcarpetas con la guía `README_Etsy_Printing_Instructions.pdf`.

---

### Test 5: Generación por CLI (Línea de Comandos)
Prueba la generación de un conjunto completo desde PowerShell:
```powershell
node dist/index.js generate "straw_pirate_full_set" -b "two_piece_set" -p mock --bundle
```
**Resultado esperado:**
Genera los 11 archivos en `output/straw_pirate_full_set/`, incluyendo el ZIP de Etsy y `straw_pirate_full_set_etsy_listing_metadata.json` con 13 tags SEO.

---

## 3. Verificaciones Físicas Indispensables (Stop Conditions)

| Código | Descripción de la Prueba | Criterio de Aceptación | Estado |
| :--- | :--- | :--- | :---: |
| **H-01** | Impresión física de Página 1 a escala 100% (Sin ajustar a página). | Medición con regla métrica del recuadro exterior: exactamente $10.0\text{ cm} \times 10.0\text{ cm}$ ($100\text{ mm} \times 100\text{ mm}$). | ✅ [VERIFICADO OK] |
| **H-02** | Continuidad de ensamble de hojas A4/Letter. | Las líneas de corte y curvas Bézier entre páginas contiguas (`A1` con `A2`, etc.) empalman sin escalones ni desfases. | ✅ [VERIFICADO OK] |

---

## 4. Resumen de Estado del Sistema

- **Versión del Motor:** `pattern-ai-core v0.1.0`
- **Ambiente:** Node.js v24+ (ESM) / Windows 11 (PowerShell / CMD)
- **Veredicto Global de Auditoría:** **APTO (Fases 1.0, 2.0 y 3.0 Completadas y Verificadas al 100%)**
