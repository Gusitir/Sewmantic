/**
 * tests/server.test.ts
 * Suite de Pruebas Unitarias y de Integración para el Servidor HTTP y API REST
 * pattern-ai-core
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { startServer, RunningServerInfo } from '../src/server/index.js';

describe('Servidor API REST Local y Endpoints del Motor (HTTP Native)', () => {
  const testOutputDir = path.resolve('output/test_server_api');
  let runningServer: RunningServerInfo;
  let baseUrl: string;

  beforeAll(async () => {
    // Limpieza de carpeta de prueba
    if (fs.existsSync(testOutputDir)) {
      await fs.promises.rm(testOutputDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(testOutputDir, { recursive: true });

    // Levantar servidor en puerto efímero (port: 0)
    runningServer = await startServer({
      port: 0,
      host: '127.0.0.1',
      outputDir: testOutputDir,
      open: false,
    });

    baseUrl = runningServer.url;
  });

  afterAll(async () => {
    // Cerrar servidor limpiamente
    if (runningServer) {
      await runningServer.close();
    }

    // Limpiar carpeta de prueba
    if (fs.existsSync(testOutputDir)) {
      await fs.promises.rm(testOutputDir, { recursive: true, force: true });
    }
  });

  // ==========================================
  // 1. ENDPOINT: GET /api/status
  // ==========================================
  it('GET /api/status - devuelve información técnica de versión, proveedores y tallas', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.version).toBe('0.1.0');
    expect(data.supportedProviders).toContain('mock');
    expect(data.supportedProviders).toContain('api');
    expect(data.standardSizes).toEqual(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']);
    expect(data.supportedBlocks).toContain('menswear_torso_oversize');
    expect(data.supportedBlocks).toContain('wahid');
    expect(data.supportedBlocks).toContain('simon');
    expect(data.supportedBlocks).toContain('brian');
    expect(data.supportedBlocks).toContain('bella');
    expect(data.supportedBlocks).toContain('paco');
    expect(data.supportedBlocks).toContain('sandy');
    expect(data.supportedBlocks).toContain('shin');
    expect(data.engine).toContain('FreeSewing v3');
  });

  // ==========================================
  // 2. ENDPOINT: GET /api/presets
  // ==========================================
  it('GET /api/presets - devuelve la lista de plantillas y slopers disponibles', async () => {
    const res = await fetch(`${baseUrl}/api/presets`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.count).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(data.presets)).toBe(true);

    const hoodie = data.presets.find((p: any) => p.id === 'hoodie');
    expect(hoodie).toBeDefined();
    expect(hoodie.concept_name).toBe('streetwear_oversize_hoodie');
    expect(hoodie.base_block).toBe('menswear_torso_oversize');
    expect(hoodie.dna).toBeDefined();

    const tshirt = data.presets.find((p: any) => p.id === 'tshirt');
    expect(tshirt).toBeDefined();
    expect(tshirt.base_block).toBe('tshirt_sloper');
  });

  // ==========================================
  // 3. CORS Y PREFLIGHT (OPTIONS)
  // ==========================================
  it('OPTIONS /api/status - responde 204 con cabeceras CORS habilitadas', async () => {
    const res = await fetch(`${baseUrl}/api/status`, {
      method: 'OPTIONS',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toContain('GET');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
  });

  // ==========================================
  // 4. ENDPOINT: POST /api/generate
  // ==========================================
  it('POST /api/generate - orquesta el pipeline completo con proveedor mock y genera archivos', async () => {
    const payload = {
      prompt: 'Sudadera streetwear oversize anime con capucha cruzada',
      provider: 'mock',
      sizes: ['S', 'M', 'L'],
      measurements: { chest_circumference_mm: 1040 },
      bundle: true,
      wasteFactor: 0.15,
    };

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.conceptSlug).toBe('streetwear_oversize_hoodie');
    expect(data.files).toBeDefined();
    expect(data.files.continuousSvg).toBeDefined();
    expect(data.files.techpackJson).toBeDefined();
    expect(data.files.etsyBundleZip).toBeDefined();
    expect(data.stats.totalParts).toBeGreaterThanOrEqual(4);
    expect(data.bundle).toBeDefined();

    // Verificar existencia física en disco
    expect(fs.existsSync(data.files.continuousSvg)).toBe(true);
    expect(fs.existsSync(data.files.techpackJson)).toBe(true);
    expect(fs.existsSync(data.files.etsyBundleZip)).toBe(true);
  });

  it('POST /api/generate - respeta el parámetro base_block / blueprint (Wahid -> Chaleco)', async () => {
    const payload = {
      prompt: 'Chaleco de sastre clásico entallado',
      provider: 'mock',
      base_block: 'wahid',
      sizes: ['M', 'L'],
    };

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.conceptSlug).toBe('straw_pirate_adventurer_vest');
    expect(data.dna.base_block).toBe('menswear_torso_fitted');
    expect(data.dna.modifications.sleeves?.type).toBe('sleeveless');
  });

  it('POST /api/generate - respeta el parámetro base_block / blueprint (Paco -> Bermuda)', async () => {
    const payload = {
      prompt: 'Bermuda vaquera con vuelta',
      provider: 'mock',
      blueprint: 'paco',
      sizes: ['M'],
    };

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.conceptSlug).toBe('straw_pirate_denim_shorts');
    expect(data.dna.base_block).toBe('pants_sloper');
  });

  it('POST /api/generate - respeta el parámetro base_block / blueprint (Sandy -> Falda)', async () => {
    const payload = {
      prompt: 'Falda evasé midi',
      provider: 'mock',
      base_block: 'sandy',
      sizes: ['S', 'M'],
    };

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.conceptSlug).toBe('sandy_flared_skirt');
    expect(data.dna.base_block).toBe('skirt_sloper');
    expect(data.dna.garment_category).toBe('bottom');
  });

  // ==========================================
  // 5. ENDPOINT: GET /api/patterns
  // ==========================================
  it('GET /api/patterns - lista los patrones generados en output/ con metadatos', async () => {
    const res = await fetch(`${baseUrl}/api/patterns`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.patterns)).toBe(true);

    const pattern = data.patterns.find((p: any) => p.concept_slug === 'streetwear_oversize_hoodie');
    expect(pattern).toBeDefined();
    expect(pattern.concept_slug).toBe('streetwear_oversize_hoodie');
    expect(pattern.hasSvg).toBe(true);
    expect(pattern.hasTechpack).toBe(true);
    expect(pattern.hasBundle).toBe(true);
    expect(pattern.files.continuousSvg).toBeDefined();
    expect(pattern.files.continuousSvg.sizeBytes).toBeGreaterThan(0);
  });

  // ==========================================
  // 6. ENDPOINT: GET /api/patterns/:concept/svg
  // ==========================================
  it('GET /api/patterns/:concept/svg - devuelve el SVG vectorial continuo', async () => {
    const res = await fetch(`${baseUrl}/api/patterns/streetwear_oversize_hoodie/svg`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/svg+xml');

    const svgText = await res.text();
    expect(svgText).toContain('<svg');
    expect(svgText).toContain('</svg>');
    expect(svgText).toContain('data-part="front"');
    expect(svgText).toContain('data-part="sleeve"');
  });

  // ==========================================
  // 7. ENDPOINT: GET /api/patterns/:concept/techpack
  // ==========================================
  it('GET /api/patterns/:concept/techpack - devuelve la ficha técnica en JSON', async () => {
    const res = await fetch(
      `${baseUrl}/api/patterns/streetwear_oversize_hoodie/techpack`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');

    const techpack = await res.json();
    expect(techpack.conceptName).toContain('hoodie');
    expect(techpack.fabricConsumption).toBeDefined();
    expect(techpack.fabricConsumption.averageLinearMeters).toBeGreaterThan(0);
    expect(techpack.cuttingPieces.length).toBeGreaterThan(0);
    expect(techpack.finishedMeasurements.length).toBeGreaterThan(0);
    expect(techpack.notions.length).toBeGreaterThan(0);
    expect(techpack.assemblySequence.length).toBeGreaterThan(0);
  });

  // ==========================================
  // 8. ENDPOINT: GET /api/patterns/:concept/bundle
  // ==========================================
  it('GET /api/patterns/:concept/bundle - descarga el archivo ZIP comercial para Etsy', async () => {
    const res = await fetch(
      `${baseUrl}/api/patterns/streetwear_oversize_hoodie/bundle`
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    expect(res.headers.get('content-disposition')).toContain('.zip');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // Verificación de firma mágica PK (0x50 0x4B 0x03 0x04) de archivos ZIP
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  // ==========================================
  // 9. ENDPOINT: POST /api/bundle
  // ==========================================
  it('POST /api/bundle - empaqueta un concepto existente y retorna metadatos', async () => {
    const res = await fetch(`${baseUrl}/api/bundle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_name: 'streetwear_oversize_hoodie',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.bundle.zipPath).toBeDefined();
    expect(data.bundle.bundledFiles.length).toBeGreaterThanOrEqual(5);
    expect(data.bundle.metadata.tags.length).toBe(13);
  });

  // ==========================================
  // 10. MANEJO DE ERRORES Y CASOS BORDE
  // ==========================================
  it('Manejo de errores: 404 en SVG de concepto inexistente', async () => {
    const res = await fetch(`${baseUrl}/api/patterns/concepto_fantasma_xyz/svg`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('No se encontró el patrón');
  });

  it('Manejo de errores: 404 en Techpack de concepto inexistente', async () => {
    const res = await fetch(
      `${baseUrl}/api/patterns/concepto_fantasma_xyz/techpack`
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('No se encontró el patrón');
  });

  it('Manejo de errores: 404 en Bundle ZIP de concepto inexistente', async () => {
    const res = await fetch(
      `${baseUrl}/api/patterns/concepto_fantasma_xyz/bundle`
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('No se encontró el patrón');
  });

  it('Manejo de errores: 400 en POST /api/generate sin prompt ni directDna', async () => {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('prompt');
  });

  it('Manejo de errores: 500 en POST /api/generate con proveedor inválido devuelve success: false y details', async () => {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Camiseta de prueba de fallo',
        provider: 'proveedor_inexistente_xyz',
      }),
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('proveedor_inexistente_xyz');
    expect(data.details).toBeDefined();
    expect(typeof data.details).toBe('string');
  });

  it('Manejo de errores: 400 en POST /api/bundle sin concept_name', async () => {
    const res = await fetch(`${baseUrl}/api/bundle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('concept_name');
  });

  it('Manejo de errores: 404 en endpoint de API desconocido', async () => {
    const res = await fetch(`${baseUrl}/api/ruta_no_existente`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Endpoint de API no encontrado');
  });

  // ==========================================
  // 11. SERVIDO DE ARCHIVOS ESTÁTICOS (WEB UI)
  // ==========================================
  it('GET / - sirve la interfaz web HTML principal', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('pattern-ai-core');
    expect(html).toContain('Generar Moldería Textil IA');
  });
});
