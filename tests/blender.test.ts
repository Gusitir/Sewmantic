/**
 * tests/blender.test.ts
 * Suite de pruebas unitarias y de integración para el Motor 3D glTF 2.0 y Puente Blender Headless
 * pattern-ai-core - Tarea T-23
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  generate3DGarmentModel,
  resolveFabricPbr,
  parseColorToRgba,
  findBlenderExecutable,
  detectBlenderCli,
  buildGltfBinary,
  FABRIC_PBR_PRESETS,
  Garment3DOptions,
  Garment3DResult,
  PatternDna,
} from '../src/index.js';

describe('Blender Headless Bridge & 3D Garment Mesh Engine (T-23)', () => {
  const testOutputDir = path.resolve('output/test_3d_unit');

  // Asegurar que el directorio de pruebas exista
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }

  // =========================================================================
  // 1. Color Parser & PBR Fabric Presets
  // =========================================================================
  describe('1. Color Parser & Textile PBR Presets', () => {
    it('should parse hex colors (6-digit, 3-digit, 8-digit) to RGBA float tuples [0..1]', () => {
      // 6-digit hex
      const red = parseColorToRgba('#D62828');
      expect(red).toBeDefined();
      expect(red![0]).toBeCloseTo(0.839, 2);
      expect(red![1]).toBeCloseTo(0.157, 2);
      expect(red![2]).toBeCloseTo(0.157, 2);
      expect(red![3]).toBe(1.0);

      // 3-digit hex
      const white = parseColorToRgba('#FFF');
      expect(white).toEqual([1.0, 1.0, 1.0, 1.0]);

      // Array input
      const customArray = parseColorToRgba([0.2, 0.4, 0.6, 0.8]);
      expect(customArray).toEqual([0.2, 0.4, 0.6, 0.8]);

      // Named color
      const indigo = parseColorToRgba('indigo');
      expect(indigo).toBeDefined();
      expect(indigo![2]).toBeGreaterThan(indigo![0]); // blue dominant

      // Invalid / null
      expect(parseColorToRgba('')).toBeNull();
      expect(parseColorToRgba(undefined)).toBeNull();
    });

    it('should resolve standard textile PBR properties for linen, denim, cotton, silk, leather, wool', () => {
      // Linen
      const linen = resolveFabricPbr({ fabric: 'linen' });
      expect(linen.name).toBe('Linen_Fabric');
      expect(linen.roughness).toBe(0.85);
      expect(linen.metallic).toBe(0.0);
      expect(linen.doubleSided).toBe(true);

      // Denim
      const denim = resolveFabricPbr({ fabric: 'denim' });
      expect(denim.name).toBe('Denim_Fabric');
      expect(denim.roughness).toBe(0.75);
      expect(denim.metallic).toBe(0.0);

      // Cotton
      const cotton = resolveFabricPbr({ fabric: 'cotton' });
      expect(cotton.name).toBe('Cotton_Fabric');
      expect(cotton.roughness).toBe(0.70);

      // Silk
      const silk = resolveFabricPbr({ fabric: 'silk' });
      expect(silk.name).toBe('Silk_Fabric');
      expect(silk.roughness).toBe(0.25);
      expect(silk.metallic).toBe(0.08);

      // Leather
      const leather = resolveFabricPbr({ fabric: 'leather' });
      expect(leather.name).toBe('Leather_Fabric');
      expect(leather.roughness).toBe(0.40);
      expect(leather.metallic).toBe(0.05);

      // Wool
      const wool = resolveFabricPbr({ fabric: 'wool' });
      expect(wool.name).toBe('Wool_Fabric');
      expect(wool.roughness).toBe(0.92);
    });

    it('should allow custom overrides for color, roughness and metallic on PBR materials', () => {
      const customMat = resolveFabricPbr({
        fabric: 'cotton',
        color: '#FF0000',
        roughness: 0.15,
        metallic: 0.90,
      });

      expect(customMat.baseColor[0]).toBe(1.0);
      expect(customMat.baseColor[1]).toBe(0.0);
      expect(customMat.baseColor[2]).toBe(0.0);
      expect(customMat.roughness).toBe(0.15);
      expect(customMat.metallic).toBe(0.90);
    });
  });

  // =========================================================================
  // 2. Binary glTF 2.0 Specification & Structure Validation
  // =========================================================================
  describe('2. Binary glTF 2.0 (.glb) Header & Chunk Invariants', () => {
    it('should generate a valid glTF 2.0 binary buffer with magic 0x46546C67 and version 2', async () => {
      const dna: PatternDna = {
        concept_name: 'test_tailored_top',
        base_block: 'menswear_torso',
        garment_category: 'top',
        ease: { chest_ease_mm: 60 },
        modifications: {
          neckline: { type: 'crew' },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'straight' },
        },
      };

      const result: Garment3DResult = await generate3DGarmentModel({
        dna,
        fabric: 'linen',
      });

      const buf = result.glbBuffer;
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(100);
      expect(buf.length).toBe(result.byteLength);

      // 1. Header Magic: 'glTF' (0x46546C67 in Little Endian: 0x67, 0x6C, 0x54, 0x46)
      expect(buf.readUInt32LE(0)).toBe(0x46546c67);
      expect(buf[0]).toBe(0x67); // 'g'
      expect(buf[1]).toBe(0x6c); // 'l'
      expect(buf[2]).toBe(0x54); // 'T'
      expect(buf[3]).toBe(0x46); // 'F'

      // 2. Header Version: 2
      expect(buf.readUInt32LE(4)).toBe(2);

      // 3. Header Total Length: equals buffer.length
      expect(buf.readUInt32LE(8)).toBe(buf.length);

      // 4. Chunk 0 Header: Length & Type (0x4E4F534A = 'JSON')
      const jsonLength = buf.readUInt32LE(12);
      const jsonType = buf.readUInt32LE(16);
      expect(jsonType).toBe(0x4e4f534a);
      expect(jsonLength % 4).toBe(0); // 4-byte aligned

      // 5. Parse Chunk 0 JSON content
      const jsonBytes = buf.subarray(20, 20 + jsonLength);
      const jsonStr = jsonBytes.toString('utf-8').trim();
      const gltf = JSON.parse(jsonStr);

      expect(gltf.asset).toBeDefined();
      expect(gltf.asset.version).toBe('2.0');
      expect(gltf.scene).toBe(0);
      expect(gltf.scenes).toHaveLength(1);
      expect(gltf.nodes).toBeInstanceOf(Array);
      expect(gltf.meshes).toBeInstanceOf(Array);
      expect(gltf.materials).toHaveLength(1);
      expect(gltf.accessors).toHaveLength(4); // POS, NORM, UV, INDICES
      expect(gltf.bufferViews).toHaveLength(4);
      expect(gltf.buffers).toHaveLength(1);

      // 6. Chunk 1 Header: Length & Type (0x004E4942 = 'BIN\0')
      const chunk1Offset = 20 + jsonLength;
      const binLength = buf.readUInt32LE(chunk1Offset);
      const binType = buf.readUInt32LE(chunk1Offset + 4);
      expect(binType).toBe(0x004e4942);
      expect(binLength % 4).toBe(0); // 4-byte aligned
      expect(chunk1Offset + 8 + binLength).toBe(buf.length);
    });

    it('should have valid POSITION accessor with required min and max bounding arrays', async () => {
      const result = await generate3DGarmentModel({
        concept_name: 'bounding_box_test',
        fabric: 'cotton',
      });

      const buf = result.glbBuffer;
      const jsonLength = buf.readUInt32LE(12);
      const gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf-8').trim());

      const posAccessor = gltf.accessors[0];
      expect(posAccessor.type).toBe('VEC3');
      expect(posAccessor.componentType).toBe(5126); // FLOAT
      expect(posAccessor.min).toHaveLength(3);
      expect(posAccessor.max).toHaveLength(3);
      expect(posAccessor.min[0]).toBeLessThanOrEqual(posAccessor.max[0]);
      expect(posAccessor.min[1]).toBeLessThanOrEqual(posAccessor.max[1]);
      expect(posAccessor.min[2]).toBeLessThanOrEqual(posAccessor.max[2]);
    });
  });

  // =========================================================================
  // 3. Garment Categories & 3D Curvature
  // =========================================================================
  describe('3. Multi-Category 3D Garment Geometries', () => {
    it('should generate 3D mesh for Tops (Pirate Vest, Hoodie, T-Shirt)', async () => {
      const vestDna: PatternDna = {
        concept_name: 'unit_pirate_vest',
        garment_category: 'top',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 70 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 150 },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'straight' },
        },
      };

      const outPath = path.join(testOutputDir, 'unit_pirate_vest.glb');
      const result = await generate3DGarmentModel({
        dna: vestDna,
        fabric: 'linen',
        color: '#D62828',
        outputPath: outPath,
      });

      expect(fs.existsSync(outPath)).toBe(true);
      expect(result.byteLength).toBeGreaterThan(1000);
      expect(result.byteLength).toBeLessThan(5 * 1024 * 1024); // < 5MB
      expect(result.vertexCount).toBeGreaterThan(100);
      expect(result.triangleCount).toBeGreaterThan(100);
      expect(result.material.name).toBe('Linen_Fabric');
    });

    it('should generate 3D mesh for Trousers and Bermudas (Bottoms)', async () => {
      const pantsDna: PatternDna = {
        concept_name: 'unit_denim_pants',
        garment_category: 'bottom',
        base_block: 'pants_sloper',
        ease: { chest_ease_mm: 0, waist_ease_mm: 40, hip_ease_mm: 80 },
        modifications: {
          trouser_legs: { type: 'straight', length_type: 'full' },
          waistband: { type: 'fitted', height_mm: 40 },
        },
      };

      const outPath = path.join(testOutputDir, 'unit_denim_pants.glb');
      const result = await generate3DGarmentModel({
        dna: pantsDna,
        fabric: 'denim',
        outputPath: outPath,
      });

      expect(fs.existsSync(outPath)).toBe(true);
      expect(result.byteLength).toBeGreaterThan(1000);
      expect(result.byteLength).toBeLessThan(5 * 1024 * 1024);
      expect(result.material.name).toBe('Denim_Fabric');
      expect(result.meshNames.some((n) => n.includes('leg') || n.includes('front') || n.includes('back'))).toBe(true);
    });

    it('should generate 3D mesh for Dresses and Skirts', async () => {
      const dressDna: PatternDna = {
        concept_name: 'unit_a_line_dress',
        garment_category: 'dress',
        base_block: 'dress_sloper',
        ease: { chest_ease_mm: 80, waist_ease_mm: 60 },
        modifications: {
          neckline: { type: 'scoop', depth_mm: 100 },
          sleeves: { type: 'short', length_mm: 180 },
          dress_details: { silhouette: 'a_line', skirt_length_mm: 650 },
        },
      };

      const outPath = path.join(testOutputDir, 'unit_a_line_dress.glb');
      const result = await generate3DGarmentModel({
        dna: dressDna,
        fabric: 'cotton',
        outputPath: outPath,
      });

      expect(fs.existsSync(outPath)).toBe(true);
      expect(result.byteLength).toBeGreaterThan(1000);
      expect(result.byteLength).toBeLessThan(5 * 1024 * 1024);
      expect(result.material.name).toBe('Cotton_Fabric');
    });

    it('should generate 3D mesh for Kimonos and Haoris with Furisode Sleeves', async () => {
      const kimonoDna: PatternDna = {
        concept_name: 'unit_anime_kimono',
        garment_category: 'kimono',
        base_block: 'dress_sloper',
        ease: { chest_ease_mm: 140, waist_ease_mm: 120 },
        modifications: {
          sleeves: { type: 'kimono' },
          kimono_details: { sleeve_style: 'furisode_square', collar_width_mm: 60, obi_belt: true },
        },
      };

      const outPath = path.join(testOutputDir, 'unit_anime_kimono.glb');
      const result = await generate3DGarmentModel({
        dna: kimonoDna,
        fabric: 'silk',
        outputPath: outPath,
      });

      expect(fs.existsSync(outPath)).toBe(true);
      expect(result.byteLength).toBeGreaterThan(1000);
      expect(result.byteLength).toBeLessThan(5 * 1024 * 1024);
      expect(result.material.name).toBe('Silk_Fabric');
      expect(result.meshNames.some((n) => n.includes('furisode') || n.includes('sleeve') || n.includes('front'))).toBe(true);
    });
  });

  // =========================================================================
  // 4. Blender CLI Headless Integration & Detection
  // =========================================================================
  describe('4. Blender CLI Environment & Execution', () => {
    it('should detect Blender CLI executable if available on the system', () => {
      const status = detectBlenderCli();
      expect(status).toBeDefined();
      expect(typeof status.available).toBe('boolean');
      if (status.available) {
        expect(status.path).toBeDefined();
        expect(fs.existsSync(status.path!)).toBe(true);
      }
    });

    it('should execute Blender headless export when requested and Blender is available', async () => {
      const blenderStatus = detectBlenderCli();
      if (!blenderStatus.available) {
        console.log('[SKIPPED] Blender CLI no disponible en este host CI.');
        return;
      }

      const vestDna: PatternDna = {
        concept_name: 'blender_cli_pirate_vest',
        garment_category: 'top',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 80 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 160 },
          sleeves: { type: 'sleeveless' },
          hem: { type: 'straight' },
        },
      };

      const outPath = path.join(testOutputDir, 'blender_cli_pirate_vest.glb');
      const result = await generate3DGarmentModel({
        dna: vestDna,
        fabric: 'linen',
        color: '#D62828',
        useBlenderCli: true,
        outputPath: outPath,
      });

      expect(result.glbBuffer.length).toBeGreaterThan(0);
      expect(result.isBlenderGenerated).toBe(true);
      expect(fs.existsSync(outPath)).toBe(true);

      // Validar magic bytes del .glb generado por Blender
      expect(result.glbBuffer.readUInt32LE(0)).toBe(0x46546c67);
      expect(result.glbBuffer.readUInt32LE(4)).toBe(2);
    });

    it('should gracefully fallback to native glTF generator if Blender fails or is unavailable', async () => {
      const vestDna: PatternDna = {
        concept_name: 'fallback_top',
        garment_category: 'top',
        base_block: 'menswear_torso',
        ease: { chest_ease_mm: 60 },
        modifications: {},
      };

      // Invocación con ruta de Blender inexistente para forzar fallback
      const result = await generate3DGarmentModel({
        dna: vestDna,
        fabric: 'cotton',
        useBlenderCli: true,
        blenderPath: 'C:\\NonExistentPath\\blender_fake.exe',
      });

      expect(result.glbBuffer).toBeDefined();
      expect(result.glbBuffer.length).toBeGreaterThan(0);
      expect(result.isBlenderGenerated).toBe(false);
      expect(result.glbBuffer.readUInt32LE(0)).toBe(0x46546c67);
    });
  });
});
