/**
 * tests/tech_sheet.test.ts
 * Suite de pruebas unitarias y de integración para el Generador de Fichas Técnicas (Tech Pack Generator)
 * pattern-ai-core
 */

import { describe, it, expect } from 'vitest';
import {
  PatternDna,
  StandardSize,
  STANDARD_SIZES,
  modifyPattern,
  modifyPatternMultiSize,
  generateTechSheet,
  generateTechSheetMarkdown,
  generateTechSheetJson,
  generateTechSheetPdf,
  TechSheetData,
} from '../src/index.js';

describe('Tech Pack Generator: Fabric Consumption & Waste Factor', () => {
  const hoodieDna: PatternDna = {
    concept_name: 'streetwear_oversize_hoodie',
    base_block: 'menswear_torso_oversize',
    ease: {
      chest_ease_mm: 160,
      bicep_ease_mm: 70,
      shoulder_ease_mm: 40,
    },
    modifications: {
      neckline: {
        type: 'crossover_hood',
        depth_mm: 40,
      },
      sleeves: {
        type: 'drop_shoulder',
        drop_mm: 50,
      },
      hem: {
        type: 'curved_tail',
        drop_mm: 35,
      },
      pocket: {
        type: 'kangaroo',
      },
      hood: {
        type: 'crossover',
        overlap_mm: 60,
      },
    },
    tech_specs: {
      notions: ['1x cordón 130cm', '2x ojetes metálicos niquelados'],
      estimated_fabric_meters: 1.85,
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
      fabric_type: 'French Terry 350g',
      fabric_width_mm: 1500,
    },
  };

  it('calculates fabric consumption with default 15% waste factor', () => {
    const multiSizeMap = modifyPatternMultiSize(hoodieDna);
    const techSheet = generateTechSheet(hoodieDna, multiSizeMap);

    expect(techSheet.fabricConsumption).toBeDefined();
    expect(techSheet.fabricConsumption.wastePercentage).toBe(15);
    expect(techSheet.fabricConsumption.wasteMultiplier).toBe(1.15);
    expect(techSheet.fabricConsumption.fabricWidth_mm).toBe(1500);

    // Consumos por talla
    for (const size of STANDARD_SIZES) {
      const c = techSheet.fabricConsumption.perSize[size];
      expect(c).toBeDefined();
      expect(c.totalNetArea_mm2).toBeGreaterThan(500000); // Al menos 0.5 m² netos
      expect(c.totalNetArea_m2).toBeGreaterThan(0.5);
      expect(c.idealLinearMeters).toBeGreaterThan(0.3);
      expect(c.estimatedLinearMeters).toBeGreaterThan(c.idealLinearMeters);
      // Merma de al menos 15%
      expect(c.estimatedLinearMeters).toBeCloseTo(c.idealLinearMeters * 1.15, 1);
    }

    // Progresión de consumo por tallas (XS < M < 3XL)
    const xsMeters = techSheet.fabricConsumption.perSize['XS'].estimatedLinearMeters;
    const mMeters = techSheet.fabricConsumption.perSize['M'].estimatedLinearMeters;
    const xxxlMeters = techSheet.fabricConsumption.perSize['3XL'].estimatedLinearMeters;
    expect(xsMeters).toBeLessThan(mMeters);
    expect(mMeters).toBeLessThan(xxxlMeters);

    // Promedio y consolidado
    expect(techSheet.fabricConsumption.averageLinearMeters).toBeGreaterThan(0.5);
    expect(techSheet.fabricConsumption.totalLinearMetersAllSizes).toBeGreaterThan(
      techSheet.fabricConsumption.averageLinearMeters * 5
    );
  });

  it('enforces minimum waste factor of 10% when a lower value is requested', () => {
    const multiSizeMap = modifyPatternMultiSize(hoodieDna);
    // Solicitamos 5% (0.05), pero la regla de negocio exige mínimo 10%
    const techSheet = generateTechSheet(hoodieDna, multiSizeMap, {
      wasteFactor: 0.05,
    });

    expect(techSheet.fabricConsumption.wastePercentage).toBe(10);
    expect(techSheet.fabricConsumption.wasteMultiplier).toBe(1.10);

    const mConsumption = techSheet.fabricConsumption.perSize['M'];
    expect(mConsumption.estimatedLinearMeters).toBeCloseTo(mConsumption.idealLinearMeters * 1.10, 1);
  });

  it('respects custom waste factor >= 10% (e.g. 20%) and custom fabric width', () => {
    const multiSizeMap = modifyPatternMultiSize(hoodieDna);
    const techSheet = generateTechSheet(hoodieDna, multiSizeMap, {
      wasteFactor: 0.20,
      fabricWidth_mm: 1600,
    });

    expect(techSheet.fabricConsumption.wastePercentage).toBe(20);
    expect(techSheet.fabricConsumption.wasteMultiplier).toBe(1.20);
    expect(techSheet.fabricConsumption.fabricWidth_mm).toBe(1600);

    const mConsumption = techSheet.fabricConsumption.perSize['M'];
    expect(mConsumption.estimatedLinearMeters).toBeCloseTo(mConsumption.idealLinearMeters * 1.20, 1);
  });

  it('generates tech sheet directly from a single ModifiedPatternResult', () => {
    const singleResult = modifyPattern(hoodieDna, 'L');
    const techSheet = generateTechSheet(hoodieDna, singleResult);

    expect(techSheet.primarySize).toBe('L');
    expect(techSheet.fabricConsumption.perSize['L']).toBeDefined();
    expect(techSheet.fabricConsumption.perSize['L'].estimatedLinearMeters).toBeGreaterThan(0.5);
  });
});

