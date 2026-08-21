# CONTEXT - Crónica de Decisiones y Estado (`pattern-ai-core`)

```yaml
version: 1.0.0
compacted_at: 2026-08-20T18:05:00-05:00
archive_snapshot: .agents/archive/CONTEXT_pre_compact_snapshot.md
assurance: Lean
active_model: accounts/fireworks/models/qwen3p8-max (Fireworks AI Direct API)
suites_passing: 17/17 (468/468 tests PASS)
```

---

## 1. Arquitectura Inmutable y Verdad Técnica Actual

- **Motor Geométrico Paramétrico:** Node.js (TypeScript) con FreeSewing Core v3. Genera slopers base de torso (masculino/femenino), mangas, capuchas, pantalones/bermudas, faldas (recta/evasé/plisada), vestidos y kimonos/haoris con mangas *Furisode*.
- **Invariantes Textiles:** Coincidencia de sisa-manga ($< 3\text{ mm}$), entrepierna de pantalón ($\Delta \le 0.05\text{ mm}$), costuras de costado de corpiño ($\Delta \le 0.01\text{ mm}$), cuadro de calibración de $10\text{ cm} \times 10\text{ cm}$ en Página 1 de PDFs paginados.
- **Inferencia IA:** `DirectApiProvider` nativo conectando a Fireworks AI (`https://api.fireworks.ai/inference/v1/chat/completions`) con **Qwen 3.8 Max** (`accounts/fireworks/models/qwen3p8-max`). Inferencia multimodal nativa de 1 solo paso con payload `image_url` y parámetros `max_tokens: 4000`, `top_k: 40`, `presence_penalty: 0`, `frequency_penalty: 0`.
- **Plataforma Web Studio:** Servidor HTTP REST nativo (`node:http`) en puerto 3030 con Visor 2D interactivo (zoom centrado, pan, capas XS-3XL, cuadrícula A4) y **Visor 3D WebGL** interactivo con Three.js, rotación 360°, iluminación de estudio y materiales PBR textiles.
- **Canal Comercial Etsy:** Empaquetador automatizado `.zip` estructurado en **7 carpetas comerciales** (`01_Print_At_Home_A4`, `02_Print_At_Home_US_Letter`, `03_Copy_Shop_Plotter_A0`, `04_Vector_Layers_SVG`, `05_Sewing_Guide_And_TechPack`, `06_Dna_Parameters`, `07_3D_Interactive_Model`) y metadatos SEO con exactamente 13 tags.

---

## 2. Hitos y Fases Completadas (Trazabilidad de Commits)

### 📌 Fase 1.0: MVP Core Geometry & Tiling (`T-01` a `T-08`)
- **Objetivo:** Slopers base de FreeSewing v3, validador Zod de ADN paramétrico, exportador SVG continuo, motor de tiling A4/Letter con cruces de corte y cuadro de calibración 10x10 cm en Pág 1, Ficha técnica industrial (PDF/MD/JSON).
- **Evidencia & Veredicto:** 193 tests PASS. Commits `50fbdf3` a `2e7a0a0`. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.1-mvp.md`.

### 📌 Fase 2.0: Pantalones, Medidas a Medida & Etsy ZIP (`T-09` a `T-12`)
- **Objetivo:** Slopers paramétricos de pantalón/bermuda con aplomo y entrepierna igualada ($\Delta \le 0.05\text{ mm}$), motor de interpolación de medidas exactas del cliente con clamping anatómico, y empaquetador comercial `.zip` para Etsy con 13 tags SEO.
- **Evidencia & Veredicto:** 309 tests PASS. Commits `faaa7b8` a `32f05a9`. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.2-features.md`.

