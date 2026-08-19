# PLAN v0.2 - Fase 2: Slopers de Pantalon, Medidas a Medida y Empaquetador Etsy

Status: active
Goal: Expandir el motor de patronaje con slopers de pantalones/shorts, personalizacion por medidas antropometricas individuales y generacion de paquetes comerciales automatizados (.zip) listos para Etsy.
Assurance: Lean

## Matriz de Tareas y Asignacion de Roles

| Tarea | Descripcion | Rol Principal | Rol Secundario | Puerta Determinista |
|---|---|---|---|---|
| **T-09** | Sloper Base de Pantalon / Shorts Parametrico (Delantero y Espalda) | Ingeniero | Obrero | `npm test` |
| **T-10** | Integracion de Pantalones/Bermudas en Modifier Engine y ADN | Ingeniero | Obrero | `npm test` |
| **T-11** | Motor de Personalizacion Antropometrica por Medidas Exactas | Ingeniero | Obrero | `npm test` |
| **T-12** | Empaquetador Comercial Automatizado para Etsy (ZIP Bundler & Assets) | Obrero | Ingeniero (Audit) | `npm test` |

---

## Detalle de Tareas

### T-09 - Sloper Base de Pantalon / Shorts Parametrico (Delantero y Espalda)

- Status: done
- Depends on: T-04, T-05
- Scope: `src/engine/base_blocks/trousers.ts`, `src/engine/base_blocks/index.ts`, `tests/trousers.test.ts`
- Rol: Ingeniero (Calculo geometrico de curvas de tiro y entrepierna).
- Acceptance:
  - [x] Generador de bloques de pantalon/bermuda con delantero (`front_leg`) y espalda (`back_leg`).
  - [x] Curvas de tiro anatomicas: tiro delantero mas corto y vertical; tiro de espalda mas inclinado y profundo con prolongacion de entrepierna segun contorno de cadera.
  - [x] Puntos de anclaje parametricos: `waist_center`, `waist_side`, `hip_side`, `crotch_point`, `knee_side`, `knee_inseam`, `hem_side`, `hem_inseam`.
  - [x] Soporte para tiro alto, medio y bajo; largo de pantalon completo, pescador/capri y bermuda/short.
  - [x] Piquetes de coincidencia en rodilla y entrepierna; grainlines verticales paralelos a la linea de aplomo / centro de pierna.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Proporcion incorrecta del tiro de espalda causando tirantez al sentarse.
- STOP when: El tiro no cierre el poligono o la longitud de entrepierna delantera difiera en $> 3\text{ mm}$ de la trasera.

---

### T-10 - Integracion de Pantalones/Bermudas en Modifier Engine y ADN

- Status: done
- Depends on: T-09
- Scope: `src/engine/modifier.ts`, `src/types/pattern.ts`, `src/schema/pattern_schema.ts`, `tests/modifier.test.ts`
- Rol: Ingeniero (Logica de transformaciones y holguras).
- Acceptance:
  - [x] Soporte para modificaciones de pantalon: bolsillos laterales (in-seam y parche/cargo), pretina elastica / rib / cordon, dobladillos con vuelta o deshilachados.
  - [x] Adaptacion de holguras de cadera, muslo y botamanga segun silueta (slim, straight, baggy, pirate shorts).
  - [x] Suite de pruebas con generacion de pantalon completo y bermudas en todas las tallas XS-3XL.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Conflicto con piezas de torso en patrones de conjunto (set 2 piezas).
- STOP when: `modifyPattern` no pueda resolver prendas inferiores o conjuntos de 2 piezas.

---

### T-11 - Motor de Personalizacion Antropometrica por Medidas Exactas

- Status: done
- Depends on: T-10
- Scope: `src/engine/base_blocks/measurements.ts`, `src/pipeline.ts`, `src/index.ts`, `tests/custom_measurements.test.ts`
- Rol: Ingeniero (Interpolacion y escalado biometrico).
- Acceptance:
  - [x] Parametro CLI `--measurements <json_o_string>` para admitir medidas personalizadas del cliente (ej: `chest: 1020, waist: 880, hip: 1040, height: 1820`).
  - [x] Algoritmo de graduacion anatomica continua (interpolacion no lineal entre tablas antropometricas).
  - [x] Ficha tecnica reflejando las medidas individuales del cliente versus medidas estandar.
- Gates: `npm test`
- Human checks: none
- Risk triggers: Clamping insuficiente permitiendo proporciones anatomicas distorsionadas.
- STOP when: Medidas extremas rompan la topologia de los slopers.

---

### T-12 - Empaquetador Comercial Automatizado para Etsy (ZIP Bundler & Assets)

- Status: done
- Depends on: T-11
- Scope: `src/engine/etsy_bundler.ts`, `src/pipeline.ts`, `src/index.ts`, `tests/bundler.test.ts`
- Rol: Obrero (Empaquetado de archivos y estructura de carpetas) / Ingeniero (Auditoria).
- Acceptance:
  - [x] Subcomando `pattern bundle <concept>` o flag `--bundle` que genere automaticamente un archivo `.zip` organizado para compradores de Etsy:
    - `01_Print_At_Home_A4/`
    - `02_Print_At_Home_US_Letter/`
    - `03_Copy_Shop_Plotter_A0/`
    - `04_Vector_Layers_SVG/`
    - `05_Sewing_Guide_And_TechPack/`
    - `README_Etsy_Printing_Instructions.pdf`
  - [x] Generacion de archivo `etsy_listing_metadata.json` con titulo SEO optimizado, etiquetas sugeridas (13 tags de Etsy) y descripcion en ingles lista para copiar y pegar.
- Gates: `npm test && node dist/index.js bundle`
- Human checks: H-05
- Risk triggers: Corrupcion de archivos comprimidos o rutas rotas.
- STOP when: El archivo ZIP no contenga todos los formatos o falle la descompresion.

---

## Closure gate

- [x] Todas las tareas (`T-09` a `T-12`) con veredicto APTO.
- [x] Pruebas automatizadas pasando al 100% en Vitest (309/309 tests).
- [x] Muestra completa de prendas y conjuntos empaquetada en ZIP comercial para Etsy (`straw_pirate_adventurer_vest_etsy_bundle.zip` y `streetwear_oversize_hoodie_etsy_bundle.zip`).
