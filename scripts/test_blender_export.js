/**
 * scripts/test_blender_export.js
 * Script de prueba aislado para generación y validación de archivos .glb 3D
 * pattern-ai-core
 *
 * Invoca `generate3DGarmentModel` para varias tipologías textiles (chaleco, bermuda, kimono/vestido)
 * y valida los invariantes del estándar oficial glTF 2.0:
 * - Existencia del archivo y tamaño (> 0 bytes y < 5 MB).
 * - Magic bytes 'glTF' (0x67, 0x6C, 0x54, 0x46 / uint32 0x46546C67).
 * - Header version == 2.
 * - JSON chunk estructurado con materiales PBR y BIN chunk con atributos geométricos.
 */

import fs from 'node:fs';
import path from 'node:path';
import { generate3DGarmentModel, FABRIC_PBR_PRESETS, detectBlenderCli } from '../dist/index.js';

async function runTestBlenderExport() {
  console.log('===============================================================');
  console.log('pattern-ai-core — Validación de Exportación glTF 2.0 (.glb) 3D');
  console.log('===============================================================\n');

  const blenderStatus = detectBlenderCli();
  console.log(`[Entorno] Blender CLI: ${blenderStatus.available ? `Disponible (${blenderStatus.path})` : 'No detectado (usando motor glTF 2.0 nativo de alta precisión)'}\n`);

  const outputDir = path.resolve('output/test_3d');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Caso de prueba 1: Chaleco / Pirate Vest (Lino / Vermilion)
  console.log('---------------------------------------------------------------');
  console.log('1. Generando Modelo 3D: Chaleco Sastrería Pirata (Lino Rojo)');
  console.log('---------------------------------------------------------------');

  const vestDna = {
    concept_name: 'straw_pirate_adventurer_vest',
    description: 'Chaleco de aventurero pirata en lino rojo bermellón',
    garment_category: 'top',
    base_block: 'menswear_torso',
    ease: { chest_ease_mm: 80, waist_ease_mm: 60 },
    modifications: {
      neckline: { type: 'v_neck', depth_mm: 180 },
      sleeves: { type: 'sleeveless' },
      hem: { type: 'straight' },
    },
    tech_specs: {
      fabric_type: 'linen',
      seam_allowance_mm: 10,
      hem_allowance_mm: 20,
      estimated_fabric_meters: 1.2,
      notions: ['botones de latón'],
    },
  };

  const vestGlbPath = path.join(outputDir, 'straw_pirate_adventurer_vest.glb');
  const vestResult = await generate3DGarmentModel({
    dna: vestDna,
    fabric: 'linen',
    color: '#D62828', // Vermilion Red
    roughness: 0.82,
    metallic: 0.0,
    outputPath: vestGlbPath,
  });

  validateGlb(vestResult.glbBuffer, vestGlbPath, 'Chaleco Pirata (Lino)');

  // 2. Caso de prueba 2: Bermudas / Denim Shorts
  console.log('\n---------------------------------------------------------------');
  console.log('2. Generando Modelo 3D: Bermuda Denim / Jean');
  console.log('---------------------------------------------------------------');

  const bermudaDna = {
    concept_name: 'streetwear_denim_bermuda',
    description: 'Bermuda vaquera con corte holgado y bolsillos cargo',
    garment_category: 'bottom',
    base_block: 'pants_sloper',
    ease: { chest_ease_mm: 0, waist_ease_mm: 40, hip_ease_mm: 80 },
    modifications: {
      trouser_legs: { type: 'wide_baggy', length_type: 'bermuda' },
      waistband: { type: 'fitted', height_mm: 40 },
    },
    tech_specs: {
      fabric_type: 'denim',
      seam_allowance_mm: 12,
      hem_allowance_mm: 25,
      estimated_fabric_meters: 1.5,
      notions: ['remaches de cobre', 'cremallera YKK'],
    },
  };

  const bermudaGlbPath = path.join(outputDir, 'streetwear_denim_bermuda.glb');
  const bermudaResult = await generate3DGarmentModel({
    dna: bermudaDna,
    fabric: 'denim',
    outputPath: bermudaGlbPath,
  });

  validateGlb(bermudaResult.glbBuffer, bermudaGlbPath, 'Bermuda (Denim)');

  // 3. Caso de prueba 3: Vestido / Kimono de Seda
  console.log('\n---------------------------------------------------------------');
  console.log('3. Generando Modelo 3D: Kimono / Vestido de Seda PBR');
  console.log('---------------------------------------------------------------');

  const kimonoDna = {
    concept_name: 'anime_miko_kimono_dress',
    description: 'Vestido estilo kimono tradicional de seda con mangas furisode',
    garment_category: 'kimono',
    base_block: 'dress_sloper',
    ease: { chest_ease_mm: 120, waist_ease_mm: 100 },
    modifications: {
      sleeves: { type: 'kimono' },
      kimono_details: { sleeve_style: 'furisode_square', collar_width_mm: 50, obi_belt: true },
    },
    tech_specs: {
      fabric_type: 'silk',
      seam_allowance_mm: 10,
      hem_allowance_mm: 20,
      estimated_fabric_meters: 3.2,
      notions: ['cinta obi de satén'],
    },
  };

  const kimonoGlbPath = path.join(outputDir, 'anime_miko_kimono_dress.glb');
  const kimonoResult = await generate3DGarmentModel({
    dna: kimonoDna,
    fabric: 'silk',
    color: '#E8D5F2', // Seda lila suave
    outputPath: kimonoGlbPath,
  });

  validateGlb(kimonoResult.glbBuffer, kimonoGlbPath, 'Kimono Vestido (Seda)');

  console.log('\n===============================================================');
  console.log('[ÉXITO TOTAL] Todos los modelos 3D (.glb) superaron la validación.');
  console.log('===============================================================\n');
}

