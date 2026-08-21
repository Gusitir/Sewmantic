/**
 * src/engine/tech_sheet.ts
 * Generador de Fichas Técnicas de Confección, Consumo de Tela y Medidas Terminadas (Tech Pack Generator)
 * pattern-ai-core
 *
 * Genera especificaciones técnicas de producción industrial para patrones paramétricos:
 * - Cálculo riguroso de consumo de tela por talla con factor de merma (waste factor >= 10%).
 * - Lista de corte detallada con telas sugeridas y áreas netas.
 * - Lista de avíos y mercería (BOM).
 * - Secuencia de confección paso a paso con alineación de piquetes (notches).
 * - Tabla de medidas terminadas de prenda (Finished Garment Measurements - POM) multi-talla.
 * - Exportadores a Markdown, JSON y PDF (PDFKit).
 */

import PDFDocument from 'pdfkit';
import { StandardSize, PatternDna, TechSpecs } from '../types/pattern.js';
import { ModifiedPatternResult, modifyPatternMultiSize } from './modifier.js';
import {
  STANDARD_SIZES,
  BodyMeasurements,
  getStandardMeasurements,
  calculateCustomMeasurements,
  ANATOMICAL_LIMITS,
} from './base_blocks/measurements.js';
import { pdfDocToBuffer } from './exporter.js';

/**
 * Opciones de configuración para la generación de la ficha técnica
 */
export interface TechSheetOptions {
  /** Ancho de tela estándar en milímetros (por defecto 1500 mm = 1.50 m) */
  fabricWidth_mm?: number;
  /** Factor de merma / desperdicio de corte (por defecto 0.15 = 15%, mínimo permitido: 0.10 = 10%) */
  wasteFactor?: number;
  /** Tipo de tela sugerida principal */
  fabricType?: string;
  /** Color o variante primaria */
  primaryColor?: string;
  /** Tallas objetivo a incluir en la ficha técnica */
  targetSizes?: StandardSize[];
  /** Notas adicionales de producción */
  notes?: string[];
  /** Versión del documento de ficha técnica */
  version?: string;
  /** Unidad de medida preferida para tablas */
  unit?: 'mm' | 'cm';
}

/**
 * Detalle de cada pieza de corte
 */
export interface CutPieceDetail {
  id: string;
  name: string;
  cutCount: number;
  onFold: boolean;
  quantityDescription: string;
  suggestedFabric: string;
  seamAllowance_mm: number;
  hemAllowance_mm: number;
  netArea_mm2: number;
  totalArea_mm2: number;
  width_mm: number;
  height_mm: number;
  grainlineDescription: string;
  notchSummary: string;
}

/**
 * Consumo de tela para una talla específica
 */
export interface SizeFabricConsumption {
  size: StandardSize;
  totalNetArea_mm2: number;
  totalNetArea_m2: number;
  fabricWidth_mm: number;
  wastePercentage: number;
  wasteMultiplier: number;
  idealLinearMeters: number;
  estimatedLinearMeters: number;
}

/**
 * Desglose de consumo por tipo específico de tela (para conjuntos multi-tela)
 */
export interface FabricDetailBreakdown {
  fabricKey: string;
  fabricName: string;
  fabricType?: string;
  color?: string;
  width_mm: number;
  wastePercentage: number;
  wasteMultiplier: number;
  averageLinearMeters: number;
  totalLinearMetersAllSizes: number;
  perSize: Record<StandardSize, SizeFabricConsumption>;
  pieces: string[];
}

/**
 * Resumen consolidado de consumo textil
 */
export interface FabricConsumptionSummary {
  fabricWidth_mm: number;
  wastePercentage: number;
  wasteMultiplier: number;
  suggestedFabric: string;
  perSize: Record<StandardSize, SizeFabricConsumption>;
  averageLinearMeters: number;
  totalLinearMetersAllSizes: number;
  sizeCount: number;
  breakdown_by_fabric?: Record<string, FabricDetailBreakdown>;
}


/**
 * Insumo o material de mercería (Bill of Materials - BOM)
 */
export interface NotionItem {
  category:
    | 'thread'
    | 'needle'
    | 'elastic_rib'
    | 'cords_drawstrings'
    | 'interfacing'
    | 'hardware'
    | 'tape'
    | 'label'
    | 'other';
  name: string;
  specification: string;
  quantity: string;
  usageLocation: string;
}

/**
 * Paso de la secuencia de confección y ensamblado
 */
export interface AssemblyStep {
  stepNumber: number;
  title: string;
  operation: string;
  machineType: string;
  stitchType: string;
  instructions: string;
  notchGuidance?: string;
  criticalNotes?: string;
}

/**
 * Fila de la tabla de medidas terminadas de la prenda (Points of Measurement - POM)
 */
export interface FinishedGarmentMeasurementRow {
  code: string;
  pointOfMeasurement: string;
  tolerance_mm: number;
  values: Record<StandardSize, number>;
}

/**
 * Comparación de una medida corporal personalizada vs talla base
 */
export interface CustomMeasurementComparison {
  key: keyof BodyMeasurements;
  label: string;
  baseValue_mm: number;
  customValue_mm: number;
  delta_mm: number;
  isExplicit: boolean;
}

/**
 * Resumen consolidado de personalización antropométrica
 */
export interface CustomMeasurementsSummary {
  referenceSize: StandardSize;
  providedFieldsCount: number;
  measurements: CustomMeasurementComparison[];
}

/**
 * Estructura completa de datos de la Ficha Técnica (Tech Pack)
 */
export interface TechSheetData {
  conceptName: string;
  description: string;
  baseBlock: string;
  primarySize: StandardSize;
  allSizes: StandardSize[];
  createdAt: string;
  version: string;
  seamAllowance_mm: number;
  hemAllowance_mm: number;
  fabricConsumption: FabricConsumptionSummary;
  cuttingPieces: CutPieceDetail[];
  notions: NotionItem[];
  assemblySequence: AssemblyStep[];
  finishedMeasurements: FinishedGarmentMeasurementRow[];
  customMeasurements?: CustomMeasurementsSummary;
  notes: string[];
}

/**
 * Determina el tipo de tela sugerida para una pieza según su nombre y el bloque base
 */
function inferFabricForPart(partName: string, dna: PatternDna, defaultFabric: string): string {
  const nameLower = partName.toLowerCase();
  if (nameLower.includes('rib') || nameLower.includes('band')) {
    return 'Rib 1x1 / 2x2 con Elastano (380-420 gsm)';
  }
  if (nameLower.includes('pocket_bag') || nameLower.includes('lining') || nameLower.includes('forro')) {
    return 'Forro liviano / Popelina / Jersey 140 gsm';
  }

  const isSet =
    dna.garment_category === 'set' ||
    Boolean(dna.fabric_details) ||
    Boolean(dna.sub_garments) ||
    Boolean(dna.multi_piece_config) ||
    dna.base_block === 'two_piece_set' ||
    (dna.concept_name && dna.concept_name.toLowerCase().includes('set'));

  if (isSet) {
    const mainFabric =
      dna.fabric_details?.main_fabric?.name ||
      dna.fabric_details?.main_fabric?.type ||
      dna.sub_garments?.top?.tech_specs?.fabric_type ||
      'Lino Rústico Rojo / Rustic Red Linen Canvas (260 gsm)';

    const secondaryFabric =
      dna.fabric_details?.secondary_fabric?.name ||
      dna.fabric_details?.secondary_fabric?.type ||
      dna.sub_garments?.bottom?.tech_specs?.fabric_type ||
      'Denim Azul Índigo 12oz / 12oz Blue Denim';

    // Top parts: front_torso, back_torso, front, back, sleeve, hood, top_pocket
    if (
      nameLower.includes('torso') ||
      nameLower.includes('vest') ||
      nameLower.includes('chaleco') ||
      nameLower.includes('sleeve') ||
      nameLower.includes('hood') ||
      (nameLower.includes('front') && !nameLower.includes('leg')) ||
      (nameLower.includes('back') && !nameLower.includes('leg'))
    ) {
      return mainFabric;
    }

    // Bottom parts: front_leg, back_leg, waistband, pretina, cuff, pocket, pant, trouser, shorts, bermuda
    if (
      nameLower.includes('leg') ||
      nameLower.includes('waistband') ||
      nameLower.includes('pretina') ||
      nameLower.includes('cuff') ||
      nameLower.includes('pant') ||
      nameLower.includes('trouser') ||
      nameLower.includes('short') ||
      nameLower.includes('bermuda') ||
      nameLower.includes('pocket')
    ) {
      return secondaryFabric;
    }
  }

  return defaultFabric;
}

/**
 * Formatea el resumen de piquetes de una pieza
 */
function summarizeNotches(notches?: Array<{ type?: string; label?: string }>): string {
  if (!notches || notches.length === 0) {
    return 'Sin piquetes';
  }
  return notches
    .map((n) => `${n.type === 'double' ? 'Piquete Doble' : 'Piquete Simple'}: ${n.label || 'Referencia'}`)
    .join('; ');
}

/**
 * Construye la lista de avíos y mercería estándar e industrial
 */
