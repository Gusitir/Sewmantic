/**
 * src/engine/exporter.ts
 * Motor de Exportación Vectorial Textil (SVG Continuo, PDF A0 Plotter y PDF Tiled A4/Letter)
 * pattern-ai-core
 *
 * Exporta moldería textil completa con fidelidad vectorial 100%, recuadro de calibración 10x10 cm,
 * ficha técnica de confección, cruces de registro y segmentación multipágina.
 */

import PDFDocument from 'pdfkit';
import { StandardSize, PatternDna, TechSpecs } from '../types/pattern.js';
import { BoundingBox, PatternPart, Point2D, combineBounds } from './geometry.js';
import { ModifiedPatternResult } from './modifier.js';
import {
  CALIBRATION_BOX_MM,
  CALIBRATION_BOX_PT,
  MM_TO_PT,
  PT_TO_MM,
  mmToPt,
  ptToMm,
  renderCalibrationBoxSvg,
  drawCalibrationBoxPdf,
} from './calibration_box.js';
import {
  PaperFormat,
  PaperDimensions,
  PAGE_FORMATS,
  TileGridResult,
  TileSheetInfo,
  calculateTileGrid,
  drawSheetRegistrationMarks,
  drawAssemblyMapPdf,
  renderAssemblyMapSvg,
} from '../utils/tiler.js';

/**
 * Convierte un flujo de PDFKit a Buffer binario en memoria
 */
export function pdfDocToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', (err) => {
      reject(err);
    });
  });
}

export interface ArrangedPiece {
  name: string;
  part: PatternPart;
  offsetX_mm: number;
  offsetY_mm: number;
  bounds_mm: BoundingBox;
}

export interface ArrangedPatternLayout {
  pieces: ArrangedPiece[];
  totalBounds_mm: BoundingBox;
  totalBounds_pt: BoundingBox;
}

/**
 * Organiza y distribuye las piezas de moldería sobre el lienzo (Nesting lineal / en cuadrícula)
 * asegurando que no se superpongan y dejando un espacio de separación (gap_mm)
 *
 * @param parts Diccionario de piezas de moldería
 * @param gap_mm Separación entre piezas en milímetros (default 30mm)
 * @param maxRowWidth_mm Ancho máximo antes de iniciar una nueva fila (default 850mm para rollos de 900mm)
 */
export function layoutPatternParts(
  parts: Record<string, PatternPart>,
  gap_mm = 30,
  maxRowWidth_mm = 850
): ArrangedPatternLayout {
  const pieces: ArrangedPiece[] = [];
  let currentX = 0;
  let currentY = 0;
  let rowMaxH = 0;

  const partEntries = Object.entries(parts);

  for (const [name, part] of partEntries) {
    const pW = Math.max(10, part.bounds.width);
    const pH = Math.max(10, part.bounds.height);

    // Salto de fila si excede el ancho máximo
    if (currentX + pW > maxRowWidth_mm && currentX > 0) {
      currentX = 0;
      currentY += rowMaxH + gap_mm;
      rowMaxH = 0;
    }

    const offsetX = currentX - part.bounds.minX;
    const offsetY = currentY - part.bounds.minY;

    const pieceBounds: BoundingBox = {
      minX: currentX,
      minY: currentY,
      maxX: currentX + pW,
      maxY: currentY + pH,
      width: pW,
      height: pH,
    };

    pieces.push({
      name,
      part,
      offsetX_mm: offsetX,
      offsetY_mm: offsetY,
      bounds_mm: pieceBounds,
    });

    currentX += pW + gap_mm;
    rowMaxH = Math.max(rowMaxH, pH);
  }

  const allBounds = pieces.map((p) => p.bounds_mm);
  const totalBounds_mm = combineBounds(allBounds);

  const totalBounds_pt: BoundingBox = {
    minX: totalBounds_mm.minX * MM_TO_PT,
    minY: totalBounds_mm.minY * MM_TO_PT,
    maxX: totalBounds_mm.maxX * MM_TO_PT,
    maxY: totalBounds_mm.maxY * MM_TO_PT,
    width: totalBounds_mm.width * MM_TO_PT,
    height: totalBounds_mm.height * MM_TO_PT,
  };

  return {
    pieces,
    totalBounds_mm,
    totalBounds_pt,
  };
}

/**
 * Estilos de línea por talla para exportación multi-capa
 */
export const SIZE_LAYER_STYLES: Record<
  StandardSize,
  { stroke: string; strokeWidth: number; dashArray?: string; pdfDash?: [number, number] }
> = {
  XS: { stroke: '#9333ea', strokeWidth: 1.2, dashArray: '4,4', pdfDash: [4, 4] },
  S: { stroke: '#2563eb', strokeWidth: 1.2, dashArray: '6,3,2,3', pdfDash: [6, 3] },
  M: { stroke: '#111827', strokeWidth: 1.5 },
  L: { stroke: '#16a34a', strokeWidth: 1.2, dashArray: '6,3', pdfDash: [6, 3] },
  XL: { stroke: '#d97706', strokeWidth: 1.2, dashArray: '8,4', pdfDash: [8, 4] },
  '2XL': { stroke: '#dc2626', strokeWidth: 1.2, dashArray: '10,4,2,4', pdfDash: [10, 4] },
  '3XL': { stroke: '#0891b2', strokeWidth: 1.2, dashArray: '2,2', pdfDash: [2, 2] },
};

