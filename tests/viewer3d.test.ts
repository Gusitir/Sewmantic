/**
 * tests/viewer3d.test.ts
 * Suite de Pruebas Automatizadas para el Visor 3D WebGL, Endpoint .glb y Empaquetado 3D
 * pattern-ai-core - Tarea T-24
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startServer,
  RunningServerInfo,
  generatePatternPipeline,
  createEtsyBundle,
  PatternDna,
} from '../src/index.js';

const TEST_3D_DIR = path.resolve('tests/output_viewer3d_test');

/**
 * Función auxiliar para extraer los nombres de entradas del directorio central de un archivo ZIP
 */
function extractZipEntries(zipBuffer: Buffer): string[] {
  const entries: string[] = [];
  let offset = 0;
  while (offset < zipBuffer.length - 4) {
    if (zipBuffer.readUInt32LE(offset) === 0x02014b50) {
      const fileNameLen = zipBuffer.readUInt16LE(offset + 28);
      const extraLen = zipBuffer.readUInt16LE(offset + 30);
      const commentLen = zipBuffer.readUInt16LE(offset + 32);
      const fileName = zipBuffer.toString('utf8', offset + 46, offset + 46 + fileNameLen);
      entries.push(fileName);
      offset += 46 + fileNameLen + extraLen + commentLen;
    } else {
      offset++;
    }
  }
  return entries;
}

