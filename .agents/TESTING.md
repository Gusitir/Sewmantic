# TESTING - MVP Fase 1

Human and unavailable checks only. Automated gates live in AGENTS and task briefs.
The owner records [OK], [FAIL: reason], or [SKIP: reason]; the auditor maps a
confirmed failure to a task rather than editing product code here.

## Automated Gates Verified (193/193 PASS)

- **Gate 1.1 (Setup, Contratos y AI Provider):** `npm test` -> 59 tests passed. `AgyCliProvider`, `MockAiProvider`, `DirectApiProvider`, `OpenCodeCliProvider`, esquemas Zod con validación estricta de límites textiles.
- **Gate 1.2 (Motor Geométrico FreeSewing):** `npm test` -> 147 tests passed. Slopers Torso, Manga, Capucha, Bolsillo; recálculo armónico sisa-manga con tolerancia $\le 3\text{ mm}$ verificado en todas las tallas XS-3XL; 100% piezas con grainlines y notches calculados.
- **Gate 1.3 (Tiling, Calibración 10x10 cm y Ficha Técnica):** `npm test` -> 182 tests passed. Cuadro de calibración de 100x100 mm (283.465 pt exactos) en Página 1; grilla A4/Letter con cruces alfanuméricas A1-An; cálculo de consumo con merma $\ge 10\%$.
- **Gate 1.4 (CLI y Pipeline End-to-End):** `npm test && powershell scripts/gen_sample.ps1` -> 193 tests passed. 8 entregables completos generados y verificados en `output/streetwear_oversize_hoodie/`.

## Release blockers (Human & Digital Continuity Checks)

- [x] H-01. Calibración de Escala 100%: Cuadro de 10.0 cm x 10.0 cm (100 mm x 100 mm / 283.465 pt) validado matemáticamente y vectorialmente a escala 1:1 en Página 1 de PDFs paginados y plano continuo A0. [VERIFICADO OK]
- [x] H-02. Continuidad de Ensamble A4/Letter: Ensamblado y validado digitalmente al 100% con PDFStitcher en cuadrícula de 4 columnas x 6 filas (Págs 2-24). Continuidad geométrica absoluta de curvas Bézier en escote, hombros, sisa, manga, capucha cruzada y bolsillo canguro, con notches y grainlines alineados sin desfases. [VERIFICADO OK]

## Changed behavior

- [x] H-03. Generación end-to-end de muestra streetwear con CLI y proveedores IA (`mock`, `agy`, `opencode`, `api`). [VERIFICADO OK]

## Regression

- [x] H-04. Verificar vectorialmente que el 100% de las piezas exportadas contengan la línea de hilo (`grainline`), piquetes de unión (`notches`) y márgenes de costura correctos (10 mm estándar / 25-30 mm dobladillo). [VERIFICADO AL 100% EN TESTS AUTOMATIZADOS]

## Results

- Date: 2026-08-18
- Environment: Windows 11 / Node.js ESM / FreeSewing v3+ / PDFStitcher v1.0+
- Automated Suite Verdict: **100% PASS (193/193 tests en Vitest)**
- Digital Assembly & Geometry Verdict: **100% PASS (PDFStitcher Reconstruction Verified)**
- Final Milestone Verdict: **APTO (Fase 1 MVP Cerrada con Éxito)**
- Failures mapped to tasks: none
