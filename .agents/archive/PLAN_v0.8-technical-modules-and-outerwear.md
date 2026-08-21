# PLAN v0.8 - Fase 8: Módulos de Cuellos Técnicos, Bolsillos Cargo con Fuelle y Blueprint Utility Vest

Status: completed
Goal: Extender la librería modular paramétrica con cuellos técnicos (alzado/chimenea stand_collar y camisero con tirilla), bolsillos cargo con fuelle 3D y solapa (cargo_bellows_pocket), y el blueprint ancla Outerwear / Utility Vest para prendas tácticas, safari y chaquetas.
Assurance: Lean

## Matriz de Tareas y Asignación de Roles

| Tarea | Descripción | Rol Principal | Rol Secundario | Puerta Determinista | Estado |
|---|---|---|---|---|:---:|
| **T-33** | Módulos de Cuellos Técnicos: Cuello Alzado/Chimenea y Cuello Camisero | Ingeniero | Obrero | `npm run build && npm test` | ✅ DONE |
| **T-34** | Bolsillos Cargo 3D con Fuelle, Solapas y Blueprint Utility Vest | Ingeniero | Obrero | `npm run build && npm test` | ✅ DONE |

---

## Detalle de Tareas

### T-33 - Módulos de Cuellos Técnicos (Cuello Alzado/Chimenea y Cuello Camisero con Tirilla)

- Status: in_progress
- Depends on: T-32
- Scope: `src/types/pattern.ts`, `src/schema/pattern_schema.ts`, `src/engine/modifier.ts`, `src/engine/blender_bridge.ts`, `tests/collars.test.ts`
- Rol: Ingeniero / Obrero
- Acceptance:
  - [ ] Añadir `'stand_collar'` y `'shirt_collar_with_stand'` a los tipos y esquemas de `neckline` / `collar`.
  - [ ] Implementar la pieza de patrón paramétrico `collar` / `stand_collar` en `modifier.ts`:
    - Longitud de tira coincidente con el perímetro total del escote delantero + espalda ($L_{\text{collar}} = L_{\text{front\_neck}} + L_{\text{back\_neck}}$).
    - Altura configurable (ej. 35-50 mm) con curvatura anatómica para ceñirse a la nuca y piquete de hombro.
    - Piquetes de centro espalda y hombro, `cutCount: 2` (exterior e interior) y entretela.
  - [ ] Proyección 3D de la tira de cuello en `blender_bridge.ts`.
  - [ ] Suite de pruebas unitarias en `tests/collars.test.ts`.
- Gates: `npm run build && npm test`
- Human checks: none

---

### T-34 - Bolsillos Cargo 3D con Fuelle, Solapas y Blueprint Utility Vest / Outerwear

- Status: pending
- Depends on: T-33
- Scope: `src/types/pattern.ts`, `src/schema/pattern_schema.ts`, `src/engine/modifier.ts`, `src/ai/prompt_builder.ts`, `src/server/public/index.html`, `src/server/public/app.js`, `tests/cargo_pockets.test.ts`
- Rol: Ingeniero / Obrero
- Acceptance:
  - [ ] Soporte para `pockets` tipo `'cargo_bellows'` y array de bolsillos múltiples en `PatternDna`.
  - [ ] Generación de las 3 piezas de moldería del bolsillo cargo:
    - `cargo_pocket_body` (Cuerpo rectangular del bolsillo).
    - `cargo_pocket_bellows` (Tira de fuelle perimetral en U para dar volumen 3D).
    - `cargo_pocket_flap` (Solapa con punta o rectangular para cierre de broches).
  - [ ] Blueprint ancla `utility_vest` / `outerwear` en `PromptBuilder` y Web Studio (torso recto `brian`, bajo recto `straight`, sisa limpia `sleeveless`, cuello chimenea `stand_collar` y bolsillos cargo).
  - [ ] Suite de pruebas unitarias en `tests/cargo_pockets.test.ts`.
- Gates: `npm run build && npm test`
- Human checks: `H-03` (Verificación visual del chaleco táctico generado en el Web Studio).
