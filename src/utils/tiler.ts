/**
 * src/utils/tiler.ts
 * Motor de Tiling (A4 / US Letter), Cruces de Registro y Segmentación Multipágina
 * pattern-ai-core
 *
 * Divide moldería textil continua en hojas individuales A4 o US Letter a escala 100% exacta
 * con cruces de registro alfanuméricas (A1..Zn), líneas de corte y mapa de ensamble.
 */

import type PDFKit from 'pdfkit';
import { BoundingBox } from '../engine/geometry.js';
import { MM_TO_PT, PT_TO_MM, mmToPt } from '../engine/calibration_box.js';

export type PaperFormat = 'A4' | 'letter' | 'a4' | 'Letter' | 'A0' | 'a0';

export interface PaperDimensions {
  format: 'A4' | 'letter' | 'A0';
  name: string;
  width_mm: number;
  height_mm: number;
  width_pt: number;
  height_pt: number;
}

/**
 * Dimensiones canónicas de papeles estándar de impresión
 */
export const PAGE_FORMATS: Record<'A4' | 'letter' | 'A0', PaperDimensions> = {
  A4: {
    format: 'A4',
    name: 'ISO A4 (210 x 297 mm)',
    width_mm: 210,
    height_mm: 297,
    width_pt: 210 * MM_TO_PT, // 595.27559 pt ≈ 595.28 pt
    height_pt: 297 * MM_TO_PT, // 841.88976 pt ≈ 841.89 pt
  },
  letter: {
    format: 'letter',
    name: 'US Letter (8.5 x 11 in / 215.9 x 279.4 mm)',
    width_mm: 215.9,
    height_mm: 279.4,
    width_pt: 8.5 * 72, // 612.0 pt
    height_pt: 11 * 72, // 792.0 pt
  },
  A0: {
    format: 'A0',
    name: 'ISO A0 (841 x 1189 mm)',
    width_mm: 841,
    height_mm: 1189,
    width_pt: 841 * MM_TO_PT, // 2383.937 pt ≈ 2383.94 pt
    height_pt: 1189 * MM_TO_PT, // 3370.394 pt ≈ 3370.39 pt
  },
};

/**
 * Margen de impresión seguro estándar (10 mm = 28.3465 pt)
 */
export const DEFAULT_MARGIN_MM = 10;
export const DEFAULT_MARGIN_PT = DEFAULT_MARGIN_MM * MM_TO_PT;

export interface TileGridConfig {
  format?: PaperFormat;
  margin_mm?: number;
  padding_mm?: number;
}

