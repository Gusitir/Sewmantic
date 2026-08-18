/**
 * tests/e2e.test.ts
 * Suite de Pruebas End-to-End Integrales para Pipeline, CLI y Calibración Textil
 * pattern-ai-core
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generatePatternPipeline,
  generateCalibrationSheetPdf,
  exportCalibrationPdf,
  inspectPatternDnaFile,
  compileTechpackFromFile,
  slugify,
  parsePatternDna,
  CALIBRATION_BOX_MM,
  CALIBRATION_BOX_PT,
  PAGE_FORMATS,
  initCli,
  getVersion,
} from '../src/index.js';

const TEST_OUTPUT_DIR = path.resolve('tests/output_e2e_test');

/**
 * Descomprime y decodifica todos los flujos de contenido /FlateDecode y operadores hex TJ de un PDFKit buffer
 */
function extractPdfDecodedText(pdfBuffer: Buffer): string {
  let combined = '';
  const str = pdfBuffer.toString('binary');
  const streamStartToken = 'stream\n';
  const streamEndToken = '\nendstream';

  let searchIndex = 0;
  while (searchIndex < str.length) {
    const sStart = str.indexOf(streamStartToken, searchIndex);
    if (sStart === -1) break;
    const dataStart = sStart + streamStartToken.length;
    const sEnd = str.indexOf(streamEndToken, dataStart);
    if (sEnd === -1) break;

    const sliceBuf = pdfBuffer.subarray(dataStart, sEnd);
    try {
      const decompressed = zlib.inflateSync(sliceBuf);
      combined += decompressed.toString('latin1') + '\n';
    } catch {
      combined += sliceBuf.toString('latin1') + '\n';
    }

    searchIndex = sEnd + streamEndToken.length;
  }

  // Decodifica secuencias hexadecimales de PDFKit (e.g. <43414c49425241>)
  const decoded = combined.replace(/<([0-9a-fA-F]+)>/g, (_match, hex) => {
    try {
      return Buffer.from(hex, 'hex').toString('latin1');
    } catch {
      return hex;
    }
  });

  return decoded;
}

beforeAll(async () => {
  // Limpiar directorio de pruebas antes de iniciar
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    await fs.promises.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }
});

afterAll(async () => {
  // Limpiar directorio de pruebas al finalizar
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    await fs.promises.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }
});