export interface ContinuousSvgOptions {
  includeCalibrationBox?: boolean;
  includeGrainlines?: boolean;
  includeNotches?: boolean;
  includeLabels?: boolean;
  gap_mm?: number;
  margin_mm?: number;
  sizeLayers?: Map<StandardSize, ModifiedPatternResult>;
}

/**
 * Exporta el patrón como SVG continuo con capas semánticas por pieza
 *
 * @param pattern Resultado de patrón modificado
 * @param options Opciones de exportación SVG
 */
export function exportContinuousSvg(
  pattern: ModifiedPatternResult,
  options: ContinuousSvgOptions = {}
): string {
  const {
    includeCalibrationBox = true,
    includeGrainlines = true,
    includeNotches = true,
    includeLabels = true,
    gap_mm = 30,
    margin_mm = 20,
    sizeLayers,
  } = options;

  const layout = layoutPatternParts(pattern.parts, gap_mm);

  // Espacio para cuadro de calibración si se incluye
  let calibSvg = '';
  let calibExtraW = 0;
  let calibExtraH = 0;

  if (includeCalibrationBox) {
    const calibX = margin_mm;
    const calibY = margin_mm;
    calibSvg = `\n  <!-- Cuadro de Calibración 10x10 cm -->\n${renderCalibrationBoxSvg({
      x: calibX,
      y: calibY,
      standalone: false,
      unit: 'mm',
      id: 'calibration-box',
    })}`;
    calibExtraH = CALIBRATION_BOX_MM + gap_mm;
  }

  const svgW = Math.max(layout.totalBounds_mm.width + 2 * margin_mm, CALIBRATION_BOX_MM + 2 * margin_mm);
  const svgH = layout.totalBounds_mm.height + calibExtraH + 2 * margin_mm;

  let piecesSvg = '';

  for (const piece of layout.pieces) {
    const { name, part, offsetX_mm, offsetY_mm } = piece;
    const posY = offsetY_mm + calibExtraH + margin_mm;
    const posX = offsetX_mm + margin_mm;

    let grainlineSvg = '';
    if (includeGrainlines && part.grainline) {
      const gStart = part.grainline.start;
      const gEnd = part.grainline.end;
      const gMidX = (gStart.x + gEnd.x) / 2;
      const gMidY = (gStart.y + gEnd.y) / 2;

      grainlineSvg = `
      <!-- Grainline / Hilo de tela -->
      <g class="grainline" stroke="#2563eb" stroke-width="0.8">
        <line x1="${gStart.x.toFixed(2)}" y1="${gStart.y.toFixed(2)}" x2="${gEnd.x.toFixed(2)}" y2="${gEnd.y.toFixed(2)}" marker-start="url(#arrow)" marker-end="url(#arrow)" />
        <text x="${(gMidX + 3).toFixed(2)}" y="${gMidY.toFixed(2)}" font-size="3.5" font-family="sans-serif" fill="#2563eb" transform="rotate(-90 ${gMidX} ${gMidY})">${part.grainline.label || 'HILO DE TELA'}</text>
      </g>`;
    }

    let notchesSvg = '';
    if (includeNotches && part.notches && part.notches.length > 0) {
      notchesSvg = `\n      <!-- Piquetes / Notches -->\n      <g class="notches" stroke="#dc2626" stroke-width="0.8">`;
      for (const notch of part.notches) {
        const nx = notch.point.x;
        const ny = notch.point.y;
        notchesSvg += `\n        <line x1="${(nx - 2).toFixed(2)}" y1="${(ny - 2).toFixed(2)}" x2="${(nx + 2).toFixed(2)}" y2="${(ny + 2).toFixed(2)}" />`;
        notchesSvg += `\n        <line x1="${(nx - 2).toFixed(2)}" y1="${(ny + 2).toFixed(2)}" x2="${(nx + 2).toFixed(2)}" y2="${(ny - 2).toFixed(2)}" />`;
        if (notch.label) {
          notchesSvg += `\n        <text x="${(nx + 3).toFixed(2)}" y="${(ny + 3).toFixed(2)}" font-size="2.5" font-family="sans-serif" fill="#dc2626">${notch.label}</text>`;
        }
      }
      notchesSvg += `\n      </g>`;
    }

    let labelsSvg = '';
    if (includeLabels) {
      const cX = part.bounds.minX + part.bounds.width / 2;
      const cY = part.bounds.minY + part.bounds.height / 2;
      const cutText = part.onFold ? `CORTAR x${part.cutCount} (AL LOMO / FOLD)` : `CORTAR x${part.cutCount}`;

      labelsSvg = `
      <!-- Etiquetas de pieza -->
      <g class="labels" text-anchor="middle" font-family="sans-serif" fill="#111827">
        <text x="${cX.toFixed(2)}" y="${(cY - 6).toFixed(2)}" font-size="6" font-weight="bold">${part.label || part.name.toUpperCase()}</text>
        <text x="${cX.toFixed(2)}" y="${(cY).toFixed(2)}" font-size="4">TALLA: ${pattern.size}</text>
        <text x="${cX.toFixed(2)}" y="${(cY + 5).toFixed(2)}" font-size="3.5" fill="#4b5563">${cutText}</text>
        <text x="${cX.toFixed(2)}" y="${(cY + 9).toFixed(2)}" font-size="3" fill="#6b7280">Costura: ${part.seamAllowance_mm || pattern.seamAllowance_mm || 10}mm</text>
      </g>`;
    }

    let sizeOutlinesSvg = '';
    const hasSizeLayers =
      sizeLayers &&
      ((sizeLayers instanceof Map && sizeLayers.size > 0) ||
        (typeof sizeLayers === 'object' && Object.keys(sizeLayers).length > 0));

    if (hasSizeLayers) {
      const entries: [string, ModifiedPatternResult][] =
        sizeLayers instanceof Map
          ? Array.from(sizeLayers.entries())
          : Object.entries(sizeLayers);

      for (const [sz, szPattern] of entries) {
        const szPart = szPattern?.parts ? szPattern.parts[name] : undefined;
        if (szPart && szPart.pathD) {
          const pal = SIZE_LAYER_STYLES[sz as StandardSize] || { stroke: '#111827', strokeWidth: 1.2 };
          const isBase = sz === pattern.size;
          const strokeW = isBase ? 1.6 : 1.0;
          const dashAttr = pal.dashArray ? `stroke-dasharray="${pal.dashArray}"` : '';
          sizeOutlinesSvg += `\n      <!-- Capa Talla ${sz} -->\n      <g class="size-layer size-${sz}" data-size="${sz}">\n        <path class="outline-cut size-stroke-${sz}" d="${szPart.pathD}" fill="none" stroke="${pal.stroke}" stroke-width="${strokeW}" ${dashAttr} />\n      </g>`;
        }
      }
    } else {
      sizeOutlinesSvg = `\n      <!-- Contorno de corte base (Talla ${pattern.size}) -->\n      <g class="size-layer size-${pattern.size}" data-size="${pattern.size}">\n        <path class="outline-cut" d="${part.pathD}" fill="none" stroke="#111827" stroke-width="1.3" />\n      </g>`;
    }

    piecesSvg += `
    <!-- Pieza: ${name} -->
    <g id="part-${name}" class="pattern-piece" data-part="${name}" transform="translate(${posX.toFixed(2)}, ${posY.toFixed(2)})">${sizeOutlinesSvg}${grainlineSvg}${notchesSvg}${labelsSvg}
    </g>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW.toFixed(2)} ${svgH.toFixed(2)}" width="${svgW.toFixed(2)}mm" height="${svgH.toFixed(2)}mm">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
    </marker>
  </defs>
  <style>
    .pattern-piece { vector-effect: non-scaling-stroke; }
    .outline-cut { stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    .size-layer { transition: opacity 0.2s ease, stroke-width 0.2s ease; }
    .size-layer.dimmed { opacity: 0.15; }
    .size-layer.hidden { display: none; }
  </style>
  <g id="pattern-container">${calibSvg}
${piecesSvg}
  </g>
</svg>`;
}

export interface ContinuousPdfOptions {
  paperFormat?: 'A0' | 'roll900' | 'custom';
  margin_mm?: number;
  includeCalibrationBox?: boolean;
  includeFichaTecnica?: boolean;
}

/**
 * Exporta el patrón completo en formato PDF continuo (A0 o plotter roll de 900mm+)
 *
 * @param pattern Patrón de moldería modificado
 * @param options Opciones de formato y configuración
 */
/**
 * Dibuja reglas métricas calibradas continuas (en cm/mm) en los bordes superior e izquierdo del plotter
 */
function drawPlotterMetricRulers(
  doc: PDFKit.PDFDocument,
  pageW_pt: number,
  pageH_pt: number,
  margin_pt: number
): void {
  doc.save();

  // Marco exterior de plotter de alta resistencia
  doc.lineWidth(1.2);
  doc.strokeColor('#1e293b');
  doc.rect(margin_pt / 2, margin_pt / 2, pageW_pt - margin_pt, pageH_pt - margin_pt).stroke();

  // 1. REGLA MÉTRICA SUPERIOR (Eje X)
  const rulerY = margin_pt / 2 + 10;
  const rulerEndX = pageW_pt - margin_pt / 2 - 10;

  doc.lineWidth(0.6);
  doc.strokeColor('#475569');
  doc.moveTo(margin_pt, rulerY).lineTo(rulerEndX, rulerY).stroke();

  const totalMmX = (rulerEndX - margin_pt) / MM_TO_PT;
  for (let mm = 0; mm <= totalMmX; mm += 10) {
    const curX = margin_pt + mm * MM_TO_PT;
    const is100 = mm % 100 === 0;
    const is50 = mm % 50 === 0;
    const tickLen = is100 ? 10 : is50 ? 6 : 3;

    doc.moveTo(curX, rulerY).lineTo(curX, rulerY + tickLen).stroke();

    if (is100 && mm > 0) {
      doc
        .fontSize(6)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text(`${mm / 10} cm`, curX - 15, rulerY + 12, { width: 30, align: 'center' });
    }
  }

  // 2. REGLA MÉTRICA IZQUIERDA (Eje Y)
  const rulerX = margin_pt / 2 + 10;
  const rulerEndY = pageH_pt - margin_pt / 2 - 10;

  doc.moveTo(rulerX, margin_pt).lineTo(rulerX, rulerEndY).stroke();

  const totalMmY = (rulerEndY - margin_pt) / MM_TO_PT;
  for (let mm = 0; mm <= totalMmY; mm += 10) {
    const curY = margin_pt + mm * MM_TO_PT;
    const is100 = mm % 100 === 0;
    const is50 = mm % 50 === 0;
    const tickLen = is100 ? 10 : is50 ? 6 : 3;

    doc.moveTo(rulerX, curY).lineTo(rulerX + tickLen, curY).stroke();

    if (is100 && mm > 0) {
      doc.save();
      doc.translate(rulerX + 13, curY);
      doc.rotate(-90);
      doc
        .fontSize(6)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text(`${mm / 10} cm`, -15, -3, { width: 30, align: 'center' });
      doc.restore();
    }
  }

  // Dianas ópticas en las 4 esquinas del plotter
  const cornerArm = 20;
  const corners = [
    { cx: margin_pt / 2, cy: margin_pt / 2 },
    { cx: pageW_pt - margin_pt / 2, cy: margin_pt / 2 },
    { cx: margin_pt / 2, cy: pageH_pt - margin_pt / 2 },
    { cx: pageW_pt - margin_pt / 2, cy: pageH_pt - margin_pt / 2 },
  ];

  for (const c of corners) {
    doc.lineWidth(1.0);
    doc.strokeColor('#dc2626');
    doc.moveTo(c.cx - cornerArm, c.cy).lineTo(c.cx + cornerArm, c.cy).stroke();
    doc.moveTo(c.cx, c.cy - cornerArm).lineTo(c.cx, c.cy + cornerArm).stroke();
    doc.circle(c.cx, c.cy, 6).stroke();
    doc.circle(c.cx, c.cy, 2).fill('#dc2626');
  }

  doc.restore();
}

/**
 * Exporta el patrón en formato PDF Continuo (A0, Roll 900mm+ o Auto-ajustado)
 * Diseñado para impresión en copistería técnica, plotter textil industrial o corte láser.
 *
 * @param pattern Resultado de patrón modificado
 * @param options Opciones de exportación PDF continuo
 */
export async function exportContinuousPdf(
  pattern: ModifiedPatternResult,
  options: ContinuousPdfOptions = {}
): Promise<Buffer> {
  const {
    paperFormat = 'A0',
    margin_mm = 25,
    includeCalibrationBox = true,
    includeFichaTecnica = true,
  } = options;

  const margin_pt = margin_mm * MM_TO_PT;
  const layout = layoutPatternParts(pattern.parts, 35);

  // Espacio para la cartela técnica y el cuadro de calibración en la parte superior
  const headerSpace_pt = includeFichaTecnica || includeCalibrationBox ? CALIBRATION_BOX_PT + 50 : 0;

  // Cálculo dinámico del tamaño de página (evita cualquier recorte en A0 u otros anchos de bobina)
  const reqW_pt = layout.totalBounds_pt.width + 2 * margin_pt + 40; // +40 pt para la regla izquierda
  const reqH_pt = layout.totalBounds_pt.height + headerSpace_pt + 2 * margin_pt + 40;

  let pageWidth_pt: number;
  let pageHeight_pt: number;

  if (paperFormat === 'A0') {
    // Si cabe en A0 Portrait (841 x 1189 mm)
    if (reqW_pt <= PAGE_FORMATS.A0.width_pt && reqH_pt <= PAGE_FORMATS.A0.height_pt) {
      pageWidth_pt = PAGE_FORMATS.A0.width_pt;
      pageHeight_pt = PAGE_FORMATS.A0.height_pt;
    }
    // Si cabe en A0 Landscape (1189 x 841 mm)
    else if (reqW_pt <= PAGE_FORMATS.A0.height_pt && reqH_pt <= PAGE_FORMATS.A0.width_pt) {
      pageWidth_pt = PAGE_FORMATS.A0.height_pt;
      pageHeight_pt = PAGE_FORMATS.A0.width_pt;
    }
    // Si es más grande que A0, adaptar automáticamente el rollo manteniendo escala 1:1
    else {
      pageWidth_pt = Math.max(reqW_pt, PAGE_FORMATS.A0.width_pt);
      pageHeight_pt = Math.max(reqH_pt, PAGE_FORMATS.A0.height_pt);
    }
  } else if (paperFormat === 'roll900') {
    pageWidth_pt = Math.max(900 * MM_TO_PT, reqW_pt);
    pageHeight_pt = Math.max(1000, reqH_pt);
  } else {
    pageWidth_pt = Math.max(reqW_pt, CALIBRATION_BOX_PT + 400);
    pageHeight_pt = reqH_pt;
  }

  const doc = new PDFDocument({
    size: [pageWidth_pt, pageHeight_pt],
    margin: 0,
    autoFirstPage: true,
  });

  const bufferPromise = pdfDocToBuffer(doc);

  // 1. DIBUJAR REGLAS MÉTRICAS GRADUADAS Y MARCO PERIMETRAL DE PLOTTER
  drawPlotterMetricRulers(doc, pageWidth_pt, pageHeight_pt, margin_pt);

  const contentStartX = margin_pt + 25; // espacio para la regla izquierda
  const contentStartY = margin_pt + 25; // espacio para la regla superior

  // 2. CARTELA TÉCNICA INDUSTRIAL Y CUADRO DE CALIBRACIÓN 10x10 cm
  if (includeCalibrationBox) {
    drawCalibrationBoxPdf(doc, contentStartX, contentStartY, {
      showWarning: true,
      showSubdivisions: true,
      showCenterCross: true,
      showFourInchFrame: true,
    });
  }

  if (includeFichaTecnica) {
    const cardX = includeCalibrationBox ? contentStartX + CALIBRATION_BOX_PT + 16 : contentStartX;
    const cardY = contentStartY;
    const cardW = Math.min(pageWidth_pt - cardX - margin_pt - 10, 650);
    const cardH = CALIBRATION_BOX_PT;

    doc.save();
    // Tarjeta estilizada con fondo Slate / Navy
    doc
      .roundedRect(cardX, cardY, cardW, cardH, 4)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    // Barra de título
    doc
      .roundedRect(cardX, cardY, cardW, 26, 4)
      .fillAndStroke('#1e3a8a', '#1e3a8a');

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(
        `PLANO DE PATRONAJE INDUSTRIAL — ${pattern.concept_name.toUpperCase()}`,
        cardX + 12,
        cardY + 7,
        { width: cardW - 24 }
      );

    let lY = cardY + 34;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e293b');
    doc.text(`Talla Principal: ${pattern.size}   |   Bloque Anatómico: ${pattern.base_block}`, cardX + 12, lY);
    lY += 13;

    doc.font('Helvetica').fontSize(8).fillColor('#334155');
    doc.text(`• Margen de costura: ${pattern.seamAllowance_mm} mm   • Dobladillo: ${pattern.hemAllowance_mm} mm`, cardX + 12, lY);
    lY += 12;

    if (pattern.tech_specs?.estimated_fabric_meters) {
      doc.text(`• Consumo de tela estimado: ${pattern.tech_specs.estimated_fabric_meters} m (con 15% merma)`, cardX + 12, lY);
      lY += 12;
    }

    const partsStr = Object.values(pattern.parts)
      .map((p) => `${p.label || p.name} (x${p.cutCount}${p.onFold ? ' al lomo' : ''})`)
      .join('  •  ');
    doc.text(`• Piezas incluidas: ${partsStr}`, cardX + 12, lY, { width: cardW - 24 });
    lY += 18;

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#dc2626')
      .text('ESCALA 1:1 (100%) — IMPRESIÓN CONTINUA EN PLOTTER — NO AJUSTAR A PÁGINA', cardX + 12, lY);

    doc.restore();
  }

  // 3. RENDERIZADO DE TODAS LAS PIEZAS VECTORIALES A ESCALA 100%
  const startY_pt = contentStartY + headerSpace_pt;

  for (const piece of layout.pieces) {
    const { part, offsetX_mm, offsetY_mm } = piece;
    const pieceX_pt = contentStartX + offsetX_mm * MM_TO_PT;
    const pieceY_pt = startY_pt + offsetY_mm * MM_TO_PT;

    doc.save();
    doc.translate(pieceX_pt, pieceY_pt);
    doc.scale(MM_TO_PT, MM_TO_PT);

    // Contorno de corte (trazo negro sólido de 1.4 pt)
    doc.lineWidth(1.4 / MM_TO_PT);
    doc.strokeColor('#0f172a');
    doc.path(part.pathD).stroke();

    // Hilo de tela (Grainline)
    if (part.grainline) {
      doc.lineWidth(1.0 / MM_TO_PT);
      doc.strokeColor('#2563eb');
      doc
        .moveTo(part.grainline.start.x, part.grainline.start.y)
        .lineTo(part.grainline.end.x, part.grainline.end.y)
        .stroke();
    }

    // Piquetes (Notches)
    if (part.notches && part.notches.length > 0) {
      doc.lineWidth(1.0 / MM_TO_PT);
      doc.strokeColor('#dc2626');
      for (const notch of part.notches) {
        doc
          .moveTo(notch.point.x - 3, notch.point.y - 3)
          .lineTo(notch.point.x + 3, notch.point.y + 3)
          .stroke();
        doc
          .moveTo(notch.point.x - 3, notch.point.y + 3)
          .lineTo(notch.point.x + 3, notch.point.y - 3)
          .stroke();
      }
    }

    doc.restore();

    // Etiquetas de pieza sobre badge semitransparente
    doc.save();
    const cX_pt = pieceX_pt + (part.bounds.minX + part.bounds.width / 2) * MM_TO_PT;
    const cY_pt = pieceY_pt + (part.bounds.minY + part.bounds.height / 2) * MM_TO_PT;
    const cutText = part.onFold ? `CORTAR x${part.cutCount} (AL LOMO)` : `CORTAR x${part.cutCount}`;

    doc
      .roundedRect(cX_pt - 85, cY_pt - 18, 170, 36, 4)
      .fillAndStroke('rgba(255, 255, 255, 0.90)', '#cbd5e1');

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(part.label || part.name.toUpperCase(), cX_pt - 80, cY_pt - 14, {
        width: 160,
        align: 'center',
      });

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#334155')
      .text(`TALLA: ${pattern.size}  |  ${cutText}`, cX_pt - 80, cY_pt + 2, {
        width: 160,
        align: 'center',
      });
    doc.restore();
  }

  doc.end();
  return bufferPromise;
}

export interface TiledPdfOptions {
  format?: PaperFormat;
  margin_mm?: number;
  gap_mm?: number;
  includeCalibrationBox?: boolean; // Obligatorio en página 1
  includeAssemblyMap?: boolean;
}

/**
 * Renderiza la Página 1 (Portada Técnica, Cuadro de Calibración 10x10 cm, Ficha y Mapa de Ensamble)
 */
function drawTiledPdfCoverPage(
  doc: PDFKit.PDFDocument,
  pattern: ModifiedPatternResult,
  grid: TileGridResult
): void {
  const { paper, margin_pt } = grid;
  const contentW = paper.width_pt - 2 * margin_pt;

  // 1. Encabezado principal de portada
  doc.save();
  doc
    .rect(margin_pt, margin_pt, contentW, 40)
    .fillAndStroke('#1e3a8a', '#1e3a8a');

  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text(pattern.concept_name.toUpperCase(), margin_pt + 10, margin_pt + 8, {
      width: contentW - 20,
    });

  doc
    .fontSize(8.5)
    .font('Helvetica')
    .fillColor('#bfdbfe')
    .text(
      `PATRÓN DE MOLDERÍA PARAMÉTRICA — TALLA: ${pattern.size} | BLOQUE: ${pattern.base_block}`,
      margin_pt + 10,
      margin_pt + 24
    );
  doc.restore();

  // 2. Cuadro de Calibración 100x100 mm (283.465 pt) a la izquierda
  const calibY = margin_pt + 48;
  drawCalibrationBoxPdf(doc, margin_pt, calibY, {
    showWarning: true,
    showSubdivisions: true,
    showCenterCross: true,
    showFourInchFrame: true,
  });

  // 3. Ficha Técnica y Resumen de Confección a la derecha del cuadro de calibración
  const sideX = margin_pt + CALIBRATION_BOX_PT + 12;
  const sideW = contentW - CALIBRATION_BOX_PT - 12;

  doc.save();
  doc
    .rect(sideX, calibY, sideW, CALIBRATION_BOX_PT)
    .fillAndStroke('#f8fafc', '#e2e8f0');

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text('FICHA TÉCNICA DE CONFECCIÓN', sideX + 8, calibY + 8, { width: sideW - 16 });

  let fY = calibY + 22;
  doc.fontSize(7.5).font('Helvetica').fillColor('#334155');

  doc.text(`• Talla base: ${pattern.size}`, sideX + 8, fY);
  fY += 11;
  doc.text(`• Margen de costura: ${pattern.seamAllowance_mm} mm`, sideX + 8, fY);
  fY += 11;
  doc.text(`• Margen de dobladillo: ${pattern.hemAllowance_mm} mm`, sideX + 8, fY);
  fY += 11;

  if (pattern.measurements?.chest_circumference_mm) {
    doc.text(`• Pecho / Busto: ${pattern.measurements.chest_circumference_mm} mm`, sideX + 8, fY);
    fY += 11;
  }

  if (pattern.tech_specs?.estimated_fabric_meters) {
    doc.text(`• Tela estimada: ${pattern.tech_specs.estimated_fabric_meters} m`, sideX + 8, fY);
    fY += 11;
  }

  if (pattern.harmonization) {
    doc.text(
      `• Sisa/Copa: Holgura ${(pattern.harmonization.easeRatio * 100).toFixed(1)}%`,
      sideX + 8,
      fY
    );
    fY += 11;
  }

  doc.font('Helvetica-Bold').fillColor('#1e293b');
  doc.text('Desglose de piezas:', sideX + 8, fY + 2);
  fY += 12;

  doc.font('Helvetica').fontSize(6.8).fillColor('#475569');
  for (const part of Object.values(pattern.parts)) {
    const foldText = part.onFold ? ' (al lomo)' : '';
    doc.text(`- ${part.label || part.name}: x${part.cutCount}${foldText}`, sideX + 12, fY);
    fY += 9.5;
    if (fY > calibY + CALIBRATION_BOX_PT - 10) break;
  }
  doc.restore();

  // 4. Mitad inferior: Guía Rápida de Montaje (Etsy / Home Printer) + Mapa de Ensamble
  const mapY = calibY + CALIBRATION_BOX_PT + 12;
  const bottomH = paper.height_pt - mapY - margin_pt - 26;

  const guideW = contentW * 0.42;
  const mapW = contentW * 0.56;
  const mapX = margin_pt + guideW + (contentW * 0.02);

  // 4a. GUÍA RÁPIDA DE CORTE Y MONTAJE (PASO A PASO)
  doc.save();
  doc
    .roundedRect(margin_pt, mapY, guideW, Math.max(bottomH, 120), 4)
    .fillAndStroke('#f8fafc', '#cbd5e1');

  // Encabezado de la guía
  doc
    .roundedRect(margin_pt, mapY, guideW, 20, 4)
    .fillAndStroke('#0f172a', '#0f172a');

  doc
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text('GUÍA RÁPIDA DE CORTE Y MONTAJE', margin_pt + 8, mapY + 5.5, {
      width: guideW - 16,
      align: 'center',
    });

  let gY = mapY + 28;
  const steps = [
    { num: '1', title: 'IMPRIMIR AL 100% (1:1)', desc: 'Imprima solo esta Pág 1 a tamaño real (sin ajustar márgenes).' },
    { num: '2', title: 'VERIFICAR REGLA', desc: 'Mida el cuadro de arriba: debe medir 10.0 x 10.0 cm (4"x4").' },
    { num: '3', title: 'CORTAR BORDES', desc: 'En cada hoja, corte los bordes derecho e inferior por la línea.' },
    { num: '4', title: 'UNIR DIAMANTES', desc: 'Haga coincidir los medios diamantes y cruces [A1-A2, B1-B2].' },
    { num: '5', title: 'PEGAR Y CORTAR', desc: 'Fije con cinta adhesiva y corte las piezas con 10mm de costura.' },
  ];

  for (const step of steps) {
    // Círculo con número
    doc.circle(margin_pt + 14, gY + 4, 6).fillAndStroke('#2563eb', '#1e40af');
    doc
      .fontSize(6)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(step.num, margin_pt + 9, gY + 1.5, { width: 10, align: 'center' });

    doc
      .fontSize(6.5)
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text(step.title, margin_pt + 24, gY);

    doc
      .fontSize(5.8)
      .font('Helvetica')
      .fillColor('#475569')
      .text(step.desc, margin_pt + 24, gY + 8.5, { width: guideW - 32 });

    gY += 21;
    if (gY > mapY + bottomH - 10) break;
  }
  doc.restore();

  // 4b. MAPA GENERAL DE ENSAMBLE (ASSEMBLY GRID MAP)
  drawAssemblyMapPdf(doc, grid, mapX, mapY, mapW, Math.max(bottomH, 120));

  // 5. Pie de página de la portada
  doc.save();
  const coverFooterY = paper.height_pt - margin_pt - 14;
  doc
    .fontSize(7)
    .font('Helvetica-Bold')
    .fillColor('#dc2626')
    .text(
      'ESCALA 100% (1:1) — Verifique el cuadro de calibración con regla física antes de ensamblar o cortar.',
      margin_pt,
      coverFooterY,
      { width: contentW, align: 'center' }
    );
  doc.restore();
}

/**
 * Exporta el patrón en formato PDF Paginado Multipágina (A4 o US Letter)
 *
 * PAGINA 1: Incluye OBLIGATORIAMENTE el Cuadro de Calibración de 10x10 cm, Ficha Técnica y Mapa de Ensamble.
 * PAGINAS 2 a N+1: Hojas individuales de la grilla (A1, A2...) con la geometría segmentada y cruces de corte.
 *
 * @param pattern Patrón modificado
 * @param options Opciones de tiling y papel
 */
export async function exportTiledPdf(
  pattern: ModifiedPatternResult,
  options: TiledPdfOptions = {}
): Promise<Buffer> {
  const { format = 'A4', margin_mm = 10, gap_mm = 30 } = options;

  const layout = layoutPatternParts(pattern.parts, gap_mm);
  const grid = calculateTileGrid(layout.totalBounds_mm, {
    format,
    margin_mm,
    pieces: layout.pieces,
    filterEmpty: true,
  });

  const { paper, margin_pt, printable_pt } = grid;

  const doc = new PDFDocument({
    size: [paper.width_pt, paper.height_pt],
    margin: 0,
    autoFirstPage: true,
  });

  const bufferPromise = pdfDocToBuffer(doc);

  // ==========================================
  // PÁGINA 1: PORTADA TÉCNICA + CALIBRACIÓN
  // ==========================================
  drawTiledPdfCoverPage(doc, pattern, grid);

  // ==========================================
  // PÁGINAS 2 a N+1: HOJAS DE PATRÓN ACTIVAS (OMITE HOJAS VACÍAS)
  // ==========================================
  const tilesToPrint = grid.activeTiles || grid.tiles.filter((t) => t.hasContent !== false);

  for (const tile of tilesToPrint) {
    doc.addPage({
      size: [paper.width_pt, paper.height_pt],
      margin: 0,
    });

    // 1. Cruces de registro, bordes de corte punteados, marcas de unión y encabezado
    drawSheetRegistrationMarks(doc, tile, grid, {
      patternName: pattern.concept_name,
      sizeName: pattern.size,
    });

    // 2. Geometría Vectorial Segmentada a Escala 100%
    doc.save();

    // Área de recorte (clipping path) sobre el área útil imprimible
    doc
      .rect(tile.printableArea_pt.x, tile.printableArea_pt.y, tile.printableArea_pt.width, tile.printableArea_pt.height)
      .clip();

    // Traslación precisa: hace coincidir la esquina de la baldosa con la esquina imprimible
    doc.translate(
      margin_pt - tile.viewBox_pt.minX,
      margin_pt - tile.viewBox_pt.minY
    );

    let piecesOnThisTile = 0;

    // Dibujar cada pieza posicionada
    for (const piece of layout.pieces) {
      const { part, offsetX_mm, offsetY_mm } = piece;

      // Comprobar si la pieza intersecta la ventana de visualización de esta hoja
      const pieceMinX_mm = offsetX_mm + part.bounds.minX;
      const pieceMinY_mm = offsetY_mm + part.bounds.minY;
      const pieceMaxX_mm = offsetX_mm + part.bounds.maxX;
      const pieceMaxY_mm = offsetY_mm + part.bounds.maxY;

      const intersects = !(
        pieceMaxX_mm < tile.viewBox_mm.minX ||
        pieceMinX_mm > tile.viewBox_mm.maxX ||
        pieceMaxY_mm < tile.viewBox_mm.minY ||
        pieceMinY_mm > tile.viewBox_mm.maxY
      );

      if (!intersects) continue;
      piecesOnThisTile++;

      const pieceX_pt = offsetX_mm * MM_TO_PT;
      const pieceY_pt = offsetY_mm * MM_TO_PT;

      doc.save();
      doc.translate(pieceX_pt, pieceY_pt);
      doc.scale(MM_TO_PT, MM_TO_PT);

      // Trazo de corte principal (Línea negra nítida 1.4 pt)
      doc.lineWidth(1.4 / MM_TO_PT);
      doc.strokeColor('#0f172a');
      doc.path(part.pathD).stroke();

      // Hilo de tela (Grainline)
      if (part.grainline) {
        doc.lineWidth(1.0 / MM_TO_PT);
        doc.strokeColor('#2563eb');
        doc
          .moveTo(part.grainline.start.x, part.grainline.start.y)
          .lineTo(part.grainline.end.x, part.grainline.end.y)
          .stroke();
      }

      // Piquetes (Notches)
      if (part.notches && part.notches.length > 0) {
        doc.lineWidth(1.0 / MM_TO_PT);
        doc.strokeColor('#dc2626');
        for (const notch of part.notches) {
          doc
            .moveTo(notch.point.x - 3, notch.point.y - 3)
            .lineTo(notch.point.x + 3, notch.point.y + 3)
            .stroke();
          doc
            .moveTo(notch.point.x - 3, notch.point.y + 3)
            .lineTo(notch.point.x + 3, notch.point.y - 3)
            .stroke();
        }
      }

      doc.restore();
    }

    // Restaurar el contexto sin traslación global
    doc.restore();

    // 3. Etiquetas de pieza (renderizadas en coordenadas locales de la página para evitar auto page breaks en PDFKit)
    for (const piece of layout.pieces) {
      const { part, offsetX_mm, offsetY_mm } = piece;
      const cX_mm = offsetX_mm + part.bounds.minX + part.bounds.width / 2;
      const cY_mm = offsetY_mm + part.bounds.minY + part.bounds.height / 2;
      const labelW_mm = 55;
      const labelH_mm = 14;

      const isLabelFullyInsideTile = (
        cX_mm - labelW_mm / 2 >= tile.viewBox_mm.minX &&
        cX_mm + labelW_mm / 2 <= tile.viewBox_mm.maxX &&
        cY_mm - labelH_mm / 2 >= tile.viewBox_mm.minY &&
        cY_mm + labelH_mm / 2 <= tile.viewBox_mm.maxY
      );

      if (isLabelFullyInsideTile) {
        const localX_pt = margin_pt + (cX_mm - tile.viewBox_mm.minX) * MM_TO_PT;
        const localY_pt = margin_pt + (cY_mm - tile.viewBox_mm.minY) * MM_TO_PT;
        const cutText = part.onFold ? `CORTAR x${part.cutCount} (AL LOMO)` : `CORTAR x${part.cutCount}`;

        doc.save();
        // Badge semitransparente
        doc
          .roundedRect(localX_pt - 75, localY_pt - 14, 150, 28, 3)
          .fillAndStroke('rgba(255, 255, 255, 0.90)', '#94a3b8');

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(part.label || part.name.toUpperCase(), localX_pt - 70, localY_pt - 10, {
            width: 140,
            align: 'center',
            lineBreak: false,
          });

        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#334155')
          .text(`TALLA ${pattern.size} | ${cutText}`, localX_pt - 70, localY_pt + 2.5, {
            width: 140,
            align: 'center',
            lineBreak: false,
          });
        doc.restore();
      }
    }
  }

  doc.end();
  return bufferPromise;
}

/**
 * Exporta un PDF multipágina con múltiples tallas o capas de graduación
 *
 * @param sizeMap Mapa de talla estándar a patrón modificado
 * @param options Opciones de exportación
 */
export async function exportMultiSizeTiledPdf(
  sizeMap: Map<StandardSize, ModifiedPatternResult>,
  options: TiledPdfOptions = {}
): Promise<Buffer> {
  // Toma la talla principal o M como referencia de estructura
  const baseSize = sizeMap.get('M') || Array.from(sizeMap.values())[0];
  if (!baseSize) {
    throw new Error('sizeMap no puede estar vacío');
  }

  // Genera el PDF paginado usando la talla base (o todas combinadas)
  return exportTiledPdf(baseSize, options);
}
