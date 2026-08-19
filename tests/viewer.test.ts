/**
 * tests/viewer.test.ts
 * Suite de Pruebas Unitarias y de Integración para el Visor Vectorial 2D y Frontend
 * pattern-ai-core
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  calculateZoomPan,
  calculateFitView,
  calculateGridSheets,
  parseSvgViewBox,
  getRowLabel,
  formatMillimeters,
  generateGridOverlaySvg,
  MM_TO_PT,
  CALIBRATION_BOX_MM,
  CALIBRATION_BOX_PT,
} from '../src/server/public/viewer.js';
import { startServer, RunningServerInfo } from '../src/server/index.js';

describe('Visor Vectorial 2D Interactivo y Transformaciones Matemáticas (viewer.js)', () => {
  // =========================================================================
  // 1. VERIFICACIÓN DE INTEGRIDAD DE ARCHIVOS FRONTEND
  // =========================================================================
  it('1.1 Archivos estáticos del frontend existen y no están vacíos', () => {
    const publicDir = path.resolve('src/server/public');
    const requiredFiles = [
      'index.html',
      'style.css',
      'app.js',
      'viewer.js',
      'viewer.css',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(publicDir, file);
      expect(fs.existsSync(filePath), `Archivo ${file} debe existir en ${publicDir}`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size, `Archivo ${file} no debe estar vacío`).toBeGreaterThan(100);
    }
  });

  // =========================================================================
  // 2. MATEMÁTICAS DE ZOOM CENTRADO EN CURSOR (calculateZoomPan)
  // =========================================================================
  describe('2. Zoom Centrado en Cursor', () => {
    it('2.1 Acerca el zoom manteniendo el punto bajo el cursor en la misma posición relativa', () => {
      const currentPan = { panX: 100, panY: 50 };
      const currentScale = 1.0;
      const scaleFactor = 2.0; // Zoom 2x
      const cursorX = 300;
      const cursorY = 250;

      const result = calculateZoomPan(currentPan, currentScale, scaleFactor, cursorX, cursorY);

      expect(result.scale).toBe(2.0);

      // Punto en el espacio SVG antes del zoom:
      // Px = (300 - 100) / 1.0 = 200
      // Py = (250 - 50) / 1.0 = 200
      // Nuevo pan:
      // newPanX = 300 - 200 * 2.0 = -100
      // newPanY = 250 - 200 * 2.0 = -150
      expect(result.panX).toBe(-100);
      expect(result.panY).toBe(-150);

      // Verificación de invariante: En la nueva escala y pan, el punto (200, 200) mapea exactamente al cursor (300, 250)
      const mappedX = result.panX + 200 * result.scale;
      const mappedY = result.panY + 200 * result.scale;
      expect(mappedX).toBe(cursorX);
      expect(mappedY).toBe(cursorY);
    });

    it('2.2 Aleja el zoom correctamente centrado en el cursor', () => {
      const currentPan = { panX: -100, panY: -150 };
      const currentScale = 2.0;
      const scaleFactor = 0.5; // Zoom out 0.5x -> regresa a 1.0
      const cursorX = 300;
      const cursorY = 250;

      const result = calculateZoomPan(currentPan, currentScale, scaleFactor, cursorX, cursorY);

      expect(result.scale).toBe(1.0);
      expect(result.panX).toBe(100);
      expect(result.panY).toBe(50);
    });

    it('2.3 Respeta los límites mínimos (minScale) y máximos (maxScale)', () => {
      const currentPan = { panX: 0, panY: 0 };
      
      // Intentar reducir por debajo del mínimo (0.05)
      const minRes = calculateZoomPan(currentPan, 0.05, 0.1, 400, 300, 0.05, 30.0);
      expect(minRes.scale).toBe(0.05);

      // Intentar ampliar por encima del máximo (30.0)
      const maxRes = calculateZoomPan(currentPan, 25.0, 2.0, 400, 300, 0.05, 30.0);
      expect(maxRes.scale).toBe(30.0);
    });
  });

  // =========================================================================
  // 3. MATEMÁTICAS DE AJUSTE A PANTALLA (calculateFitView)
  // =========================================================================
  describe('3. Ajuste Automático al Viewport (Fit View)', () => {
    it('3.1 Calcula la escala y paneo para centrar un contenido más ancho que alto', () => {
      const viewportW = 1000;
      const viewportH = 600;
      const bounds = { minX: 0, minY: 0, width: 800, height: 400 };
      const padding = 50;

      const fit = calculateFitView(viewportW, viewportH, bounds, padding);

      // Área disponible: W = 1000 - 100 = 900; H = 600 - 100 = 500
      // scaleX = 900 / 800 = 1.125
      // scaleY = 500 / 400 = 1.25
      // scale esperado = min(1.125, 1.25) = 1.125
      expect(fit.scale).toBeCloseTo(1.125, 3);

      // Ancho renderizado: 800 * 1.125 = 900. Centrado en 1000 -> panX = (1000 - 900) / 2 = 50
      expect(fit.panX).toBeCloseTo(50, 3);
      // Alto renderizado: 400 * 1.125 = 450. Centrado en 600 -> panY = (600 - 450) / 2 = 75
      expect(fit.panY).toBeCloseTo(75, 3);
    });

    it('3.2 Calcula la escala y paneo para centrar un contenido más alto que ancho', () => {
      const viewportW = 800;
      const viewportH = 1000;
      const bounds = { minX: 100, minY: 50, width: 400, height: 800 };
      const padding = 20;

      const fit = calculateFitView(viewportW, viewportH, bounds, padding);

      // Área disponible: W = 760; H = 960
      // scaleX = 760 / 400 = 1.9
      // scaleY = 960 / 800 = 1.2
      // scale esperado = min(1.9, 1.2) = 1.2
      expect(fit.scale).toBeCloseTo(1.2, 3);
      expect(fit.panX).toBeDefined();
      expect(fit.panY).toBeDefined();
    });
  });

  // =========================================================================
  // 4. MATEMÁTICAS DE CUADRÍCULA DE PAGINACIÓN A4 Y LETTER (calculateGridSheets)
  // =========================================================================
  describe('4. Cuadrícula de Paginación A4 / US Letter', () => {
    it('4.1 Calcula grilla A4 (190x277 mm imprimibles) correctamente', () => {
      // Patrón de 500 mm ancho x 700 mm alto
      const bounds = { minX: 0, minY: 0, width: 500, height: 700 };
      const grid = calculateGridSheets(bounds, 'A4', 10);

      // cols = ceil(500 / 190) = 3
      // rows = ceil(700 / 277) = 3
      // totalSheets = 3 * 3 = 9
      expect(grid.format).toBe('A4');
      expect(grid.cols).toBe(3);
      expect(grid.rows).toBe(3);
      expect(grid.totalSheets).toBe(9);
      expect(grid.sheets.length).toBe(9);

      // Verificar nomenclatura alfanumérica de hojas
      expect(grid.sheets[0].id).toBe('A1');
      expect(grid.sheets[1].id).toBe('A2');
      expect(grid.sheets[2].id).toBe('A3');
      expect(grid.sheets[3].id).toBe('B1');
      expect(grid.sheets[4].id).toBe('B2');
      expect(grid.sheets[8].id).toBe('C3');
    });

    it('4.2 Calcula grilla US Letter (195.9x259.4 mm imprimibles) correctamente', () => {
      const bounds = { minX: 0, minY: 0, width: 400, height: 600 };
      const grid = calculateGridSheets(bounds, 'letter', 10);

      // cols = ceil(400 / 195.9) = 3
      // rows = ceil(600 / 259.4) = 3
      expect(grid.format).toBe('letter');
      expect(grid.cols).toBe(3);
      expect(grid.rows).toBe(3);
      expect(grid.totalSheets).toBe(9);
      expect(grid.printableW).toBeCloseTo(195.9, 1);
      expect(grid.printableH).toBeCloseTo(259.4, 1);
    });

    it('4.3 getRowLabel genera etiquetas alfanuméricas estándar (A..Z, AA...)', () => {
      expect(getRowLabel(0)).toBe('A');
      expect(getRowLabel(1)).toBe('B');
      expect(getRowLabel(25)).toBe('Z');
      expect(getRowLabel(26)).toBe('AA');
      expect(getRowLabel(27)).toBe('AB');
    });

    it('4.4 generateGridOverlaySvg produce SVG válido con rectángulos y badges', () => {
      const bounds = { minX: 0, minY: 0, width: 380, height: 500 };
      const grid = calculateGridSheets(bounds, 'A4', 10);
      const svg = generateGridOverlaySvg(grid, 'dark');

      expect(svg).toContain('class="pagination-grid-layer"');
      expect(svg).toContain('data-sheet-id="A1"');
      expect(svg).toContain('data-sheet-id="A2"');
      expect(svg).toContain('<rect');
      expect(svg).toContain('<text');
    });
  });

  // =========================================================================
  // 5. PARSEADOR DE VIEWBOX Y FORMATEO MÉTRICO
  // =========================================================================
  describe('5. Utilidades Geométricas del Visor', () => {
    it('5.1 parseSvgViewBox extrae correctamente las coordenadas y dimensiones', () => {
      const svg1 = '<svg viewBox="0 0 1200 800" width="1200mm" height="800mm"></svg>';
      const b1 = parseSvgViewBox(svg1);
      expect(b1.minX).toBe(0);
      expect(b1.minY).toBe(0);
      expect(b1.width).toBe(1200);
      expect(b1.height).toBe(800);
      expect(b1.maxX).toBe(1200);
      expect(b1.maxY).toBe(800);

      const svg2 = '<svg width="500" height="400"><g></g></svg>';
      const b2 = parseSvgViewBox(svg2);
      expect(b2.width).toBe(500);
      expect(b2.height).toBe(400);
    });

    it('5.2 formatMillimeters formatea longitudes textiles en mm, cm y m', () => {
      expect(formatMillimeters(5)).toBe('5.0 mm');
      expect(formatMillimeters(100)).toBe('10.0 cm (100 mm)');
      expect(formatMillimeters(1500)).toBe('1.50 m (1500 mm)');
    });

    it('5.3 Constantes de calibración respetan la escala 1:1 vectorial', () => {
      expect(CALIBRATION_BOX_MM).toBe(100);
      expect(CALIBRATION_BOX_PT).toBeCloseTo(283.465, 2);
    });
  });
});

// =========================================================================
// 6. INTEGRACIÓN SERVIDOR HTTP: SERVIDO DE ASSETS Y ENDPOINTS DE DESCARGA
// =========================================================================
describe('Servidor HTTP y Endpoints de Frontend & Descargas', () => {
  const testOutputDir = path.resolve('output/test_viewer_server');
  let runningServer: RunningServerInfo;
  let baseUrl: string;

  beforeAll(async () => {
    if (fs.existsSync(testOutputDir)) {
      await fs.promises.rm(testOutputDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(testOutputDir, { recursive: true });

    runningServer = await startServer({
      port: 0,
      host: '127.0.0.1',
      outputDir: testOutputDir,
      open: false,
    });

    baseUrl = runningServer.url;

    // Generar un patrón de prueba para verificar descargas directas
    await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Sudadera oversize streetwear con capucha cruzada',
        provider: 'mock',
        sizes: ['S', 'M', 'L'],
        bundle: true,
      }),
    });
  });

  afterAll(async () => {
    if (runningServer) {
      await runningServer.close();
    }
    if (fs.existsSync(testOutputDir)) {
      await fs.promises.rm(testOutputDir, { recursive: true, force: true });
    }
  });

  it('6.1 Sirve index.html como HTML principal con Content-Type correcto', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('pattern-ai-core');
    expect(html).toContain('viewer.js');
    expect(html).toContain('viewer.css');
  });

  it('6.2 Sirve viewer.js y viewer.css como recursos estáticos válidos', async () => {
    const resJs = await fetch(`${baseUrl}/viewer.js`);
    expect(resJs.status).toBe(200);
    expect(resJs.headers.get('content-type')).toContain('application/javascript');
    const jsText = await resJs.text();
    expect(jsText).toContain('PatternViewer');
    expect(jsText).toContain('calculateZoomPan');

    const resCss = await fetch(`${baseUrl}/viewer.css`);
    expect(resCss.status).toBe(200);
    expect(resCss.headers.get('content-type')).toContain('text/css');
  });

  it('6.3 Sirve app.js y style.css correctamente', async () => {
    const resApp = await fetch(`${baseUrl}/app.js`);
    expect(resApp.status).toBe(200);
    expect(resApp.headers.get('content-type')).toContain('application/javascript');

    const resStyle = await fetch(`${baseUrl}/style.css`);
    expect(resStyle.status).toBe(200);
    expect(resStyle.headers.get('content-type')).toContain('text/css');
  });

  it('6.4 GET /api/patterns/:concept/download/a4 descarga el PDF A4 paginado', async () => {
    const res = await fetch(`${baseUrl}/api/patterns/streetwear_oversize_hoodie/download/a4`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    expect(res.headers.get('content-disposition')).toContain('_tiled_a4.pdf');

    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('6.5 GET /api/patterns/:concept/download/letter descarga el PDF Letter paginado', async () => {
    const res = await fetch(`${baseUrl}/api/patterns/streetwear_oversize_hoodie/download/letter`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('_tiled_letter.pdf');
  });

  it('6.6 GET /api/patterns/:concept/download/a0 descarga el PDF Plotter A0', async () => {
    const res = await fetch(`${baseUrl}/api/patterns/streetwear_oversize_hoodie/download/a0`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('_plotter_a0.pdf');
  });

  it('6.7 GET /api/patterns/:concept/download/svg descarga el archivo SVG vectorial', async () => {
    const res = await fetch(`${baseUrl}/api/patterns/streetwear_oversize_hoodie/download/svg`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');
    expect(res.headers.get('content-disposition')).toContain('_continuous.svg');
  });

  it('6.8 GET /api/patterns/:concept/download/techpack-pdf descarga la Ficha Técnica en PDF', async () => {
    const res = await fetch(`${baseUrl}/api/patterns/streetwear_oversize_hoodie/download/techpack-pdf`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('_techpack.pdf');
  });

  it('6.9 GET /api/patterns/:concept/download/inexistente devuelve 404', async () => {
    const res = await fetch(`${baseUrl}/api/patterns/streetwear_oversize_hoodie/download/formato_invalido_xyz`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('no encontrado');
  });
});