describe('Pipeline End-to-End y Generación de Entregables (E2E)', () => {
  it('ejecuta el pipeline completo y genera los 8 entregables físicos en disco', async () => {
    const prompt = 'Hoodie Oversize Streetwear con capucha cruzada y bolsillo canguro';

    const result = await generatePatternPipeline({
      prompt,
      provider: 'mock',
      outputDir: TEST_OUTPUT_DIR,
      sizes: ['S', 'M', 'L', 'XL'],
      wasteFactor: 0.15,
    });

    expect(result.success).toBe(true);
    expect(result.conceptName).toBe('streetwear_oversize_hoodie');
    expect(result.conceptSlug).toBe('streetwear_oversize_hoodie');
    expect(result.sizes).toContain('S');
    expect(result.sizes).toContain('M');
    expect(result.sizes).toContain('L');
    expect(result.sizes).toContain('XL');
    expect(result.stats.totalParts).toBeGreaterThanOrEqual(4); // front, back, sleeve, hood, pocket
    expect(result.stats.generatedFilesCount).toBe(8);

    const outDir = result.outputDirectory;
    expect(fs.existsSync(outDir)).toBe(true);

    // 1. Verificar Tiled A4 PDF
    expect(fs.existsSync(result.files.tiledA4Pdf)).toBe(true);
    const a4Stats = fs.statSync(result.files.tiledA4Pdf);
    expect(a4Stats.size).toBeGreaterThan(1000);
    const a4Buffer = fs.readFileSync(result.files.tiledA4Pdf);
    expect(a4Buffer.toString('latin1', 0, 5)).toBe('%PDF-');

    // 2. Verificar Tiled Letter PDF
    expect(fs.existsSync(result.files.tiledLetterPdf)).toBe(true);
    const letterStats = fs.statSync(result.files.tiledLetterPdf);
    expect(letterStats.size).toBeGreaterThan(1000);
    const letterBuffer = fs.readFileSync(result.files.tiledLetterPdf);
    expect(letterBuffer.toString('latin1', 0, 5)).toBe('%PDF-');

    // 3. Verificar Plotter A0 PDF
    expect(fs.existsSync(result.files.plotterA0Pdf)).toBe(true);
    const a0Stats = fs.statSync(result.files.plotterA0Pdf);
    expect(a0Stats.size).toBeGreaterThan(1000);
    const a0Buffer = fs.readFileSync(result.files.plotterA0Pdf);
    expect(a0Buffer.toString('latin1', 0, 5)).toBe('%PDF-');

    // 4. Verificar SVG Continuo
    expect(fs.existsSync(result.files.continuousSvg)).toBe(true);
    const svgContent = fs.readFileSync(result.files.continuousSvg, 'utf-8');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('</svg>');
    expect(svgContent).toContain('calibration-box');
    expect(svgContent).toContain('grainline');
    expect(svgContent).toContain('outline-cut');

    // 5. Verificar TechPack PDF
    expect(fs.existsSync(result.files.techpackPdf)).toBe(true);
    const techPdfStats = fs.statSync(result.files.techpackPdf);
    expect(techPdfStats.size).toBeGreaterThan(1000);
    const techPdfBuffer = fs.readFileSync(result.files.techpackPdf);
    expect(techPdfBuffer.toString('latin1', 0, 5)).toBe('%PDF-');

    // 6. Verificar TechPack Markdown
    expect(fs.existsSync(result.files.techpackMd)).toBe(true);
    const mdContent = fs.readFileSync(result.files.techpackMd, 'utf-8');
    expect(mdContent).toContain('# FICHA TÉCNICA DE CONFECCIÓN');
    expect(mdContent).toContain('## 1. CONSUMO DE TELA');
    expect(mdContent).toContain('## 2. LISTA DETALLADA DE PIEZAS DE CORTE');
    expect(mdContent).toContain('## 3. LISTA DE AVÍOS Y MERCERÍA (BILL OF MATERIALS - BOM)');
    expect(mdContent).toContain('## 4. SECUENCIA DE CONFECCIÓN Y ENSAMBLADO PASO A PASO');
    expect(mdContent).toContain('## 5. TABLA DE MEDIDAS TERMINADAS DE LA PRENDA (POINTS OF MEASUREMENT - POM)');

    // 7. Verificar ADN JSON
    expect(fs.existsSync(result.files.dnaJson)).toBe(true);
    const dnaJsonStr = fs.readFileSync(result.files.dnaJson, 'utf-8');
    const parsedDna = JSON.parse(dnaJsonStr);
    const validatedDna = parsePatternDna(parsedDna);
    expect(validatedDna.concept_name).toBe('streetwear_oversize_hoodie');
    expect(validatedDna.ease.chest_ease_mm).toBe(150);

    // 8. Verificar TechPack JSON
    expect(fs.existsSync(result.files.techpackJson)).toBe(true);
    const techpackJsonStr = fs.readFileSync(result.files.techpackJson, 'utf-8');
    const parsedTechpack = JSON.parse(techpackJsonStr);
    expect(parsedTechpack.conceptName).toBe('streetwear_oversize_hoodie');
    expect(parsedTechpack.fabricConsumption.wastePercentage).toBe(15);
    expect(parsedTechpack.finishedMeasurements.length).toBeGreaterThan(5);
    expect(parsedTechpack.assemblySequence.length).toBeGreaterThan(5);
  });

  it('verifica la calibración de 10x10 cm en la portada / Página 1 de PDFs paginados', async () => {
    const result = await generatePatternPipeline({
      prompt: 'classic_crew_tee',
      provider: 'mock',
      outputDir: TEST_OUTPUT_DIR,
      sizes: ['M'],
    });

    const a4Buffer = fs.readFileSync(result.files.tiledA4Pdf);
    const decodedText = extractPdfDecodedText(a4Buffer);

    // Comprueba que el contenido vectorial y de texto incluye calibración de 10x10 cm y escala 100%
    expect(decodedText).toContain('CALIBRA');
    expect(decodedText).toContain('100% SCALE');
    expect(decodedText).toContain('100 mm x 100 mm');

    // Dimensiones en pt del cuadro: 283.465 pt
    expect(CALIBRATION_BOX_PT).toBeCloseTo(283.465, 2);
    expect(CALIBRATION_BOX_MM).toBe(100);
  });
});