describe('Tech Pack Generator: Cutting Pieces & Notions (BOM)', () => {
  const tshirtDna: PatternDna = {
    concept_name: 'cyberpunk_oversize_tee',
    base_block: 'tshirt_sloper',
    ease: {
      chest_ease_mm: 140,
      bicep_ease_mm: 60,
    },
    modifications: {
      neckline: {
        type: 'crew',
        band_height_mm: 25,
      },
      sleeves: {
        type: 'drop_shoulder',
        drop_mm: 45,
        length_type: 'short',
      },
      hem: {
        type: 'split',
        split_height_mm: 70,
      },
    },
    tech_specs: {
      seam_allowance_mm: 10,
      hem_allowance_mm: 20,
      fabric_type: 'Jersey 100% Algodón Peinado 200g',
    },
  };

  it('lists detailed cutting pieces with quantities, fold info, net areas and allowances', () => {
    const modified = modifyPattern(tshirtDna, 'M');
    const techSheet = generateTechSheet(tshirtDna, modified);

    expect(techSheet.cuttingPieces.length).toBeGreaterThanOrEqual(3);

    const frontPiece = techSheet.cuttingPieces.find((p) => p.id === 'front');
    expect(frontPiece).toBeDefined();
    expect(frontPiece?.onFold).toBe(true);
    expect(frontPiece?.cutCount).toBe(1);
    expect(frontPiece?.quantityDescription).toContain('lomo');
    expect(frontPiece?.seamAllowance_mm).toBe(10);
    expect(frontPiece?.hemAllowance_mm).toBe(20);
    expect(frontPiece?.netArea_mm2).toBeGreaterThan(100000);
    expect(frontPiece?.notchSummary).toContain('Piquete');

    const sleevePiece = techSheet.cuttingPieces.find((p) => p.id === 'sleeve');
    expect(sleevePiece).toBeDefined();
    expect(sleevePiece?.cutCount).toBe(2);
    expect(sleevePiece?.onFold).toBe(false);
    expect(sleevePiece?.quantityDescription).toContain('2');
  });

  it('builds comprehensive bill of materials (BOM) including thread, needles, tapes, and labels', () => {
    const modified = modifyPattern(tshirtDna, 'M');
    const techSheet = generateTechSheet(tshirtDna, modified);

    expect(techSheet.notions.length).toBeGreaterThanOrEqual(5);

    const categories = techSheet.notions.map((n) => n.category);
    expect(categories).toContain('thread');
    expect(categories).toContain('needle');
    expect(categories).toContain('tape');
    expect(categories).toContain('label');

    const threadNotion = techSheet.notions.find((n) => n.category === 'thread');
    expect(threadNotion?.specification).toContain('Poliéster');
    expect(threadNotion?.quantity).toBeDefined();

    const needleNotion = techSheet.notions.find((n) => n.category === 'needle');
    expect(needleNotion?.specification).toContain('Punta de Bola');
  });
});