### 📌 Fase 3.0: Web Studio 2D & Conjuntos de 2 Piezas (`T-13` a `T-16`)
- **Objetivo:** Servidor HTTP REST nativo modular con CORS, Visor Vectorial 2D interactivo (zoom, pan, capas XS-3XL y cuadrícula A4), y generador de conjuntos coordinados de 2 piezas (Luffy Pirate Set: chaleco lino + bermuda denim).
- **Evidencia & Veredicto:** 375 tests PASS. Commits `563f4dc` a `bcb7fae`. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.3-web-ui.md`.

### 📌 Fase 4.0: Fireworks AI Multimodal (Qwen 3.8 Max) & Diagnóstico (`T-17` a `T-20`)
- **Objetivo:** Inferencia multimodal directa con Fireworks AI, eliminación de dependencias CLI bash obsoletas, script de diagnóstico (`scripts/test_fireworks_call.js`), logging transparente en consola del servidor, manejo de errores detallados (`error.details`), Drag & Drop con canvas resizing y generación a partir de imágenes de referencia (`scripts/test_fireworks_e2e_image.js`).
- **Evidencia & Veredicto:** 373 tests PASS, generación E2E en 15s generando los 11 entregables en disco. Commits `ed85ce8` a `2942d9d`. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.4-fireworks-multimodal.md`.

### 📌 Fase 5.0: Slopers Femeninos, Cosplay & Visor 3D WebGL (`T-21` a `T-24`)
- **Objetivo:**
  - `T-21` (Commit `b7b420a`): Sloper femenino con pinzas de busto al apex (`womenswear_bodice.ts`) y falda (`skirt.ts`).
  - `T-22` (Commit `a0c2ed4`): Modificador de vestidos coordinados, kimonos/haoris con mangas *Furisode*, faldas con pretina y presets oficiales (`anime_water_goddess_dress`, `demon_slayer_haori_kimono`).
  - `T-23` (Commit `176f724`): Generador binario nativo glTF 2.0 (`.glb`) con curvatura anatómica 3D, normales suaves, UVs y materiales PBR textiles, con soporte headless de Blender (`scripts/export_glb_headless.py`).
  - `T-24` (Commit `a0410d7`): Pestaña 'Visor 3D Interactivo' en Web Studio con Three.js 360°, streaming REST `/api/patterns/:concept/glb`, y ampliación del paquete Etsy a 7 carpetas comerciales con modelos `.glb`.
- **Evidencia & Veredicto:** 468 tests PASS across 17 suites. Veredicto **APTO**. Plan archivado en `archive/PLAN_v0.5-womenswear-and-3d-blender.md`.

### 📌 Fase 6.0: Triangulación 2D-a-3D Exacta y Siluetas Reales en Motor 3D (`T-25` a `T-28`)
- **Objetivo:** Implementación del motor de triangulación 2D por corte de orejas (*Ear Clipping*), proyector anatómico envolvente 3D para polígonos complejos (escotes en V, huecos de sisa, dobladillos en pico, mangas Furisode y piernas de pantalón), ensamblado multi-pieza y visualización fotorrealista fiel a la moldería 2D en el Web Studio.
- `T-25` (Commit `b315f5b`): Motor de triangulación `triangulator.ts` con Ear-Clipping CCW, validación de área analítica ($< 0.1\%$) y 25 tests unitarios. Veredicto **APTO**.
- **Estado:** Activo (`PLAN_v0.6-true-to-pattern-3d-meshing.md`). Tarea activa: `T-26`.

---

## 3. Matriz de Paradas Humanas (Stop Conditions)

| Código | Descripción de la Prueba | Criterio de Aceptación | Estado |
| :--- | :--- | :--- | :---: |
| **H-01** | Impresión física de Página 1 a escala 100%. | Medición con regla: exactamente $10.0\text{ cm} \times 10.0\text{ cm}$. | ✅ [VERIFICADO OK] |
| **H-02** | Continuidad de ensamble de hojas A4/Letter. | Líneas de corte continuas con PDFStitcher sin saltos ni escalones. | ✅ [VERIFICADO OK] |
| **H-03** | Verificación visual de patrones 2D y 3D en Web Studio. | Inspección interactiva del visor 2D y rotación 360° del visor 3D WebGL. | 🟡 [LISTO PARA PROBAR POR EL USUARIO] |


