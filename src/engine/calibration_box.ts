/**
 * src/engine/calibration_box.ts
 * Módulo de Calibración e Invariante Textil (100 mm x 100 mm / 10 cm x 10 cm & 4" x 4")
 * pattern-ai-core
 *
 * REQUISITO CRÍTICO TEXTIL:
 * Permite verificar físicamente con regla que el patrón se imprimió exactamente
 * al 100% de escala sin distorsión ni auto-ajuste de la impresora (Fit to Page).
 */

import type PDFKit from 'pdfkit';

/**
 * Factores de conversión dimensionales exactos
 * 1 pulgada = 25.4 mm = 72 puntos tipográficos (pt)
 */
export const MM_TO_PT = 72 / 25.4; // 2.8346456692913384 pt/mm
export const PT_TO_MM = 25.4 / 72; // 0.35277777777777775 mm/pt
export const INCH_TO_PT = 72; // 72 pt/in
export const INCH_TO_MM = 25.4; // 25.4 mm/in

/**
 * Dimensiones canónicas del Cuadro de Calibración
 */
export const CALIBRATION_BOX_MM = 100; // 100 mm = 10 cm
export const CALIBRATION_BOX_PT = CALIBRATION_BOX_MM * MM_TO_PT; // 283.46456692913387 pt ≈ 283.465 pt

export const FOUR_INCHES_MM = 101.6; // 4 in = 101.6 mm
export const FOUR_INCHES_PT = 4 * INCH_TO_PT; // 288 pt

/**
 * Convierte milímetros a puntos PDF
 */
export function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

/**
 * Convierte puntos PDF a milímetros
 */
export function ptToMm(pt: number): number {
  return pt * PT_TO_MM;
}

/**
 * Opciones para el renderizado del cuadro de calibración
 */
export interface CalibrationBoxOptions {
  x?: number; // posición X (en pt o mm según contexto, default 0)
  y?: number; // posición Y (default 0)
  showWarning?: boolean; // mostrar aviso destacado (default true)
  showSubdivisions?: boolean; // mostrar marcas milimétricas / pulgadas (default true)
  showCenterCross?: boolean; // mostrar cruz de registro central (default true)
  showFourInchFrame?: boolean; // mostrar marco de 4x4 pulgadas (default true)
  theme?: 'dark' | 'light' | 'technical'; // estilo visual (default 'technical')
}

export interface CalibrationBoxSvgOptions extends CalibrationBoxOptions {
  standalone?: boolean; // si true genera <svg> completo, si false un <g> (default false)
  unit?: 'mm' | 'pt'; // unidad de coordenadas (default 'mm')
  id?: string; // id del elemento (default 'calibration-box-10x10')
}

export interface CalibrationBoxPdfOptions extends CalibrationBoxOptions {
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
}

/**
 * Retorna las métricas exactas del bloque de calibración
 */
export function getCalibrationBoxMetrics() {
  return {
    mm: CALIBRATION_BOX_MM,
    pt: CALIBRATION_BOX_PT,
    pt_rounded: Math.round(CALIBRATION_BOX_PT * 1000) / 1000, // 283.465 pt
    inches: 100 / INCH_TO_MM, // ~3.937 in
    four_inches_mm: FOUR_INCHES_MM,
    four_inches_pt: FOUR_INCHES_PT,
    mm_to_pt: MM_TO_PT,
    pt_to_mm: PT_TO_MM,
  };
}

/**
 * Renderiza el Cuadro de Calibración de 100x100 mm como bloque vectorial SVG
 * @param options Opciones de personalización del SVG
 * @returns Cadena con código SVG XML
 */