/**
 * Valida la conformidad estricta de un buffer glTF 2.0 binario (.glb)
 */
function validateGlb(buffer, filePath, label) {
  const stat = fs.statSync(filePath);
  const sizeBytes = stat.size;
  const sizeKb = (sizeBytes / 1024).toFixed(2);
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);

  console.log(`• Archivo: ${path.basename(filePath)} (${sizeKb} KB / ${sizeBytes} bytes)`);

  // Invariante 1: Tamaño > 0 y < 5 MB
  if (sizeBytes <= 0) {
    throw new Error(`[FAIL] El archivo ${filePath} está vacío (0 bytes).`);
  }
  if (sizeBytes > 5 * 1024 * 1024) {
    throw new Error(`[FAIL] El archivo ${filePath} supera el límite de 5 MB (${sizeMb} MB).`);
  }
  console.log(`  ✓ Tamaño optimizado para WebGL: ${sizeKb} KB (< 5 MB)`);

  // Invariante 2: Magic Bytes 'glTF' (0x46546C67)
  if (buffer.length < 12) {
    throw new Error(`[FAIL] Encabezado .glb trunco (${buffer.length} bytes < 12 bytes).`);
  }

  const magic = buffer.readUInt32LE(0);
  const magicHex = '0x' + magic.toString(16).toUpperCase();
  const byte0 = buffer[0];
  const byte1 = buffer[1];
  const byte2 = buffer[2];
  const byte3 = buffer[3];

  if (magic !== 0x46546c67 || byte0 !== 0x67 || byte1 !== 0x6c || byte2 !== 0x54 || byte3 !== 0x46) {
    throw new Error(`[FAIL] Magic bytes glTF inválidos: ${magicHex}. Esperado: 0x46546C67 ('glTF')`);
  }
  console.log(`  ✓ Magic bytes verificados: 0x${byte0.toString(16)} 0x${byte1.toString(16)} 0x${byte2.toString(16)} 0x${byte3.toString(16)} ('glTF' / ${magicHex})`);

  // Invariante 3: Header Version == 2
  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    throw new Error(`[FAIL] Versión glTF inválida: ${version}. Esperado: 2 (glTF 2.0)`);
  }
  console.log(`  ✓ Versión estándar glTF verificada: ${version}.0`);

  // Invariante 4: Longitud total declarada
  const declaredTotalLength = buffer.readUInt32LE(8);
  if (declaredTotalLength !== buffer.length) {
    throw new Error(`[FAIL] Discrepancia de longitud total: declarada ${declaredTotalLength} vs real ${buffer.length}`);
  }
  console.log(`  ✓ Longitud binaria consistente: ${declaredTotalLength} bytes`);

  // Invariante 5: Chunk 0 JSON
  const chunk0Length = buffer.readUInt32LE(12);
  const chunk0Type = buffer.readUInt32LE(16);
  if (chunk0Type !== 0x4e4f534a) {
    // 'JSON'
    throw new Error(`[FAIL] Chunk 0 no es tipo JSON: 0x${chunk0Type.toString(16)}`);
  }

  const jsonBytes = buffer.subarray(20, 20 + chunk0Length);
  const jsonStr = jsonBytes.toString('utf-8').trim();
  const gltfObj = JSON.parse(jsonStr);

  if (!gltfObj.asset || gltfObj.asset.version !== '2.0') {
    throw new Error(`[FAIL] glTF JSON asset.version no es '2.0'`);
  }
  if (!gltfObj.materials || gltfObj.materials.length === 0) {
    throw new Error(`[FAIL] No se encontraron materiales PBR en el glTF`);
  }

  const mat = gltfObj.materials[0];
  const pbr = mat.pbrMetallicRoughness;
  console.log(`  ✓ Material PBR: "${mat.name}" [Color: (${pbr.baseColorFactor.map((c) => c.toFixed(2)).join(', ')}), Roughness: ${pbr.roughnessFactor}, Metallic: ${pbr.metallicFactor}]`);

  // Invariante 6: Chunk 1 BIN
  const chunk1Offset = 20 + chunk0Length;
  if (chunk1Offset < buffer.length) {
    const chunk1Length = buffer.readUInt32LE(chunk1Offset);
    const chunk1Type = buffer.readUInt32LE(chunk1Offset + 4);
    if (chunk1Type !== 0x004e4942) {
      // 'BIN\0'
      throw new Error(`[FAIL] Chunk 1 no es tipo BIN: 0x${chunk1Type.toString(16)}`);
    }
    console.log(`  ✓ Chunk 1 BIN verificado: ${chunk1Length} bytes de buffers geométricos`);
  }

  console.log(`  -> Validación glTF 2.0 exitosa para: ${label}`);
}

runTestBlenderExport().catch((err) => {
  console.error('\n[ERROR FATAL]', err);
  process.exit(1);
});
