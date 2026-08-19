/**
 * src/server/public/viewer.js
 * Visor Vectorial SVG 2D Interactivo de Alta Fidelidad
 * pattern-ai-core
 *
 * Soporte de Zoom centrado en cursor, Pan interactivo, Fit View,
 * Cuadrícula de Paginación A4/Letter con visualización de hojas activas numeradas,
 * Selector de capas por talla, Regla métrica y Verificador de Calibración 10x10 cm.
 */

// Constantes métricas y de papel estándar
export const MM_TO_PT = 72 / 25.4; // ≈ 2.83464567
export const PT_TO_MM = 25.4 / 72; // ≈ 0.35277778
export const CALIBRATION_BOX_MM = 100;
export const CALIBRATION_BOX_PT = 100 * MM_TO_PT;

export const PAPER_SPECS = {
  A4: {
    format: 'A4',
    name: 'ISO A4 (210 × 297 mm)',
    width_mm: 210,
    height_mm: 297,
    margin_mm: 10,
    printable_w_mm: 190,
    printable_h_mm: 277,
  },
  letter: {
    format: 'letter',
    name: 'US Letter (8.5 × 11 in / 215.9 × 279.4 mm)',
    width_mm: 215.9,
    height_mm: 279.4,
    margin_mm: 10,
    printable_w_mm: 195.9,
    printable_h_mm: 259.4,
  },
};

export const SIZE_COLORS = {
  XS: '#9333ea', // Purple
  S: '#2563eb',  // Blue
  M: '#06b6d4',  // Cyan / Primary
  L: '#10b981',  // Emerald
  XL: '#f59e0b', // Amber
  '2XL': '#ef4444', // Red
  '3XL': '#8b5cf6', // Indigo
};

/**
 * Convierte un índice de fila (0-based) a nomenclatura alfanumérica estándar (A, B... Z, AA...)
 */
export function getRowLabel(rowIndex) {
  let label = '';
  let index = Math.max(0, Math.floor(rowIndex));
  while (index >= 0) {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  }
  return label;
}

/**
 * Formatea una longitud en milímetros a cadena amigable
 */
export function formatMillimeters(mm) {
  if (typeof mm !== 'number' || isNaN(mm)) return '0 mm';
  if (Math.abs(mm) >= 1000) {
    return `${(mm / 1000).toFixed(2)} m (${mm.toFixed(0)} mm)`;
  }
  if (Math.abs(mm) >= 10) {
    return `${(mm / 10).toFixed(1)} cm (${mm.toFixed(0)} mm)`;
  }
  return `${mm.toFixed(1)} mm`;
}

/**
 * Parsea el atributo viewBox de una cadena o elemento SVG
 */