export function renderCalibrationBoxSvg(options: CalibrationBoxSvgOptions = {}): string {
  const {
    x = 0,
    y = 0,
    standalone = false,
    unit = 'mm',
    id = 'calibration-box-10x10',
    showWarning = true,
    showSubdivisions = true,
    showCenterCross = true,
    showFourInchFrame = true,
  } = options;

  const width = unit === 'mm' ? CALIBRATION_BOX_MM : CALIBRATION_BOX_PT;
  const height = unit === 'mm' ? CALIBRATION_BOX_MM : CALIBRATION_BOX_PT;
  const fourInches = unit === 'mm' ? FOUR_INCHES_MM : FOUR_INCHES_PT;

  const mmStep = unit === 'mm' ? 10 : 10 * MM_TO_PT;
  const halfMmStep = unit === 'mm' ? 5 : 5 * MM_TO_PT;
  const inchStep = unit === 'mm' ? INCH_TO_MM : INCH_TO_PT;

  const cx = x + width / 2;
  const cy = y + height / 2;

  let ticksSvg = '';
  if (showSubdivisions) {
    // Marcas métricas en borde superior y borde izquierdo (cada 5mm y 10mm)
    for (let i = 1; i <= 9; i++) {
      const pos10 = unit === 'mm' ? i * 10 : i * mmStep;
      const pos5 = pos10 - halfMmStep;

      // Subdivisión 5mm (arriba e izquierda)
      const tick5Len = unit === 'mm' ? 1.5 : 1.5 * MM_TO_PT;
      ticksSvg += `  <line x1="${(x + pos5).toFixed(2)}" y1="${y.toFixed(2)}" x2="${(x + pos5).toFixed(2)}" y2="${(y + tick5Len).toFixed(2)}" stroke="#4b5563" stroke-width="0.5" />\n`;
      ticksSvg += `  <line x1="${x.toFixed(2)}" y1="${(y + pos5).toFixed(2)}" x2="${(x + tick5Len).toFixed(2)}" y2="${(y + pos5).toFixed(2)}" stroke="#4b5563" stroke-width="0.5" />\n`;

      // Subdivisión 10mm (arriba e izquierda)
      const tick10Len = unit === 'mm' ? 3.5 : 3.5 * MM_TO_PT;
      ticksSvg += `  <line x1="${(x + pos10).toFixed(2)}" y1="${y.toFixed(2)}" x2="${(x + pos10).toFixed(2)}" y2="${(y + tick10Len).toFixed(2)}" stroke="#111827" stroke-width="0.75" />\n`;
      ticksSvg += `  <line x1="${x.toFixed(2)}" y1="${(y + pos10).toFixed(2)}" x2="${(x + tick10Len).toFixed(2)}" y2="${(y + pos10).toFixed(2)}" stroke="#111827" stroke-width="0.75" />\n`;

      // Etiquetas métricas (1, 2, ... 9)
      const textX = x + pos10;
      const textY = y + (unit === 'mm' ? 5.5 : 5.5 * MM_TO_PT);
      ticksSvg += `  <text x="${textX.toFixed(2)}" y="${textY.toFixed(2)}" font-size="${unit === 'mm' ? 2.5 : 2.5 * MM_TO_PT}" font-family="sans-serif" text-anchor="middle" fill="#4b5563">${i}</text>\n`;
    }

    // Marcas imperiales en borde inferior y borde derecho (1", 2", 3")
    for (let i = 1; i <= 3; i++) {
      const posInch = unit === 'mm' ? i * INCH_TO_MM : i * INCH_TO_PT;
      const tickInchLen = unit === 'mm' ? 3.5 : 3.5 * MM_TO_PT;

      // Borde inferior
      ticksSvg += `  <line x1="${(x + posInch).toFixed(2)}" y1="${(y + height).toFixed(2)}" x2="${(x + posInch).toFixed(2)}" y2="${(y + height - tickInchLen).toFixed(2)}" stroke="#111827" stroke-width="0.75" />\n`;
      ticksSvg += `  <text x="${(x + posInch).toFixed(2)}" y="${(y + height - tickInchLen - (unit === 'mm' ? 1.5 : 4)).toFixed(2)}" font-size="${unit === 'mm' ? 2.5 : 2.5 * MM_TO_PT}" font-family="sans-serif" text-anchor="middle" fill="#4b5563">${i}"</text>\n`;

      // Borde derecho
      ticksSvg += `  <line x1="${(x + width).toFixed(2)}" y1="${(y + posInch).toFixed(2)}" x2="${(x + width - tickInchLen).toFixed(2)}" y2="${(y + posInch).toFixed(2)}" stroke="#111827" stroke-width="0.75" />\n`;
    }
  }

  // Marco de 4x4 pulgadas
  let fourInchSvg = '';
  if (showFourInchFrame) {
    const offset4 = (fourInches - width) / 2;
    const fX = x - offset4;
    const fY = y - offset4;
    fourInchSvg = `  <!-- Marco de 4x4 pulgadas (288 pt / 101.6 mm) -->
  <rect x="${fX.toFixed(2)}" y="${fY.toFixed(2)}" width="${fourInches.toFixed(2)}" height="${fourInches.toFixed(2)}" fill="none" stroke="#2563eb" stroke-width="0.6" stroke-dasharray="2,2" />
  <text x="${(fX + fourInches / 2).toFixed(2)}" y="${(fY - (unit === 'mm' ? 1 : 2.8)).toFixed(2)}" font-size="${unit === 'mm' ? 2.2 : 6}" font-family="sans-serif" text-anchor="middle" font-weight="bold" fill="#2563eb">4" x 4" (101.6 mm / 288 pt)</text>\n`;
  }

  // Cruz central de registro
  let centerCrossSvg = '';
  if (showCenterCross) {
    const crossArm = unit === 'mm' ? 6 : 6 * MM_TO_PT;
    const circleR = unit === 'mm' ? 2 : 2 * MM_TO_PT;
    centerCrossSvg = `  <!-- Cruz de registro central -->
  <line x1="${(cx - crossArm).toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(cx + crossArm).toFixed(2)}" y2="${cy.toFixed(2)}" stroke="#dc2626" stroke-width="0.6" />
  <line x1="${cx.toFixed(2)}" y1="${(cy - crossArm).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${(cy + crossArm).toFixed(2)}" stroke="#dc2626" stroke-width="0.6" />
  <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${circleR.toFixed(2)}" fill="none" stroke="#dc2626" stroke-width="0.6" />
  <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(circleR * 0.3).toFixed(2)}" fill="#dc2626" />\n`;
  }

  // Aviso y texto de advertencia
  let warningSvg = '';
  if (showWarning) {
    const bannerW = unit === 'mm' ? 76 : 76 * MM_TO_PT;
    const bannerH = unit === 'mm' ? 14 : 14 * MM_TO_PT;
    const bannerX = cx - bannerW / 2;
    const bannerY = cy + (unit === 'mm' ? 8 : 8 * MM_TO_PT);

    warningSvg = `  <!-- Banner de advertencia de escala 100% -->
  <rect x="${bannerX.toFixed(2)}" y="${bannerY.toFixed(2)}" width="${bannerW.toFixed(2)}" height="${bannerH.toFixed(2)}" fill="#fef2f2" stroke="#dc2626" stroke-width="0.75" rx="${unit === 'mm' ? 1 : 2.8}" />
  <text x="${cx.toFixed(2)}" y="${(bannerY + (unit === 'mm' ? 4.5 : 12)).toFixed(2)}" font-size="${unit === 'mm' ? 2.8 : 7.5}" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#dc2626">100% SCALE - DO NOT SCALE</text>
  <text x="${cx.toFixed(2)}" y="${(bannerY + (unit === 'mm' ? 8.5 : 23)).toFixed(2)}" font-size="${unit === 'mm' ? 2.2 : 6}" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#111827">PRINT AT 100% / SIN AJUSTE DE PÁGINA</text>
  <text x="${cx.toFixed(2)}" y="${(bannerY + (unit === 'mm' ? 12 : 33)).toFixed(2)}" font-size="${unit === 'mm' ? 1.8 : 5}" font-family="sans-serif" text-anchor="middle" fill="#4b5563">Medir con regla física antes de cortar tela</text>\n`;
  }

  // Textos de título y cotas
  const titleY = y + (unit === 'mm' ? 12 : 12 * MM_TO_PT);
  const subtitleY = y + (unit === 'mm' ? 17 : 17 * MM_TO_PT);
  const titleSvg = `  <!-- Título y cotas -->
  <text x="${cx.toFixed(2)}" y="${titleY.toFixed(2)}" font-size="${unit === 'mm' ? 3.2 : 9}" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#111827">CUADRO DE CALIBRACIÓN</text>
  <text x="${cx.toFixed(2)}" y="${subtitleY.toFixed(2)}" font-size="${unit === 'mm' ? 2.6 : 7.5}" font-family="sans-serif" text-anchor="middle" fill="#374151">100 mm x 100 mm (10.0 cm x 10.0 cm)</text>\n`;

  const groupContent = `
  <!-- Marco exterior de 100x100 mm (escala 100%) -->
  <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" fill="#ffffff" stroke="#111827" stroke-width="1" />
${fourInchSvg}${ticksSvg}${titleSvg}${centerCrossSvg}${warningSvg}`;

  if (standalone) {
    const totalW = width + (unit === 'mm' ? 10 : 10 * MM_TO_PT);
    const totalH = height + (unit === 'mm' ? 10 : 10 * MM_TO_PT);
    const viewBoxX = (x - (unit === 'mm' ? 5 : 5 * MM_TO_PT)).toFixed(2);
    const viewBoxY = (y - (unit === 'mm' ? 5 : 5 * MM_TO_PT)).toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg id="${id}" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${totalW.toFixed(2)} ${totalH.toFixed(2)}" width="${totalW.toFixed(2)}${unit}" height="${totalH.toFixed(2)}${unit}">
  <g id="calibration-box-content">
${groupContent}
  </g>
</svg>`;
  }

  return `<g id="${id}">\n${groupContent}\n</g>`;
}

/**
 * Dibuja el Cuadro de Calibración de 100x100 mm directamente en un documento PDFKit
 * Garantiza fidelidad vectorial matemática exacta a 72 pt/pulgada.
 *
 * @param doc Instancia de PDFDocument de PDFKit
 * @param x Posición X en puntos (pt)
 * @param y Posición Y en puntos (pt)
 * @param options Opciones de renderizado
 */
export function drawCalibrationBoxPdf(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  options: CalibrationBoxPdfOptions = {}
): void {
  const {
    showWarning = true,
    showSubdivisions = true,
    showCenterCross = true,
    showFourInchFrame = true,
    textColor = '#111827',
    borderColor = '#111827',
  } = options;

  const boxW = CALIBRATION_BOX_PT; // 283.465 pt
  const boxH = CALIBRATION_BOX_PT; // 283.465 pt
  const cx = x + boxW / 2;
  const cy = y + boxH / 2;

  doc.save();

  // 1. Fondo blanco y marco exterior 100x100 mm (283.465 pt)
  doc
    .rect(x, y, boxW, boxH)
    .fillAndStroke('#ffffff', borderColor);

  doc.lineWidth(1.2);
  doc.rect(x, y, boxW, boxH).stroke(borderColor);

  // 2. Marco de 4x4 pulgadas (288 pt = 101.6 mm) centrado
  if (showFourInchFrame) {
    const fW = FOUR_INCHES_PT; // 288 pt
    const fH = FOUR_INCHES_PT;
    const fX = cx - fW / 2;
    const fY = cy - fH / 2;

    doc.save();
    doc.lineWidth(0.6);
    doc.dash(3, { space: 3 });
    doc.rect(fX, fY, fW, fH).stroke('#2563eb');
    doc.undash();

    doc
      .fontSize(5.5)
      .fillColor('#2563eb')
      .text('4" x 4" (101.6 mm / 288 pt)', fX, fY - 8, {
        width: fW,
        align: 'center',
      });
    doc.restore();
  }

  // 3. Regla milimétrica y marcas de subdivisión
  if (showSubdivisions) {
    doc.save();
    doc.lineWidth(0.6);

    const stepMm = 10 * MM_TO_PT; // 28.3465 pt por cada 10 mm
    const halfStepMm = 5 * MM_TO_PT; // 14.173 pt por cada 5 mm

    for (let i = 1; i <= 9; i++) {
      const pos10 = i * stepMm;
      const pos5 = pos10 - halfStepMm;

      // 5 mm tick
      doc
        .moveTo(x + pos5, y)
        .lineTo(x + pos5, y + 4)
        .stroke('#6b7280');
      doc
        .moveTo(x, y + pos5)
        .lineTo(x + 4, y + pos5)
        .stroke('#6b7280');

      // 10 mm tick
      doc
        .moveTo(x + pos10, y)
        .lineTo(x + pos10, y + 8)
        .stroke(borderColor);
      doc
        .moveTo(x, y + pos10)
        .lineTo(x + 8, y + pos10)
        .stroke(borderColor);

      // Etiquetas métricas (1 a 9 cm)
      doc
        .fontSize(6)
        .fillColor('#4b5563')
        .text(`${i}`, x + pos10 - 5, y + 10, { width: 10, align: 'center' });
      doc
        .fontSize(6)
        .fillColor('#4b5563')
        .text(`${i}`, x + 10, y + pos10 - 3, { width: 10, align: 'left' });
    }

    // Regla en pulgadas (inferior y derecha)
    for (let i = 1; i <= 3; i++) {
      const posInch = i * INCH_TO_PT; // 72, 144, 216 pt
      doc
        .moveTo(x + posInch, y + boxH)
        .lineTo(x + posInch, y + boxH - 8)
        .stroke(borderColor);
      doc
        .fontSize(6.5)
        .fillColor('#4b5563')
        .text(`${i}"`, x + posInch - 6, y + boxH - 18, { width: 12, align: 'center' });

      doc
        .moveTo(x + boxW, y + posInch)
        .lineTo(x + boxW - 8, y + posInch)
        .stroke(borderColor);
    }
    doc.restore();
  }

  // 4. Textos de título e información
  doc.save();
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(textColor)
    .text('CUADRO DE CALIBRACIÓN / TEST SQUARE', x, y + 24, {
      width: boxW,
      align: 'center',
    });

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#374151')
    .text('100 mm x 100 mm (10.0 cm x 10.0 cm)', x, y + 36, {
      width: boxW,
      align: 'center',
    });
  doc.restore();

  // 5. Cruz central de registro y diana
  if (showCenterCross) {
    doc.save();
    doc.lineWidth(0.75);
    doc.strokeColor('#dc2626');

    const crossLen = 14;
    // Línea horizontal
    doc
      .moveTo(cx - crossLen, cy)
      .lineTo(cx + crossLen, cy)
      .stroke();
    // Línea vertical
    doc
      .moveTo(cx, cy - crossLen)
      .lineTo(cx, cy + crossLen)
      .stroke();

    // Círculos de registro
    doc.circle(cx, cy, 6).stroke();
    doc.circle(cx, cy, 1.5).fill('#dc2626');
    doc.restore();
  }

  // 6. Banner de advertencia de escala 100%
  if (showWarning) {
    doc.save();
    const bannerW = 210;
    const bannerH = 42;
    const bannerX = cx - bannerW / 2;
    const bannerY = cy + 22;

    // Caja de aviso
    doc
      .rect(bannerX, bannerY, bannerW, bannerH)
      .fillAndStroke('#fef2f2', '#dc2626');

    doc.lineWidth(1);
    doc.rect(bannerX, bannerY, bannerW, bannerH).stroke('#dc2626');

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#dc2626')
      .text('100% SCALE - DO NOT SCALE', bannerX, bannerY + 5, {
        width: bannerW,
        align: 'center',
      });

    doc
      .fontSize(7)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('PRINT AT 100% / SIN AJUSTES DE PÁGINA', bannerX, bannerY + 16, {
        width: bannerW,
        align: 'center',
      });

    doc
      .fontSize(5.8)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text('Verifique con regla física antes de cortar la tela', bannerX, bannerY + 28, {
        width: bannerW,
        align: 'center',
      });

    doc.restore();
  }

  doc.restore();
}