function buildNotionsList(dna: PatternDna, defaultFabric: string): NotionItem[] {
  const notions: NotionItem[] = [];

  const isSet =
    dna.garment_category === 'set' ||
    Boolean(dna.fabric_details) ||
    Boolean(dna.sub_garments) ||
    Boolean(dna.multi_piece_config) ||
    dna.base_block === 'two_piece_set' ||
    (dna.concept_name && dna.concept_name.toLowerCase().includes('set'));

  if (isSet) {
    // 1. Hilos específicos para conjunto de 2 piezas (Lino Rojo + Denim Azul)
    notions.push({
      category: 'thread',
      name: 'Hilo de Costura Recta / Overlock Rojo',
      specification: 'Poliéster 100% Spun 40/2 color rojo escarlata de alta tenacidad al tono de lino',
      quantity: 'Aprox. 150 m por prenda',
      usageLocation: 'Uniones de hombros, sisas, vistas y bajo del chaleco',
    });

    notions.push({
      category: 'thread',
      name: 'Hilo de Costura Denim Azul Índigo',
      specification: 'Poliéster 100% Spun 30/2 o 40/2 azul marino / índigo',
      quantity: 'Aprox. 180 m por prenda',
      usageLocation: 'Tiro delantero y trasero, entrepierna y costados de la bermuda',
    });

    notions.push({
      category: 'thread',
      name: 'Hilo Torzal de Pespunte Jeans Dorado',
      specification: 'Poliéster torzal grueso 20/3 amarillo oro contrastante para vaqueros',
      quantity: 'Aprox. 80 m por prenda',
      usageLocation: 'Pespuntes decorativos y de refuerzo en bolsillos y pretina de bermuda',
    });

    // 2. Agujas industriales
    notions.push({
      category: 'needle',
      name: 'Set de Agujas Industriales para Conjunto',
      specification: '1x Sistema 134R 80/12 (Lino Chaleco) + 1x Sistema 134 Jeans 100/16 (Denim)',
      quantity: '1 set (2 agujas)',
      usageLocation: 'Máquina recta y remalladora para lino y denim',
    });

    // 3. Botones y avíos metálicos consolidados (BOM Completo)
    notions.push({
      category: 'hardware',
      name: 'Botones Frontales de Chaleco',
      specification: 'Botones planos de resina/nácar o metálicos dorados Ø 22-25 mm con 4 agujeros o pie',
      quantity: '3 unidades',
      usageLocation: 'Centro delantero del chaleco pirata',
    });

    notions.push({
      category: 'hardware',
      name: 'Botón Metálico Jeans y Remaches Bermuda',
      specification: 'Botón metálico de golpe para vaqueros Ø 17 mm con vástago de aluminio',
      quantity: '1 botón + 4 remaches decorativos',
      usageLocation: 'Centro delantero de pretina y esquinas de bolsillos de bermuda',
    });

    notions.push({
      category: 'hardware',
      name: 'Cremallera Metálica para Bragueta',
      specification: 'Cremallera metálica reforzada YKK latón antiguo #4 de 15 cm con tope de seguridad',
      quantity: '1 unidad (15 cm)',
      usageLocation: 'Bragueta delantera de la bermuda denim',
    });

    // 4. Entretela termoadhesiva
    notions.push({
      category: 'interfacing',
      name: 'Entretela Termoadhesiva Estructurada',
      specification: 'Entretela tejida fusionable semi-rígida 60 g/m² para sastrería liviana',
      quantity: 'Aprox. 0.50 m lineales',
      usageLocation: 'Vistas delanteras del chaleco y pretina estructurada de la bermuda',
    });

    // 5. Etiquetas de marca y composición
    notions.push({
      category: 'label',
      name: 'Set de Etiquetas de Marca y Cuidado Cosplay',
      specification: '1x Etiqueta Principal de Marca + 2x Etiquetas de Talla + 2x Etiquetas de Cuidado',
      quantity: '1 set completo',
      usageLocation: 'Escote chaleco y pretina interior trasera de bermuda',
    });
  } else {
    // 1. Hilos de coser y áncora
    notions.push({
      category: 'thread',
      name: 'Hilo de Costura Recta / Overlock',
      specification: 'Poliéster 100% Spun 40/2 o 120/2 de alta tenacidad al tono de tela',
      quantity: 'Aprox. 200 m por prenda',
      usageLocation: 'Pespuntes, uniones de hombros, mangas y costados',
    });

    notions.push({
      category: 'thread',
      name: 'Hilo de Recubrimiento / Áncoras',
      specification: 'Poliéster texturizado 150D/1 para áncoras elásticas',
      quantity: 'Aprox. 250 m por prenda',
      usageLocation: 'Fileteado de overlock y recubridora (collareta)',
    });

    // 2. Agujas industriales recomendadas
    const isKnit =
      dna.base_block.toLowerCase().includes('hoodie') ||
      dna.base_block.toLowerCase().includes('tshirt') ||
      dna.base_block.toLowerCase().includes('oversize');

    notions.push({
      category: 'needle',
      name: 'Agujas de Confección',
      specification: isKnit
        ? 'Sistema 130/705 H-SUK o DBx1 Punta de Bola Mediana (Ballpoint) 75/11 a 80/12'
        : 'Sistema 134R / DBx1 Punta Redonda Normal 80/12 a 90/14',
      quantity: '1-2 unidades por lote de confección',
      usageLocation: 'Máquinas recta, overlock y collareta',
    });

    // 3. Rib / Complementos elásticos
    const isRibbed =
      dna.modifications.hem?.type === 'ribbed' ||
      Boolean(dna.modifications.sleeves?.cuff_rib_mm) ||
      dna.modifications.neckline?.type === 'crew';

    if (isRibbed) {
      notions.push({
        category: 'elastic_rib',
        name: 'Tejido de Rib Complementario',
        specification: 'Rib 1x1 o 2x2 Algodón/Spandex (95/5) 380 g/m² con memoria elástica',
        quantity: 'Aprox. 0.35 - 0.45 m lineales',
        usageLocation: 'Pretina de bajo, puños de manga y/o cuello',
      });
    }

    // 4. Capucha: Cordón, Ojetes y Entretela
    const hasHood =
      dna.modifications.hood !== undefined ||
      dna.modifications.neckline?.type === 'crossover_hood' ||
      dna.modifications.neckline?.type === 'hood' ||
      dna.base_block.toLowerCase().includes('hoodie');

    if (hasHood) {
      notions.push({
        category: 'cords_drawstrings',
        name: 'Cordón de Ajuste para Capucha',
        specification: 'Cordón tubular de algodón 100% trenzado Ø 8-10 mm con punteras metálicas (aglets)',
        quantity: '1 unidad (1.25 m a 1.40 m)',
        usageLocation: 'Canal frontal de la capucha',
      });

      notions.push({
        category: 'hardware',
        name: 'Ojetes Metálicos de Salida',
        specification: 'Ojetes de latón inoxidables niquelados/pavonados Ø interior 8 mm con contra-arandela',
        quantity: '2 unidades',
        usageLocation: 'Boca de salida del cordón en delantero de capucha',
      });

      notions.push({
        category: 'interfacing',
        name: 'Entretela de Refuerzo Termoadhesiva',
        specification: 'Entretela no tejida fusionable liviana 40 g/m² (poliéster)',
        quantity: '2 parches de 35 x 35 mm',
        usageLocation: 'Refuerzo interior en la zona de troquelado de los ojetes',
      });
    }

    // 5. Cinta de refuerzo de hombro y tapeta de cuello
    notions.push({
      category: 'tape',
      name: 'Cinta Estabilizadora de Hombros',
      specification: 'Cinta de polietileno transparente framilon / hiladillo de algodón 6 mm',
      quantity: 'Aprox. 0.45 m por prenda',
      usageLocation: 'Embebida en la costura de unión de hombros para evitar estiramiento',
    });

    notions.push({
      category: 'tape',
      name: 'Cinta Tapeta Limpieza Escote Espalda',
      specification: 'Cinta de espiguilla (Herringbone) 100% algodón 12-15 mm al tono o contraste',
      quantity: 'Aprox. 0.35 m por prenda',
      usageLocation: 'Cubrecostura interior de escote trasero de hombro a hombro',
    });

    // 6. Set de etiquetas
    notions.push({
      category: 'label',
      name: 'Set de Etiquetas de Marca y Cuidado',
      specification: '1x Etiqueta Principal Jacquard de marca + 1x Etiqueta de Talla + 1x Etiqueta de Composición y Cuidado textil',
      quantity: '1 set completo',
      usageLocation: 'Centro escote espalda y costura lateral izquierda a 10 cm del bajo',
    });
  }

  // 7. Notions personalizadas declaradas en dna
  const customNotions = dna.tech_specs?.notions ?? dna.notions ?? [];
  for (const cNotion of customNotions) {
    if (!notions.some((n) => n.name.toLowerCase().includes(cNotion.toLowerCase()))) {
      notions.push({
        category: 'other',
        name: cNotion,
        specification: 'Insumo especificado en ADN paramétrico',
        quantity: 'Según diseño',
        usageLocation: 'Prenda',
      });
    }
  }

  return notions;
}

/**
 * Construye la secuencia de ensamble paso a paso con explicación detallada de piquetes
 */
