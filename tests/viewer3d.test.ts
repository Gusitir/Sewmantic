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
  generate3DGarmentModel,
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

  // =========================================================================
  // 5. Motor WebGL Nativo Autónomo & Shaders PBR
  // =========================================================================
  describe('5. Motor WebGL Nativo Autónomo y Parseo de Malla 3D Directo', () => {
    it('viewer3d.js contiene la implementación completa de shaders PBR y matemáticas matriciales nativas', async () => {
      const res = await fetch(`${baseUrl}/viewer3d.js`);
      const jsText = await res.text();

      // Shaders PBR y matrices 4x4
      expect(jsText).toContain('VERTEX_SHADER');
      expect(jsText).toContain('FRAGMENT_SHADER');
      expect(jsText).toContain('uKeyLightDir');
      expect(jsText).toContain('uFillLightDir');
      expect(jsText).toContain('uRimLightDir');
      expect(jsText).toContain('uBaseColor');
      expect(jsText).toContain('uRoughness');
      expect(jsText).toContain('uMetallic');
      expect(jsText).toContain('mat4');
      expect(jsText).toContain('NativeWebGlEngine');
    });

    it('parseGlbBuffer extrae posiciones, normales, límites y conteos de un archivo .glb real', async () => {
      const conceptSlug = 'streetwear_oversize_hoodie';
      const res = await fetch(`${baseUrl}/api/patterns/${conceptSlug}/glb`);
      const arrayBuf = await res.arrayBuffer();

      // Importar módulo viewer3d.js local
      const { parseGlbBuffer: parseFn } = await import('../src/server/public/viewer3d.js');

      const parsed = await parseFn(arrayBuf);
      expect(parsed).toBeDefined();
      expect(parsed.positions).toBeDefined();
      expect(parsed.positions.length).toBeGreaterThan(0);
      expect(parsed.normals).toBeDefined();
      expect(parsed.normals.length).toBe(parsed.positions.length);
      expect(parsed.vertexCount).toBeGreaterThan(0);
      expect(parsed.triangleCount).toBeGreaterThan(0);
      expect(parsed.bounds).toBeDefined();
      expect(parsed.bounds.minX).toBeLessThan(parsed.bounds.maxX);
      expect(parsed.center).toHaveLength(3);
      expect(parsed.radius).toBeGreaterThan(0);
      expect(parsed.material).toBeDefined();
      expect(parsed.material.baseColor).toHaveLength(3);
    });

    it('parseGlbBuffer extrae y acumula todas las primitivas y materiales en conjuntos coordinados de 2 piezas (Luffy Full Set)', async () => {
      const { parseGlbBuffer: parseFn } = await import('../src/server/public/viewer3d.js');

      const pirateSetDna: PatternDna = {
        concept_name: 'straw_pirate_full_set',
        description: 'Conjunto coordinado cosplay aventurero del Rey de los Piratas: chaleco lino rojo y bermuda denim azul',
        garment_category: 'set',
        base_block: 'two_piece_set',
        ease: {
          chest_ease_mm: 70,
          waist_ease_mm: 40,
          hip_ease_mm: 60,
          shoulder_ease_mm: 0,
          crotch_ease_mm: 30,
          thigh_ease_mm: 70,
        },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 160 },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'curved_tail', drop_mm: 60 },
          trouser_legs: { type: 'wide_baggy', length_type: 'bermuda' },
          waistband: { type: 'fitted', height_mm: 40 },
        },
        fabric_details: {
          main_fabric: {
            name: 'Lino Rústico Rojo Carmesí',
            type: 'linen',
            color: '#D62828',
          },
          secondary_fabric: {
            name: 'Denim Azul Índigo Selvedge',
            type: 'denim',
            color: '#1E3A8A',
          },
        },
        sub_garments: {
          top: {
            concept_name: 'straw_pirate_adventurer_vest',
            garment_category: 'top',
            base_block: 'menswear_torso_fitted',
            ease: { chest_ease_mm: 50, waist_ease_mm: 40 },
            modifications: {
              neckline: { type: 'v_neck', depth_mm: 130 },
              sleeves: { type: 'sleeveless' },
              hem: { type: 'curved_tail', drop_mm: 45 },
            },
            fabric_details: {
              main_fabric: { type: 'linen', color: '#D62828' },
            },
          },
          bottom: {
            concept_name: 'straw_pirate_denim_shorts',
            garment_category: 'bottom',
            base_block: 'pants_sloper',
            ease: { chest_ease_mm: 0, waist_ease_mm: 35, hip_ease_mm: 50 },
            modifications: {
              trouser_legs: { type: 'wide_baggy', length_type: 'bermuda' },
              waistband: { type: 'fitted', height_mm: 40 },
            },
            fabric_details: {
              main_fabric: { type: 'denim', color: '#1E3A8A' },
            },
          },
        },
      };

      const set3DResult = await generate3DGarmentModel({
        dna: pirateSetDna,
      });

      expect(set3DResult.glbBuffer).toBeDefined();

      const parsed = await parseFn(set3DResult.glbBuffer);
      expect(parsed).toBeDefined();
      expect(parsed.primitives).toBeDefined();
      expect(parsed.primitives.length).toBeGreaterThanOrEqual(2);

      // Validar acumulación total de vértices y triángulos
      let expectedVertexTotal = 0;
      let expectedTriangleTotal = 0;
      for (const prim of parsed.primitives) {
        expectedVertexTotal += prim.vertexCount;
        expectedTriangleTotal += prim.triangleCount;
        expect(prim.positions.length).toBe(prim.vertexCount * 3);
        expect(prim.normals.length).toBe(prim.vertexCount * 3);
        expect(prim.uvs.length).toBe(prim.vertexCount * 2);
        expect(prim.indices.length).toBe(prim.triangleCount * 3);
      }

      expect(parsed.vertexCount).toBe(expectedVertexTotal);
      expect(parsed.triangleCount).toBe(expectedTriangleTotal);
      expect(parsed.positions.length).toBe(expectedVertexTotal * 3);
      expect(parsed.normals.length).toBe(expectedVertexTotal * 3);
      expect(parsed.uvs.length).toBe(expectedVertexTotal * 2);
      expect(parsed.indices.length).toBe(expectedTriangleTotal * 3);

      // Validar materiales PBR extraídos
      expect(parsed.materials).toBeDefined();
      expect(parsed.materials.length).toBeGreaterThanOrEqual(2);
      expect(parsed.materials[0].name).toContain('Linen');
      expect(parsed.materials[1].name).toContain('Denim');

      // Validar offset de índices
      const prim0 = parsed.primitives[0];
      const prim1 = parsed.primitives[1];
      const prim0IndicesCount = prim0.indices.length;
      // Los índices combinados correspondientes a prim1 deben tener un offset igual a prim0.vertexCount
      for (let i = 0; i < prim1.indices.length; i++) {
        expect(parsed.indices[prim0IndicesCount + i]).toBe(prim1.indices[i] + prim0.vertexCount);
      }
    });

    it('parseGlbBuffer procesa prendas de 1 sola pieza complejas (Kimono Furisode, Falda, Chaleco)', async () => {
      const { parseGlbBuffer: parseFn } = await import('../src/server/public/viewer3d.js');

      const kimonoDna: PatternDna = {
        concept_name: 'anime_miko_kimono_dress',
        garment_category: 'kimono',
        base_block: 'dress_sloper',
        ease: { chest_ease_mm: 120, waist_ease_mm: 100 },
        modifications: {
          sleeves: { type: 'kimono' },
          kimono_details: { sleeve_style: 'furisode_square', collar_width_mm: 50, obi_belt: true },
        },
        tech_specs: { fabric_type: 'silk' },
      };

      const kimono3DResult = await generate3DGarmentModel({
        dna: kimonoDna,
        fabric: 'silk',
        color: '#E8D5F2',
      });

      const parsedKimono = await parseFn(kimono3DResult.glbBuffer);
      expect(parsedKimono).toBeDefined();
      expect(parsedKimono.vertexCount).toBeGreaterThan(0);
      expect(parsedKimono.triangleCount).toBeGreaterThan(0);
      expect(parsedKimono.material.name).toContain('Silk');
      expect(parsedKimono.primitives.length).toBeGreaterThanOrEqual(1);
    });

    it('parseGlbBuffer y getFallbackExplodeOffset asignan vectores explodeOffset [dx, dy, dz] válidos (T-31)', async () => {
      const { parseGlbBuffer: parseFn, getFallbackExplodeOffset } = await import('../src/server/public/viewer3d.js');

      // 1. Validar función de fallback heurístico
      expect(getFallbackExplodeOffset('front_facing')).toEqual([0, 0, 0.05]);
      expect(getFallbackExplodeOffset('back_neck_facing')).toEqual([0, 0, -0.05]);
      expect(getFallbackExplodeOffset('armhole_facing')).toEqual([0.08, 0, 0.04]);
      expect(getFallbackExplodeOffset('front_panel')).toEqual([0, 0, 0.12]);
      expect(getFallbackExplodeOffset('back_panel')).toEqual([0, 0, -0.12]);
      expect(getFallbackExplodeOffset('left_sleeve')).toEqual([0.25, 0, 0]);
      expect(getFallbackExplodeOffset('front_leg')).toEqual([0, -0.15, 0.08]);
      expect(getFallbackExplodeOffset('back_leg')).toEqual([0, -0.15, -0.08]);

      // 2. Validar que un modelo generado por blender_bridge contiene explodeOffset en cada primitiva
      const vestDna: PatternDna = {
        concept_name: 'pirate_vest_with_facings',
        garment_category: 'top',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 60, waist_ease_mm: 40 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 120 },
          sleeves: { type: 'sleeveless' },
        },
        tech_specs: { fabric_type: 'linen' },
      };

      const vestResult = await generate3DGarmentModel({
        dna: vestDna,
        fabric: 'linen',
      });

      const parsedVest = await parseFn(vestResult.glbBuffer);
      expect(parsedVest.primitives).toBeDefined();
      expect(parsedVest.primitives.length).toBeGreaterThan(0);

      for (const prim of parsedVest.primitives) {
        expect(prim.explodeOffset).toBeDefined();
        expect(Array.isArray(prim.explodeOffset)).toBe(true);
        expect(prim.explodeOffset.length).toBe(3);
        expect(typeof prim.explodeOffset[0]).toBe('number');
        expect(typeof prim.explodeOffset[1]).toBe('number');
        expect(typeof prim.explodeOffset[2]).toBe('number');
      }
    });

    it('viewer3d.js expone GarmentViewer3D con setExplodeFactor y getExplodeFactor (T-31)', async () => {
      const { GarmentViewer3D } = await import('../src/server/public/viewer3d.js');
      expect(GarmentViewer3D).toBeDefined();
      expect(typeof GarmentViewer3D).toBe('function');

      // Verificar que los métodos de control de despiece existan en el prototipo
      expect(typeof GarmentViewer3D.prototype.setExplodeFactor).toBe('function');
      expect(typeof GarmentViewer3D.prototype.getExplodeFactor).toBe('function');
    });
  });
});