export interface TileSheetNeighbors {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

export interface TileSheetInfo {
  id: string; // e.g. "A1", "A2", "B1"
  row: number; // 0-indexed
  col: number; // 0-indexed
  rowLabel: string; // "A", "B", "C"...
  colLabel: string; // "1", "2", "3"...
  tileIndex: number; // 0, 1, 2, ...
  pageNumber: number; // 2, 3, 4... (la portada con resumen y calibración es la pág 1)
  viewBox_mm: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  viewBox_pt: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  printableArea_pt: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  neighbors: TileSheetNeighbors;
}

export interface TileGridResult {
  format: 'A4' | 'letter';
  paper: PaperDimensions;
  margin_mm: number;
  margin_pt: number;
  printable_mm: { width: number; height: number };
  printable_pt: { width: number; height: number };
  cols: number;
  rows: number;
  totalTiles: number;
  totalPages: number; // totalTiles + 1 (Pág 1 = Portada técnica y calibración)
  tiles: TileSheetInfo[];
  patternBounds_mm: BoundingBox;
  patternBounds_pt: BoundingBox;
}

/**
 * Convierte un índice de fila (0-based) a nomenclatura alfanumérica estándar (A, B... Z, AA, AB...)
 */
export function getRowLabel(rowIndex: number): string {
  let label = '';
  let index = rowIndex;
  while (index >= 0) {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  }
  return label;
}

/**
 * Obtiene las dimensiones estándar del formato de papel
 */
export function getPaperDimensions(format: PaperFormat | string = 'A4'): PaperDimensions {
  const norm = format.toLowerCase();
  if (norm === 'letter' || norm === 'us_letter' || norm === 'usletter') {
    return PAGE_FORMATS.letter;
  }
  if (norm === 'a0') {
    return PAGE_FORMATS.A0;
  }
  return PAGE_FORMATS.A4;
}

/**
 * Calcula la grilla de tiling multipágina (A4 / Letter) para un bounding box de moldería
 *
 * @param patternBounds Caja delimitadora del patrón en milímetros (mm)
 * @param config Configuración de formato y márgenes
 */
export function calculateTileGrid(
  patternBounds: BoundingBox,
  config: TileGridConfig = {}
): TileGridResult {
  const paper = getPaperDimensions(config.format ?? 'A4');
  const normalizedFormat: 'A4' | 'letter' = paper.format === 'letter' ? 'letter' : 'A4';
  const margin_mm = config.margin_mm ?? DEFAULT_MARGIN_MM;
  const margin_pt = margin_mm * MM_TO_PT;

  const printable_width_mm = paper.width_mm - 2 * margin_mm;
  const printable_height_mm = paper.height_mm - 2 * margin_mm;

  const printable_width_pt = paper.width_pt - 2 * margin_pt;
  const printable_height_pt = paper.height_pt - 2 * margin_pt;

  const patternW_mm = Math.max(1, patternBounds.width);
  const patternH_mm = Math.max(1, patternBounds.height);

  const cols = Math.max(1, Math.ceil(patternW_mm / printable_width_mm));
  const rows = Math.max(1, Math.ceil(patternH_mm / printable_height_mm));
  const totalTiles = rows * cols;
  const totalPages = totalTiles + 1; // Página 1 = portada + calibración

  const tiles: TileSheetInfo[] = [];

  for (let r = 0; r < rows; r++) {
    const rowLabel = getRowLabel(r);
    for (let c = 0; c < cols; c++) {
      const colLabel = `${c + 1}`;
      const id = `${rowLabel}${colLabel}`;
      const tileIndex = r * cols + c;
      const pageNumber = tileIndex + 2; // Inicia en la página 2

      const minX_mm = patternBounds.minX + c * printable_width_mm;
      const minY_mm = patternBounds.minY + r * printable_height_mm;
      const maxX_mm = minX_mm + printable_width_mm;
      const maxY_mm = minY_mm + printable_height_mm;

      const minX_pt = minX_mm * MM_TO_PT;
      const minY_pt = minY_mm * MM_TO_PT;
      const maxX_pt = maxX_mm * MM_TO_PT;
      const maxY_pt = maxY_mm * MM_TO_PT;

      const neighbors: TileSheetNeighbors = {};
      if (r > 0) neighbors.top = `${getRowLabel(r - 1)}${colLabel}`;
      if (r < rows - 1) neighbors.bottom = `${getRowLabel(r + 1)}${colLabel}`;
      if (c > 0) neighbors.left = `${rowLabel}${c}`;
      if (c < cols - 1) neighbors.right = `${rowLabel}${c + 2}`;

      tiles.push({
        id,
        row: r,
        col: c,
        rowLabel,
        colLabel,
        tileIndex,
        pageNumber,
        viewBox_mm: {
          minX: minX_mm,
          minY: minY_mm,
          maxX: maxX_mm,
          maxY: maxY_mm,
          width: printable_width_mm,
          height: printable_height_mm,
        },
        viewBox_pt: {
          minX: minX_pt,
          minY: minY_pt,
          maxX: maxX_pt,
          maxY: maxY_pt,
          width: printable_width_pt,
          height: printable_height_pt,
        },
        printableArea_pt: {
          x: margin_pt,
          y: margin_pt,
          width: printable_width_pt,
          height: printable_height_pt,
        },
        neighbors,
      });
    }
  }

  const patternBounds_pt: BoundingBox = {
    minX: patternBounds.minX * MM_TO_PT,
    minY: patternBounds.minY * MM_TO_PT,
    maxX: patternBounds.maxX * MM_TO_PT,
    maxY: patternBounds.maxY * MM_TO_PT,
    width: patternBounds.width * MM_TO_PT,
    height: patternBounds.height * MM_TO_PT,
  };

  return {
    format: normalizedFormat,
    paper,
    margin_mm,
    margin_pt,
    printable_mm: { width: printable_width_mm, height: printable_height_mm },
    printable_pt: { width: printable_width_pt, height: printable_height_pt },
    cols,
    rows,
    totalTiles,
    totalPages,
    tiles,
    patternBounds_mm: patternBounds,
    patternBounds_pt,
  };
}

export interface SheetMarksOptions {
  patternName?: string;
  sizeName?: string;
}

/**
 * Dibuja las cruces de registro, bordes de corte punteados, indicadores de solape
 * y encabezados de página en una hoja de corte individual
 */
export function drawSheetRegistrationMarks(
  doc: PDFKit.PDFDocument,
  tile: TileSheetInfo,
  grid: TileGridResult,
  options: SheetMarksOptions = {}
): void {
  const { patternName = 'Pattern AI', sizeName = 'M' } = options;
  const { margin_pt, printable_pt, paper } = grid;
  const { x, y, width: w, height: h } = tile.printableArea_pt;

  doc.save();

  // 1. Líneas de corte perimetrales punteadas (recuadro del área imprimible)
  doc.lineWidth(0.5);
  doc.dash(4, { space: 3 });
  doc.rect(x, y, w, h).stroke('#9ca3af');
  doc.undash();

  // 2. Cruces de registro en las 4 esquinas del área imprimible
  const crossArm = 12; // pt
  const circleR = 3; // pt
  const corners = [
    { cx: x, cy: y, label: `${tile.id}-TL`, alignX: 4, alignY: 4 },
    { cx: x + w, cy: y, label: `${tile.id}-TR`, alignX: -22, alignY: 4 },
    { cx: x, cy: y + h, label: `${tile.id}-BL`, alignX: 4, alignY: -10 },
    { cx: x + w, cy: y + h, label: `${tile.id}-BR`, alignX: -22, alignY: -10 },
  ];

  for (const corner of corners) {
    doc.save();
    doc.lineWidth(0.6);
    doc.strokeColor('#dc2626');

    // Cruz
    doc
      .moveTo(corner.cx - crossArm, corner.cy)
      .lineTo(corner.cx + crossArm, corner.cy)
      .stroke();
    doc
      .moveTo(corner.cx, corner.cy - crossArm)
      .lineTo(corner.cx, corner.cy + crossArm)
      .stroke();

    // Círculos de alineación
    doc.circle(corner.cx, corner.cy, circleR).stroke();
    doc.circle(corner.cx, corner.cy, 1).fill('#dc2626');

    // Etiqueta alfanumérica de esquina
    doc
      .fontSize(5)
      .font('Helvetica-Bold')
      .fillColor('#dc2626')
      .text(corner.label, corner.cx + corner.alignX, corner.cy + corner.alignY, {
        width: 25,
      });
    doc.restore();
  }

  // 3. Indicadores de unión direccional con hojas vecinas (solapes)
  doc.save();
  doc.fontSize(6).font('Helvetica-Bold').fillColor('#4b5563');

  // Borde superior
  if (tile.neighbors.top) {
    doc.text(`▲ UNIR CON [${tile.neighbors.top}] (ARRIBA)`, x, y - 8, {
      width: w,
      align: 'center',
    });
  }

  // Borde inferior
  if (tile.neighbors.bottom) {
    doc.text(`▼ UNIR CON [${tile.neighbors.bottom}] (ABAJO)`, x, y + h + 2, {
      width: w,
      align: 'center',
    });
  }

  // Borde izquierdo
  if (tile.neighbors.left) {
    doc.save();
    doc.rotate(-90, { origin: [x - 4, y + h / 2] });
    doc.text(`◄ UNIR CON [${tile.neighbors.left}]`, x - 40, y + h / 2 - 3, {
      width: 80,
      align: 'center',
    });
    doc.restore();
  }

  // Borde derecho
  if (tile.neighbors.right) {
    doc.save();
    doc.rotate(90, { origin: [x + w + 4, y + h / 2] });
    doc.text(`UNIR CON [${tile.neighbors.right}] ►`, x + w - 40, y + h / 2 - 3, {
      width: 80,
      align: 'center',
    });
    doc.restore();
  }
  doc.restore();

  // 4. Encabezado técnico superior de la hoja
  doc.save();
  const headerY = Math.max(3, margin_pt - 18);
  doc
    .fontSize(7)
    .font('Helvetica-Bold')
    .fillColor('#111827')
    .text(`${patternName} — Talla: ${sizeName}`, margin_pt, headerY, {
      continued: true,
      width: printable_pt.width,
    });

  doc
    .font('Helvetica-Bold')
    .fillColor('#2563eb')
    .text(`  |  HOJA [ ${tile.id} ]  `, { continued: true });

  doc
    .font('Helvetica')
    .fillColor('#6b7280')
    .text(
      `(Fila ${tile.rowLabel}, Col ${tile.colLabel} de ${grid.rows}x${grid.cols}) — Pág ${tile.pageNumber} de ${grid.totalPages}`,
      { align: 'right' }
    );
  doc.restore();

  // 5. Pie de página inferior de la hoja
  doc.save();
  const footerY = paper.height_pt - Math.max(8, margin_pt - 4);
  doc
    .fontSize(5.5)
    .font('Helvetica')
    .fillColor('#9ca3af')
    .text(
      `Escala 100% (1:1) — 1 mm = 2.835 pt | NO ESCALAR AL IMPRIMIR (Imprimir a tamaño real) | pattern-ai-core`,
      margin_pt,
      footerY,
      { width: printable_pt.width, align: 'center' }
    );
  doc.restore();

  // 6. Tijeras / Marcador de corte en esquinas
  doc.save();
  doc
    .fontSize(6)
    .fillColor('#9ca3af')
    .text('✂ Cortar', x + 5, y + 2);
  doc.restore();

  doc.restore();
}

/**
 * Dibuja el Mapa General de Ensamble (Assembly Overview) en un área específica de la portada PDF
 */
export function drawAssemblyMapPdf(
  doc: PDFKit.PDFDocument,
  grid: TileGridResult,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const { cols, rows, tiles } = grid;
  const padding = 4;
  const availW = width - 2 * padding;
  const availH = height - 2 * padding;

  const cellW = Math.min(availW / cols, 60);
  const cellH = Math.min(availH / rows, 45);

  const gridTotalW = cellW * cols;
  const gridTotalH = cellH * rows;
  const startX = x + (width - gridTotalW) / 2;
  const startY = y + (height - gridTotalH) / 2;

  doc.save();

  // Marco contenedor del mapa de ensamble
  doc.lineWidth(0.5);
  doc.rect(x, y, width, height).fillAndStroke('#f9fafb', '#e5e7eb');

  doc
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .fillColor('#111827')
    .text('MAPA GENERAL DE ENSAMBLE / ASSEMBLY MAP', x, y + 6, {
      width,
      align: 'center',
    });

  doc
    .fontSize(6)
    .font('Helvetica')
    .fillColor('#6b7280')
    .text(`Grilla de ${rows} Filas x ${cols} Columnas (${grid.totalTiles} hojas de patrón)`, x, y + 16, {
      width,
      align: 'center',
    });

  // Dibujar cada celda de la grilla
  for (const tile of tiles) {
    const cellX = startX + tile.col * cellW;
    const cellY = startY + tile.row * cellH;

    // Celda
    doc
      .rect(cellX + 1, cellY + 1, cellW - 2, cellH - 2)
      .fillAndStroke('#ffffff', '#2563eb');

    // Identificador de hoja (e.g. "A1")
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(tile.id, cellX, cellY + (cellH * 0.2), {
        width: cellW,
        align: 'center',
      });

    // Número de página (e.g. "Pág 2")
    doc
      .fontSize(5.5)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(`Pág ${tile.pageNumber}`, cellX, cellY + (cellH * 0.6), {
        width: cellW,
        align: 'center',
      });
  }

  doc.restore();
}

/**
 * Renderiza el Mapa General de Ensamble como SVG
 */
export function renderAssemblyMapSvg(grid: TileGridResult): string {
  const { cols, rows, tiles } = grid;
  const cellW = 50;
  const cellH = 40;
  const svgW = cols * cellW + 20;
  const svgH = rows * cellH + 30;

  let cellsSvg = '';
  for (const tile of tiles) {
    const cx = 10 + tile.col * cellW;
    const cy = 20 + tile.row * cellH;

    cellsSvg += `  <rect x="${cx + 2}" y="${cy + 2}" width="${cellW - 4}" height="${cellH - 4}" fill="#ffffff" stroke="#2563eb" stroke-width="1" rx="2" />\n`;
    cellsSvg += `  <text x="${cx + cellW / 2}" y="${cy + cellH * 0.45}" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#1e40af">${tile.id}</text>\n`;
    cellsSvg += `  <text x="${cx + cellW / 2}" y="${cy + cellH * 0.75}" font-size="8" font-family="sans-serif" text-anchor="middle" fill="#6b7280">Pág ${tile.pageNumber}</text>\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}px" height="${svgH}px">
  <text x="${svgW / 2}" y="14" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#111827">MAPA DE ENSAMBLE (${rows}x${cols})</text>
${cellsSvg}
</svg>`;
}
