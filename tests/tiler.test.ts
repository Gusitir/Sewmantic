/**
 * tests/tiler.test.ts
 * Suite de pruebas exhaustivas para Motor de Tiling (A4/Letter), Cruces de Registro,
 * Cuadro de Calibración 10x10 cm y Exportador Vectorial PDF/SVG
 * pattern-ai-core
 */

import { describe, it, expect } from 'vitest';
import PDFDocument from 'pdfkit';
import {
  // Calibración
  MM_TO_PT,
  PT_TO_MM,
  INCH_TO_PT,
  INCH_TO_MM,
  CALIBRATION_BOX_MM,
  CALIBRATION_BOX_PT,
  FOUR_INCHES_MM,
  FOUR_INCHES_PT,
  mmToPt,
  ptToMm,
  getCalibrationBoxMetrics,
  renderCalibrationBoxSvg,
  drawCalibrationBoxPdf,
  // Tiler
  PAGE_FORMATS,
  DEFAULT_MARGIN_MM,
  DEFAULT_MARGIN_PT,
  getRowLabel,
  getPaperDimensions,
  calculateTileGrid,
  drawSheetRegistrationMarks,
  drawAssemblyMapPdf,
  renderAssemblyMapSvg,
  // Exporter
  layoutPatternParts,
  exportContinuousSvg,
  exportContinuousPdf,
  exportTiledPdf,
  exportMultiSizeTiledPdf,
  pdfDocToBuffer,
  // Modelos e integración
  PatternDna,
  modifyPattern,
  modifyPatternMultiSize,
} from '../src/index.js';