function buildAssemblySequence(dna: PatternDna): AssemblyStep[] {
  const steps: AssemblyStep[] = [];
  let stepNum = 1;

  const isSet =
    dna.garment_category === 'set' ||
    Boolean(dna.fabric_details) ||
    Boolean(dna.sub_garments) ||
    Boolean(dna.multi_piece_config) ||
    dna.base_block === 'two_piece_set' ||
    (dna.concept_name && dna.concept_name.toLowerCase().includes('set'));

  if (isSet) {
    // Secuencia de confección completa para conjunto de 2 piezas (Chaleco + Bermuda)
    steps.push({
      stepNumber: stepNum++,
      title: 'Preparación, Fusionado de Entretelas y Control de Piezas',
      operation: 'Termofijado de Vistas y Pretinas',
      machineType: 'Prensa Térmica / Plancha Industrial (140°C, 3 bar, 12s)',
      stitchType: 'N/A (Termofijado)',
      instructions:
        'Verificar el corte de las piezas de ambas prendas: Torso Delantero, Torso Espalda, Pierna Delantera, Pierna Espalda, Pretina y Bolsillos. ' +
        'Fusionar entretela en las vistas delanteras del chaleco y en la mitad interior de la pretina de la bermuda. Marcar piquetes en sisa, cintura y bajo.',
      notchGuidance: 'Comprobar piquetes simples en delantero y dobles en espalda en ambas prendas.',
      criticalNotes: 'Asegurar que la entretela no sobrepase el margen de costura.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Confección y Fijado de Bolsillos Traseros de la Bermuda',
      operation: 'Pespunte de Bolsillo Parche en Espalda Denim',
      machineType: 'Máquina Recta 1 Aguja (ISO 301) con Hilo Torzal',
      stitchType: 'Pespunte Jeans 3.5 mm con remate en esquinas',
      instructions:
        'Dobladillar la boca superior de los bolsillos traseros (dobladillo de 20 mm). Doblar y planchar los márgenes laterales e inferior a 10 mm. ' +
        'Ubicar sobre la pierna espalda haciendo coincidir los piquetes de referencia superior e inferior. ' +
        'Pespuntear a 2 mm del borde con doble pespunte y presillas triangulares de refuerzo en vértices superiores.',
      notchGuidance: 'Alinear los vértices superiores con los piquetes de referencia en espalda.',
      criticalNotes: 'Las presillas en esquinas son obligatorias para resistir la tracción.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Armado del Chaleco: Hombros, Vistas y Escote en V',
      operation: 'Unión de Hombros y Colocación de Vistas Delanteras',
      machineType: 'Máquina Recta (ISO 301) + Overlock 4 Hilos (ISO 514)',
      stitchType: 'Costura Recta 3.0 mm + Sobrehilado',
      instructions:
        '1. Encarar delantero y espalda del chaleco derecho con derecho y unir hombros a 10 mm intercalando cinta estabilizadora. ' +
        '2. Unir las vistas delanteras al contorno del escote en V y centro delantero. ' +
        '3. Picar los vértices del escote en V y volcar hacia el interior, asentando con plancha y pespunte de carga interior.',
      notchGuidance: 'Hacer coincidir el vértice del escote en V con la marca de centro.',
      criticalNotes: 'El picado del ángulo en V debe llegar a 1 mm de la costura sin cortarla.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Acabado de Sisas sin Mangas y Cerrado de Costados del Chaleco',
      operation: 'Ribeteado / Vistas de Sisa y Cierre Lateral',
      machineType: 'Máquina Recta (ISO 301) + Overlock (ISO 514)',
      stitchType: 'Costura Recta 3.0 mm + Fileteado',
      instructions:
        '1. Dobladillar o colocar bies/vista en las sisas sin mangas y pespuntear a 5 mm del borde. ' +
        '2. Encarar delantero y espalda derecho con derecho y cerrar costados a 10 mm. ' +
        '3. Dobladillar el bajo curvo del chaleco a 20 mm con pespunte al tono.',
      notchGuidance: 'Alinear piquetes de sisa y cintura en costados.',
      criticalNotes: 'Mantener tensión suave en sisas curvas para evitar que se desboquen.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Armado de la Bermuda: Tiros y Montaje de Bragueta',
      operation: 'Cierre de Tiro Delantero y Colocación de Cremallera YKK',
      machineType: 'Máquina Recta (ISO 301) + Overlock 4 Hilos (ISO 514)',
      stitchType: 'Pespunte reforzado + Puntada de seguridad',
      instructions:
        '1. Sobrehilar los bordes de tiro delantero y trasero de la bermuda. ' +
        '2. Montar la cremallera metálica en la bragueta delantera con su tapeta protectora. ' +
        '3. Pespuntear la curva exterior de la bragueta con hilo torzal dorado. ' +
        '4. Unir el tiro delantero hasta el tope de la cremallera.',
      notchGuidance: 'Alinear piquetes de bragueta y centro delantero.',
      criticalNotes: 'Evitar que la aguja golpee los dientes metálicos de la cremallera.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Cierre de Entrepierna, Costados y Tiro Trasero de la Bermuda',
      operation: 'Unión Continua de Piernas',
      machineType: 'Overlock 4 Hilos (ISO 514) + Recta Doble Pespunte',
      stitchType: 'Costura de seguridad 5 hilos o Overlock 4 hilos',
      instructions:
        '1. Unir la entrepierna de pierna delantera con pierna trasera en una sola pasada continua. ' +
        '2. Cerrar el tiro trasero reforzando con doble costura de seguridad. ' +
        '3. Cerrar los costados exteriores de la bermuda desde la cintura hasta el bajo.',
      notchGuidance: 'Hacer coincidir en cruz exacta la intersección de las costuras de entrepierna.',
      criticalNotes: 'Tolerancia en el cruce de entrepierna: +/- 1.5 mm máximo.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Confección y Pegado de Pretina Estructurada',
      operation: 'Montaje de Pretina Jeans con Trabillas',
      machineType: 'Máquina Recta (ISO 301) con Hilo Torzal',
      stitchType: 'Pespunte al borde 2.0 mm',
      instructions:
        '1. Fijar la pretina entretelada a la cintura de la bermuda encarando derecho con revés. ' +
        '2. Doblar la pretina hacia el derecho envolviendo el margen y pespuntear todo el contorno a 2 mm con hilo torzal. ' +
        '3. Insertar la etiqueta de cuidado y composición en el interior trasero.',
      notchGuidance: 'Alinear los piquetes de pretina con las costuras laterales y centros.',
      criticalNotes: 'Asegurar que la pretina quede totalmente plana y sin embebidos desiguales.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Terminación de Bajos: Flecos Pirata / Dobladillo Vuelto',
      operation: 'Acabado de Ruedo de Chaleco y Bermuda',
      machineType: 'Máquina Recta / Tijera de Deshilachado Textil',
      stitchType: 'Pespunte de retención 2.0 mm',
      instructions:
        '1. En la bermuda: Pespuntear una línea de retención a 35 mm del borde inferior. Deshilachar manualmente la trama del denim para crear los flecos pirata característicos de Luffy o planchar el puño vuelto. ' +
        '2. En el chaleco: Asentar con plancha el bajo en pico / cola curva y pespuntear.',
      notchGuidance: 'Alinear con los piquetes de bajo pirata.',
      criticalNotes: 'La costura de retención evita que el deshilachado continúe con los lavados.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Ojales, Botones, Control de Calidad y Planchado Final',
      operation: 'Ojalado Automático, Fijación de Botones y Auditoría POM',
      machineType: 'Ojaladora Industrial + Botonera + Plancha a Vapor',
      stitchType: 'Ojal de sastre / Ojal de lágrima',
      instructions:
        '1. Realizar 3 ojales verticales en el delantero derecho del chaleco y pegar los 3 botones dorados en el delantero izquierdo. ' +
        '2. Abrir ojal en la pretina de la bermuda y colocar el botón metálico jeans de golpe. ' +
        '3. Auditar las 10 medidas clave de la tabla POM en ambas prendas. ' +
        '4. Planchar a vapor medio (140°C para lino, 150°C para denim), doblar y embolsar como conjunto.',
      notchGuidance: 'Verificar la alineación horizontal de botones y ojales.',
      criticalNotes: 'Las medidas de ambas prendas terminadas deben cumplir las tolerancias de la tabla POM.',
    });

    return steps;
  }

  const isVest =
    !isSet &&
    (dna.base_block.toLowerCase().includes('vest') ||
      dna.base_block.toLowerCase().includes('wahid') ||
      dna.concept_name.toLowerCase().includes('vest') ||
      dna.concept_name.toLowerCase().includes('chaleco') ||
      dna.concept_name.toLowerCase().includes('waistcoat') ||
      (dna.modifications.sleeves?.type === 'sleeveless' &&
        dna.modifications.neckline?.type === 'v_neck' &&
        !dna.modifications.hood));

  if (isVest) {
    // Secuencia estructurada de 4 pasos para chaleco / prendas con vistas y cruce
    steps.push({
      stepNumber: stepNum++,
      title: 'Paso 1: Preparación y entretelado térmico de vistas interiores (delantera, cuello, sisa)',
      operation: 'Termofijado y Fusionado de Vistas Interiores',
      machineType: 'Prensa Térmica / Plancha Industrial (140°C, 3 bar, 12s)',
      stitchType: 'N/A (Termofijado)',
      instructions:
        'Paso 1: Preparación y entretelado térmico de vistas interiores (delantera, cuello, sisa). ' +
        'Fusionar entretela termoadhesiva tejida semi-rígida (60 g/m²) en las vistas del delantero, vistas de escote/cuello y vistas de sisa para aportar soporte y estabilidad dimensional. ' +
        'Marcar piquetes de referencia en centros, hombros y márgenes de costura.',
      notchGuidance: 'Comprobar rigurosamente la coincidencia de piquetes entre vistas interiores y piezas principales.',
      criticalNotes: 'Asegurar que la entretela no sobrepase los márgenes de costura para evitar rigidez excesiva en el ensamble.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Paso 2: Confección de botonadura frontal y ojales en las marcas del cruce (+20mm)',
      operation: 'Montaje de Vistas, Confección de Cruce Frontal y Ojalado',
      machineType: 'Máquina Recta (ISO 301) + Ojaladora Industrial + Botonera',
      stitchType: 'Costura Recta 3.0 mm + Ojal de Sastre',
      instructions:
        'Paso 2: Confección de botonadura frontal y ojales en las marcas del cruce (+20mm). ' +
        'Encarar las vistas delanteras con los delanteros derecho con derecho y coser a 10 mm a lo largo del centro delantero y el escote en V. ' +
        'Picar el ángulo del escote en V a 1 mm de la costura, volcar las vistas hacia el interior y asentar con plancha a vapor. ' +
        'Ejecutar los ojales en el delantero derecho sobre las marcas del cruce (+20mm) y coser los botones en el delantero izquierdo alineados con las marcas de cruce.',
      notchGuidance: 'Alinear rigurosamente las marcas del cruce (+20mm) y los piquetes de centro delantero.',
      criticalNotes: 'Mantener la simetría milimétrica en el cruce de +20mm para garantizar un calce plano y sin tensiones.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Paso 3: Ensamble y pespunte de hombros y costados alineando los piquetes pareados',
      operation: 'Unión de Hombros, Remate de Sisas y Cierre de Costados',
      machineType: 'Máquina Recta (ISO 301) + Overlock 4 Hilos (ISO 514)',
      stitchType: 'Costura Recta 3.0 mm + Sobrehilado de Seguridad',
      instructions:
        'Paso 3: Ensamble y pespunte de hombros y costados alineando los piquetes pareados. ' +
        'Encarar delantero y espalda derecho con derecho, unir hombros intercalando cinta estabilizadora y fijar vistas de sisa. ' +
        'Cerrar costuras laterales alineando los piquetes pareados (piquetes simples en delantero y dobles en espalda). ' +
        'Aplicar pespunte de carga interior o sobrecostura decorativa según especificación.',
      notchGuidance: 'Alinear con precisión los piquetes pareados en costados y sisas (simple en delantero, doble en espalda).',
      criticalNotes: 'La tolerancia máxima permitida de desfase en la alineación de piquetes pareados es de ±1 mm.',
    });

    steps.push({
      stepNumber: stepNum++,
      title: 'Paso 4: Remate de dobladillos (recto, cola o doble pico) y planchado final',
      operation: 'Dobladillado Inferior, Control Dimensional POM y Planchado Final',
      machineType: 'Máquina Recta (ISO 301) / Mesa de Planchado Industrial con Caldera',
      stitchType: 'Pespunte al tono 2.5 - 3.0 mm',
      instructions:
        'Paso 4: Remate de dobladillos (recto, cola o doble pico) y planchado final. ' +
        'Volcar el dobladillo inferior según el diseño del patrón (dobladillo recto, bajo en cola curva o doble pico frontal característico) y pespuntear al tono a 20-25 mm del borde. ' +
        'Realizar inspección de control de calidad auditando los puntos clave de la tabla de medidas terminadas (POM), limpieza de hilachas y planchado final con vapor y horma.',
      notchGuidance: 'Verificar la perfecta simetría de los picos o curva del bajo respecto a la línea central.',
      criticalNotes: 'Las medidas de la prenda terminada deben cumplir estrictamente las tolerancias de la tabla POM.',
    });

    return steps;
  }

  const hasHood =
    dna.modifications.hood !== undefined ||
    dna.modifications.neckline?.type === 'crossover_hood' ||
    dna.modifications.neckline?.type === 'hood' ||
    dna.base_block.toLowerCase().includes('hoodie');

  const hasPocket =
    dna.modifications.pocket !== undefined ||
    (dna.modifications.pockets && dna.modifications.pockets.length > 0) ||
    dna.base_block.toLowerCase().includes('hoodie');

  const pocketType = dna.modifications.pocket?.type ?? (hasPocket ? 'kangaroo' : 'none');

  // Paso 1: Preparación y refuerzos
  steps.push({
    stepNumber: stepNum++,
    title: 'Preparación, Fusionado y Marcado de Piquetes',
    operation: 'Termofijado y Control Inicial',
    machineType: 'Prensa Térmica / Plancha Industrial (140°C, 3 bar, 12s)',
    stitchType: 'N/A (Termofijado)',
    instructions:
      'Verificar el corte de todas las piezas y la correcta presencia de piquetes en sisa y centros. ' +
      (hasHood ? 'Fusionar los parches de entretela de 35x35 mm en la ubicación de los ojetes de la capucha. Troquelar y colocar los 2 ojetes metálicos. ' : '') +
      'Realizar estampados, bordados o aplicaciones previas sobre el delantero si están programados.',
    notchGuidance: 'Comprobar piquetes simples en delantero y piquetes dobles en espalda.',
    criticalNotes: 'Asegurar que la entretela no sobrepase el margen de costura visible.',
  });

  // Paso 2: Confección de Bolsillo si aplica
  if (hasPocket && pocketType !== 'none') {
    const isKangaroo = pocketType === 'kangaroo';
    steps.push({
      stepNumber: stepNum++,
      title: isKangaroo ? 'Confección y Montaje de Bolsillo Canguro' : 'Confección y Montaje de Bolsillo Parche',
      operation: 'Dobladillado de Bocas y Fijado al Torso Delantero',
      machineType: 'Recubridora 2 Agujas (ISO 406) / Recta Pespunte (ISO 301)',
      stitchType: 'Pespunte 3.0 mm con remate en extremos',
      instructions: isKangaroo
        ? 'Dobladillar las 2 aberturas laterales inclinadas de acceso para manos (dobladillo de 20 mm). ' +
          'Doblar y planchar los márgenes superiores e inferiores de 10 mm hacia el interior. ' +
          'Posicionar el bolsillo sobre el delantero haciendo coincidir el piquete de centro superior e inferior del bolsillo con el centro delantero y los piquetes de referencia. ' +
          'Pespuntear los contornos superior y laterales a 1.5 mm del borde. Aplicar presilla de refuerzo (bar-tack) de 10 mm en los 4 vértices de esfuerzo.'
        : 'Doblar el dobladillo superior del bolsillo parche y pespuntear a 20 mm. Planchar márgenes laterales e inferior a 10 mm. ' +
          'Ubicar sobre delantero según piquetes de referencia y pespuntear a 1.5 mm del borde con presillas en esquinas superiores.',
      notchGuidance: 'Alinear rigurosamente los piquetes de centro de bolsillo con la línea de centro delantero.',
      criticalNotes: 'Las presillas de refuerzo en las esquinas son obligatorias para evitar desgarros por tracción.',
    });
  }

  // Paso 3: Unión de Hombros
  steps.push({
    stepNumber: stepNum++,
    title: 'Unión de Hombros con Cinta Estabilizadora',
    operation: 'Cerrado de Hombros Delantero y Espalda',
    machineType: 'Overlock 4 Hilos (Remalladora Industrial)',
    stitchType: 'ISO 514 (Costura de seguridad 4 hilos)',
    instructions:
      'Encarar derecho con derecho el torso delantero y el torso espalda. ' +
      'Intercalar la cinta estabilizadora (framilon / hiladillo) en la costura de hombro del lado de la espalda. ' +
      'Coser a margen exacto de 10 mm. Planchar las costuras volcadas hacia la espalda.',
    notchGuidance: 'Hacer coincidir los extremos del escote y los vértices de hombro-sisa.',
    criticalNotes: 'La cinta estabilizadora evita la deformación del hombro con el uso y lavado.',
  });

  // Paso 4: Capucha o Cuello
  if (hasHood) {
    steps.push({
      stepNumber: stepNum++,
      title: 'Armado y Pegado de Capucha al Escote',
      operation: 'Cierre Central de Capucha, Dobladillo Facial y Unión al Escote',
      machineType: 'Overlock 4 Hilos (ISO 514) + Recta 1 Aguja (ISO 301)',
      stitchType: 'Overlock 4 hilos + Pespunte recto 3.5 mm',
      instructions:
        '1. Encarar derecho con derecho las 2 piezas de capucha y coser la costura central curva de coronilla/nuca con overlock 4 hilos. ' +
        '2. Doblar el contorno de abertura facial a 25 mm formando el canal para el cordón y pespuntear en máquina recta a 22 mm del borde. ' +
        '3. Pasar el cordón de algodón por los ojetes y fijar provisionalmente sus extremos. ' +
        '4. Unir la capucha al escote: alinear el piquete central de nuca con la costura de centro espalda. Si es cruzada (crossover), solapar el delantero derecho sobre el izquierdo según piquetes de cruce. ' +
        '5. Coser todo el contorno de escote con overlock 4 hilos. ' +
        '6. Aplicar la cinta tapeta de espiguilla en el escote trasero para cubrir y embellecer la costura.',
      notchGuidance:
        'Alinear el piquete de centro nuca de la capucha con el centro del escote trasero. Alinear los piquetes de cruce en el escote delantero.',
      criticalNotes: 'Verificar que el cordón quede libre dentro del canal y no sea atrapado por la costura del pespunte.',
    });
  } else {
    steps.push({
      stepNumber: stepNum++,
      title: 'Preparación y Pegado de Tira de Cuello / Rib',
      operation: 'Cerrado en Aro y Pegado a Escote con Tensión Controlada',
      machineType: 'Overlock 4 Hilos (ISO 514) + Recta Tapeta (ISO 301)',
      stitchType: 'Overlock 4 hilos + Pespunte de limpieza',
      instructions:
        '1. Cerrar la tira de rib en aro con costura recta a 10 mm y abrir costura con plancha. ' +
        '2. Doblar la tira al medio a lo largo con el revés hacia adentro. ' +
        '3. Dividir el cuello y el escote en 4 cuartos mediante piquetes. ' +
        '4. Unir el rib al escote con overlock 4 hilos estirando suavemente el rib de forma homogénea (tensión 85-90%). ' +
        '5. Cubrir la costura interior del escote espalda con cinta tapeta de espiguilla de hombro a hombro.',
      notchGuidance: 'Hacer coincidir los piquetes de cuartos del rib con los centros y hombros del escote.',
      criticalNotes: 'El estiramiento del rib debe ser uniforme para evitar ondas o frunces antiestéticos.',
    });
  }

  // Paso 5: Pegado de Mangas en Plano (CRÍTICO: NOTCH ALIGNMENT)
  steps.push({
    stepNumber: stepNum++,
    title: 'Pegado de Mangas en Plano (Open Armhole Insertion)',
    operation: 'Montaje de Copa de Manga sobre Sisa Abierta',
    machineType: 'Overlock 4 Hilos (Remalladora Industrial)',
    stitchType: 'ISO 514 (Ancho de costura 7.0 mm)',
    instructions:
      'Extender la prenda abierta por los hombros con el derecho hacia arriba. ' +
      'Encarar el derecho de la copa de manga con el derecho de la sisa del torso. ' +
      'Distribución y alineación de marcas de control: ' +
      '  a) Alinear el PIQUETE SIMPLE DE SISA DELANTERA con el PIQUETE SIMPLE DE COPA DELANTERA DE MANGA. ' +
      '  b) Alinear el PIQUETE DOBLE DE SISA ESPALDA con el PIQUETE DOBLE DE COPA TRASERA DE MANGA. ' +
      '  c) Alinear el PIQUETE DE CORONILLA CENTRAL DE MANGA con la COSTURA DE HOMBRO. ' +
      'Coser con overlock 4 hilos desde el bajo sisa delantero hasta el bajo sisa trasero embebiendo la copa uniformemente (ratio 1.005-1.015).',
    notchGuidance:
      'REQUISITO OBLIGATORIO DE CALIDAD: Los piquetes simples identifican el delantero; los piquetes dobles identifican la espalda. NO invertir el sentido de las mangas.',
    criticalNotes: 'La copa de manga armonizada no debe presentar pliegues; el embebido debe ser fluido y continuo.',
  });

  // Paso 6: Cerrado de Costados y Bajo Manga
  steps.push({
    stepNumber: stepNum++,
    title: 'Cerrado de Costados y Mangas en una Sola Pasada',
    operation: 'Unión Continua desde Bocamanga hasta Ruedo',
    machineType: 'Overlock 4 Hilos (ISO 514)',
    stitchType: 'ISO 514 (Remallado con cadeneta de seguridad)',
    instructions:
      'Encarar delantero y espalda derecho con derecho, doblando la manga por la mitad a lo largo. ' +
      'Hacer coincidir perfectamente la intersección de las costuras de axila / sisa (cruce en cruz perfecto). ' +
      'Coser en una sola pasada continua desde el puño de la manga hasta el dobladillo inferior. ' +
      'Insertar la etiqueta de cuidado y composición en el costado izquierdo a 100 mm del bajo.',
    notchGuidance: 'Hacer coincidir los piquetes de cintura/cadera y las costuras de sisa bajo axila.',
    criticalNotes: 'El cruce de costuras en la axila debe coincidir con tolerancia máxima de +/- 1.5 mm.',
  });

  // Paso 7: Confección de Puños
  steps.push({
    stepNumber: stepNum++,
    title: 'Montaje de Puños / Acabado de Bocamanga',
    operation: 'Colocación de Puños de Rib o Dobladillo Elástico',
    machineType: 'Overlock 4 Hilos (ISO 514) / Recubridora 2 Agujas (ISO 406)',
    stitchType: 'Overlock 4 hilos en aro o pespunte recubierto',
    instructions:
      'Cerrar los puños de rib en círculo encarando derecho con derecho. Doblar al medio con revés hacia adentro. ' +
      'Introducir el puño dentro de la bocamanga encarando derechos y haciendo coincidir la costura del puño con la costura bajo manga. ' +
      'Remallar todo el contorno estirando el rib uniformemente para ajustar a la medida de muñeca.',
    notchGuidance: 'Alinear la costura del puño con la costura longitudinal inferior de la manga.',
    criticalNotes: 'Asegurar remate de cadeneta de overlock en el interior del puño para evitar deshilachado.',
  });

  // Paso 8: Confección de Bajo / Pretina
  steps.push({
    stepNumber: stepNum++,
    title: 'Confección de Bajo / Pretina Inferior',
    operation: 'Pegado de Pretina de Rib o Dobladillado',
    machineType: 'Overlock 4 Hilos (ISO 514) / Recubridora (ISO 406)',
    stitchType: 'Overlock 4 hilos o Puntada de recubrimiento 2 agujas 5 mm',
    instructions:
      'Si lleva pretina de rib: Cerrar el rib en anillo, doblar al medio e insertar en el bajo haciendo coincidir los cuartos con las costuras laterales y centros. Remallar estirando homogéneamente. ' +
      'Si es dobladillo simple o cola curva (curved tail): Doblar a margen especificado (25 mm) y pespuntear en recubridora o recta con aguja doble.',
    notchGuidance: 'Alinear costuras de unión de pretina con las costuras laterales del torso.',
    criticalNotes: 'Mantener tensión constante en la pretina para evitar frunces localizados.',
  });

  // Paso 9: Control de Calidad, Limpieza y Planchado Final
  steps.push({
    stepNumber: stepNum++,
    title: 'Limpieza de Hilos, Control de Calidad Dimensional y Planchado Final',
    operation: 'Inspección Final, Deshebrado y Planchado a Vapor con Horma',
    machineType: 'Mesa de Planchado Industrial con Succión y Caldera de Vapor',
    stitchType: 'N/A (Control de Calidad)',
    instructions:
      '1. Deshebrar y asegurar todas las colas de cadeneta de overlock. ' +
      '2. Colocar los terminales metálicos finales en el cordón de la capucha si no venían pre-ensamblados. ' +
      '3. Realizar auditoría dimensional midiendo los 10 puntos clave de la tabla de medidas terminadas (POM). ' +
      '4. Planchar la prenda con vapor medio a 140°C evitando brillo en costuras. ' +
      '5. Doblar, embolsar con gel desecante y rotular con código de barras y talla.',
    notchGuidance: 'Verificar simetría general de costuras y ausencia de asimetrías en escote y hombros.',
    criticalNotes: 'Las medidas de la prenda terminada deben cumplir las tolerancias de la tabla POM (+/- 5 a 10 mm).',
  });

  return steps;
}