describe('Tech Pack Generator: Assembly Sequence & Notch Guidance', () => {
  const hoodieDna: PatternDna = {
    concept_name: 'anime_streetwear_hoodie',
    base_block: 'hoodie_sloper',
    ease: {
      chest_ease_mm: 150,
      bicep_ease_mm: 60,
    },
    modifications: {
      neckline: {
        type: 'crossover_hood',
      },
      sleeves: {
        type: 'drop_shoulder',
      },
      pocket: {
        type: 'kangaroo',
      },
      hood: {
        type: 'crossover',
      },
    },
  };

  it('generates a logical step-by-step assembly sequence with machine types and stitch types', () => {
    const techSheet = generateTechSheet(hoodieDna, modifyPatternMultiSize(hoodieDna));

    expect(techSheet.assemblySequence.length).toBeGreaterThanOrEqual(6);

    const stepNumbers = techSheet.assemblySequence.map((s) => s.stepNumber);
    expect(stepNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // Verificación de máquinas y tipos de puntada
    const hasOverlock = techSheet.assemblySequence.some((s) => s.machineType.includes('Overlock'));
    const hasISO514 = techSheet.assemblySequence.some((s) => s.stitchType.includes('ISO 514'));
    expect(hasOverlock).toBe(true);
    expect(hasISO514).toBe(true);
  });

  it('includes critical notch alignment instructions in sleeve insertion step (single front vs double back)', () => {
    const techSheet = generateTechSheet(hoodieDna, modifyPatternMultiSize(hoodieDna));

    const sleeveStep = techSheet.assemblySequence.find(
      (s) => s.title.toLowerCase().includes('manga') || s.operation.toLowerCase().includes('manga')
    );
    expect(sleeveStep).toBeDefined();
    expect(sleeveStep?.instructions).toContain('PIQUETE SIMPLE DE SISA DELANTERA');
    expect(sleeveStep?.instructions).toContain('PIQUETE DOBLE DE SISA ESPALDA');
    expect(sleeveStep?.notchGuidance).toContain('piquetes simples');
    expect(sleeveStep?.notchGuidance).toContain('piquetes dobles');
  });

  it('generates structured 4-step assembly sequence for vest (straw pirate adventurer vest / wahid)', () => {
    const vestDna: PatternDna = {
      concept_name: 'straw_pirate_adventurer_vest',
      base_block: 'menswear_torso_fitted',
      ease: {
        chest_ease_mm: 50,
        waist_ease_mm: 40,
        hip_ease_mm: 35,
      },
      modifications: {
        neckline: { type: 'v_neck', depth_mm: 130 },
        sleeves: { type: 'sleeveless' },
        hem: { type: 'curved_tail', drop_mm: 45 },
      },
      tech_specs: {
        notions: ['3x botones dorados 22mm', 'entretela termoadhesiva'],
        estimated_fabric_meters: 0.85,
        fabric_type: 'Rustic Red Linen',
      },
    };

    const techSheet = generateTechSheet(vestDna, modifyPatternMultiSize(vestDna));
    expect(techSheet.assemblySequence.length).toBe(4);

    const [step1, step2, step3, step4] = techSheet.assemblySequence;

    // Paso 1: Preparación y entretelado térmico de vistas interiores (delantera, cuello, sisa)
    expect(step1.stepNumber).toBe(1);
    expect(step1.title).toContain('Preparación y entretelado térmico de vistas interiores');
    expect(step1.instructions).toContain('vistas interiores');
    expect(step1.instructions).toContain('entretela');

    // Paso 2: Confección de botonadura frontal y ojales en las marcas del cruce (+20mm)
    expect(step2.stepNumber).toBe(2);
    expect(step2.title).toContain('botonadura frontal y ojales');
    expect(step2.instructions).toContain('+20mm');
    expect(step2.instructions).toContain('marcas del cruce');

    // Paso 3: Ensamble y pespunte de hombros y costados alineando los piquetes pareados
    expect(step3.stepNumber).toBe(3);
    expect(step3.title).toContain('hombros y costados alineando los piquetes pareados');
    expect(step3.instructions).toContain('piquetes pareados');
    expect(step3.notchGuidance).toContain('piquetes pareados');

    // Paso 4: Remate de dobladillos (recto, cola o doble pico) y planchado final
    expect(step4.stepNumber).toBe(4);
    expect(step4.title).toContain('Remate de dobladillos');
    expect(step4.title).toContain('planchado final');
    expect(step4.instructions).toContain('doble pico');

    // Verificación en Markdown y JSON
    const md = generateTechSheetMarkdown(techSheet);
    expect(md).toContain('## 4. GUÍA DE CONFECCIÓN Y ENSAMBLE PASO A PASO');
    expect(md).toContain('Preparación y entretelado térmico de vistas interiores');
    expect(md).toContain('cruce (+20mm)');
    expect(md).toContain('piquetes pareados');
    expect(md).toContain('Remate de dobladillos');

    const json = JSON.parse(generateTechSheetJson(techSheet)) as TechSheetData;
    expect(json.assemblySequence.length).toBe(4);
    expect(json.assemblySequence[0].title).toContain('vistas interiores');
  });
});

describe('Tech Pack Generator: Finished Garment Measurements (POM Table)', () => {
  const hoodieDna: PatternDna = {
    concept_name: 'oversize_hoodie_pom',
    base_block: 'menswear_torso_oversize',
    ease: {
      chest_ease_mm: 160,
      bicep_ease_mm: 70,
    },
    modifications: {
      neckline: { type: 'hood' },
      sleeves: { type: 'drop_shoulder' },
      hood: { type: 'standard' },
      pocket: { type: 'kangaroo' },
    },
  };

  it('produces finished garment measurements (POM) across all standard sizes with valid progressive values', () => {
    const multiSizeMap = modifyPatternMultiSize(hoodieDna);
    const techSheet = generateTechSheet(hoodieDna, multiSizeMap);

    expect(techSheet.finishedMeasurements.length).toBeGreaterThanOrEqual(8);

    const chestRow = techSheet.finishedMeasurements.find((r) => r.code === 'POM-01');
    expect(chestRow).toBeDefined();
    expect(chestRow?.pointOfMeasurement).toContain('Pecho');
    expect(chestRow?.tolerance_mm).toBe(10);

    // Verificación de valores positivos y gradientes ascendentes
    const chestXS = chestRow!.values['XS'];
    const chestM = chestRow!.values['M'];
    const chest3XL = chestRow!.values['3XL'];

    expect(chestXS).toBeGreaterThan(900);
    expect(chestM).toBeGreaterThan(chestXS);
    expect(chest3XL).toBeGreaterThan(chestM);

    // Largo delantero
    const lengthRow = techSheet.finishedMeasurements.find((r) => r.code === 'POM-03');
    expect(lengthRow).toBeDefined();
    expect(lengthRow!.values['M']).toBeGreaterThan(600);

    // Manga
    const sleeveRow = techSheet.finishedMeasurements.find((r) => r.code === 'POM-08');
    expect(sleeveRow).toBeDefined();
    expect(sleeveRow!.values['M']).toBeGreaterThan(450);
  });
});

describe('Tech Pack Generator: Export Formats (Markdown, JSON, PDF)', () => {
  const dna: PatternDna = {
    concept_name: 'test_tech_pack_garment',
    base_block: 'menswear_torso_oversize',
    ease: {
      chest_ease_mm: 160,
      bicep_ease_mm: 70,
    },
    modifications: {
      neckline: { type: 'crew' },
      sleeves: { type: 'set_in' },
      hem: { type: 'straight' },
    },
    tech_specs: {
      fabric_type: 'Algodón Pima 100% 220g',
      fabric_width_mm: 1500,
      seam_allowance_mm: 10,
      hem_allowance_mm: 25,
    },
  };

  it('generates valid, well-structured Markdown document', () => {
    const techSheet = generateTechSheet(dna, modifyPatternMultiSize(dna));
    const md = generateTechSheetMarkdown(techSheet);

    expect(typeof md).toBe('string');
    expect(md).toContain('# FICHA TÉCNICA DE CONFECCIÓN Y CONSUMO (TECH PACK)');
    expect(md).toContain('## 1. CONSUMO DE TELA Y RENDIMIENTO TEXTIL');
    expect(md).toContain('## 2. LISTA DETALLADA DE PIEZAS DE CORTE');
    expect(md).toContain('## 3. LISTA DE AVÍOS Y MERCERÍA (BILL OF MATERIALS - BOM)');
    expect(md).toContain('## 4. GUÍA DE CONFECCIÓN Y ENSAMBLE PASO A PASO');
    expect(md).toContain('## 5. TABLA DE MEDIDAS TERMINADAS DE LA PRENDA (POINTS OF MEASUREMENT - POM)');
    expect(md).toContain('POM-01');
    expect(md).toContain('15%');
  });

  it('generates valid, parseable JSON output', () => {
    const techSheet = generateTechSheet(dna, modifyPatternMultiSize(dna));
    const jsonStr = generateTechSheetJson(techSheet);

    expect(typeof jsonStr).toBe('string');
    const parsed = JSON.parse(jsonStr) as TechSheetData;
    expect(parsed.conceptName).toBe('test_tech_pack_garment');
    expect(parsed.fabricConsumption.wastePercentage).toBe(15);
    expect(parsed.cuttingPieces.length).toBeGreaterThan(0);
    expect(parsed.notions.length).toBeGreaterThan(0);
    expect(parsed.assemblySequence.length).toBeGreaterThan(0);
    expect(parsed.finishedMeasurements.length).toBeGreaterThan(0);
  });

  it('generates a valid, non-corrupted PDF buffer without throwing errors', async () => {
    const techSheet = generateTechSheet(dna, modifyPatternMultiSize(dna));
    const pdfBuffer = await generateTechSheetPdf(techSheet);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(3000); // Documento PDF completo (>3KB)
    // Cabecera estándar de archivo PDF "%PDF-"
    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('generates multi-page PDF for complete complex hoodie with all sizes and features', async () => {
    const complexHoodieDna: PatternDna = {
      concept_name: 'cyber_heavyweight_hoodie',
      base_block: 'menswear_torso_oversize',
      ease: {
        chest_ease_mm: 180,
        bicep_ease_mm: 80,
      },
      modifications: {
        neckline: { type: 'crossover_hood', depth_mm: 45 },
        sleeves: { type: 'drop_shoulder', drop_mm: 60, cuff_rib_mm: 65 },
        hem: { type: 'curved_tail', drop_mm: 40, back_drop_mm: 60 },
        pocket: { type: 'kangaroo' },
        hood: { type: 'crossover', overlap_mm: 70 },
      },
      tech_specs: {
        fabric_type: 'Heavy French Terry 460g / 100% Organic Cotton',
        fabric_width_mm: 1500,
        seam_allowance_mm: 10,
        hem_allowance_mm: 25,
        notions: ['Cordón encerado 140cm', 'Ojetes titanio 10mm', 'Etiqueta Tyvek lateral'],
      },
    };

    const multiSizeMap = modifyPatternMultiSize(complexHoodieDna);
    const techSheet = generateTechSheet(complexHoodieDna, multiSizeMap, {
      wasteFactor: 0.18,
      notes: [
        'Prenda heavyweight con encogimiento de lavado de hasta 4%.',
        'Costuras reforzadas con 5 hilos en puntos de tensión crítica.',
        'Control dimensional riguroso en sisa y contorno de capucha.',
      ],
    });

    const pdfBuffer = await generateTechSheetPdf(techSheet);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(5000);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    const md = generateTechSheetMarkdown(techSheet);
    expect(md).toContain('18%');
    expect(md).toContain('Heavy French Terry');
    expect(md).toContain('cyber_heavyweight_hoodie');
  });
});

describe('Tech Pack Generator: Edge Cases & Boundary Conditions', () => {
  it('enforces 10% minimum waste factor for 0 or negative waste factor inputs', () => {
    const dna: PatternDna = {
      concept_name: 'zero_waste_attempt_tee',
      base_block: 'tshirt_sloper',
      ease: { chest_ease_mm: 80 },
      modifications: {},
    };

    const zeroTechSheet = generateTechSheet(dna, modifyPattern(dna, 'M'), { wasteFactor: 0 });
    expect(zeroTechSheet.fabricConsumption.wastePercentage).toBe(10);
    expect(zeroTechSheet.fabricConsumption.wasteMultiplier).toBe(1.10);

    const negTechSheet = generateTechSheet(dna, modifyPattern(dna, 'M'), { wasteFactor: -0.25 });
    expect(negTechSheet.fabricConsumption.wastePercentage).toBe(10);
    expect(negTechSheet.fabricConsumption.wasteMultiplier).toBe(1.10);
  });

  it('correctly handles sleeveless garment without sleeve pieces in POM and cutting pieces', () => {
    const sleevelessDna: PatternDna = {
      concept_name: 'sleeveless_tank_top',
      base_block: 'menswear_torso',
      ease: { chest_ease_mm: 60 },
      modifications: {
        sleeves: { type: 'sleeveless' },
      },
    };

    const techSheet = generateTechSheet(sleevelessDna, modifyPatternMultiSize(sleevelessDna));
    const sleevePiece = techSheet.cuttingPieces.find((p) => p.id === 'sleeve');
    expect(sleevePiece).toBeUndefined();

    // No debe haber POM de manga
    const sleevePom = techSheet.finishedMeasurements.find((r) => r.code === 'POM-08');
    expect(sleevePom).toBeUndefined();

    // Pero sí debe haber pecho, hombro, largo
    const chestPom = techSheet.finishedMeasurements.find((r) => r.code === 'POM-01');
    expect(chestPom).toBeDefined();
    expect(chestPom!.values['M']).toBeGreaterThan(800);
  });

  it('correctly handles patch pocket and assigns appropriate suggested fabrics and BOM', () => {
    const patchDna: PatternDna = {
      concept_name: 'utility_patch_pocket_tee',
      base_block: 'tshirt_sloper',
      ease: { chest_ease_mm: 100 },
      modifications: {
        pocket: { type: 'patch', width_mm: 120, height_mm: 140 },
        hem: { type: 'ribbed', rib_height_mm: 50 },
      },
    };

    const techSheet = generateTechSheet(patchDna, modifyPatternMultiSize(patchDna));
    const pocketPiece = techSheet.cuttingPieces.find((p) => p.id === 'pocket');
    expect(pocketPiece).toBeDefined();
    expect(pocketPiece?.name).toContain('PARCHE');
    expect(pocketPiece?.cutCount).toBe(1);

    // Verificación de rib en BOM
    const ribNotion = techSheet.notions.find((n) => n.category === 'elastic_rib');
    expect(ribNotion).toBeDefined();
  });
});