describe('Módulo de Calibración Aislado y Comando Calibrate', () => {
  it('genera la hoja de calibración PDF de 1 página con proporciones exactas A4', async () => {
    const bufferA4 = await generateCalibrationSheetPdf('A4');
    expect(Buffer.isBuffer(bufferA4)).toBe(true);
    expect(bufferA4.length).toBeGreaterThan(1000);
    expect(bufferA4.toString('latin1', 0, 5)).toBe('%PDF-');

    const decodedText = extractPdfDecodedText(bufferA4);
    expect(decodedText).toContain('CALIBRA');
    expect(decodedText).toContain('100% SCALE');
    expect(decodedText).toContain('100 mm x 100 mm');
    expect(decodedText).toContain('4" x 4"');
  });

  it('genera la hoja de calibración PDF de 1 página con formato Letter', async () => {
    const bufferLetter = await generateCalibrationSheetPdf('Letter');
    expect(Buffer.isBuffer(bufferLetter)).toBe(true);
    expect(bufferLetter.length).toBeGreaterThan(1000);
    expect(bufferLetter.toString('latin1', 0, 5)).toBe('%PDF-');

    const decodedText = extractPdfDecodedText(bufferLetter);
    expect(decodedText).toContain('CALIBRA');
    expect(decodedText).toContain('US LETTER');
  });

  it('exportCalibrationPdf guarda el archivo físico y crea subdirectorios', async () => {
    const calibFile = path.join(TEST_OUTPUT_DIR, 'custom_calib/sheet_10x10.pdf');
    const res = await exportCalibrationPdf(calibFile, 'A4');

    expect(fs.existsSync(res.filePath)).toBe(true);
    expect(res.buffer.length).toBeGreaterThan(1000);
    expect(res.filePath).toBe(path.resolve(calibFile));
  });
});

describe('Utilidades de Inspección y Techpack Compilación', () => {
  it('inspectPatternDnaFile lee y valida correctamente un archivo ADN JSON', async () => {
    // Generar un DNA primero
    const genResult = await generatePatternPipeline({
      prompt: 'classic crew tee',
      provider: 'mock',
      outputDir: TEST_OUTPUT_DIR,
    });

    const dna = await inspectPatternDnaFile(genResult.files.dnaJson);
    expect(dna.concept_name).toBe('classic_crew_tee');
    expect(dna.base_block).toBe('tshirt_sloper');
  });

  it('compileTechpackFromFile regenera los entregables técnicos a partir de ADN JSON', async () => {
    const genResult = await generatePatternPipeline({
      prompt: 'classic crew tee',
      provider: 'mock',
      outputDir: TEST_OUTPUT_DIR,
    });

    const customTechDir = path.join(TEST_OUTPUT_DIR, 'recompiled_tech');
    const res = await compileTechpackFromFile(genResult.files.dnaJson, {
      outputDir: customTechDir,
      sizes: ['S', 'M', 'L'],
      wasteFactor: 0.18,
    });

    expect(fs.existsSync(res.pdfPath)).toBe(true);
    expect(fs.existsSync(res.mdPath)).toBe(true);
    expect(fs.existsSync(res.jsonPath)).toBe(true);
    expect(res.techSheet.fabricConsumption.wastePercentage).toBe(18);
  });
});

describe('Helper slugify y CLI commander', () => {
  it('slugify convierte strings a formato seguro para filesystem', () => {
    expect(slugify('Hoodie Oversize Streetwear')).toBe('hoodie_oversize_streetwear');
    expect(slugify('Pantalón Cómodo & Elegante!')).toBe('pantalon_comodo_elegante');
    expect(slugify('---Camiseta___Anime---')).toBe('camiseta_anime');
    expect(slugify('')).toBe('pattern');
  });

  it('initCli configura todos los comandos requeridos', () => {
    const cli = initCli();
    expect(cli.name()).toBe('pattern-ai-core');
    expect(cli.version()).toBe(getVersion());

    const commandNames = cli.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('generate');
    expect(commandNames).toContain('calibrate');
    expect(commandNames).toContain('inspect');
    expect(commandNames).toContain('techpack');
    expect(commandNames).toContain('status');
  });
});

describe('Manejo de Errores y Validaciones en Pipeline', () => {
  it('falla limpiamente si el prompt está vacío', async () => {
    await expect(
      generatePatternPipeline({
        prompt: '',
        provider: 'mock',
      })
    ).rejects.toThrow('Pipeline request requires a non-empty prompt');
  });

  it('falla limpiamente si se especifica un proveedor no soportado', async () => {
    await expect(
      generatePatternPipeline({
        prompt: 'test',
        provider: 'unsupported_ai_provider',
      })
    ).rejects.toThrow(/Unsupported AI provider/);
  });
});
