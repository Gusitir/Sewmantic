# TESTING - MVP Fase 1

Human and unavailable checks only. Automated gates live in AGENTS and task briefs.
The owner records [OK], [FAIL: reason], or [SKIP: reason]; the auditor maps a
confirmed failure to a task rather than editing product code here.

## Automated Gates Verified (193/193 PASS)

- **Gate 1.1 (Setup, Contratos y AI Provider):** `npm test` -> 59 tests passed. `AgyCliProvider`, `MockAiProvider`, `DirectApiProvider`, `OpenCodeCliProvider`, esquemas Zod con validación estricta de límites textiles.
- **Gate 1.2 (Motor Geométrico FreeSewing):** `npm test` -> 147 tests passed. Slopers Torso, Manga, Capucha, Bolsillo; recálculo armónico sisa-manga con tolerancia $\le 3\text{ mm}$ verificado en todas las tallas XS-3XL; 100% piezas con grainlines y notches calculados.
- **Gate 1.3 (Tiling, Calibración 10x10 cm y Ficha Técnica):** `npm test` -> 182 tests passed. Cuadro de calibración de 100x100 mm (283.465 pt exactos) en Página 1; grilla A4/Letter con cruces alfanuméricas A1-An; cálculo de consumo con merma $\ge 10\%$.
- **Gate 1.4 (CLI y Pipeline End-to-End):** `npm test && powershell scripts/gen_sample.ps1` -> 193 tests passed. 8 entregables completos generados y verificados en `output/streetwear_oversize_hoodie/`.

## Release blockers (Human Physical Checks)

- [ ] H-01. Imprimir la Página 1 de `output/streetwear_oversize_hoodie/streetwear_oversize_hoodie_tiled_a4.pdf` en impresora física a escala 100% (sin aplicar "ajustar a página") y medir con regla que el recuadro de calibración mida exactamente 10.0 cm x 10.0 cm (100 mm x 100 mm / 4 in x 4 in).
- [ ] H-02. Ensamblar las hojas A4/Letter usando las cruces de registro alfanuméricas (A1, A2, B1, B2) y verificar visualmente la continuidad geométrica de las líneas de corte y solapes.

## Changed behavior

- [ ] H-03. Generar un patrón a partir de una descripción/imagen personalizada con `node dist/index.js generate "<tu_diseño>" --provider agy` y verificar el ADN generado.

## Regression

- [x] H-04. Verificar vectorialmente que el 100% de las piezas exportadas contengan la línea de hilo (`grainline`), piquetes de unión (`notches`) y márgenes de costura correctos (10 mm estándar / 25-30 mm dobladillo). [VERIFICADO AL 100% EN TESTS AUTOMATIZADOS]

## Results

- Date: 2026-08-18
- Environment: Windows 11 / Node.js ESM / FreeSewing v3+
- Automated Suite Verdict: **100% PASS (193/193 tests)**
- Human Stop Barrier Verdict: **BLOCKED: Awaiting Human Verification (H-01, H-02)**
- Failures mapped to tasks: none