describe('Visor 3D WebGL, Streaming .GLB y Empaquetado Comercial 3D (T-24)', () => {
  let serverInfo: RunningServerInfo;
  let baseUrl: string;

  beforeAll(async () => {
    if (fs.existsSync(TEST_3D_DIR)) {
      await fs.promises.rm(TEST_3D_DIR, { recursive: true, force: true });
    }
    await fs.promises.mkdir(TEST_3D_DIR, { recursive: true });

    // Iniciar servidor de prueba en puerto efímero
    serverInfo = await startServer({
      port: 0,
      outputDir: TEST_3D_DIR,
      version: '0.1.0-test',
    });
    baseUrl = serverInfo.url;
  });

  afterAll(async () => {
    if (serverInfo) {
      await serverInfo.close();
    }
    if (fs.existsSync(TEST_3D_DIR)) {
      await fs.promises.rm(TEST_3D_DIR, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // 1. Servicio de Archivos Estáticos del Visor 3D
  // =========================================================================
  describe('1. Static Assets del Visor 3D en Servidor Web Studio', () => {
    it('sirve correctamente viewer3d.js con Content-Type: application/javascript', async () => {
      const res = await fetch(`${baseUrl}/viewer3d.js`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/javascript');
      const text = await res.text();
      expect(text).toContain('GarmentViewer3D');
      expect(text).toContain('FABRIC_PRESETS');
      expect(text).toContain('parseGlbBuffer');
    });

    it('sirve correctamente viewer3d.css con Content-Type: text/css', async () => {
      const res = await fetch(`${baseUrl}/viewer3d.css`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/css');
      const text = await res.text();
      expect(text).toContain('.pac-viewer3d-container');
      expect(text).toContain('.viewer3d-viewport');
      expect(text).toContain('.viewer3d-floating-toolbar');
    });

    it('index.html incluye los enlaces del visor 3D y la pestaña interactiva', async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('viewer3d.css');
      expect(html).toContain('viewer3d.js');
      expect(html).toContain('id="tabBtn3D"');
      expect(html).toContain('id="view3d"');
      expect(html).toContain('id="viewer3dStage"');
      expect(html).toContain('id="downloadGlbBtn"');
    });
  });

  // =========================================================================
  // 2. Generación Automatizada en Pipeline End-to-End
  // =========================================================================
  describe('2. Pipeline End-to-End con Generación Automática .GLB', () => {
    it('produce automáticamente el archivo .glb y lo mapea en result.files.glb', async () => {
      const result = await generatePatternPipeline({
        prompt: 'Sudadera oversize streetwear anime con capucha',
        provider: 'mock',
        outputDir: TEST_3D_DIR,
        sizes: ['M', 'L'],
        bundle: true,
      });

      expect(result.success).toBe(true);
      expect(result.files.glb).toBeDefined();
      expect(fs.existsSync(result.files.glb!)).toBe(true);

      const glbBuffer = await fs.promises.readFile(result.files.glb!);
      expect(glbBuffer.length).toBeGreaterThan(1000);

      // Validar Magic Bytes glTF 2.0 (0x46546C67 'glTF')
      expect(glbBuffer.readUInt32LE(0)).toBe(0x46546c67);
      expect(glbBuffer.readUInt32LE(4)).toBe(2); // Version 2
      expect(glbBuffer.readUInt32LE(8)).toBe(glbBuffer.length); // Total length
    });
  });

  // =========================================================================
  // 3. Endpoint REST GET /api/patterns/:concept/glb
  // =========================================================================
  describe('3. Endpoint REST Streaming de Modelos 3D (.glb)', () => {
    it('sirve el archivo .glb con Content-Type: model/gltf-binary vía GET /api/patterns/:concept/glb', async () => {
      const conceptSlug = 'streetwear_oversize_hoodie';
      const res = await fetch(`${baseUrl}/api/patterns/${conceptSlug}/glb`);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('model/gltf-binary');
      expect(res.headers.get('access-control-allow-origin')).toBe('*');

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      expect(buf.readUInt32LE(0)).toBe(0x46546c67); // Magic 'glTF'
      expect(buf.readUInt32LE(4)).toBe(2);
    });

    it('permite la descarga directa vía GET /api/patterns/:concept/download/glb', async () => {
      const conceptSlug = 'streetwear_oversize_hoodie';
      const res = await fetch(`${baseUrl}/api/patterns/${conceptSlug}/download/glb`);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('model/gltf-binary');
      expect(res.headers.get('content-disposition')).toContain('attachment');
    });

    it('retorna 404 para un concepto que no existe', async () => {
      const res = await fetch(`${baseUrl}/api/patterns/non_existent_garment_xyz/glb`);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. Empaquetado Comercial Etsy con Estructura de 7 Carpetas
  // =========================================================================
  describe('4. Empaquetado Comercial Etsy con Assets 3D (07_3D_Interactive_Model/)', () => {
    it('incluye el archivo .glb en el ZIP bajo 07_3D_Interactive_Model/<concept>.glb', async () => {
      const conceptSlug = 'straw_pirate_adventurer_vest';
      const conceptDir = path.join(TEST_3D_DIR, conceptSlug);
      await fs.promises.mkdir(conceptDir, { recursive: true });

      // Simular los archivos entregables
      await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_tiled_a4.pdf`), '%PDF-1.4 Mock A4');
      await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_tiled_letter.pdf`), '%PDF-1.4 Mock Letter');
      await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_plotter_a0.pdf`), '%PDF-1.4 Mock A0');
      await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_continuous.svg`), '<svg></svg>');
      await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_techpack.pdf`), '%PDF-1.4 Mock Techpack');
      await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_techpack.md`), '# Techpack Mock');
      await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}_techpack.json`), '{"techpack": true}');
      await fs.promises.writeFile(
        path.join(conceptDir, `${conceptSlug}_dna.json`),
        JSON.stringify({ concept_name: conceptSlug, base_block: 'menswear_torso_oversize' })
      );
      await fs.promises.writeFile(path.join(conceptDir, `${conceptSlug}.glb`), 'glTF Binary Model Mock');

      const bundle = await createEtsyBundle(conceptDir, conceptSlug);
      expect(bundle.conceptSlug).toBe(conceptSlug);
      expect(fs.existsSync(bundle.zipPath)).toBe(true);

      const zipBuf = await fs.promises.readFile(bundle.zipPath);
      const entries = extractZipEntries(zipBuf);

      // Validar las 7 carpetas estructuradas y el archivo README
      expect(entries).toContain(`01_Print_At_Home_A4/${conceptSlug}_tiled_a4.pdf`);
      expect(entries).toContain(`02_Print_At_Home_US_Letter/${conceptSlug}_tiled_letter.pdf`);
      expect(entries).toContain(`03_Copy_Shop_Plotter_A0/${conceptSlug}_plotter_a0.pdf`);
      expect(entries).toContain(`04_Vector_Layers_SVG/${conceptSlug}_continuous.svg`);
      expect(entries).toContain(`05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.pdf`);
      expect(entries).toContain(`05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.md`);
      expect(entries).toContain(`05_Sewing_Guide_And_TechPack/${conceptSlug}_techpack.json`);
      expect(entries).toContain(`06_Dna_Parameters/${conceptSlug}_dna.json`);
      expect(entries).toContain(`07_3D_Interactive_Model/${conceptSlug}.glb`);
      expect(entries).toContain('README_Etsy_Printing_Instructions.pdf');

      // Total de 10 archivos en el ZIP completo
      expect(entries.length).toBe(10);
      expect(bundle.bundledFiles).toContain(`07_3D_Interactive_Model/${conceptSlug}.glb`);
    });

    it('los metadatos de Etsy mencionan el modelo 3D interactivo en la descripción', async () => {
      const conceptSlug = 'straw_pirate_adventurer_vest';
      const conceptDir = path.join(TEST_3D_DIR, conceptSlug);
      const bundle = await createEtsyBundle(conceptDir, conceptSlug);

      const metaContent = await fs.promises.readFile(bundle.metadataPath, 'utf-8');
      const meta = JSON.parse(metaContent);

      expect(meta.description).toContain('07_3D_Interactive_Model');
      expect(meta.description).toContain('.GLB');
      expect(meta.description).toContain('3D interactive model');
    });
  });
});