/**
 * Extrae y calcula las medidas terminadas de la prenda (Finished Garment Measurements - POM)
 * para todas las tallas generadas en el mapa.
 */
function buildFinishedMeasurementsTable(
  dna: PatternDna,
  sizeMap: Map<StandardSize, ModifiedPatternResult>,
  allSizes: StandardSize[]
): FinishedGarmentMeasurementRow[] {
  const rows: FinishedGarmentMeasurementRow[] = [];

  const isSet =
    dna.garment_category === 'set' ||
    Boolean(dna.fabric_details) ||
    Boolean(dna.sub_garments) ||
    Boolean(dna.multi_piece_config) ||
    dna.base_block === 'two_piece_set' ||
    (dna.concept_name && dna.concept_name.toLowerCase().includes('set'));

  const isBottomOnly =
    dna.garment_category === 'bottom' ||
    dna.base_block.toLowerCase().includes('pant') ||
    dna.base_block.toLowerCase().includes('trouser') ||
    dna.base_block.toLowerCase().includes('short') ||
    dna.base_block.toLowerCase().includes('bermuda');

  // Helper para computar valores en mm para cada talla
  const computeValues = (extractor: (res: ModifiedPatternResult) => number): Record<StandardSize, number> => {
    const record = {} as Record<StandardSize, number>;
    for (const size of allSizes) {
      const res = sizeMap.get(size);
      if (res) {
        record[size] = Math.round(extractor(res));
      } else {
        record[size] = 0;
      }
    }
    return record;
  };

  if (isSet) {
    // 1. MEDIDAS TERMINADAS DE PARTE SUPERIOR (CHALECO / TOP)
    rows.push({
      code: 'POM-01',
      pointOfMeasurement: 'Contorno Total de Pecho / Busto - Chaleco (Total Chest)',
      tolerance_mm: 10,
      values: computeValues((res) => {
        const front = res.parts.front_torso || res.parts.front;
        if (front && front.points.armhole_bottom) {
          return front.points.armhole_bottom.x * 4;
        }
        return res.measurements.chest_circumference_mm + (dna.ease.chest_ease_mm ?? 50);
      }),
    });

    rows.push({
      code: 'POM-02',
      pointOfMeasurement: 'Largo Total Delantero desde HPS - Chaleco (Front Length)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const front = res.parts.front_torso || res.parts.front;
        if (front && front.points.center_hem && front.points.neck_shoulder) {
          return Math.abs(front.points.center_hem.y - front.points.neck_shoulder.y);
        }
        return front ? front.bounds.height : res.measurements.front_length_mm;
      }),
    });

    rows.push({
      code: 'POM-03',
      pointOfMeasurement: 'Largo Total Espalda desde HPS - Chaleco (Back Length)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const back = res.parts.back_torso || res.parts.back;
        if (back && back.points.center_hem && back.points.neck_shoulder) {
          return Math.abs(back.points.center_hem.y - back.points.neck_shoulder.y);
        }
        return back ? back.bounds.height : res.measurements.back_length_mm;
      }),
    });

    rows.push({
      code: 'POM-04',
      pointOfMeasurement: 'Ancho de Hombro a Hombro - Chaleco (Shoulder Width)',
      tolerance_mm: 6,
      values: computeValues((res) => {
        const front = res.parts.front_torso || res.parts.front;
        if (front && front.points.shoulder_tip) {
          return front.points.shoulder_tip.x * 2;
        }
        return res.measurements.shoulder_to_shoulder_mm;
      }),
    });

    rows.push({
      code: 'POM-05',
      pointOfMeasurement: 'Profundidad de Escote en V - Chaleco (Front Neck Drop)',
      tolerance_mm: 5,
      values: computeValues((res) => {
        const front = res.parts.front_torso || res.parts.front;
        if (front && front.points.neck_center && front.points.neck_shoulder) {
          return Math.abs(front.points.neck_center.y - front.points.neck_shoulder.y);
        }
        return 130;
      }),
    });

    // 2. MEDIDAS TERMINADAS DE PARTE INFERIOR (BERMUDA / DENIM SHORTS)
    rows.push({
      code: 'POM-06',
      pointOfMeasurement: 'Contorno Total de Cintura - Bermuda (Waist Circumference)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const wb = res.parts.waistband;
        if (wb) {
          return wb.bounds.width * 2;
        }
        return res.measurements.waist_circumference_mm + (dna.ease.waist_ease_mm ?? 30);
      }),
    });

    rows.push({
      code: 'POM-07',
      pointOfMeasurement: 'Contorno Total de Cadera - Bermuda (Hip Circumference)',
      tolerance_mm: 10,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        const backLeg = res.parts.back_leg;
        if (frontLeg && backLeg) {
          return (frontLeg.bounds.width + backLeg.bounds.width) * 2;
        }
        return res.measurements.hip_circumference_mm + (dna.ease.hip_ease_mm ?? 50);
      }),
    });

    rows.push({
      code: 'POM-08',
      pointOfMeasurement: 'Largo Lateral Total - Bermuda (Waist to Hem Outseam)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        return frontLeg ? frontLeg.bounds.height : 550;
      }),
    });

    rows.push({
      code: 'POM-09',
      pointOfMeasurement: 'Largo de Entrepierna - Bermuda (Inseam Length)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        if (frontLeg && frontLeg.points.crotch_tip && frontLeg.points.hem_in) {
          return Math.abs(frontLeg.points.hem_in.y - frontLeg.points.crotch_tip.y);
        }
        return 320;
      }),
    });


    rows.push({
      code: 'POM-10',
      pointOfMeasurement: 'Semiancho de Ruedo / Bajo de Pierna - Bermuda (Half Leg Opening)',
      tolerance_mm: 6,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        if (frontLeg && frontLeg.points.hem_in && frontLeg.points.hem_out) {
          return Math.abs(frontLeg.points.hem_out.x - frontLeg.points.hem_in.x);
        }
        return 240;
      }),
    });

    return rows;
  }

  if (isBottomOnly) {
    rows.push({
      code: 'POM-01',
      pointOfMeasurement: 'Contorno Total de Cintura (Total Waist Circumference)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const wb = res.parts.waistband;
        if (wb) return wb.bounds.width * 2;
        return res.measurements.waist_circumference_mm + (dna.ease.waist_ease_mm ?? 30);
      }),
    });

    rows.push({
      code: 'POM-02',
      pointOfMeasurement: 'Contorno Total de Cadera (Total Hip Circumference)',
      tolerance_mm: 10,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        const backLeg = res.parts.back_leg;
        if (frontLeg && backLeg) return (frontLeg.bounds.width + backLeg.bounds.width) * 2;
        return res.measurements.hip_circumference_mm + (dna.ease.hip_ease_mm ?? 40);
      }),
    });

    rows.push({
      code: 'POM-03',
      pointOfMeasurement: 'Largo Lateral Total (Outseam Length)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        return frontLeg ? frontLeg.bounds.height : res.measurements.waist_to_floor_mm;
      }),
    });

    rows.push({
      code: 'POM-04',
      pointOfMeasurement: 'Largo de Entrepierna (Inseam Length)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        if (frontLeg && frontLeg.points.crotch_tip && frontLeg.points.hem_in) {
          return Math.abs(frontLeg.points.hem_in.y - frontLeg.points.crotch_tip.y);
        }
        return res.measurements.inseam_mm;
      }),
    });

    rows.push({
      code: 'POM-05',
      pointOfMeasurement: 'Semiancho de Muslo en Tiro (Half Thigh Width)',
      tolerance_mm: 6,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        if (frontLeg && frontLeg.points.crotch_tip && frontLeg.points.hip_side) {
          return Math.abs(frontLeg.points.hip_side.x - frontLeg.points.crotch_tip.x);
        }
        return res.measurements.thigh_circumference_mm / 2 + 20;
      }),
    });


    rows.push({
      code: 'POM-06',
      pointOfMeasurement: 'Semiancho de Ruedo / Bajo de Pierna (Half Leg Opening)',
      tolerance_mm: 5,
      values: computeValues((res) => {
        const frontLeg = res.parts.front_leg;
        if (frontLeg && frontLeg.points.hem_in && frontLeg.points.hem_out) {
          return Math.abs(frontLeg.points.hem_out.x - frontLeg.points.hem_in.x);
        }
        return 220;
      }),
    });

    return rows;
  }

  // Prenda superior regular (Hoodie, T-Shirt, Vest, Dress)
  // POM-01: Contorno Total de Pecho / Busto
  rows.push({
    code: 'POM-01',
    pointOfMeasurement: 'Contorno Total de Pecho / Busto (Total Chest Circumference)',
    tolerance_mm: 10,
    values: computeValues((res) => {
      const front = res.parts.front;
      if (front && front.points.armhole_bottom) {
        return front.points.armhole_bottom.x * 4;
      }
      return res.measurements.chest_circumference_mm + dna.ease.chest_ease_mm;
    }),
  });

  // POM-02: Contorno Total de Bajo / Ruedo
  rows.push({
    code: 'POM-02',
    pointOfMeasurement: 'Contorno Total de Bajo / Ruedo (Total Hem Sweep)',
    tolerance_mm: 10,
    values: computeValues((res) => {
      const front = res.parts.front;
      if (front && front.points.side_hem) {
        return front.points.side_hem.x * 4;
      }
      const hipEase = dna.ease.hip_ease_mm ?? dna.ease.chest_ease_mm * 0.9;
      return res.measurements.hip_circumference_mm + hipEase;
    }),
  });

  // POM-03: Largo Total Delantero desde HPS (High Point Shoulder)
  rows.push({
    code: 'POM-03',
    pointOfMeasurement: 'Largo Total Delantero desde HPS (HPS to Front Hem Length)',
    tolerance_mm: 8,
    values: computeValues((res) => {
      const front = res.parts.front;
      if (front && front.points.center_hem && front.points.neck_shoulder) {
        return Math.abs(front.points.center_hem.y - front.points.neck_shoulder.y);
      }
      return front ? front.bounds.height : res.measurements.front_length_mm;
    }),
  });

  // POM-04: Largo Total Espalda desde HPS
  rows.push({
    code: 'POM-04',
    pointOfMeasurement: 'Largo Total Espalda desde HPS (HPS to Back Hem Length)',
    tolerance_mm: 8,
    values: computeValues((res) => {
      const back = res.parts.back;
      if (back && back.points.center_hem && back.points.neck_shoulder) {
        return Math.abs(back.points.center_hem.y - back.points.neck_shoulder.y);
      }
      return back ? back.bounds.height : res.measurements.back_length_mm;
    }),
  });

  // POM-05: Ancho de Hombro a Hombro (Across Shoulder Width)
  rows.push({
    code: 'POM-05',
    pointOfMeasurement: 'Ancho de Hombro a Hombro (Across Shoulder Width)',
    tolerance_mm: 6,
    values: computeValues((res) => {
      const front = res.parts.front;
      if (front && front.points.shoulder_tip) {
        return front.points.shoulder_tip.x * 2;
      }
      return res.measurements.shoulder_to_shoulder_mm + (dna.ease.shoulder_ease_mm ?? 0);
    }),
  });

  // POM-06: Ancho de Escote (Neck Opening Width)
  rows.push({
    code: 'POM-06',
    pointOfMeasurement: 'Ancho de Escote de Hombro a Hombro (Neck Width)',
    tolerance_mm: 5,
    values: computeValues((res) => {
      const front = res.parts.front;
      if (front && front.points.neck_shoulder) {
        return front.points.neck_shoulder.x * 2;
      }
      return res.measurements.neck_circumference_mm / 3;
    }),
  });

  // POM-07: Caída / Profundidad de Escote Delantero (Front Neck Drop)
  rows.push({
    code: 'POM-07',
    pointOfMeasurement: 'Profundidad de Escote Delantero desde HPS (Front Neck Drop)',
    tolerance_mm: 4,
    values: computeValues((res) => {
      const front = res.parts.front;
      if (front && front.points.neck_center && front.points.neck_shoulder) {
        return Math.abs(front.points.neck_center.y - front.points.neck_shoulder.y);
      }
      return 85;
    }),
  });

  // POM-08: Largo de Manga (si aplica)
  const hasSleeve = sizeMap.get(allSizes[0])?.parts.sleeve !== undefined;
  if (hasSleeve) {
    rows.push({
      code: 'POM-08',
      pointOfMeasurement: 'Largo de Manga desde Sisa / Caída (Sleeve Length)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const sleeve = res.parts.sleeve;
        return sleeve ? sleeve.bounds.height : res.measurements.sleeve_length_mm;
      }),
    });

    // POM-09: Ancho de Bíceps (Sleeve Bicep Width)
    rows.push({
      code: 'POM-09',
      pointOfMeasurement: 'Semiancho de Bíceps en Sisa (Half Bicep Width)',
      tolerance_mm: 6,
      values: computeValues((res) => {
        const sleeve = res.parts.sleeve;
        if (sleeve && sleeve.points.underarm_front && sleeve.points.underarm_back) {
          return Math.abs(sleeve.points.underarm_front.x - sleeve.points.underarm_back.x);
        }
        return sleeve ? sleeve.bounds.width : (res.measurements.bicep_circumference_mm + 60) / 2;
      }),
    });

    // POM-10: Ancho de Bocamanga / Puño (Cuff Opening Width)
    rows.push({
      code: 'POM-10',
      pointOfMeasurement: 'Semiancho de Bocamanga / Puño (Half Cuff Opening)',
      tolerance_mm: 5,
      values: computeValues((res) => {
        const sleeve = res.parts.sleeve;
        if (sleeve && sleeve.points.wrist_front && sleeve.points.wrist_back) {
          return Math.abs(sleeve.points.wrist_front.x - sleeve.points.wrist_back.x);
        }
        return sleeve && sleeve.points.wrist_front ? sleeve.points.wrist_front.x * 2 : 140;
      }),
    });
  }

  // POM-11 & POM-12: Capucha (si aplica)
  const hasHoodPart = sizeMap.get(allSizes[0])?.parts.hood !== undefined;
  if (hasHoodPart) {
    rows.push({
      code: 'POM-11',
      pointOfMeasurement: 'Altura Total de Capucha (Hood Height)',
      tolerance_mm: 8,
      values: computeValues((res) => {
        const hood = res.parts.hood;
        return hood ? hood.bounds.height : 360;
      }),
    });

    rows.push({
      code: 'POM-12',
      pointOfMeasurement: 'Profundidad de Capucha (Hood Depth / Width)',
      tolerance_mm: 6,
      values: computeValues((res) => {
        const hood = res.parts.hood;
        return hood ? hood.bounds.width : 270;
      }),
    });
  }

  // POM-13 & POM-14: Bolsillo (si aplica)
  const hasPocketPart = sizeMap.get(allSizes[0])?.parts.pocket !== undefined;
  if (hasPocketPart) {
    rows.push({
      code: 'POM-13',
      pointOfMeasurement: 'Ancho Máximo de Bolsillo (Pocket Width)',
      tolerance_mm: 5,
      values: computeValues((res) => {
        const pocket = res.parts.pocket;
        return pocket ? pocket.bounds.width : 340;
      }),
    });

    rows.push({
      code: 'POM-14',
      pointOfMeasurement: 'Alto de Bolsillo (Pocket Height)',
      tolerance_mm: 5,
      values: computeValues((res) => {
        const pocket = res.parts.pocket;
        return pocket ? pocket.bounds.height : 220;
      }),
    });
  }

  return rows;
}

