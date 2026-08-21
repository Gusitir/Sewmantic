# PLAN v0.6 - Fase 6: Triangulación 2D-a-3D Exacta y Siluetas Reales en el Motor 3D (.glb)

Status: active
Goal: Transformar el generador 3D para que convierta los polígonos y contornos vectoriales 2D reales de FreeSewing v3 (escotes en V, huecos de sisa, dobladillos en pico, mangas cuadradas Furisode y piernas de pantalón) en mallas 3D anatómicas drapeadas con triangulación exacta y costuras conectadas.
Assurance: Lean

## Matriz de Tareas y Asignación de Roles

| Tarea | Descripción | Rol Principal | Rol Secundario | Puerta Determinista | Estado |
|---|---|---|---|---|:---:|
| **T-25** | Motor de Triangulación 2D de Polígonos de Moldería (*Ear Clipping Triangulator*) | Ingeniero | Obrero | `npm test` | ✅ DONE |
| **T-26** | Proyector Anatómico 3D y Deformación Envolvente de Paneles Textiles | Ingeniero | Obrero | `npm test` | ✅ DONE |
| **T-27** | Ensamblado de Paneles Multi-Pieza y Costuras 3D en Buffer glTF 2.0 | Ingeniero | Obrero | `node scripts/test_blender_export.js` | 🟡 READY |
| **T-28** | Verificación Visual E2E en Web Studio y Auditoría de Fase 6.0 | Arquitecto | Ingeniero | `npm test && node dist/index.js` | ⚪ QUEUED |

---

## Detalle de Tareas

### T-25 - Motor de Triangulación 2D de Polígonos de Moldería (*Ear Clipping Triangulator*)

- Status: done
- Depends on: T-24
- Scope: `src/engine/triangulator.ts`, `tests/triangulator.test.ts`
- Rol: Ingeniero (Geometría computacional y triangulación de polígonos cóncavos con agujeros/pinzas).
- Acceptance:
  - [x] Implementar un algoritmo determinista de triangulación por corte de orejas (*Ear Clipping*) optimizado para contornos textiles 2D (`outline: Point2D[]`).
  - [x] Soportar polígonos cóncavos complejos (escotes profundos en V, dobladillos con puntas múltiples, sisas curvas).
  - [x] Evitar auto-intersecciones y garantizar índices de caras normales con orientación coherente (front-facing CCW).
  - [x] Suite de pruebas unitarias en `tests/triangulator.test.ts` validando área total triangulada $\approx$ área del polígono 2D ($\Delta < 0.1\%$).
- Gates: `npm test`
- Human checks: none
- Risk triggers: Polígonos colineales o vértices duplicados que bloqueen el ear clipping.
- STOP when: El área triangulada difiera en $> 0.5\%$ respecto al área analítica 2D.

---

### T-26 - Proyector Anatómico 3D y Deformación Envolvente de Paneles Textiles

- Status: done
- Depends on: T-25
- Scope: `src/engine/blender_bridge.ts`, `tests/blender.test.ts`
- Rol: Ingeniero (Gráficos 3D y proyección espacial de piezas).
- Acceptance:
  - [x] Proyectar las coordenadas 2D $(x, y)$ de cada pieza en un espacio 3D $(x, y, z)$ anatómico envolvente:
    - Pieza Delantera: curvatura cóncava frontal ($z > 0$, con máxima profundidad en el esternón/pecho y cierre hacia los costados).
    - Pieza Espalda: curvatura dorsal envolvente ($z < 0$, cerrando los costados con el delantero).
    - Mangas / Mangas Furisode: tubo 3D o panel lateral doblado que conecta con la sisa.
    - Piernas de Pantalón: cilindros cónicos que siguen la entrepierna y costados.
    - Faldas: cono evasé envolvente.
  - [x] Cálculo analítico de normales de vértice suaves (smooth vertex normals) para sombreado PBR realista sin faceteado plano.
  - [x] Mapeo UV paramétrico proporcional a las dimensiones métricas reales en milímetros.
- Gates: `npm test`
- Human checks: none

---

### T-27 - Ensamblado de Paneles Multi-Pieza y Costuras 3D en Buffer glTF 2.0

- Status: ready
- Depends on: T-26
- Scope: `src/engine/blender_bridge.ts`, `src/pipeline.ts`, `scripts/test_blender_export.js`
- Rol: Ingeniero / Obrero (Pipeline de empaquetado binario glTF).
- Acceptance:
  - [ ] Unificar todas las piezas de la prenda (delantero, espalda, mangas, cuello, bolsillos) en una sola escena glTF con jerarquía de nodos o malla única con costuras cerradas.
  - [ ] Asegurar que el tamaño del `.glb` se mantenga optimizado para WebGL ($< 300\text{ KB}$).
  - [ ] Actualizar script `scripts/test_blender_export.js` verificando siluetas reales para chaleco pirata, kimono Furisode y bermuda.
- Gates: `node scripts/test_blender_export.js`
- Human checks: none

---

### T-28 - Verificación Visual E2E en Web Studio y Auditoría de Fase 6.0

- Status: queued
- Depends on: T-27
- Scope: `src/server/public/viewer3d.js`, `src/server/public/app.js`, `output/`
- Rol: Arquitecto (Lead / Auditor General).
- Acceptance:
  - [ ] Generación end-to-end de prendas desde Web Studio mostrando en el Visor 3D la silueta idéntica al 2D (escote V real, huecos de sisa, bajo en pico).
  - [ ] Suite completa de tests deterministas pasando al 100%.
  - [ ] Emisión de Veredicto APTO y commit de cierre de fase `[STATE] close phase 6.0`.
- Gates: `npm test && node dist/index.js`
- Human checks: Inspección visual interactiva en el Web Studio.

---

## Closure gate

- [ ] Motor de triangulación de polígonos 2D verificado al 100%.
- [ ] Modelos 3D `.glb` reflejando con exactitud los cortes, escotes y dobladillos de la moldería 2D.
- [ ] Visor 3D WebGL renderizando las siluetas reales sin simplificación cilíndrica.
- [ ] Veredicto APTO emitido por el Arquitecto.
