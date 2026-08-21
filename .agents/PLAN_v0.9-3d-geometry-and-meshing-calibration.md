# PLAN v0.9 - Fase 9: Calibración Geométrica 3D, Despiece y Triangulación Homogénea

Status: draft (pending approval)
Goal: Corregir las 4 anomalías geométricas y visuales del motor 3D observadas en Web Studio: (1) eliminar la singularidad de triangulación en abanico en triangulator.ts, (2) transformar la tira de fuelle 2D en volumen 3D integrado del bolsillo y espejar en corte x2, (3) subdividir cilíndricamente los cuellos para curvatura continua en 3D, y (4) alinear las líneas de guía de ensamble y el orden de capas Z.
Assurance: Lean

## Matriz de Tareas y Asignación de Roles

| Tarea | Descripción | Rol Principal | Rol Secundario | Puerta Determinista | Estado |
|---|---|---|---|---|:---:|
| **T-35** | Corrección de Ear-Clipping en `triangulator.ts`: eliminación del fallback a abanico en curvas densas | Ingeniero | Obrero | `npm test` | ⚪ PENDING |
| **T-36** | Reestructuración 3D de Bolsillos Cargo (`cargo_pocket_body`, `cargo_pocket_bellows`, `cargo_pocket_flap`) y espejado x2 | Ingeniero | Obrero | `npm test` | ⚪ PENDING |
| **T-37** | Subdivisión Cilíndrica de Cuellos (`stand_collar`, `collar_stand`, `collar_fall`) en `blender_bridge.ts` | Ingeniero | Obrero | `npm test` | ⚪ PENDING |
| **T-38** | Calibración de Líneas de Guía de Ensamble y Orden de Capas Z en `viewer3d.js` | Ingeniero | Obrero | `npm run build && npm test` | ⚪ PENDING |

---

## Especificación Técnica de Tareas

### `[T-35]` Ear-Clipping Robusto en Curvas Bézier (`triangulator.ts`)
- **Problema:** En polígonos cóncavos con muchos vértices muestreados (escotes V, sisas, dobladillos con pico), los puntos colineales en bordes causan falsos positivos en `isPointInTriangle`, haciendo que `isEar` falle y active el Fallback 2 (abanico desde el vértice 0).
- **Acción:**
  1. Ajustar `isPointInTriangle` para excluir puntos del perímetro exterior y manejar tolerancia de bordes.
  2. Implementar particionado convexo o corte de menor ángulo antes de recurrir a abanicos.
  3. Validar con tests unitarios en `tests/triangulator.test.ts`.

### `[T-36]` Proyección 3D de Bolsillos con Fuelle y Espejado Simétrico (`blender_bridge.ts`)
- **Problema:** `cargo_pocket_bellows` es una tira plana de 460mm x 50mm proyectada horizontalmente en el eje X, atravesando el torso.
- **Acción:**
  1. Separar el manejo de `cargo_pocket_bellows` en 3D: posicionar como paredes perimetrales del bolsillo (extrusión hacia el torso) en vez de tira plana desenrollada.
  2. Posicionar `cargo_pocket_flap` en la parte superior con leve inclinación frontal.
  3. Si `part.cutCount === 2` o la prenda lo requiere, espejar el conjunto del bolsillo en el lado izquierdo del torso.

### `[T-37]` Subdivisión Cilíndrica de Cuellos 3D (`blender_bridge.ts`)
- **Problema:** Los cuellos solo tienen 6 puntos de esquina en 2D, lo que genera triángulos gigantescos que cruzan el centro del cuello.
- **Acción:**
  1. Interpolar la tira del cuello en $N = 16\text{--}24$ segmentos cilíndricos a lo largo de su longitud ($u \in [0, 1]$).
  2. Mapear cada segmento con su ángulo correspondiente $\phi(u)$ y radio de cuello $R \approx 9\text{--}10\text{ cm}$.

### `[T-38]` Guías de Ensamble y Orden de Capas Z (`viewer3d.js`)
- **Problema:** Líneas de ensamble cruzadas en diagonal y distancias Z de vistas interiores (`front_facing`) inconsistentes.
- **Acción:**
  1. Actualizar `updateSeamGuideLines()` en `viewer3d.js` para anclar a las coordenadas reales de hombros y costados de cada panel.
  2. Ajustar `explodeOffset` para vistas interiores y capas de refuerzo.