/**
 * Genera la estructura de datos completa de la Ficha Técnica (Tech Pack)
 *
 * @param dna ADN Paramétrico del patrón
 * @param modifiedResults Mapa de tallas a patrones modificados o un resultado individual
 * @param options Opciones de configuración de la ficha técnica
 * @returns TechSheetData completo con consumos, piezas, avíos, pasos de confección y medidas terminadas
 */
export function generateTechSheet(
  dna: PatternDna,
  modifiedResults: Map<StandardSize, ModifiedPatternResult> | ModifiedPatternResult,
  options: TechSheetOptions = {}
): TechSheetData {
  // 1. Normalizar mapa de tallas
  const rawCustom = dna.custom_measurements ?? dna.sizing?.custom_measurements;
  let effectiveDna = dna;
  if (rawCustom && Object.keys(rawCustom).length > 0) {
    const calculated = calculateCustomMeasurements(
      rawCustom,
      dna.sizing?.size ?? 'M'
    );
    effectiveDna = {
      ...dna,
      sizing: {
        ...dna.sizing,
        size: dna.sizing?.size ?? 'M',
        custom_measurements: rawCustom,
        chest_circ_mm: calculated.chest_circumference_mm,
        waist_circ_mm: calculated.waist_circumference_mm,
        hip_circ_mm: calculated.hip_circumference_mm,
      },
    };
  }

  let sizeMap: Map<StandardSize, ModifiedPatternResult>;
  let primarySize: StandardSize;
  if (modifiedResults instanceof Map) {
    if (modifiedResults.size === 0) {
      const targetSizes =
        options.targetSizes ?? effectiveDna.sizing?.target_layers ?? STANDARD_SIZES;
      sizeMap = modifyPatternMultiSize(effectiveDna, targetSizes);
    } else {
      sizeMap = modifiedResults;
    }
    primarySize =
      effectiveDna.sizing?.size ?? (sizeMap.has('M') ? 'M' : Array.from(sizeMap.keys())[0]);
  } else {
    primarySize = modifiedResults.size;
    const targetSizes =
      options.targetSizes ?? effectiveDna.sizing?.target_layers ?? STANDARD_SIZES;
    sizeMap = modifyPatternMultiSize(effectiveDna, targetSizes);
    // Asegurar que la talla dada esté presente
    sizeMap.set(modifiedResults.size, modifiedResults);
  }

  const allSizes = Array.from(sizeMap.keys());
  const primaryResult = sizeMap.get(primarySize) ?? Array.from(sizeMap.values())[0];

  // 2. Parámetros de tela y merma (REQUISITO CRÍTICO: Factor de merma >= 10%, default 15%)
  const fabricWidth_mm = options.fabricWidth_mm ?? dna.tech_specs?.fabric_width_mm ?? 1500;
  const rawWasteFactor = options.wasteFactor ?? 0.15;
  const wasteFactor = Math.max(0.10, rawWasteFactor); // Garantizar mínimo 10% de merma
  const wastePercentage = Math.round(wasteFactor * 100 * 10) / 10;
  const wasteMultiplier = 1 + wasteFactor;

  const isSet =
    dna.garment_category === 'set' ||
    Boolean(dna.fabric_details) ||
    Boolean(dna.sub_garments) ||
    Boolean(dna.multi_piece_config) ||
    dna.base_block === 'two_piece_set' ||
    (dna.concept_name && dna.concept_name.toLowerCase().includes('set'));

  const defaultFabric =
    options.fabricType ??
    dna.tech_specs?.fabric_type ??
    (isSet
      ? 'Conjunto 2 Piezas: Lino Rústico Rojo + Denim Azul 12oz'
      : dna.base_block.toLowerCase().includes('hoodie')
      ? 'French Terry 100% Algodón Peinado (320-350 gsm)'
      : dna.base_block.toLowerCase().includes('tshirt')
      ? 'Jersey 100% Algodón Peinado 24/1 (180-200 gsm)'
      : 'Tejido Principal');

  // 3. Cálculo riguroso de consumo de tela por talla y desglose multi-tela
  const perSizeConsumption: Record<StandardSize, SizeFabricConsumption> = {} as Record<
    StandardSize,
    SizeFabricConsumption
  >;
  let totalLinearMetersSum = 0;

  // Desglose para conjuntos de 2 telas
  const mainFabricName =
    dna.fabric_details?.main_fabric?.name ||
    dna.fabric_details?.main_fabric?.type ||
    dna.sub_garments?.top?.tech_specs?.fabric_type ||
    'Lino Rústico Rojo / Rustic Red Linen Canvas (260 gsm)';
  const mainFabricWidth = dna.fabric_details?.main_fabric?.width_mm || fabricWidth_mm;

  const secFabricName =
    dna.fabric_details?.secondary_fabric?.name ||
    dna.fabric_details?.secondary_fabric?.type ||
    dna.sub_garments?.bottom?.tech_specs?.fabric_type ||
    'Denim Azul Índigo 12oz / 12oz Blue Denim';
  const secFabricWidth = dna.fabric_details?.secondary_fabric?.width_mm || fabricWidth_mm;

  const mainPerSize: Record<StandardSize, SizeFabricConsumption> = {} as Record<
    StandardSize,
    SizeFabricConsumption
  >;
  const secPerSize: Record<StandardSize, SizeFabricConsumption> = {} as Record<
    StandardSize,
    SizeFabricConsumption
  >;
  let mainTotalMetersSum = 0;
  let secTotalMetersSum = 0;

  const mainPiecesSet = new Set<string>();
  const secPiecesSet = new Set<string>();

  for (const [size, result] of sizeMap.entries()) {
    let sizeNetArea_mm2 = 0;
    let mainNetArea_mm2 = 0;
    let secNetArea_mm2 = 0;

    for (const [partName, part] of Object.entries(result.parts)) {
      const cutCount = part.cutCount ?? 1;
      const foldFactor = part.onFold ? 2 : 1;
      const pieceNetArea = part.area_mm2 * foldFactor * cutCount;
      sizeNetArea_mm2 += pieceNetArea;

      const partFabric = inferFabricForPart(partName, dna, defaultFabric);
      if (partFabric === mainFabricName || (!isSet && !secFabricName)) {
        mainNetArea_mm2 += pieceNetArea;
        mainPiecesSet.add(part.label || part.name);
      } else {
        secNetArea_mm2 += pieceNetArea;
        secPiecesSet.add(part.label || part.name);
      }
    }

    const totalNetArea_m2 = sizeNetArea_mm2 / 1_000_000;
    const fabricWidth_m = fabricWidth_mm / 1000;
    const idealLinearMeters = totalNetArea_m2 / fabricWidth_m;
    const estimatedLinearMeters = Math.round(idealLinearMeters * wasteMultiplier * 100) / 100;

    perSizeConsumption[size] = {
      size,
      totalNetArea_mm2: Math.round(sizeNetArea_mm2),
      totalNetArea_m2: Math.round(totalNetArea_m2 * 10000) / 10000,
      fabricWidth_mm,
      wastePercentage,
      wasteMultiplier,
      idealLinearMeters: Math.round(idealLinearMeters * 100) / 100,
      estimatedLinearMeters,
    };

    totalLinearMetersSum += estimatedLinearMeters;

    if (isSet) {
      const mainNet_m2 = mainNetArea_mm2 / 1_000_000;
      const mainIdealMeters = mainNet_m2 / (mainFabricWidth / 1000);
      const mainEstMeters = Math.round(mainIdealMeters * wasteMultiplier * 100) / 100;

      mainPerSize[size] = {
        size,
        totalNetArea_mm2: Math.round(mainNetArea_mm2),
        totalNetArea_m2: Math.round(mainNet_m2 * 10000) / 10000,
        fabricWidth_mm: mainFabricWidth,
        wastePercentage,
        wasteMultiplier,
        idealLinearMeters: Math.round(mainIdealMeters * 100) / 100,
        estimatedLinearMeters: mainEstMeters,
      };
      mainTotalMetersSum += mainEstMeters;

      const secNet_m2 = secNetArea_mm2 / 1_000_000;
      const secIdealMeters = secNet_m2 / (secFabricWidth / 1000);
      const secEstMeters = Math.round(secIdealMeters * wasteMultiplier * 100) / 100;

      secPerSize[size] = {
        size,
        totalNetArea_mm2: Math.round(secNetArea_mm2),
        totalNetArea_m2: Math.round(secNet_m2 * 10000) / 10000,
        fabricWidth_mm: secFabricWidth,
        wastePercentage,
        wasteMultiplier,
        idealLinearMeters: Math.round(secIdealMeters * 100) / 100,
        estimatedLinearMeters: secEstMeters,
      };
      secTotalMetersSum += secEstMeters;
    }
  }

  const sizeCount = allSizes.length;
  const averageLinearMeters =
    sizeCount > 0 ? Math.round((totalLinearMetersSum / sizeCount) * 100) / 100 : 0;

  const fabricConsumptionSummary: FabricConsumptionSummary = {
    fabricWidth_mm,
    wastePercentage,
    wasteMultiplier,
    suggestedFabric: defaultFabric,
    perSize: perSizeConsumption,
    averageLinearMeters,
    totalLinearMetersAllSizes: Math.round(totalLinearMetersSum * 100) / 100,
    sizeCount,
    ...(isSet
      ? {
          breakdown_by_fabric: {
            main_fabric: {
              fabricKey: 'main_fabric',
              fabricName: mainFabricName,
              fabricType: dna.fabric_details?.main_fabric?.type ?? 'rustic_red_linen_canvas',
              color: dna.fabric_details?.main_fabric?.color ?? 'Rojo Escarlata / Scarlet Red',
              width_mm: mainFabricWidth,
              wastePercentage,
              wasteMultiplier,
              averageLinearMeters:
                sizeCount > 0 ? Math.round((mainTotalMetersSum / sizeCount) * 100) / 100 : 0,
              totalLinearMetersAllSizes: Math.round(mainTotalMetersSum * 100) / 100,
              perSize: mainPerSize,
              pieces: Array.from(mainPiecesSet),
            },
            secondary_fabric: {
              fabricKey: 'secondary_fabric',
              fabricName: secFabricName,
              fabricType: dna.fabric_details?.secondary_fabric?.type ?? 'blue_indigo_denim_12oz',
              color: dna.fabric_details?.secondary_fabric?.color ?? 'Azul Índigo Lavado / Washed Indigo Blue',
              width_mm: secFabricWidth,
              wastePercentage,
              wasteMultiplier,
              averageLinearMeters:
                sizeCount > 0 ? Math.round((secTotalMetersSum / sizeCount) * 100) / 100 : 0,
              totalLinearMetersAllSizes: Math.round(secTotalMetersSum * 100) / 100,
              perSize: secPerSize,
              pieces: Array.from(secPiecesSet),
            },
          },
        }
      : {}),
  };

  // 4. Detalle de piezas de corte (referencia talla base)
  const cuttingPieces: CutPieceDetail[] = [];
  for (const [partId, part] of Object.entries(primaryResult.parts)) {
    const foldFactor = part.onFold ? 2 : 1;
    const cutCount = part.cutCount ?? 1;
    const singlePieceNetArea = Math.round(part.area_mm2 * foldFactor);
    const totalPieceArea = singlePieceNetArea * cutCount;

    const qtyDesc = part.onFold
      ? `x${cutCount} al lomo / doblez`
      : cutCount === 2
      ? 'x2 (1 par encarado)'
      : `x${cutCount}`;

    cuttingPieces.push({
      id: partId,
      name: part.label || part.name.toUpperCase(),
      cutCount,
      onFold: Boolean(part.onFold),
      quantityDescription: qtyDesc,
      suggestedFabric: inferFabricForPart(part.name, dna, defaultFabric),
      seamAllowance_mm: part.seamAllowance_mm ?? primaryResult.seamAllowance_mm ?? 10,
      hemAllowance_mm: part.hemAllowance_mm ?? primaryResult.hemAllowance_mm ?? 25,
      netArea_mm2: singlePieceNetArea,
      totalArea_mm2: totalPieceArea,
      width_mm: Math.round(part.bounds.width * foldFactor),
      height_mm: Math.round(part.bounds.height),
      grainlineDescription: part.grainline?.label
        ? `${part.grainline.label} (Paralelo a urdimbre / vertical)`
        : 'Paralelo al hilo de urdimbre',
      notchSummary: summarizeNotches(part.notches),
    });
  }

  // 5. Lista de avíos y mercería (BOM)
  const notions = buildNotionsList(dna, defaultFabric);

  // 6. Secuencia de confección paso a paso
  const assemblySequence = buildAssemblySequence(dna);

  // 7. Tabla de medidas terminadas (POM) multi-talla
  const finishedMeasurements = buildFinishedMeasurementsTable(dna, sizeMap, allSizes);

  // 8. Notas generales de producción
  const notes = options.notes ?? [
    'Factor de merma textil configurado con holgura de corte para tizado y encogimiento de lavado.',
    'Verificar muestra de encogimiento textil previo al tizado y corte final (tolerancia esperada: <= 3%).',
    'Las piezas cortadas al lomo deben alinearse rigurosamente con el hilo de tela (grainline).',
    'Respetar el código de piquetes en sisa: piquete simple indica delantero, piquete doble indica espalda.',
    'Todas las costuras de sobrehilado deben rematarse para evitar deshilachado durante el ciclo de uso.',
  ];

  // 9. Personalización antropométrica por medidas exactas si existen
  let customMeasurementsSummary: CustomMeasurementsSummary | undefined;
  if (rawCustom && Object.keys(rawCustom).length > 0) {
    const baseMeas = getStandardMeasurements(primarySize);
    const calculatedMeas = calculateCustomMeasurements(rawCustom, primarySize);
    const comparisons: CustomMeasurementComparison[] = [];
    let providedCount = 0;

    for (const key of Object.keys(ANATOMICAL_LIMITS) as (keyof BodyMeasurements)[]) {
      const baseVal = baseMeas[key];
      const customVal = calculatedMeas[key];
      const isExplicit =
        typeof rawCustom[key] === 'number' && !isNaN(rawCustom[key] as number);
      if (isExplicit) {
        providedCount++;
      }
      comparisons.push({
        key,
        label: ANATOMICAL_LIMITS[key]?.label || key,
        baseValue_mm: baseVal,
        customValue_mm: customVal,
        delta_mm: customVal - baseVal,
        isExplicit,
      });
    }

    customMeasurementsSummary = {
      referenceSize: primarySize,
      providedFieldsCount: providedCount,
      measurements: comparisons,
    };
  }

  return {
    conceptName: dna.concept_name,
    description: dna.description ?? `Ficha técnica industrial para ${dna.concept_name}`,
    baseBlock: dna.base_block,
    primarySize,
    allSizes,
    createdAt: new Date().toISOString().split('T')[0],
    version: options.version ?? '1.0.0',
    seamAllowance_mm: primaryResult.seamAllowance_mm,
    hemAllowance_mm: primaryResult.hemAllowance_mm,
    fabricConsumption: fabricConsumptionSummary,
    cuttingPieces,
    notions,
    assemblySequence,
    finishedMeasurements,
    customMeasurements: customMeasurementsSummary,
    notes,
  };
}