describe('Cuadro de Calibración e Invariante Textil 100 mm x 100 mm & 4" x 4"', () => {
  it('cumple con exactitud matemática estricta la conversión mm a pt (72/25.4)', () => {
    expect(MM_TO_PT).toBeCloseTo(2.834645669, 6);
    expect(PT_TO_MM).toBeCloseTo(0.352777778, 6);

    // 100 mm = 283.4645669 pt -> ~283.465 pt
    expect(CALIBRATION_BOX_MM).toBe(100);
    expect(CALIBRATION_BOX_PT).toBeCloseTo(283.4645669, 4);
    expect(Math.round(CALIBRATION_BOX_PT * 1000) / 1000).toBe(283.465);

    // 4 inches = 288 pt = 101.6 mm
    expect(FOUR_INCHES_PT).toBe(288);
    expect(FOUR_INCHES_MM).toBe(101.6);
    expect(INCH_TO_PT).toBe(72);
    expect(INCH_TO_MM).toBe(25.4);
  });

  it('convierte bidireccionalmente entre mm y pt sin pérdida de precisión', () => {
    expect(mmToPt(100)).toBeCloseTo(283.4645669, 4);
    expect(ptToMm(283.46456692913387)).toBeCloseTo(100, 6);

    expect(mmToPt(10)).toBeCloseTo(28.3465, 3);
    expect(ptToMm(72)).toBeCloseTo(25.4, 6);
  });

  it('retorna métricas completas y consistentes con getCalibrationBoxMetrics', () => {
    const metrics = getCalibrationBoxMetrics();
    expect(metrics.mm).toBe(100);
    expect(metrics.pt_rounded).toBe(283.465);
    expect(metrics.four_inches_pt).toBe(288);
    expect(metrics.four_inches_mm).toBe(101.6);
  });

  it('renderiza código SVG válido con aviso destacado de escala 100% y submolduras', () => {
    const svgSnippet = renderCalibrationBoxSvg({ x: 10, y: 10, unit: 'mm' });
    expect(svgSnippet).toContain('<g id="calibration-box-10x10">');
    expect(svgSnippet).toContain('CUADRO DE CALIBRACIÓN');
    expect(svgSnippet).toContain('100 mm x 100 mm');
    expect(svgSnippet).toContain('100% SCALE - DO NOT SCALE');
    expect(svgSnippet).toContain('4" x 4" (101.6 mm / 288 pt)');
    expect(svgSnippet).toContain('stroke="#dc2626"'); // Cruz de registro roja
  });

  it('renderiza SVG standalone completo con cabecera XML y viewBox adecuado', () => {
    const standaloneSvg = renderCalibrationBoxSvg({ standalone: true, unit: 'pt' });
    expect(standaloneSvg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(standaloneSvg).toContain('<svg id="calibration-box-10x10"');
    expect(standaloneSvg).toContain('viewBox=');
    expect(standaloneSvg).toContain('</svg>');
  });

  it('dibuja directamente en PDFKit sin arrojar excepciones y genera buffer binario', async () => {
    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    const bufferPromise = pdfDocToBuffer(doc);

    drawCalibrationBoxPdf(doc, 50, 50, {
      showWarning: true,
      showSubdivisions: true,
      showCenterCross: true,
      showFourInchFrame: true,
    });

    doc.end();
    const pdfBuffer = await bufferPromise;
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('Motor de Tiling (A4 / US Letter) y Grilla Alfanumérica', () => {
  it('valida las dimensiones estándar de papel A4 y Letter', () => {
    const a4 = getPaperDimensions('A4');
    expect(a4.width_mm).toBe(210);
    expect(a4.height_mm).toBe(297);
    expect(a4.width_pt).toBeCloseTo(595.28, 1);
    expect(a4.height_pt).toBeCloseTo(841.89, 1);

    const letter = getPaperDimensions('letter');
    expect(letter.width_mm).toBe(215.9);
    expect(letter.height_mm).toBe(279.4);
    expect(letter.width_pt).toBe(612);
    expect(letter.height_pt).toBe(792);
  });

  it('convierte índices de fila a nomenclatura alfanumérica estándar (A, B... Z, AA...)', () => {
    expect(getRowLabel(0)).toBe('A');
    expect(getRowLabel(1)).toBe('B');
    expect(getRowLabel(2)).toBe('C');
    expect(getRowLabel(25)).toBe('Z');
    expect(getRowLabel(26)).toBe('AA');
    expect(getRowLabel(27)).toBe('AB');
  });

  it('calcula área útil imprimible neta con margen de 10 mm', () => {
    const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    const gridA4 = calculateTileGrid(bounds, { format: 'A4', margin_mm: 10 });
    expect(gridA4.margin_mm).toBe(10);
    expect(gridA4.printable_mm.width).toBe(190); // 210 - 20
    expect(gridA4.printable_mm.height).toBe(277); // 297 - 20

    const gridLetter = calculateTileGrid(bounds, { format: 'letter', margin_mm: 10 });
    expect(gridLetter.printable_mm.width).toBe(195.9); // 215.9 - 20
    expect(gridLetter.printable_mm.height).toBe(259.4); // 279.4 - 20
  });

  it('calcula grilla 1x1 para patrones pequeños que caben en una hoja', () => {
    const bounds = { minX: 0, minY: 0, maxX: 150, maxY: 200, width: 150, height: 200 };
    const grid = calculateTileGrid(bounds, { format: 'A4', margin_mm: 10 });

    expect(grid.cols).toBe(1);
    expect(grid.rows).toBe(1);
    expect(grid.totalTiles).toBe(1);
    expect(grid.totalPages).toBe(2); // Pág 1 = Portada, Pág 2 = Hoja A1
    expect(grid.tiles[0].id).toBe('A1');
    expect(grid.tiles[0].pageNumber).toBe(2);
    expect(grid.tiles[0].neighbors.top).toBeUndefined();
    expect(grid.tiles[0].neighbors.bottom).toBeUndefined();
    expect(grid.tiles[0].neighbors.left).toBeUndefined();
    expect(grid.tiles[0].neighbors.right).toBeUndefined();
  });

  it('calcula grilla 3x3 para patrón de 500x700 mm en A4 sin huecos y con vecinos', () => {
    const bounds = { minX: 0, minY: 0, maxX: 500, maxY: 700, width: 500, height: 700 };
    const grid = calculateTileGrid(bounds, { format: 'A4', margin_mm: 10 });

    // 500 / 190 = 2.63 -> 3 cols
    // 700 / 277 = 2.53 -> 3 rows
    expect(grid.cols).toBe(3);
    expect(grid.rows).toBe(3);
    expect(grid.totalTiles).toBe(9);
    expect(grid.totalPages).toBe(10); // 1 portada + 9 hojas

    // Verificar IDs de hojas generadas: A1, A2, A3, B1, B2, B3, C1, C2, C3
    const ids = grid.tiles.map((t) => t.id);
    expect(ids).toEqual(['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']);

    // Verificar vecinos de la hoja central B2
    const b2 = grid.tiles.find((t) => t.id === 'B2');
    expect(b2).toBeDefined();
    expect(b2?.neighbors.top).toBe('A2');
    expect(b2?.neighbors.bottom).toBe('C2');
    expect(b2?.neighbors.left).toBe('B1');
    expect(b2?.neighbors.right).toBe('B3');

    // Verificar contigüidad espacial de viewBox (sin huecos)
    const a1 = grid.tiles.find((t) => t.id === 'A1')!;
    const a2 = grid.tiles.find((t) => t.id === 'A2')!;
    expect(a2.viewBox_mm.minX).toBe(a1.viewBox_mm.maxX);
  });

  it('calcula grilla adecuada en formato US Letter', () => {
    const bounds = { minX: 0, minY: 0, maxX: 500, maxY: 700, width: 500, height: 700 };
    const grid = calculateTileGrid(bounds, { format: 'letter', margin_mm: 10 });

    // 500 / 195.9 = 2.55 -> 3 cols
    // 700 / 259.4 = 2.70 -> 3 rows
    expect(grid.cols).toBe(3);
    expect(grid.rows).toBe(3);
    expect(grid.totalTiles).toBe(9);
    expect(grid.format).toBe('letter');
  });

  it('renderiza mapa de ensamble en SVG y PDF sin errores', async () => {
    const bounds = { minX: 0, minY: 0, maxX: 400, maxY: 400, width: 400, height: 400 };
    const grid = calculateTileGrid(bounds, { format: 'A4' });

    // SVG
    const svgMap = renderAssemblyMapSvg(grid);
    expect(svgMap).toContain('<svg');
    expect(svgMap).toContain('MAPA DE ENSAMBLE');
    expect(svgMap).toContain('A1');

    // PDF
    const doc = new PDFDocument({ size: 'A4' });
    const bufferPromise = pdfDocToBuffer(doc);
    drawAssemblyMapPdf(doc, grid, 20, 20, 300, 200);
    doc.end();
    const buf = await bufferPromise;
    expect(buf.length).toBeGreaterThan(200);
  });
});

describe('Layout y Distribución de Piezas (Nesting Lineal)', () => {
  it('distribuye múltiples piezas sin superposición y calcula bounding box global', () => {
    const mockFront = {
      name: 'front',
      label: 'Delantero',
      cutCount: 1,
      onFold: true,
      points: {},
      pathD: 'M 0 0 L 200 0 L 200 600 L 0 600 Z',
      outline: [],
      bounds: { minX: 0, minY: 0, maxX: 200, maxY: 600, width: 200, height: 600 },
      width_mm: 200,
      height_mm: 600,
      area_mm2: 120000,
      grainline: { start: { x: 100, y: 100 }, end: { x: 100, y: 500 }, label: 'HILO' },
      notches: [],
    };

    const mockBack = {
      name: 'back',
      label: 'Espalda',
      cutCount: 1,
      onFold: true,
      points: {},
      pathD: 'M 0 0 L 200 0 L 200 620 L 0 620 Z',
      outline: [],
      bounds: { minX: 0, minY: 0, maxX: 200, maxY: 620, width: 200, height: 620 },
      width_mm: 200,
      height_mm: 620,
      area_mm2: 124000,
      grainline: { start: { x: 100, y: 100 }, end: { x: 100, y: 500 }, label: 'HILO' },
      notches: [],
    };

    const layout = layoutPatternParts({ front: mockFront, back: mockBack }, 30, 800);
    expect(layout.pieces).toHaveLength(2);
    expect(layout.pieces[0].offsetX_mm).toBe(0);
    // Segunda pieza ubicada a la derecha con gap de 30mm: 200 + 30 = 230mm
    expect(layout.pieces[1].offsetX_mm).toBe(230);
    expect(layout.totalBounds_mm.width).toBe(430); // 200 + 30 + 200
  });
});

describe('Exportador de Patrones Vectoriales (SVG, PDF A0 y PDF Tiled A4/Letter)', () => {
  const sampleDna: PatternDna = {
    concept_name: 'Cyberpunk Streetwear Hoodie',
    base_block: 'hoodie_sloper',
    ease: {
      chest_ease_mm: 160,
      bicep_ease_mm: 60,
      shoulder_ease_mm: 30,
    },
    sizing: {
      size: 'M',
    },
    tech_specs: {
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
      estimated_fabric_meters: 1.8,
      notions: ['Cordón 120cm', 'Ojalillos metálicos x2', 'Rib 1x1'],
    },
    modifications: {
      neckline: { type: 'hood' },
      sleeves: { type: 'oversized', length_type: 'full' },
      hem: { type: 'ribbed' },
      pocket: { type: 'kangaroo' },
      hood: { type: 'standard' },
    },
  };

  const modifiedPattern = modifyPattern(sampleDna, 'M');

  it('exporta SVG continuo con grupos semánticos por pieza y cuadro de calibración', () => {
    const svg = exportContinuousSvg(modifiedPattern, {
      includeCalibrationBox: true,
      includeGrainlines: true,
      includeNotches: true,
      includeLabels: true,
    });

    expect(typeof svg).toBe('string');
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('id="calibration-box"');
    expect(svg).toContain('id="part-front"');
    expect(svg).toContain('id="part-back"');
    expect(svg).toContain('class="grainline"');
    expect(svg).toContain('class="outline-cut"');
    expect(svg).toContain('</svg>');
  });

  it('exporta PDF continuo (A0 / Roll 900) con ficha técnica y cuadro de calibración', async () => {
    const pdfBuffer = await exportContinuousPdf(modifiedPattern, {
      paperFormat: 'custom',
      includeCalibrationBox: true,
      includeFichaTecnica: true,
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('exporta PDF paginado multipágina en A4 con Página 1 (Calibración) y Páginas de Grilla (A1..)', async () => {
    const pdfBuffer = await exportTiledPdf(modifiedPattern, {
      format: 'A4',
      margin_mm: 10,
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(2000);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('exporta PDF paginado multipágina en formato US Letter', async () => {
    const pdfBuffer = await exportTiledPdf(modifiedPattern, {
      format: 'letter',
      margin_mm: 10,
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(2000);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('soporta exportación multi-talla con exportMultiSizeTiledPdf', async () => {
    const multiSizes = modifyPatternMultiSize(sampleDna, ['S', 'M', 'L']);
    const pdfBuffer = await exportMultiSizeTiledPdf(multiSizes, { format: 'A4' });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(2000);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