export function parseSvgViewBox(svgContentOrElement) {
  let vbString = '';

  if (typeof svgContentOrElement === 'string') {
    const match = svgContentOrElement.match(/viewBox\s*=\s*["']([^"']+)["']/i);
    if (match) {
      vbString = match[1].trim();
    } else {
      const wMatch = svgContentOrElement.match(/width\s*=\s*["']([\d.]+)(?:mm|px|pt)?["']/i);
      const hMatch = svgContentOrElement.match(/height\s*=\s*["']([\d.]+)(?:mm|px|pt)?["']/i);
      const w = wMatch ? parseFloat(wMatch[1]) : 800;
      const h = hMatch ? parseFloat(hMatch[1]) : 600;
      return { minX: 0, minY: 0, width: w, height: h, maxX: w, maxY: h };
    }
  } else if (svgContentOrElement && typeof svgContentOrElement.getAttribute === 'function') {
    vbString = svgContentOrElement.getAttribute('viewBox') || '';
    if (!vbString) {
      const w = parseFloat(svgContentOrElement.getAttribute('width')) || 800;
      const h = parseFloat(svgContentOrElement.getAttribute('height')) || 600;
      return { minX: 0, minY: 0, width: w, height: h, maxX: w, maxY: h };
    }
  }

  const parts = vbString.split(/[\s,]+/).map(Number);
  if (parts.length >= 4 && parts.every((n) => !isNaN(n))) {
    const [minX, minY, width, height] = parts;
    return {
      minX,
      minY,
      width,
      height,
      maxX: minX + width,
      maxY: minY + height,
    };
  }

  return { minX: 0, minY: 0, width: 800, height: 600, maxX: 800, maxY: 600 };
}

/**
 * Calcula la nueva posición de paneo y escala centrada en el cursor
 * @param {{ panX: number, panY: number }} currentPan Paneo actual en píxeles
 * @param {number} currentScale Escala actual
 * @param {number} scaleFactor Factor multiplicador de zoom (ej. 1.2 o 0.8)
 * @param {number} cursorX Coordenada X del cursor relativa al contenedor
 * @param {number} cursorY Coordenada Y del cursor relativa al contenedor
 * @param {number} minScale Límite inferior de escala (default 0.05)
 * @param {number} maxScale Límite superior de escala (default 50.0)
 */
export function calculateZoomPan(
  currentPan,
  currentScale,
  scaleFactor,
  cursorX,
  cursorY,
  minScale = 0.05,
  maxScale = 50.0
) {
  const newScale = Math.max(minScale, Math.min(maxScale, currentScale * scaleFactor));
  if (Math.abs(newScale - currentScale) < 1e-6) {
    return { panX: currentPan.panX, panY: currentPan.panY, scale: currentScale };
  }

  // Punto en coordenadas del SVG antes del zoom
  const pointInSvgX = (cursorX - currentPan.panX) / currentScale;
  const pointInSvgY = (cursorY - currentPan.panY) / currentScale;

  // Nuevo pan para que el punto bajo el cursor permanezca inmóvil
  const newPanX = cursorX - pointInSvgX * newScale;
  const newPanY = cursorY - pointInSvgY * newScale;

  return {
    panX: newPanX,
    panY: newPanY,
    scale: newScale,
  };
}

/**
 * Calcula la escala y paneo para ajustar el contenido al viewport (Fit to View)
 * @param {number} viewportWidth Ancho del contenedor
 * @param {number} viewportHeight Alto del contenedor
 * @param {{ minX: number, minY: number, width: number, height: number }} contentBounds
 * @param {number} padding Margen interior en píxeles
 */
export function calculateFitView(
  viewportWidth,
  viewportHeight,
  contentBounds,
  padding = 30
) {
  const vW = Math.max(10, viewportWidth - padding * 2);
  const vH = Math.max(10, viewportHeight - padding * 2);

  const bW = Math.max(1, contentBounds.width);
  const bH = Math.max(1, contentBounds.height);

  const scaleX = vW / bW;
  const scaleY = vH / bH;
  const scale = Math.min(scaleX, scaleY);

  const panX = (viewportWidth - bW * scale) / 2 - contentBounds.minX * scale;
  const panY = (viewportHeight - bH * scale) / 2 - contentBounds.minY * scale;

  return {
    scale,
    panX,
    panY,
  };
}

/**
 * Calcula la grilla de paginación (A4 o Letter) para un bounding box de moldería
 * @param {{ minX: number, minY: number, width: number, height: number }} patternBounds Bounding box en mm
 * @param {'A4' | 'letter'} format Formato de papel
 * @param {number} margin_mm Margen de impresión en mm (default 10)
 */
export function calculateGridSheets(
  patternBounds,
  format = 'A4',
  margin_mm = 10
) {
  const spec = PAPER_SPECS[format === 'letter' ? 'letter' : 'A4'];
  const printableW = spec.width_mm - 2 * margin_mm;
  const printableH = spec.height_mm - 2 * margin_mm;

  const minX = patternBounds.minX || 0;
  const minY = patternBounds.minY || 0;
  const width = Math.max(1, patternBounds.width || 100);
  const height = Math.max(1, patternBounds.height || 100);

  const cols = Math.max(1, Math.ceil(width / printableW));
  const rows = Math.max(1, Math.ceil(height / printableH));
  const totalSheets = cols * rows;

  const sheets = [];
  let sheetNumber = 1;

  for (let r = 0; r < rows; r++) {
    const rowLabel = getRowLabel(r);
    for (let c = 0; c < cols; c++) {
      const colLabel = `${c + 1}`;
      const id = `${rowLabel}${colLabel}`;

      const sheetMinX = minX + c * printableW;
      const sheetMinY = minY + r * printableH;

      sheets.push({
        id,
        row: r,
        col: c,
        rowLabel,
        colLabel,
        sheetNumber: sheetNumber++,
        pageNumber: sheetNumber, // Pág 1 = Portada técnica, hojas empiezan en Pág 2
        x: sheetMinX,
        y: sheetMinY,
        width: printableW,
        height: printableH,
        paperWidth: spec.width_mm,
        paperHeight: spec.height_mm,
        margin_mm,
        hasContent: true,
      });
    }
  }

  return {
    format: spec.format,
    name: spec.name,
    cols,
    rows,
    totalSheets,
    printableW,
    printableH,
    sheets,
    patternBounds,
  };
}

/**
 * Genera el elemento SVG de superposición de grilla de paginación
 */
export function generateGridOverlaySvg(gridResult, theme = 'dark') {
  const isDark = theme === 'dark';
  const borderColor = isDark ? '#38bdf8' : '#2563eb';
  const badgeBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  const badgeText = isDark ? '#38bdf8' : '#1e3a8a';
  const crossColor = '#ef4444';

  let svgElements = `<g class="pagination-grid-layer" id="pagination-grid-layer">`;

  for (const s of gridResult.sheets) {
    const crossArm = 6; // mm
    const cx1 = s.x;
    const cy1 = s.y;
    const cx2 = s.x + s.width;
    const cy2 = s.y + s.height;

    svgElements += `
      <!-- Hoja ${s.id} -->
      <g class="grid-sheet-item" data-sheet-id="${s.id}">
        <!-- Marco de hoja imprimible -->
        <rect x="${s.x.toFixed(2)}" y="${s.y.toFixed(2)}" width="${s.width.toFixed(2)}" height="${s.height.toFixed(2)}"
          fill="none" stroke="${borderColor}" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.85" />
        
        <!-- Badge de identificación de hoja -->
        <rect x="${(s.x + 4).toFixed(2)}" y="${(s.y + 4).toFixed(2)}" width="36" height="18" rx="3"
          fill="${badgeBg}" stroke="${borderColor}" stroke-width="0.5" />
        <text x="${(s.x + 22).toFixed(2)}" y="${(s.y + 16).toFixed(2)}" font-family="monospace" font-weight="bold"
          font-size="9" fill="${badgeText}" text-anchor="middle">${s.id}</text>
        
        <!-- Cruces de registro en esquinas -->
        <path d="M ${(cx1 - crossArm).toFixed(2)} ${cy1.toFixed(2)} L ${(cx1 + crossArm).toFixed(2)} ${cy1.toFixed(2)} M ${cx1.toFixed(2)} ${(cy1 - crossArm).toFixed(2)} L ${cx1.toFixed(2)} ${(cy1 + crossArm).toFixed(2)}" stroke="${crossColor}" stroke-width="0.6" />
        <path d="M ${(cx2 - crossArm).toFixed(2)} ${cy1.toFixed(2)} L ${(cx2 + crossArm).toFixed(2)} ${cy1.toFixed(2)} M ${cx2.toFixed(2)} ${(cy1 - crossArm).toFixed(2)} L ${cx2.toFixed(2)} ${(cy1 + crossArm).toFixed(2)}" stroke="${crossColor}" stroke-width="0.6" />
        <path d="M ${(cx1 - crossArm).toFixed(2)} ${cy2.toFixed(2)} L ${(cx1 + crossArm).toFixed(2)} ${cy2.toFixed(2)} M ${cx1.toFixed(2)} ${(cy2 - crossArm).toFixed(2)} L ${cx1.toFixed(2)} ${(cy2 + crossArm).toFixed(2)}" stroke="${crossColor}" stroke-width="0.6" />
        <path d="M ${(cx2 - crossArm).toFixed(2)} ${cy2.toFixed(2)} L ${(cx2 + crossArm).toFixed(2)} ${cy2.toFixed(2)} M ${cx2.toFixed(2)} ${(cy2 - crossArm).toFixed(2)} L ${cx2.toFixed(2)} ${(cy2 + crossArm).toFixed(2)}" stroke="${crossColor}" stroke-width="0.6" />
      </g>
    `;
  }

  svgElements += `</g>`;
  return svgElements;
}

/**
 * Clase controladora del Visor Vectorial Interactivo 2D
 */
export class PatternViewer {
  constructor(containerElement, options = {}) {
    if (!containerElement) {
      throw new Error('PatternViewer requiere un elemento contenedor del DOM');
    }

    this.container = containerElement;
    this.options = {
      theme: options.theme || 'dark',
      minScale: options.minScale || 0.05,
      maxScale: options.maxScale || 30.0,
      zoomSpeed: options.zoomSpeed || 1.25,
      onTransformChange: options.onTransformChange || null,
      onPieceSelect: options.onPieceSelect || null,
      ...options,
    };

    // Estado interno
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialPanX = 0;
    this.initialPanY = 0;
    this.activeGrid = 'off'; // 'off' | 'A4' | 'letter'
    this.visibleSizes = new Set(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']);
    this.highlightedSize = null;
    this.showRulers = true;
    this.rawSvgText = '';
    this.bounds = { minX: 0, minY: 0, width: 800, height: 600, maxX: 800, maxY: 600 };

    this.initDom();
    this.bindEvents();
  }

  /**
   * Construye la estructura DOM del visor con canvas y overlays
   */
  initDom() {
    this.container.classList.add('pac-pattern-viewer', `theme-${this.options.theme}`);
    this.container.innerHTML = `
      <div class="viewer-viewport">
        <!-- Regla superior (Eje X) -->
        <canvas class="viewer-ruler ruler-top"></canvas>
        <!-- Regla izquierda (Eje Y) -->
        <canvas class="viewer-ruler ruler-left"></canvas>
        <!-- Esquina de unión de reglas -->
        <div class="ruler-corner">mm</div>

        <!-- Canvas central SVG -->
        <div class="svg-stage">
          <svg class="stage-svg" xmlns="http://www.w3.org/2000/svg">
            <g class="viewport-transform">
              <g class="pattern-content"></g>
              <g class="overlay-content"></g>
            </g>
          </svg>
        </div>

        <!-- Barra flotante de estado y escala -->
        <div class="viewer-floating-hud">
          <span class="hud-item zoom-level" id="hudZoomLevel">100%</span>
          <span class="hud-item cursor-pos" id="hudCursorPos">X: 0 mm, Y: 0 mm</span>
          <span class="hud-item scale-indicator">
            <span class="scale-bar"></span>
            <span class="scale-label">100 mm (10 cm)</span>
          </span>
        </div>

        <!-- Tooltip flotante para piezas -->
        <div class="viewer-piece-tooltip" style="display: none;"></div>
      </div>
    `;

    this.viewport = this.container.querySelector('.viewer-viewport');
    this.stage = this.container.querySelector('.svg-stage');
    this.stageSvg = this.container.querySelector('.stage-svg');
    this.viewportTransform = this.container.querySelector('.viewport-transform');
    this.patternContent = this.container.querySelector('.pattern-content');
    this.overlayContent = this.container.querySelector('.overlay-content');
    this.rulerTop = this.container.querySelector('.ruler-top');
    this.rulerLeft = this.container.querySelector('.ruler-left');
    this.hudZoomLevel = this.container.querySelector('#hudZoomLevel');
    this.hudCursorPos = this.container.querySelector('#hudCursorPos');
    this.tooltip = this.container.querySelector('.viewer-piece-tooltip');
  }

  /**
   * Vincula eventos de mouse, táctiles y redimensionado
   */
  bindEvents() {
    // 1. Mouse Wheel Zoom
    this.stage.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = this.stage.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const delta = e.deltaY < 0 ? this.options.zoomSpeed : 1 / this.options.zoomSpeed;
        const result = calculateZoomPan(
          { panX: this.panX, panY: this.panY },
          this.scale,
          delta,
          cursorX,
          cursorY,
          this.options.minScale,
          this.options.maxScale
        );

        this.scale = result.scale;
        this.panX = result.panX;
        this.panY = result.panY;
        this.updateTransform();
      },
      { passive: false }
    );

    // 2. Mouse Drag (Pan)
    this.stage.addEventListener('mousedown', (e) => {
      // Permitir arrastre con botón izquierdo o botón central
      if (e.button === 0 || e.button === 1) {
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.initialPanX = this.panX;
        this.initialPanY = this.panY;
        this.stage.classList.add('dragging');
      }
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.stage.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Actualizar posición del cursor en HUD (en mm de patrón)
      const svgX = (mouseX - this.panX) / this.scale;
      const svgY = (mouseY - this.panY) / this.scale;
      if (this.hudCursorPos) {
        this.hudCursorPos.textContent = `X: ${svgX.toFixed(1)} mm, Y: ${svgY.toFixed(1)} mm`;
      }

      if (this.isDragging) {
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        this.panX = this.initialPanX + deltaX;
        this.panY = this.initialPanY + deltaY;
        this.updateTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.stage.classList.remove('dragging');
      }
    });

    // 3. Touch Drag & Pinch-to-zoom
    let initialTouchDistance = 0;
    let initialTouchScale = 1.0;

    this.stage.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.dragStartX = e.touches[0].clientX;
          this.dragStartY = e.touches[0].clientY;
          this.initialPanX = this.panX;
          this.initialPanY = this.panY;
        } else if (e.touches.length === 2) {
          this.isDragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          initialTouchDistance = Math.hypot(dx, dy);
          initialTouchScale = this.scale;
        }
      },
      { passive: true }
    );

    this.stage.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 1 && this.isDragging) {
          const deltaX = e.touches[0].clientX - this.dragStartX;
          const deltaY = e.touches[0].clientY - this.dragStartY;
          this.panX = this.initialPanX + deltaX;
          this.panY = this.initialPanY + deltaY;
          this.updateTransform();
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          if (initialTouchDistance > 0) {
            const factor = dist / initialTouchDistance;
            const rect = this.stage.getBoundingClientRect();
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

            const res = calculateZoomPan(
              { panX: this.panX, panY: this.panY },
              initialTouchScale,
              factor,
              midX,
              midY,
              this.options.minScale,
              this.options.maxScale
            );
            this.scale = res.scale;
            this.panX = res.panX;
            this.panY = res.panY;
            this.updateTransform();
          }
        }
      },
      { passive: true }
    );

    this.stage.addEventListener('touchend', () => {
      this.isDragging = false;
      initialTouchDistance = 0;
    });

    // 4. Redimensionado de ventana
    window.addEventListener('resize', () => {
      this.updateRulers();
    });
  }

  /**
   * Carga y renderiza una cadena SVG completa en el visor
   */
  loadSvg(svgText) {
    if (!svgText || typeof svgText !== 'string') return;
    this.rawSvgText = svgText;

    // Parsear el SVG recibido
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgRoot = doc.querySelector('svg');

    if (!svgRoot) {
      console.error('El contenido cargado no contiene un elemento <svg> válido');
      return;
    }

    this.bounds = parseSvgViewBox(svgText);

    // Ajustar viewBox del stageSvg para que coincida con el espacio natural
    this.stageSvg.setAttribute(
      'viewBox',
      `${this.bounds.minX} ${this.bounds.minY} ${this.bounds.width} ${this.bounds.height}`
    );

    // Inyectar contenido en el contenedor interno
    this.patternContent.innerHTML = svgRoot.innerHTML;

    // Aplicar interactividad sobre las piezas del patrón
    this.setupPieceInteractivity();

    // Actualizar cuadrícula si está activa
    this.updateGridOverlay();

    // Ajustar vista inicial automáticamente (Fit View)
    this.fitView();
  }

  /**
   * Agrega eventos de hover / selección a las piezas del patrón
   */
  setupPieceInteractivity() {
    const pieces = this.patternContent.querySelectorAll('.pattern-piece, g[data-part]');
    pieces.forEach((piece) => {
      piece.classList.add('interactive-piece');

      piece.addEventListener('mouseenter', (e) => {
        const partName = piece.getAttribute('data-part') || piece.id || 'Pieza';
        const labelEl = piece.querySelector('.labels text');
        const labelText = labelEl ? labelEl.textContent : partName.toUpperCase();

        if (this.tooltip) {
          this.tooltip.innerHTML = `<strong>${labelText}</strong><br><span class="badge">Pieza: ${partName}</span>`;
          this.tooltip.style.display = 'block';
        }
      });

      piece.addEventListener('mousemove', (e) => {
        if (this.tooltip && this.tooltip.style.display !== 'none') {
          const rect = this.container.getBoundingClientRect();
          this.tooltip.style.left = `${e.clientX - rect.left + 15}px`;
          this.tooltip.style.top = `${e.clientY - rect.top + 15}px`;
        }
      });

      piece.addEventListener('mouseleave', () => {
        if (this.tooltip) {
          this.tooltip.style.display = 'none';
        }
      });

      piece.addEventListener('click', (e) => {
        e.stopPropagation();
        const partName = piece.getAttribute('data-part') || piece.id;
        if (typeof this.options.onPieceSelect === 'function') {
          this.options.onPieceSelect(partName, piece);
        }
      });
    });
  }

  /**
   * Aplica la matriz de transformación actual a la capa SVG
   */
  updateTransform() {
    if (this.viewportTransform) {
      this.viewportTransform.setAttribute(
        'transform',
        `translate(${this.panX.toFixed(2)}, ${this.panY.toFixed(2)}) scale(${this.scale.toFixed(4)})`
      );
    }

    if (this.hudZoomLevel) {
      this.hudZoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
    }

    this.updateRulers();

    if (typeof this.options.onTransformChange === 'function') {
      this.options.onTransformChange({
        scale: this.scale,
        panX: this.panX,
        panY: this.panY,
      });
    }
  }

  /**
   * Centra y ajusta el patrón completo al área visible
   */
  fitView(padding = 30) {
    const rect = this.stage.getBoundingClientRect();
    const w = rect.width || this.container.clientWidth || 800;
    const h = rect.height || this.container.clientHeight || 600;

    const fit = calculateFitView(w, h, this.bounds, padding);
    this.scale = fit.scale;
    this.panX = fit.panX;
    this.panY = fit.panY;
    this.updateTransform();
  }

  /**
   * Restablece el zoom al 100% (escala 1.0) centrado
   */
  resetView() {
    const rect = this.stage.getBoundingClientRect();
    const w = rect.width || this.container.clientWidth || 800;
    const h = rect.height || this.container.clientHeight || 600;

    this.scale = 1.0;
    this.panX = (w - this.bounds.width) / 2 - this.bounds.minX;
    this.panY = (h - this.bounds.height) / 2 - this.bounds.minY;
    this.updateTransform();
  }

  /**
   * Acerca la vista (Zoom In)
   */
  zoomIn() {
    const rect = this.stage.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const res = calculateZoomPan(
      { panX: this.panX, panY: this.panY },
      this.scale,
      this.options.zoomSpeed,
      cx,
      cy,
      this.options.minScale,
      this.options.maxScale
    );
    this.scale = res.scale;
    this.panX = res.panX;
    this.panY = res.panY;
    this.updateTransform();
  }

  /**
   * Aleja la vista (Zoom Out)
   */
  zoomOut() {
    const rect = this.stage.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const res = calculateZoomPan(
      { panX: this.panX, panY: this.panY },
      this.scale,
      1 / this.options.zoomSpeed,
      cx,
      cy,
      this.options.minScale,
      this.options.maxScale
    );
    this.scale = res.scale;
    this.panX = res.panX;
    this.panY = res.panY;
    this.updateTransform();
  }

  /**
   * Configura la cuadrícula de paginación A4 / Letter
   * @param {'off' | 'A4' | 'letter'} format
   */
  setGrid(format) {
    this.activeGrid = format || 'off';
    this.updateGridOverlay();
  }

  /**
   * Actualiza los elementos gráficos de la cuadrícula de hojas
   */
  updateGridOverlay() {
    if (!this.overlayContent) return;

    if (this.activeGrid === 'off' || !this.activeGrid) {
      this.overlayContent.innerHTML = '';
      return;
    }

    const grid = calculateGridSheets(this.bounds, this.activeGrid);
    const gridSvg = generateGridOverlaySvg(grid, this.options.theme);
    this.overlayContent.innerHTML = gridSvg;
  }

  /**
   * Alterna la visibilidad de una capa de talla (XS..3XL)
   */
  toggleSizeLayer(size, visible) {
    if (visible) {
      this.visibleSizes.add(size);
    } else {
      this.visibleSizes.delete(size);
    }

    const sizeElements = this.patternContent.querySelectorAll(
      `.size-${size}, [data-size="${size}"]`
    );
    sizeElements.forEach((el) => {
      el.style.display = visible ? '' : 'none';
    });
  }

  /**
   * Resalta visualmente una talla específica con su color temático
   */
  highlightSize(size) {
    this.highlightedSize = size;
    const pieces = this.patternContent.querySelectorAll('.pattern-piece');

    pieces.forEach((p) => {
      const pieceSize = p.getAttribute('data-size') || 'M';
      if (!size || pieceSize === size) {
        p.style.opacity = '1';
        p.style.filter = 'none';
      } else {
        p.style.opacity = '0.35';
        p.style.filter = 'grayscale(60%)';
      }
    });
  }

  /**
   * Resalta y verifica el Cuadro de Calibración 10x10 cm en pantalla
   */
  highlightCalibrationBox(shouldHighlight = true) {
    const calibBox = this.patternContent.querySelector(
      '#calibration-box, .calibration-box, g[id*="calib"]'
    );
    if (!calibBox) return false;

    if (shouldHighlight) {
      calibBox.classList.add('calibration-highlighted');
      // Enfocar suavemente el cuadro de calibración
      const boxBounds = { minX: 20, minY: 20, width: 100, height: 100 };
      const rect = this.stage.getBoundingClientRect();
      const fit = calculateFitView(rect.width, rect.height, boxBounds, 60);
      this.scale = Math.min(fit.scale, 4.0);
      this.panX = fit.panX;
      this.panY = fit.panY;
      this.updateTransform();
    } else {
      calibBox.classList.remove('calibration-highlighted');
    }
    return true;
  }

  /**
   * Dibuja las reglas métricas graduadas (X superior e Y izquierda)
   */
  updateRulers() {
    if (!this.showRulers || !this.rulerTop || !this.rulerLeft) return;

    const rulerW = this.stage.clientWidth || 800;
    const rulerH = this.stage.clientHeight || 600;

    // Regla Superior (Eje X)
    this.rulerTop.width = rulerW;
    this.rulerTop.height = 24;
    const ctxX = this.rulerTop.getContext('2d');
    if (ctxX) {
      ctxX.clearRect(0, 0, rulerW, 24);
      ctxX.fillStyle = this.options.theme === 'dark' ? '#0f172a' : '#f8fafc';
      ctxX.fillRect(0, 0, rulerW, 24);
      ctxX.strokeStyle = this.options.theme === 'dark' ? '#334155' : '#cbd5e1';
      ctxX.lineWidth = 1;
      ctxX.beginPath();
      ctxX.moveTo(0, 23.5);
      ctxX.lineTo(rulerW, 23.5);
      ctxX.stroke();

      // Dibujar marcas graduadas
      const startMmX = -this.panX / this.scale;
      const endMmX = (rulerW - this.panX) / this.scale;
      const stepMm = this.scale > 3 ? 5 : this.scale > 0.8 ? 10 : this.scale > 0.2 ? 50 : 100;

      const firstTick = Math.floor(startMmX / stepMm) * stepMm;
      ctxX.font = '9px monospace';
      ctxX.fillStyle = this.options.theme === 'dark' ? '#94a3b8' : '#475569';
      ctxX.textAlign = 'center';

      for (let mm = firstTick; mm <= endMmX; mm += stepMm) {
        const screenX = this.panX + mm * this.scale;
        const isMajor = mm % 100 === 0;
        const isMedium = mm % 50 === 0;
        const tickH = isMajor ? 14 : isMedium ? 10 : 6;

        ctxX.beginPath();
        ctxX.moveTo(screenX, 24 - tickH);
        ctxX.lineTo(screenX, 24);
        ctxX.stroke();

        if (isMajor || (this.scale > 1.2 && isMedium)) {
          ctxX.fillText(`${mm / 10}`, screenX, 9);
        }
      }
    }

    // Regla Izquierda (Eje Y)
    this.rulerLeft.width = 24;
    this.rulerLeft.height = rulerH;
    const ctxY = this.rulerLeft.getContext('2d');
    if (ctxY) {
      ctxY.clearRect(0, 0, 24, rulerH);
      ctxY.fillStyle = this.options.theme === 'dark' ? '#0f172a' : '#f8fafc';
      ctxY.fillRect(0, 0, 24, rulerH);
      ctxY.strokeStyle = this.options.theme === 'dark' ? '#334155' : '#cbd5e1';
      ctxY.lineWidth = 1;
      ctxY.beginPath();
      ctxY.moveTo(23.5, 0);
      ctxY.lineTo(23.5, rulerH);
      ctxY.stroke();

      const startMmY = -this.panY / this.scale;
      const endMmY = (rulerH - this.panY) / this.scale;
      const stepMm = this.scale > 3 ? 5 : this.scale > 0.8 ? 10 : this.scale > 0.2 ? 50 : 100;

      const firstTick = Math.floor(startMmY / stepMm) * stepMm;
      ctxY.font = '9px monospace';
      ctxY.fillStyle = this.options.theme === 'dark' ? '#94a3b8' : '#475569';
      ctxY.textAlign = 'right';

      for (let mm = firstTick; mm <= endMmY; mm += stepMm) {
        const screenY = this.panY + mm * this.scale;
        const isMajor = mm % 100 === 0;
        const isMedium = mm % 50 === 0;
        const tickW = isMajor ? 14 : isMedium ? 10 : 6;

        ctxY.beginPath();
        ctxY.moveTo(24 - tickW, screenY);
        ctxY.lineTo(24, screenY);
        ctxY.stroke();

        if (isMajor || (this.scale > 1.2 && isMedium)) {
          ctxY.save();
          ctxY.translate(10, screenY + 3);
          ctxY.rotate(-Math.PI / 2);
          ctxY.fillText(`${mm / 10}`, 0, 0);
          ctxY.restore();
        }
      }
    }
  }

  /**
   * Cambia el tema entre 'dark' y 'light'
   */
  setTheme(theme) {
    this.options.theme = theme;
    this.container.classList.remove('theme-dark', 'theme-light');
    this.container.classList.add(`theme-${theme}`);
    this.updateGridOverlay();
    this.updateRulers();
  }

  /**
   * Libera recursos y remueve listeners
   */
  destroy() {
    this.container.innerHTML = '';
  }
}

// Exportación global para navegadores directos
if (typeof window !== 'undefined') {
  window.PatternViewer = PatternViewer;
  window.calculateZoomPan = calculateZoomPan;
  window.calculateFitView = calculateFitView;
  window.calculateGridSheets = calculateGridSheets;
  window.parseSvgViewBox = parseSvgViewBox;
  window.formatMillimeters = formatMillimeters;
}