/**
 * Exporta la ficha técnica en formato Markdown estándar estructurado
 *
 * @param data Datos de la ficha técnica
 * @returns Documento Markdown formateado
 */
export function generateTechSheetMarkdown(data: TechSheetData): string {
  const {
    conceptName,
    description,
    baseBlock,
    primarySize,
    allSizes,
    createdAt,
    version,
    seamAllowance_mm,
    hemAllowance_mm,
    fabricConsumption,
    cuttingPieces,
    notions,
    assemblySequence,
    finishedMeasurements,
    customMeasurements,
    notes,
  } = data;

  const lines: string[] = [];

  // Encabezado
  lines.push(`# FICHA TÉCNICA DE CONFECCIÓN Y CONSUMO (TECH PACK)`);
  lines.push(`**Prenda / Concepto:** \`${conceptName}\`  `);
  lines.push(`**Descripción:** ${description}  `);
  lines.push(`**Bloque Base:** \`${baseBlock}\` | **Talla Referencia:** \`${primarySize}\` | **Tallas:** ${allSizes.join(', ')}  `);
  lines.push(`**Fecha:** ${createdAt} | **Versión:** v${version} | **Margen de costura:** ${seamAllowance_mm} mm | **Dobladillo:** ${hemAllowance_mm} mm  `);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // 1. Consumo de Tela
  lines.push(`## 1. CONSUMO DE TELA Y RENDIMIENTO TEXTIL`);
  lines.push(`- **Tela sugerida principal:** ${fabricConsumption.suggestedFabric}`);
  lines.push(`- **Ancho estándar de tela:** ${(fabricConsumption.fabricWidth_mm / 1000).toFixed(2)} m (${fabricConsumption.fabricWidth_mm} mm)`);
  lines.push(`- **Factor de merma / desperdicio:** **${fabricConsumption.wastePercentage}%** (Multiplicador: x${fabricConsumption.wasteMultiplier.toFixed(2)})`);
  lines.push(`- **Consumo promedio por prenda:** **${fabricConsumption.averageLinearMeters.toFixed(2)} m lineales**`);
  lines.push(`- **Consumo consolidado (${fabricConsumption.sizeCount} tallas):** **${fabricConsumption.totalLinearMetersAllSizes.toFixed(2)} m lineales**`);
  lines.push(``);

  if (fabricConsumption.breakdown_by_fabric) {
    const { main_fabric, secondary_fabric } = fabricConsumption.breakdown_by_fabric;
    lines.push(`### 1.1 Desglose por Tipo de Tela (Conjunto de 2 Piezas)`);
    if (main_fabric) {
      lines.push(`- **Tela 1 (Pieza Superior / Top):** ${main_fabric.fabricName} (${main_fabric.color ?? 'Principal'})`);
      lines.push(`  - Ancho de rollo: ${(main_fabric.width_mm / 1000).toFixed(2)} m | Promedio por prenda: **${main_fabric.averageLinearMeters.toFixed(2)} m** | Total lote: **${main_fabric.totalLinearMetersAllSizes.toFixed(2)} m**`);
    }
    if (secondary_fabric) {
      lines.push(`- **Tela 2 (Pieza Inferior / Bottom):** ${secondary_fabric.fabricName} (${secondary_fabric.color ?? 'Secundaria'})`);
      lines.push(`  - Ancho de rollo: ${(secondary_fabric.width_mm / 1000).toFixed(2)} m | Promedio por prenda: **${secondary_fabric.averageLinearMeters.toFixed(2)} m** | Total lote: **${secondary_fabric.totalLinearMetersAllSizes.toFixed(2)} m**`);
    }
    lines.push(``);

    lines.push(`| Talla | Tela 1: Top (m) | Tela 2: Bottom (m) | **Total Combinado (m)** | Área Neta Total (m²) |`);
    lines.push(`| :--- | :---: | :---: | :---: | :---: |`);
    for (const size of allSizes) {
      const c = fabricConsumption.perSize[size];
      const m1 = main_fabric?.perSize[size];
      const m2 = secondary_fabric?.perSize[size];
      if (c) {
        lines.push(
          `| **${size}** | ${m1 ? m1.estimatedLinearMeters.toFixed(2) : '-'} m | ${m2 ? m2.estimatedLinearMeters.toFixed(2) : '-'} m | **${c.estimatedLinearMeters.toFixed(2)} m** | ${c.totalNetArea_m2.toFixed(3)} m² |`
        );
      }
    }
    lines.push(``);
  } else {
    lines.push(`| Talla | Área Neta (mm²) | Área Neta (m²) | Ancho Tela | Merma (%) | Consumo Ideal (m) | **Metros Lineales Estimados (m)** |`);
    lines.push(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: |`);
    for (const size of allSizes) {
      const c = fabricConsumption.perSize[size];
      if (c) {
        lines.push(
          `| **${size}** | ${c.totalNetArea_mm2.toLocaleString()} | ${c.totalNetArea_m2.toFixed(3)} | ${(c.fabricWidth_mm / 1000).toFixed(2)} m | ${c.wastePercentage}% | ${c.idealLinearMeters.toFixed(2)} m | **${c.estimatedLinearMeters.toFixed(2)} m** |`
        );
      }
    }
    lines.push(``);
  }


  // 1.1 Personalización Antropométrica (si aplica)
  if (customMeasurements) {
    lines.push(`## 1.1 PERSONALIZACIÓN ANTROPOMÉTRICA (MEDIDAS A MEDIDA DEL CLIENTE)`);
    lines.push(`> ℹ️ **Patrón ajustado a medidas personalizadas del cliente.**`);
    lines.push(`> Talla base de referencia: **${customMeasurements.referenceSize}** | Medidas exactas suministradas: **${customMeasurements.providedFieldsCount}** | Medidas derivadas armónicamente: **${customMeasurements.measurements.length - customMeasurements.providedFieldsCount}**`);
    lines.push(``);
    lines.push(`| Medida Antropométrica | Talla Base (${customMeasurements.referenceSize}) | **Medida Cliente (mm)** | Diferencia (Δ) | Origen / Método |`);
    lines.push(`| :--- | :---: | :---: | :---: | :--- |`);
    for (const m of customMeasurements.measurements) {
      const deltaStr = m.delta_mm > 0 ? `+${m.delta_mm} mm` : m.delta_mm < 0 ? `${m.delta_mm} mm` : `0 mm`;
      const originStr = m.isExplicit ? `🎯 **Exacta (Suministrada)**` : `📐 Interpolación Armónica`;
      lines.push(
        `| **${m.label}** | ${m.baseValue_mm} mm | **${m.customValue_mm} mm** | ${deltaStr} | ${originStr} |`
      );
    }
    lines.push(``);
  }

  // 2. Lista de Piezas de Corte
  lines.push(`## 2. LISTA DETALLADA DE PIEZAS DE CORTE`);
  lines.push(`| # | Pieza | Cantidad / Corte | Tela Sugerida | Margen Costura | Dobladillo | Dimensiones (mm) | Área Neta (cm²) | Piquetes / Marcas |`);
  lines.push(`| :-: | :--- | :--- | :--- | :-: | :-: | :-: | :-: | :--- |`);
  cuttingPieces.forEach((p, idx) => {
    const areaCm2 = (p.totalArea_mm2 / 100).toFixed(1);
    lines.push(
      `| ${idx + 1} | **${p.name}** | ${p.quantityDescription} | ${p.suggestedFabric} | ${p.seamAllowance_mm} mm | ${p.hemAllowance_mm} mm | ${p.width_mm} x ${p.height_mm} | ${areaCm2} | ${p.notchSummary} |`
    );
  });
  lines.push(``);

  // 3. Lista de Avíos y Mercería (BOM)
  lines.push(`## 3. LISTA DE AVÍOS Y MERCERÍA (BILL OF MATERIALS - BOM)`);
  lines.push(`| Categoría | Insumo / Material | Especificación Técnica | Cantidad Requerida | Ubicación en Prenda |`);
  lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
  notions.forEach((n) => {
    lines.push(`| **${n.category.toUpperCase()}** | ${n.name} | ${n.specification} | ${n.quantity} | ${n.usageLocation} |`);
  });
  lines.push(``);

  // 4. Guía de Confección y Ensamble Paso a Paso
  lines.push(`## 4. GUÍA DE CONFECCIÓN Y ENSAMBLE PASO A PASO`);
  assemblySequence.forEach((step) => {
    lines.push(`### Paso ${step.stepNumber}: ${step.title}`);
    lines.push(`- **Operación:** ${step.operation}`);
    lines.push(`- **Maquinaria:** ${step.machineType} | **Puntada:** \`${step.stitchType}\``);
    lines.push(`- **Instrucciones:** ${step.instructions}`);
    if (step.notchGuidance) {
      lines.push(`- 📍 **Guía de Piquetes:** *${step.notchGuidance}*`);
    }
    if (step.criticalNotes) {
      lines.push(`- ⚠️ **Nota Crítica de Calidad:** ${step.criticalNotes}`);
    }
    lines.push(``);
  });

  // 5. Tabla de Medidas Terminadas (POM)
  lines.push(`## 5. TABLA DE MEDIDAS TERMINADAS DE LA PRENDA (POINTS OF MEASUREMENT - POM)`);
  lines.push(`*Todas las medidas se expresan en milímetros (mm) sobre prenda terminada extendida en plano.*`);
  lines.push(``);

  const headerCols = ['Código', 'Punto de Medida (POM)', 'Tolerancia', ...allSizes.map((s) => `**${s}**`)];
  lines.push(`| ${headerCols.join(' | ')} |`);
  lines.push(`| ${headerCols.map(() => ':---:').join(' | ')} |`);

  finishedMeasurements.forEach((row) => {
    const sizeVals = allSizes.map((s) => `${row.values[s] ?? 0} mm`);
    lines.push(`| **${row.code}** | ${row.pointOfMeasurement} | ±${row.tolerance_mm} mm | ${sizeVals.join(' | ')} |`);
  });
  lines.push(``);

  // 6. Notas de Calidad y Producción
  lines.push(`## 6. NOTAS GENERALES DE PRODUCCIÓN Y AUDITORÍA DE CALIDAD`);
  notes.forEach((note) => {
    lines.push(`- ${note}`);
  });
  lines.push(``);

  return lines.join('\n');
}

/**
 * Exporta la ficha técnica en formato JSON estructurado
 *
 * @param data Datos de la ficha técnica
 * @returns Cadena JSON formateada con indentación
 */
export function generateTechSheetJson(data: TechSheetData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Exporta la ficha técnica en formato PDF profesional de alta densidad con PDFKit
 *
 * @param data Datos de la ficha técnica
 * @returns Buffer binario del documento PDF generado
 */
export async function generateTechSheetPdf(data: TechSheetData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 36, // 0.5 pulg = 36 pt
    autoFirstPage: true,
    info: {
      Title: `Tech Pack - ${data.conceptName}`,
      Author: 'pattern-ai-core',
      Subject: 'Ficha Técnica Industrial de Confección',
      Keywords: 'Tech Pack, Patronaje, Moldería, Confección, FreeSewing',
    },
  });

  const bufferPromise = pdfDocToBuffer(doc);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - 2 * margin; // 523.28 pt
  const bottomLimit = pageHeight - margin - 20;

  let currentY = margin;

  // Helper para verificar salto de página
  const checkPageBreak = (neededHeight: number): void => {
    if (currentY + neededHeight > bottomLimit) {
      doc.addPage();
      currentY = margin;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = (): void => {
    doc.save();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b');
    doc.text(`TECH PACK: ${data.conceptName.toUpperCase()} | BLOQUE: ${data.baseBlock}`, margin, currentY, {
      width: contentWidth,
    });
    doc
      .moveTo(margin, currentY + 11)
      .lineTo(margin + contentWidth, currentY + 11)
      .strokeColor('#e2e8f0')
      .lineWidth(0.5)
      .stroke();
    doc.restore();
    currentY += 18;
  };

  // ==========================================
  // PÁGINA 1: ENCABEZADO Y RESUMEN GENERAL
  // ==========================================
  // Banner Superior
  doc.save();
  doc.rect(margin, currentY, contentWidth, 52).fillAndStroke('#0f172a', '#0f172a');

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text(`FICHA TÉCNICA DE PRODUCCIÓN: ${data.conceptName.toUpperCase()}`, margin + 12, currentY + 10, {
    width: contentWidth - 24,
  });

  doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8');
  doc.text(
    `Bloque: ${data.baseBlock}  |  Tallas: ${data.allSizes.join(', ')}  |  Versión: v${data.version}  |  Fecha: ${data.createdAt}`,
    margin + 12,
    currentY + 30
  );
  doc.restore();
  currentY += 58;

  // Cajas de resumen de parámetros clave
  const boxW = (contentWidth - 18) / 4;
  const boxH = 34;

  const boxes = [
    { title: 'TALLA BASE', val: data.primarySize, color: '#2563eb' },
    { title: 'COSTURA / RUEDO', val: `${data.seamAllowance_mm}mm / ${data.hemAllowance_mm}mm`, color: '#0f766e' },
    { title: 'ANCHO TELA', val: `${(data.fabricConsumption.fabricWidth_mm / 1000).toFixed(2)} m`, color: '#475569' },
    { title: 'MERMA CORTE', val: `${data.fabricConsumption.wastePercentage}% (x${data.fabricConsumption.wasteMultiplier.toFixed(2)})`, color: '#b91c1c' },
  ];

  boxes.forEach((b, idx) => {
    const bX = margin + idx * (boxW + 6);
    doc.save();
    doc.rect(bX, currentY, boxW, boxH).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#64748b').text(b.title, bX + 6, currentY + 5);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(b.color).text(b.val, bX + 6, currentY + 16, { width: boxW - 12 });
    doc.restore();
  });
  currentY += boxH + 12;

  // ==========================================
  // SECCIÓN 1: CONSUMO DE TELA Y RENDIMIENTO
  // ==========================================
  checkPageBreak(120);
  doc.save();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('1. CONSUMO DE TELA Y RENDIMIENTO TEXTIL', margin, currentY);
  doc.restore();
  currentY += 15;

  // Tabla de consumos por talla
  const isSetBreakdown = Boolean(data.fabricConsumption.breakdown_by_fabric);
  const consCols = isSetBreakdown
    ? [
        { title: 'Talla', w: 40, align: 'center' as const },
        { title: 'Tela 1: Top (m)', w: 90, align: 'center' as const },
        { title: 'Tela 2: Bottom (m)', w: 95, align: 'center' as const },
        { title: 'Total (m)', w: 80, align: 'center' as const },
        { title: 'Merma', w: 60, align: 'center' as const },
        { title: 'Área Total (m²)', w: 75, align: 'center' as const },
        { title: 'Consumo Est. (m)', w: 83.28, align: 'center' as const },
      ]
    : [
        { title: 'Talla', w: 45, align: 'center' as const },
        { title: 'Área Neta (m²)', w: 80, align: 'center' as const },
        { title: 'Ancho Tela (m)', w: 75, align: 'center' as const },
        { title: 'Factor Merma', w: 75, align: 'center' as const },
        { title: 'Consumo Ideal (m)', w: 95, align: 'center' as const },
        { title: 'Consumo Estimado (m)', w: 153.28, align: 'center' as const },
      ];

  // Header de tabla
  doc.save();
  doc.rect(margin, currentY, contentWidth, 16).fill('#1e3a8a');
  let hX = margin;
  consCols.forEach((c) => {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff').text(c.title, hX, currentY + 4, { width: c.w, align: c.align });
    hX += c.w;
  });
  doc.restore();
  currentY += 16;

  // Filas de consumos
  data.allSizes.forEach((sz, idx) => {
    const c = data.fabricConsumption.perSize[sz];
    const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';

    doc.save();
    doc.rect(margin, currentY, contentWidth, 14).fill(rowBg);
    let rX = margin;

    if (isSetBreakdown) {
      const m1 = data.fabricConsumption.breakdown_by_fabric?.main_fabric?.perSize[sz];
      const m2 = data.fabricConsumption.breakdown_by_fabric?.secondary_fabric?.perSize[sz];

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(sz, rX, currentY + 3, { width: consCols[0].w, align: 'center' });
      rX += consCols[0].w;

      doc.font('Helvetica').fillColor('#334155').text(m1 ? `${m1.estimatedLinearMeters.toFixed(2)} m` : '-', rX, currentY + 3, { width: consCols[1].w, align: 'center' });
      rX += consCols[1].w;

      doc.text(m2 ? `${m2.estimatedLinearMeters.toFixed(2)} m` : '-', rX, currentY + 3, { width: consCols[2].w, align: 'center' });
      rX += consCols[2].w;

      doc.text(c ? `${c.idealLinearMeters.toFixed(2)} m` : '0 m', rX, currentY + 3, { width: consCols[3].w, align: 'center' });
      rX += consCols[3].w;

      doc.text(c ? `${c.wastePercentage}%` : '15%', rX, currentY + 3, { width: consCols[4].w, align: 'center' });
      rX += consCols[4].w;

      doc.text(c ? c.totalNetArea_m2.toFixed(3) : '0', rX, currentY + 3, { width: consCols[5].w, align: 'center' });
      rX += consCols[5].w;

      doc.font('Helvetica-Bold').fillColor('#1e3a8a').text(c ? `${c.estimatedLinearMeters.toFixed(2)} m` : '0 m', rX, currentY + 3, { width: consCols[6].w, align: 'center' });
    } else {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(sz, rX, currentY + 3, { width: consCols[0].w, align: 'center' });
      rX += consCols[0].w;

      doc.font('Helvetica').fillColor('#334155').text(c ? c.totalNetArea_m2.toFixed(3) : '0', rX, currentY + 3, { width: consCols[1].w, align: 'center' });
      rX += consCols[1].w;

      doc.text(c ? (c.fabricWidth_mm / 1000).toFixed(2) : '1.50', rX, currentY + 3, { width: consCols[2].w, align: 'center' });
      rX += consCols[2].w;

      doc.text(c ? `${c.wastePercentage}%` : '15%', rX, currentY + 3, { width: consCols[3].w, align: 'center' });
      rX += consCols[3].w;

      doc.text(c ? `${c.idealLinearMeters.toFixed(2)} m` : '0 m', rX, currentY + 3, { width: consCols[4].w, align: 'center' });
      rX += consCols[4].w;

      doc.font('Helvetica-Bold').fillColor('#1e3a8a').text(c ? `${c.estimatedLinearMeters.toFixed(2)} m` : '0 m', rX, currentY + 3, { width: consCols[5].w, align: 'center' });
    }

    doc.restore();
    currentY += 14;
  });


  // Fila resumen de promedio
  doc.save();
  doc.rect(margin, currentY, contentWidth, 15).fillAndStroke('#e2e8f0', '#cbd5e1');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
  doc.text('PROMEDIO / CONSOLIDADO:', margin + 10, currentY + 3, { width: 250 });
  doc.text(
    `Promedio: ${data.fabricConsumption.averageLinearMeters.toFixed(2)} m  |  Total Lote (${data.fabricConsumption.sizeCount} tallas): ${data.fabricConsumption.totalLinearMetersAllSizes.toFixed(2)} m`,
    margin + 200,
    currentY + 3,
    { width: contentWidth - 210, align: 'right' }
  );
  doc.restore();
  currentY += 24;

  // ==========================================
  // SECCIÓN 1.1: PERSONALIZACIÓN ANTROPOMÉTRICA (SI APLICA)
  // ==========================================
  if (data.customMeasurements) {
    const cm = data.customMeasurements;
    checkPageBreak(130);
    doc.save();
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1e293b')
      .text('1.1 PERSONALIZACIÓN ANTROPOMÉTRICA (MEDIDAS A MEDIDA)', margin, currentY);
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        `Comparación entre medidas del cliente y talla estándar de referencia (${cm.referenceSize}). ${cm.providedFieldsCount} medidas exactas suministradas.`,
        margin,
        currentY + 12
      );
    doc.restore();
    currentY += 24;

    const customCols = [
      { title: 'Medida Antropométrica', w: 160, align: 'left' as const },
      { title: `Base (${cm.referenceSize})`, w: 75, align: 'center' as const },
      { title: 'A Medida', w: 75, align: 'center' as const },
      { title: 'Diferencia (Δ)', w: 75, align: 'center' as const },
      { title: 'Origen / Estado', w: 138.28, align: 'left' as const },
    ];

    doc.save();
    doc.rect(margin, currentY, contentWidth, 16).fill('#4338ca');
    let chX = margin;
    customCols.forEach((c) => {
      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(c.title, chX + 4, currentY + 4, { width: c.w - 8, align: c.align });
      chX += c.w;
    });
    doc.restore();
    currentY += 16;

    cm.measurements.forEach((m, idx) => {
      checkPageBreak(15);
      const rowBg = idx % 2 === 0 ? '#eef2ff' : '#ffffff';
      doc.save();
      doc.rect(margin, currentY, contentWidth, 14).fill(rowBg);

      let crX = margin;
      doc
        .fontSize(7)
        .font(m.isExplicit ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor('#0f172a')
        .text(m.label, crX + 4, currentY + 3.5, { width: customCols[0].w - 8 });
      crX += customCols[0].w;

      doc
        .font('Helvetica')
        .fillColor('#475569')
        .text(`${m.baseValue_mm} mm`, crX, currentY + 3.5, { width: customCols[1].w, align: 'center' });
      crX += customCols[1].w;

      doc
        .font('Helvetica-Bold')
        .fillColor(m.isExplicit ? '#4338ca' : '#0f172a')
        .text(`${m.customValue_mm} mm`, crX, currentY + 3.5, { width: customCols[2].w, align: 'center' });
      crX += customCols[2].w;

      const deltaStr =
        m.delta_mm > 0 ? `+${m.delta_mm} mm` : m.delta_mm < 0 ? `${m.delta_mm} mm` : '0 mm';
      const deltaColor =
        m.delta_mm !== 0 ? (m.delta_mm > 0 ? '#047857' : '#b91c1c') : '#64748b';
      doc
        .font('Helvetica-Bold')
        .fillColor(deltaColor)
        .text(deltaStr, crX, currentY + 3.5, { width: customCols[3].w, align: 'center' });
      crX += customCols[3].w;

      const originStr = m.isExplicit ? 'Exacta (Suministrada)' : 'Interpolación Armónica';
      doc
        .font(m.isExplicit ? 'Helvetica-Bold' : 'Helvetica-Oblique')
        .fillColor(m.isExplicit ? '#4338ca' : '#64748b')
        .text(originStr, crX + 4, currentY + 3.5, { width: customCols[4].w - 8 });

      doc.restore();
      currentY += 14;
    });
    currentY += 18;
  }

  // ==========================================
  // SECCIÓN 2: LISTA DE PIEZAS DE CORTE
  // ==========================================
  checkPageBreak(120);
  doc.save();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('2. LISTA DETALLADA DE PIEZAS DE CORTE', margin, currentY);
  doc.restore();
  currentY += 15;

  const pieceCols = [
    { title: 'Pieza', w: 130, align: 'left' as const },
    { title: 'Corte', w: 85, align: 'center' as const },
    { title: 'Tela Sugerida', w: 140, align: 'left' as const },
    { title: 'Costura', w: 45, align: 'center' as const },
    { title: 'Dim. (mm)', w: 65, align: 'center' as const },
    { title: 'Área (cm²)', w: 58.28, align: 'right' as const },
  ];

  doc.save();
  doc.rect(margin, currentY, contentWidth, 16).fill('#0f766e');
  let phX = margin;
  pieceCols.forEach((c) => {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff').text(c.title, phX + 4, currentY + 4, { width: c.w - 8, align: c.align });
    phX += c.w;
  });
  doc.restore();
  currentY += 16;

  data.cuttingPieces.forEach((p, idx) => {
    checkPageBreak(16);
    const rowBg = idx % 2 === 0 ? '#f0fdf4' : '#ffffff';
    doc.save();
    doc.rect(margin, currentY, contentWidth, 15).fill(rowBg);

    let prX = margin;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a').text(p.name, prX + 4, currentY + 3.5, { width: pieceCols[0].w - 8, lineBreak: false });
    prX += pieceCols[0].w;

    doc.font('Helvetica').fillColor('#334155').text(p.quantityDescription, prX + 2, currentY + 3.5, { width: pieceCols[1].w - 4, align: 'center' });
    prX += pieceCols[1].w;

    doc.text(p.suggestedFabric, prX + 2, currentY + 3.5, { width: pieceCols[2].w - 4, lineBreak: false });
    prX += pieceCols[2].w;

    doc.text(`${p.seamAllowance_mm}mm`, prX, currentY + 3.5, { width: pieceCols[3].w, align: 'center' });
    prX += pieceCols[3].w;

    doc.text(`${p.width_mm}x${p.height_mm}`, prX, currentY + 3.5, { width: pieceCols[4].w, align: 'center' });
    prX += pieceCols[4].w;

    doc.font('Helvetica-Bold').fillColor('#0f766e').text((p.totalArea_mm2 / 100).toFixed(0), prX, currentY + 3.5, { width: pieceCols[5].w - 6, align: 'right' });

    doc.restore();
    currentY += 15;
  });
  currentY += 14;

  // ==========================================
  // SECCIÓN 3: LISTA DE AVÍOS Y MERCERÍA (BOM)
  // ==========================================
  checkPageBreak(110);
  doc.save();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('3. LISTA DE AVÍOS Y MERCERÍA (BILL OF MATERIALS - BOM)', margin, currentY);
  doc.restore();
  currentY += 15;

  const notionCols = [
    { title: 'Categoría', w: 80, align: 'left' as const },
    { title: 'Insumo / Descripción Técnica', w: 220, align: 'left' as const },
    { title: 'Cantidad', w: 85, align: 'center' as const },
    { title: 'Ubicación en Prenda', w: 138.28, align: 'left' as const },
  ];

  doc.save();
  doc.rect(margin, currentY, contentWidth, 16).fill('#334155');
  let nhX = margin;
  notionCols.forEach((c) => {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff').text(c.title, nhX + 4, currentY + 4, { width: c.w - 8, align: c.align });
    nhX += c.w;
  });
  doc.restore();
  currentY += 16;

  data.notions.forEach((n, idx) => {
    checkPageBreak(16);
    const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.save();
    doc.rect(margin, currentY, contentWidth, 15).fill(rowBg);

    let nrX = margin;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569').text(n.category.toUpperCase(), nrX + 4, currentY + 3.5, { width: notionCols[0].w - 8 });
    nrX += notionCols[0].w;

    doc.font('Helvetica-Bold').fillColor('#0f172a').text(n.name, nrX + 4, currentY + 3.5, { width: notionCols[1].w - 8, lineBreak: false });
    nrX += notionCols[1].w;

    doc.font('Helvetica').fillColor('#334155').text(n.quantity, nrX, currentY + 3.5, { width: notionCols[2].w, align: 'center' });
    nrX += notionCols[2].w;

    doc.text(n.usageLocation, nrX + 4, currentY + 3.5, { width: notionCols[3].w - 8, lineBreak: false });

    doc.restore();
    currentY += 15;
  });
  currentY += 18;

  // ==========================================
  // SECCIÓN 4: GUÍA DE CONFECCIÓN Y ENSAMBLE PASO A PASO
  // ==========================================
  checkPageBreak(120);
  doc.save();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('4. GUÍA DE CONFECCIÓN Y ENSAMBLE PASO A PASO', margin, currentY);
  doc.restore();
  currentY += 15;

  data.assemblySequence.forEach((step) => {
    const cardHeight = 44;
    checkPageBreak(cardHeight + 8);

    doc.save();
    doc.rect(margin, currentY, contentWidth, cardHeight).fillAndStroke('#ffffff', '#e2e8f0');

    // Badge de número de paso
    doc.rect(margin, currentY, 24, cardHeight).fill('#1e3a8a');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff').text(`${step.stepNumber}`, margin, currentY + 16, { width: 24, align: 'center' });

    const textX = margin + 30;
    const textW = contentWidth - 36;

    // Título y máquina
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a').text(step.title, textX, currentY + 4, { width: textW - 140 });
    doc.fontSize(6.5).font('Helvetica').fillColor('#64748b').text(`${step.machineType} | ${step.stitchType}`, textX + textW - 140, currentY + 4, { width: 140, align: 'right' });

    // Instrucciones
    doc.fontSize(6.5).font('Helvetica').fillColor('#334155').text(step.instructions, textX, currentY + 14, { width: textW, height: 16, ellipsis: true });

    // Guía de piquetes
    if (step.notchGuidance) {
      doc.fontSize(6).font('Helvetica-Oblique').fillColor('#2563eb').text(`* Piquetes: ${step.notchGuidance}`, textX, currentY + 32, { width: textW, lineBreak: false });
    }

    doc.restore();
    currentY += cardHeight + 4;
  });
  currentY += 14;

  // ==========================================
  // SECCIÓN 5: TABLA DE MEDIDAS TERMINADAS (POM)
  // ==========================================
  checkPageBreak(130);
  doc.save();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('5. TABLA DE MEDIDAS TERMINADAS DE LA PRENDA (POINTS OF MEASUREMENT - POM)', margin, currentY);
  doc.fontSize(7).font('Helvetica').fillColor('#64748b').text('Medidas en milímetros (mm) sobre prenda terminada extendida en plano sin estirar.', margin, currentY + 12);
  doc.restore();
  currentY += 24;

  const numSizes = data.allSizes.length;
  const fixedColW = 230; // Code (45) + POM (150) + Tol (35)
  const sizeColW = (contentWidth - fixedColW) / Math.max(1, numSizes);

  // Header tabla POM
  doc.save();
  doc.rect(margin, currentY, contentWidth, 16).fill('#1e293b');
  let pomHX = margin;

  doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff').text('Código', pomHX, currentY + 4, { width: 45, align: 'center' });
  pomHX += 45;

  doc.text('Punto de Medida (POM)', pomHX + 4, currentY + 4, { width: 146 });
  pomHX += 150;

  doc.text('Tol. (±)', pomHX, currentY + 4, { width: 35, align: 'center' });
  pomHX += 35;

  data.allSizes.forEach((sz) => {
    doc.text(sz, pomHX, currentY + 4, { width: sizeColW, align: 'center' });
    pomHX += sizeColW;
  });
  doc.restore();
  currentY += 16;

  data.finishedMeasurements.forEach((row, idx) => {
    checkPageBreak(15);
    const rowBg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.save();
    doc.rect(margin, currentY, contentWidth, 14).fill(rowBg);

    let pomRX = margin;
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#475569').text(row.code, pomRX, currentY + 3.5, { width: 45, align: 'center' });
    pomRX += 45;

    doc.font('Helvetica').fillColor('#0f172a').text(row.pointOfMeasurement, pomRX + 4, currentY + 3.5, { width: 146, lineBreak: false });
    pomRX += 150;

    doc.fillColor('#64748b').text(`±${row.tolerance_mm}`, pomRX, currentY + 3.5, { width: 35, align: 'center' });
    pomRX += 35;

    data.allSizes.forEach((sz) => {
      const val = row.values[sz] ?? 0;
      doc.font('Helvetica-Bold').fillColor('#1e3a8a').text(`${val}`, pomRX, currentY + 3.5, { width: sizeColW, align: 'center' });
      pomRX += sizeColW;
    });

    doc.restore();
    currentY += 14;
  });
  currentY += 16;

  // ==========================================
  // SECCIÓN 6: NOTAS DE CALIDAD Y PIE DE PÁGINA
  // ==========================================
  checkPageBreak(70);
  doc.save();
  doc.rect(margin, currentY, contentWidth, 48).fillAndStroke('#fffbeb', '#fde68a');
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#92400e').text('NOTAS Y ADVERTENCIAS DE CALIDAD PARA TALLER:', margin + 8, currentY + 6);
  doc.fontSize(6.5).font('Helvetica').fillColor('#78350f');
  let noteY = currentY + 18;
  data.notes.slice(0, 3).forEach((n) => {
    doc.text(`• ${n}`, margin + 8, noteY, { width: contentWidth - 16 });
    noteY += 9;
  });
  doc.restore();

  doc.end();
  return bufferPromise;
}
