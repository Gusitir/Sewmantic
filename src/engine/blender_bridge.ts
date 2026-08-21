/**
 * src/engine/blender_bridge.ts
 * Puente Automatizado Blender Headless & Motor Nativo glTF 2.0 para Mallas 3D Textiles
 * pattern-ai-core
 *
 * Convierte patrones paramétricos 2D en geometría 3D anatómica con curvatura realista,
 * mapeo UV, normales suaves y materiales PBR textiles (Lino, Denim, Algodón, Seda, etc.).
 * Soporta generación binaria directa glTF 2.0 (.glb) y ejecución headless con Blender CLI.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { PatternDna, FabricSpec, StandardSize } from '../types/pattern.js';
import { PatternPart, Point2D, computeBounds } from './geometry.js';
import { ModifiedPatternResult, modifyPattern } from './modifier.js';
import { triangulatePolygon } from './triangulator.js';

const execFileAsync = promisify(execFile);

/**
 * Propiedades PBR de materiales textiles
 */
export interface FabricPBR {
  name: string;
  baseColor: [number, number, number, number]; // RGBA [0..1]
  roughness: number; // 0..1
  metallic: number; // 0..1
  normalScale?: number;
  subsurface?: number;
  doubleSided?: boolean;
}

/**
 * Presets estándar de materiales textiles para render PBR
 */
export const FABRIC_PBR_PRESETS: Record<string, FabricPBR> = {
  linen: {
    name: 'Linen_Fabric',
    baseColor: [0.82, 0.78, 0.70, 1.0],
    roughness: 0.85,
    metallic: 0.0,
    subsurface: 0.05,
    doubleSided: true,
  },
  lino: {
    name: 'Linen_Fabric',
    baseColor: [0.82, 0.78, 0.70, 1.0],
    roughness: 0.85,
    metallic: 0.0,
    subsurface: 0.05,
    doubleSided: true,
  },
  denim: {
    name: 'Denim_Fabric',
    baseColor: [0.15, 0.28, 0.48, 1.0],
    roughness: 0.75,
    metallic: 0.0,
    subsurface: 0.02,
    doubleSided: true,
  },
  mezclilla: {
    name: 'Denim_Fabric',
    baseColor: [0.15, 0.28, 0.48, 1.0],
    roughness: 0.75,
    metallic: 0.0,
    subsurface: 0.02,
    doubleSided: true,
  },
  cotton: {
    name: 'Cotton_Fabric',
    baseColor: [0.90, 0.90, 0.88, 1.0],
    roughness: 0.70,
    metallic: 0.0,
    subsurface: 0.04,
    doubleSided: true,
  },
  algodon: {
    name: 'Cotton_Fabric',
    baseColor: [0.90, 0.90, 0.88, 1.0],
    roughness: 0.70,
    metallic: 0.0,
    subsurface: 0.04,
    doubleSided: true,
  },
  silk: {
    name: 'Silk_Fabric',
    baseColor: [0.88, 0.82, 0.90, 1.0],
    roughness: 0.25,
    metallic: 0.08,
    subsurface: 0.10,
    doubleSided: true,
  },
  seda: {
    name: 'Silk_Fabric',
    baseColor: [0.88, 0.82, 0.90, 1.0],
    roughness: 0.25,
    metallic: 0.08,
    subsurface: 0.10,
    doubleSided: true,
  },
  leather: {
    name: 'Leather_Fabric',
    baseColor: [0.24, 0.14, 0.08, 1.0],
    roughness: 0.40,
    metallic: 0.05,
    subsurface: 0.01,
    doubleSided: true,
  },
  cuero: {
    name: 'Leather_Fabric',
    baseColor: [0.24, 0.14, 0.08, 1.0],
    roughness: 0.40,
    metallic: 0.05,
    subsurface: 0.01,
    doubleSided: true,
  },
  wool: {
    name: 'Wool_Fabric',
    baseColor: [0.32, 0.32, 0.35, 1.0],
    roughness: 0.92,
    metallic: 0.0,
    subsurface: 0.08,
    doubleSided: true,
  },
  lana: {
    name: 'Wool_Fabric',
    baseColor: [0.32, 0.32, 0.35, 1.0],
    roughness: 0.92,
    metallic: 0.0,
    subsurface: 0.08,
    doubleSided: true,
  },
  default: {
    name: 'Standard_Fabric',
    baseColor: [0.80, 0.80, 0.80, 1.0],
    roughness: 0.70,
    metallic: 0.0,
    subsurface: 0.05,
    doubleSided: true,
  },
};

/**
 * Opciones de generación de modelo 3D
 */
export interface Garment3DOptions {
  dna?: PatternDna;
  parts?: Record<string, PatternPart>;
  concept_name?: string;
  size?: StandardSize;
  fabric?: string | FabricSpec;
  color?: string | [number, number, number] | [number, number, number, number];
  roughness?: number;
  metallic?: number;
  subdivisions?: number;
  useBlenderCli?: boolean;
  blenderPath?: string;
  outputPath?: string;
  includeMannequin?: boolean;
}

/**
 * Resultado de la generación de modelo 3D
 */
export interface Garment3DResult {
  glbBuffer: Buffer;
  byteLength: number;
  vertexCount: number;
  triangleCount: number;
  meshNames: string[];
  material: {
    name: string;
    baseColor: [number, number, number, number];
    roughness: number;
    metallic: number;
  };
  filePath?: string;
  isBlenderGenerated: boolean;
}

/**
 * Parsea un color en string hex (#RRGGBB o #RGB) o array a tupla RGBA [0..1]
 */
export function parseColorToRgba(
  colorInput?: string | [number, number, number] | [number, number, number, number]
): [number, number, number, number] | null {
  if (!colorInput) return null;

  if (Array.isArray(colorInput)) {
    const r = Math.min(Math.max(colorInput[0] ?? 1, 0), 1);
    const g = Math.min(Math.max(colorInput[1] ?? 1, 0), 1);
    const b = Math.min(Math.max(colorInput[2] ?? 1, 0), 1);
    const a = Math.min(Math.max(colorInput[3] ?? 1.0, 0), 1);
    return [r, g, b, a];
  }

  const str = colorInput.trim().toLowerCase();

  // Mapeo de colores nombrados comunes
  const namedColors: Record<string, [number, number, number, number]> = {
    red: [0.85, 0.15, 0.15, 1.0],
    vermilion: [0.84, 0.16, 0.16, 1.0],
    blue: [0.15, 0.35, 0.75, 1.0],
    indigo: [0.12, 0.20, 0.45, 1.0],
    navy: [0.05, 0.10, 0.25, 1.0],
    white: [0.95, 0.95, 0.95, 1.0],
    black: [0.05, 0.05, 0.05, 1.0],
    charcoal: [0.18, 0.18, 0.20, 1.0],
    beige: [0.85, 0.80, 0.72, 1.0],
    brown: [0.35, 0.20, 0.12, 1.0],
    green: [0.15, 0.55, 0.25, 1.0],
    olive: [0.35, 0.40, 0.20, 1.0],
    yellow: [0.90, 0.80, 0.15, 1.0],
    purple: [0.45, 0.20, 0.55, 1.0],
    pink: [0.88, 0.55, 0.65, 1.0],
    gold: [0.85, 0.70, 0.20, 1.0],
  };

  if (namedColors[str]) {
    return namedColors[str];
  }

  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      return [r, g, b, 1.0];
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1.0];
    } else if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return [r, g, b, a];
    }
  }

  return null;
}

/**
 * Resuelve la configuración PBR a partir de opciones y especificaciones de tela
 */
export function resolveFabricPbr(options: Garment3DOptions): FabricPBR {
  let fabricKey = 'default';
  let fabricColorName = '';

  if (typeof options.fabric === 'string') {
    fabricKey = options.fabric.toLowerCase().trim();
  } else if (options.fabric && typeof options.fabric === 'object') {
    fabricKey = (options.fabric.type || options.fabric.name || 'default').toLowerCase().trim();
    if (options.fabric.color) {
      fabricColorName = options.fabric.color;
    }
  } else if (options.dna?.tech_specs?.fabric_type) {
    fabricKey = options.dna.tech_specs.fabric_type.toLowerCase().trim();
  } else if (options.dna?.fabric_details?.main_fabric?.type) {
    fabricKey = options.dna.fabric_details.main_fabric.type.toLowerCase().trim();
    if (options.dna.fabric_details.main_fabric.color) {
      fabricColorName = options.dna.fabric_details.main_fabric.color;
    }
  }

  // Buscar coincidencia en presets
  let matchedPreset = FABRIC_PBR_PRESETS.default;
  for (const [key, preset] of Object.entries(FABRIC_PBR_PRESETS)) {
    if (fabricKey.includes(key)) {
      matchedPreset = preset;
      break;
    }
  }

  const pbr: FabricPBR = { ...matchedPreset };

  // Sobrescribir color si fue provisto
  const explicitColor =
    parseColorToRgba(options.color) ||
    (fabricColorName ? parseColorToRgba(fabricColorName) : null);
  if (explicitColor) {
    pbr.baseColor = explicitColor;
  }

  // Sobrescribir rugosidad / reflectividad si fue provista
  if (typeof options.roughness === 'number') {
    pbr.roughness = Math.min(Math.max(options.roughness, 0), 1);
  }
  if (typeof options.metallic === 'number') {
    pbr.metallic = Math.min(Math.max(options.metallic, 0), 1);
  }

  return pbr;
}

/**
 * Busca la ruta del ejecutable de Blender en el sistema
 */
export function findBlenderExecutable(): string | null {
  // 1. Variable de entorno BLENDER_PATH
  if (process.env.BLENDER_PATH && fs.existsSync(process.env.BLENDER_PATH)) {
    return process.env.BLENDER_PATH;
  }

  // 2. Rutas conocidas en Windows
  const commonWindowsPaths = [
    'C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
    'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe',
  ];

  // 3. Rutas conocidas en macOS / Linux
  const commonUnixPaths = [
    '/Applications/Blender.app/Contents/MacOS/Blender',
    '/usr/bin/blender',
    '/usr/local/bin/blender',
    '/snap/bin/blender',
  ];

  const searchPaths = process.platform === 'win32' ? commonWindowsPaths : commonUnixPaths;
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // 4. Búsqueda en PATH del sistema
  try {
    const cmd = process.platform === 'win32' ? 'where.exe blender' : 'which blender';
    const out = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const firstLine = out.split(/\r?\n/)[0].trim();
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // Ignorar si no está en PATH
  }

  return null;
}

/**
 * Detecta si Blender CLI está disponible en el entorno
 */
export function detectBlenderCli(): { available: boolean; path: string | null } {
  const p = findBlenderExecutable();
  return {
    available: p !== null,
    path: p,
  };
}

/**
 * Representación interna de un panel 3D triangulado
 */
/**
 * Representación de un panel 3D o malla completa consolidada
 */
export interface Panel3DMesh {
  name: string;
  positions: number[]; // x, y, z (meters)
  normals: number[]; // nx, ny, nz
  uvs: number[]; // u, v
  indices: number[]; // triangle indices
}

/**
 * Estructura de malla 3D textil anatómica consolidada (True-to-Pattern)
 */
export interface GarmentMesh3D {
  positions: number[]; // [x0, y0, z0, x1, y1, z1, ...] en metros
  normals: number[]; // [nx0, ny0, nz0, ...] vectores unitarios suaves
  uvs: number[]; // [u0, v0, u1, v1, ...] coordenadas paramétricas [0..1]
  indices: number[]; // [i0, i1, i2, ...] índices de triángulos CCW
  vertexCount: number;
  triangleCount: number;
  bounds: {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
  };
  panels?: Array<{
    name: string;
    vertexOffset: number;
    indexOffset: number;
    vertexCount: number;
    indexCount: number;
  }>;
}

/**
 * Genera la malla 3D anatómica envolvente directa a partir de piezas 2D reales de moldería FreeSewing
 * (True-to-Pattern Meshing) mediante triangulación determinista y proyección espacial paramétrica.
 */
export function generateTrueToPatternMesh(
  pattern: ModifiedPatternResult,
  dna?: PatternDna
): GarmentMesh3D {
  let resolvedParts = pattern.parts;
  if (!resolvedParts || Object.keys(resolvedParts).length === 0) {
    const fallbackPart: PatternPart = {
      name: 'front_torso',
      label: 'Front Torso',
      cutCount: 1,
      onFold: true,
      points: {},
      pathD: '',
      outline: [
        { x: 0, y: 50 },
        { x: 100, y: 0 },
        { x: 200, y: 50 },
        { x: 250, y: 250 },
        { x: 250, y: 650 },
        { x: 0, y: 650 },
      ],
      bounds: { minX: 0, minY: 0, maxX: 250, maxY: 650, width: 250, height: 650 },
      width_mm: 250,
      height_mm: 650,
      area_mm2: 150000,
      grainline: { start: { x: 125, y: 50 }, end: { x: 125, y: 600 }, label: 'Grainline' },
      notches: [],
    };
    resolvedParts = { front: fallbackPart };
  }

  const combinedPositions: number[] = [];
  const combinedUvs: number[] = [];
  const combinedIndices: number[] = [];
  const panelsSummary: Array<{
    name: string;
    vertexOffset: number;
    indexOffset: number;
    vertexCount: number;
    indexCount: number;
  }> = [];

  // Parámetros antropométricos estándar (en metros)
  const SHOULDER_Y = 1.45;
  const WAIST_Y = 1.05;
  const Z_CHEST = 0.13;
  const Z_BACK = 0.12;
  const Z_OFFSET = 0.02;
  const LEG_CENTER_X = 0.10;

  for (const [partName, part] of Object.entries(resolvedParts)) {
    // 1. Obtener el contorno 2D de la pieza
    let outline: Point2D[] =
      part.outline && part.outline.length >= 3
        ? part.outline
        : Object.values(part.points || {});

    if (outline.length < 3) {
      const b = part.bounds || { minX: 0, minY: 0, maxX: 300, maxY: 500, width: 300, height: 500 };
      outline = [
        { x: b.minX, y: b.minY },
        { x: b.maxX, y: b.minY },
        { x: b.maxX, y: b.maxY },
        { x: b.minX, y: b.maxY },
      ];
    }

    const bounds = part.bounds || computeBounds(outline);
    const minX = bounds.minX;
    const maxX = bounds.maxX;
    const minY = bounds.minY;
    const maxY = bounds.maxY;
    const width_mm = Math.max(maxX - minX, 10);
    const height_mm = Math.max(maxY - minY, 10);
    const W_half = Math.max(part.bounds?.width || width_mm, 100) / 1000;
    const H_m = height_mm / 1000;

    // 2. Triangulación 2D con Ear Clipping
    let baseIndices = triangulatePolygon(outline);
    if (!baseIndices || baseIndices.length < 3) {
      baseIndices = [];
      for (let f = 1; f < outline.length - 1; f++) {
        baseIndices.push(0, f, f + 1);
      }
    }

    const lowerName = partName.toLowerCase();
    const isFrontTorso =
      lowerName.includes('front_bodice') ||
      lowerName.includes('front_dress') ||
      lowerName.includes('front_torso') ||
      (lowerName.includes('front') && !lowerName.includes('leg') && !lowerName.includes('skirt') && !lowerName.includes('pocket'));

    const isBackTorso =
      lowerName.includes('back_bodice') ||
      lowerName.includes('back_dress') ||
      lowerName.includes('back_torso') ||
      (lowerName.includes('back') && !lowerName.includes('leg') && !lowerName.includes('skirt'));

    const isFurisodeSleeve = lowerName.includes('furisode');
    const isSleeve = lowerName.includes('sleeve') && !lowerName.includes('furisode');

    const isFrontLeg = lowerName.includes('front_leg') || (lowerName.includes('leg') && lowerName.includes('front'));
    const isBackLeg = lowerName.includes('back_leg') || (lowerName.includes('leg') && lowerName.includes('back'));

    const isFrontSkirt = lowerName.includes('front_skirt') || (lowerName.includes('skirt') && lowerName.includes('front'));
    const isBackSkirt = lowerName.includes('back_skirt') || (lowerName.includes('skirt') && lowerName.includes('back'));

    const isHood = lowerName.includes('hood');
    const isWaistband = lowerName.includes('waistband') || lowerName.includes('obi_belt');
    const isCollar = lowerName.includes('collar');
    const isPocket = lowerName.includes('pocket');

    const isFullSpan = minX < -10 && maxX > 10;
    const onFold = part.onFold !== false && !isFullSpan;

    const panelVertexStart = combinedPositions.length / 3;
    const panelIndexStart = combinedIndices.length;

    const panelPositions: number[] = [];
    const panelUvs: number[] = [];
    const panelIndices: number[] = [];

    // 3. Proyección espacial anatómica envolvente
    if (isFrontTorso) {
      // Panel Delantero Derecho (X >= 0)
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const X = pt.x / 1000;
        const Y = SHOULDER_Y - (pt.y - minY) / 1000;
        const Z = Z_CHEST * Math.cos((X / W_half) * (Math.PI / 2.5)) + Z_OFFSET;
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);

      // Panel Delantero Izquierdo Espejado (X <= 0)
      if (onFold) {
        const vOffset = outline.length;
        for (let k = 0; k < outline.length; k++) {
          const pt = outline[k];
          const X = -pt.x / 1000;
          const Y = SHOULDER_Y - (pt.y - minY) / 1000;
          const Z = Z_CHEST * Math.cos((X / W_half) * (Math.PI / 2.5)) + Z_OFFSET;
          const u = 1.0 - Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
          const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);

          panelPositions.push(X, Y, Z);
          panelUvs.push(u, v);
        }
        for (let i = 0; i < baseIndices.length; i += 3) {
          panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 2] + vOffset, baseIndices[i + 1] + vOffset);
        }
      }
    } else if (isBackTorso) {
      // Panel Espalda Derecho (Z < 0)
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const X = pt.x / 1000;
        const Y = SHOULDER_Y - (pt.y - minY) / 1000;
        const Z = -(Z_BACK * Math.cos((X / W_half) * (Math.PI / 2.5)) + Z_OFFSET);
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      // Invertir orientación de triángulos de espalda para normales hacia afuera
      for (let i = 0; i < baseIndices.length; i += 3) {
        panelIndices.push(baseIndices[i], baseIndices[i + 2], baseIndices[i + 1]);
      }

      // Panel Espalda Izquierdo Espejado
      if (onFold) {
        const vOffset = outline.length;
        for (let k = 0; k < outline.length; k++) {
          const pt = outline[k];
          const X = -pt.x / 1000;
          const Y = SHOULDER_Y - (pt.y - minY) / 1000;
          const Z = -(Z_BACK * Math.cos((X / W_half) * (Math.PI / 2.5)) + Z_OFFSET);
          const u = 1.0 - Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
          const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);

          panelPositions.push(X, Y, Z);
          panelUvs.push(u, v);
        }
        for (let i = 0; i < baseIndices.length; i += 3) {
          panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 1] + vOffset, baseIndices[i + 2] + vOffset);
        }
      }
    } else if (isFurisodeSleeve) {
      // Manga Kimono Furisode colgante
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const X = 0.23 + ((pt.x - minX) / 1000) * 0.65;
        const Y = SHOULDER_Y - 0.03 - (pt.y - minY) / 1000;
        const Z = Math.sin(u * Math.PI) * 0.035 * (1.0 - 0.3 * v);

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);

      // Manga Furisode Izquierda
      const vOffset = outline.length;
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const X = -0.23 - ((pt.x - minX) / 1000) * 0.65;
        const Y = SHOULDER_Y - 0.03 - (pt.y - minY) / 1000;
        const Z = Math.sin(u * Math.PI) * 0.035 * (1.0 - 0.3 * v);

        panelPositions.push(X, Y, Z);
        panelUvs.push(1.0 - u, v);
      }
      for (let i = 0; i < baseIndices.length; i += 3) {
        panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 2] + vOffset, baseIndices[i + 1] + vOffset);
      }
    } else if (isSleeve) {
      // Manga Anatómica envolvente A-Pose
      const halfBicep = Math.max(Math.abs(minX), Math.abs(maxX), 50);
      const armAngle = (30 * Math.PI) / 180;

      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const d = (pt.y - minY) / 1000;
        const armRadius = 0.075 - 0.025 * v;
        const phi = (pt.x / halfBicep) * Math.PI;

        const xLoc = armRadius * Math.cos(phi) * Math.cos(armAngle);
        const yLoc = -armRadius * Math.cos(phi) * Math.sin(armAngle);
        const zLoc = armRadius * Math.sin(phi);

        const X = 0.23 + d * Math.sin(armAngle) + xLoc;
        const Y = SHOULDER_Y - 0.05 - d * Math.cos(armAngle) + yLoc;
        const Z = zLoc;

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);

      // Manga Izquierda Espejada
      const vOffset = outline.length;
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const d = (pt.y - minY) / 1000;
        const armRadius = 0.075 - 0.025 * v;
        const phi = (pt.x / halfBicep) * Math.PI;

        const xLoc = armRadius * Math.cos(phi) * Math.cos(armAngle);
        const yLoc = -armRadius * Math.cos(phi) * Math.sin(armAngle);
        const zLoc = armRadius * Math.sin(phi);

        const X = -0.23 - d * Math.sin(armAngle) - xLoc;
        const Y = SHOULDER_Y - 0.05 - d * Math.cos(armAngle) + yLoc;
        const Z = zLoc;

        panelPositions.push(X, Y, Z);
        panelUvs.push(1.0 - u, v);
      }
      for (let i = 0; i < baseIndices.length; i += 3) {
        panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 2] + vOffset, baseIndices[i + 1] + vOffset);
      }
    } else if (isFrontLeg) {
      // Pierna Frontal Pantalón (Cilindro anatómico envolvente)
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const theta = (u - 0.5) * Math.PI;
        const legR = 0.09 - 0.015 * v;

        const X = LEG_CENTER_X + legR * Math.sin(theta);
        const Y = WAIST_Y - (pt.y - minY) / 1000;
        const Z = legR * Math.cos(theta) + 0.015;

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);

      // Pierna Frontal Izquierda
      const vOffset = outline.length;
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const theta = (u - 0.5) * Math.PI;
        const legR = 0.09 - 0.015 * v;

        const X = -LEG_CENTER_X - legR * Math.sin(theta);
        const Y = WAIST_Y - (pt.y - minY) / 1000;
        const Z = legR * Math.cos(theta) + 0.015;

        panelPositions.push(X, Y, Z);
        panelUvs.push(1.0 - u, v);
      }
      for (let i = 0; i < baseIndices.length; i += 3) {
        panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 2] + vOffset, baseIndices[i + 1] + vOffset);
      }
    } else if (isBackLeg) {
      // Pierna Trasera Pantalón
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const theta = (0.5 - u) * Math.PI;
        const legR = 0.09 - 0.015 * v;

        const X = LEG_CENTER_X + legR * Math.sin(theta);
        const Y = WAIST_Y - (pt.y - minY) / 1000;
        const Z = -(legR * Math.cos(theta) + 0.015);

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      for (let i = 0; i < baseIndices.length; i += 3) {
        panelIndices.push(baseIndices[i], baseIndices[i + 2], baseIndices[i + 1]);
      }

      // Pierna Trasera Izquierda
      const vOffset = outline.length;
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const theta = (0.5 - u) * Math.PI;
        const legR = 0.09 - 0.015 * v;

        const X = -LEG_CENTER_X - legR * Math.sin(theta);
        const Y = WAIST_Y - (pt.y - minY) / 1000;
        const Z = -(legR * Math.cos(theta) + 0.015);

        panelPositions.push(X, Y, Z);
        panelUvs.push(1.0 - u, v);
      }
      for (let i = 0; i < baseIndices.length; i += 3) {
        panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 1] + vOffset, baseIndices[i + 2] + vOffset);
      }
    } else if (isFrontSkirt) {
      // Falda Delantera Cónica Evasé
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const theta = (u - 0.5) * ((150 * Math.PI) / 180);
        const r = 0.16 + v * (0.28 - 0.16);

        const X = r * Math.sin(theta);
        const Y = WAIST_Y - (pt.y - minY) / 1000;
        const Z = r * Math.cos(theta) + 0.01;

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);

      if (onFold) {
        const vOffset = outline.length;
        for (let k = 0; k < outline.length; k++) {
          const pt = outline[k];
          const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
          const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
          const theta = (u - 0.5) * ((150 * Math.PI) / 180);
          const r = 0.16 + v * (0.28 - 0.16);

          const X = -r * Math.sin(theta);
          const Y = WAIST_Y - (pt.y - minY) / 1000;
          const Z = r * Math.cos(theta) + 0.01;

          panelPositions.push(X, Y, Z);
          panelUvs.push(1.0 - u, v);
        }
        for (let i = 0; i < baseIndices.length; i += 3) {
          panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 2] + vOffset, baseIndices[i + 1] + vOffset);
        }
      }
    } else if (isBackSkirt) {
      // Falda Trasera Cónica
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const theta = (0.5 - u) * ((150 * Math.PI) / 180);
        const r = 0.16 + v * (0.28 - 0.16);

        const X = r * Math.sin(theta);
        const Y = WAIST_Y - (pt.y - minY) / 1000;
        const Z = -(r * Math.cos(theta) + 0.01);

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      for (let i = 0; i < baseIndices.length; i += 3) {
        panelIndices.push(baseIndices[i], baseIndices[i + 2], baseIndices[i + 1]);
      }

      if (onFold) {
        const vOffset = outline.length;
        for (let k = 0; k < outline.length; k++) {
          const pt = outline[k];
          const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
          const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
          const theta = (0.5 - u) * ((150 * Math.PI) / 180);
          const r = 0.16 + v * (0.28 - 0.16);

          const X = -r * Math.sin(theta);
          const Y = WAIST_Y - (pt.y - minY) / 1000;
          const Z = -(r * Math.cos(theta) + 0.01);

          panelPositions.push(X, Y, Z);
          panelUvs.push(1.0 - u, v);
        }
        for (let i = 0; i < baseIndices.length; i += 3) {
          panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 1] + vOffset, baseIndices[i + 2] + vOffset);
        }
      }
    } else if (isHood) {
      // Capucha anatómica
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const hoodY = 1.48 + (1.0 - v) * (H_m * 0.8);
        const phi = (u - 0.5) * Math.PI * 0.9;
        const hoodR = 0.12 + 0.04 * Math.sin(v * Math.PI);

        const X = hoodR * Math.sin(phi) + 0.05;
        const Y = hoodY;
        const Z = hoodR * Math.cos(phi) - 0.02;

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);

      if (onFold) {
        const vOffset = outline.length;
        for (let k = 0; k < outline.length; k++) {
          const pt = outline[k];
          const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
          const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
          const hoodY = 1.48 + (1.0 - v) * (H_m * 0.8);
          const phi = (u - 0.5) * Math.PI * 0.9;
          const hoodR = 0.12 + 0.04 * Math.sin(v * Math.PI);

          const X = -(hoodR * Math.sin(phi) + 0.05);
          const Y = hoodY;
          const Z = hoodR * Math.cos(phi) - 0.02;

          panelPositions.push(X, Y, Z);
          panelUvs.push(1.0 - u, v);
        }
        for (let i = 0; i < baseIndices.length; i += 3) {
          panelIndices.push(baseIndices[i] + vOffset, baseIndices[i + 2] + vOffset, baseIndices[i + 1] + vOffset);
        }
      }
    } else if (isPocket) {
      // Bolsillo frontal adosado
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const X = 0.08 + (pt.x - minX) / 1000;
        const Y = 1.15 - (pt.y - minY) / 1000;
        const Z = Z_CHEST + 0.035;

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);
    } else if (isWaistband) {
      // Cinturón / Pretina toroidal
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const phi = (u - 0.5) * 2 * Math.PI;
        const X = 0.16 * Math.sin(phi);
        const Y = WAIST_Y - (pt.y - minY) / 1000;
        const Z = 0.13 * Math.cos(phi);

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);
    } else if (isCollar) {
      // Cuello envolvente
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const phi = (u - 0.5) * 2 * Math.PI;
        const X = 0.10 * Math.sin(phi);
        const Y = SHOULDER_Y + (1.0 - v) * H_m;
        const Z = 0.09 * Math.cos(phi);

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);
    } else {
      // Panel genérico proyectado
      for (let k = 0; k < outline.length; k++) {
        const pt = outline[k];
        const u = Math.min(Math.max((pt.x - minX) / width_mm, 0), 1);
        const v = Math.min(Math.max((pt.y - minY) / height_mm, 0), 1);
        const theta = (u - 0.5) * ((60 * Math.PI) / 180);
        const X = (pt.x - minX) / 1000 - W_half / 2;
        const Y = 1.20 - (pt.y - minY) / 1000;
        const Z = 0.05 * Math.cos(theta);

        panelPositions.push(X, Y, Z);
        panelUvs.push(u, v);
      }
      panelIndices.push(...baseIndices);
    }

    // 4. Agregar a los buffers combinados consolidando desplazamientos de vértices
    const globalVOffset = combinedPositions.length / 3;
    combinedPositions.push(...panelPositions);
    combinedUvs.push(...panelUvs);

    for (let t = 0; t < panelIndices.length; t++) {
      combinedIndices.push(panelIndices[t] + globalVOffset);
    }

    panelsSummary.push({
      name: partName,
      vertexOffset: panelVertexStart,
      indexOffset: panelIndexStart,
      vertexCount: panelPositions.length / 3,
      indexCount: panelIndices.length,
    });
  }

  // 5. Cálculo de normales suaves analíticas (Smooth Normals) ponderadas por área de cara
  const totalVertices = combinedPositions.length / 3;
  const normAcc = new Float32Array(totalVertices * 3);

  for (let t = 0; t < combinedIndices.length; t += 3) {
    const idx0 = combinedIndices[t];
    const idx1 = combinedIndices[t + 1];
    const idx2 = combinedIndices[t + 2];

    const p0x = combinedPositions[idx0 * 3];
    const p0y = combinedPositions[idx0 * 3 + 1];
    const p0z = combinedPositions[idx0 * 3 + 2];

    const p1x = combinedPositions[idx1 * 3];
    const p1y = combinedPositions[idx1 * 3 + 1];
    const p1z = combinedPositions[idx1 * 3 + 2];

    const p2x = combinedPositions[idx2 * 3];
    const p2y = combinedPositions[idx2 * 3 + 1];
    const p2z = combinedPositions[idx2 * 3 + 2];

    // Vectores de arista: E1 = P1 - P0, E2 = P2 - P0
    const e1x = p1x - p0x;
    const e1y = p1y - p0y;
    const e1z = p1z - p0z;

    const e2x = p2x - p0x;
    const e2y = p2y - p0y;
    const e2z = p2z - p0z;

    // Producto cruzado E1 x E2 (magnitud proporcional a 2x área)
    const cpx = e1y * e2z - e1z * e2y;
    const cpy = e1z * e2x - e1x * e2z;
    const cpz = e1x * e2y - e1y * e2x;

    normAcc[idx0 * 3] += cpx;
    normAcc[idx0 * 3 + 1] += cpy;
    normAcc[idx0 * 3 + 2] += cpz;

    normAcc[idx1 * 3] += cpx;
    normAcc[idx1 * 3 + 1] += cpy;
    normAcc[idx1 * 3 + 2] += cpz;

    normAcc[idx2 * 3] += cpx;
    normAcc[idx2 * 3 + 1] += cpy;
    normAcc[idx2 * 3 + 2] += cpz;
  }

  const combinedNormals: number[] = new Array(totalVertices * 3);
  for (let k = 0; k < totalVertices; k++) {
    const nxVal = normAcc[k * 3];
    const nyVal = normAcc[k * 3 + 1];
    const nzVal = normAcc[k * 3 + 2];
    const len = Math.sqrt(nxVal * nxVal + nyVal * nyVal + nzVal * nzVal);

    if (len > 1e-6) {
      combinedNormals[k * 3] = nxVal / len;
      combinedNormals[k * 3 + 1] = nyVal / len;
      combinedNormals[k * 3 + 2] = nzVal / len;
    } else {
      combinedNormals[k * 3] = 0;
      combinedNormals[k * 3 + 1] = 0;
      combinedNormals[k * 3 + 2] = 1;
    }
  }

  // 6. Cálculo de cotas tridimensionales envolventes
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < totalVertices; i++) {
    const x = combinedPositions[i * 3];
    const y = combinedPositions[i * 3 + 1];
    const z = combinedPositions[i * 3 + 2];

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  if (totalVertices === 0) {
    minX = minY = minZ = maxX = maxY = maxZ = 0;
  }

  return {
    positions: combinedPositions,
    normals: combinedNormals,
    uvs: combinedUvs,
    indices: combinedIndices,
    vertexCount: totalVertices,
    triangleCount: combinedIndices.length / 3,
    bounds: { minX, minY, minZ, maxX, maxY, maxZ },
    panels: panelsSummary,
  };
}

/**
 * Ensambla un buffer binario glTF 2.0 (.glb) estándar a partir de una malla 3D textil
 */
export function buildGlbBuffer(
  mesh: GarmentMesh3D,
  fabric: FabricPBR = FABRIC_PBR_PRESETS.default,
  garmentName: string = 'Garment'
): { glbBuffer: Buffer; vertexCount: number; triangleCount: number } {
  const totalVertices = mesh.vertexCount;
  const totalTriangles = mesh.triangleCount;

  const minX = mesh.bounds?.minX ?? 0;
  const minY = mesh.bounds?.minY ?? 0;
  const minZ = mesh.bounds?.minZ ?? 0;
  const maxX = mesh.bounds?.maxX ?? 0;
  const maxY = mesh.bounds?.maxY ?? 0;
  const maxZ = mesh.bounds?.maxZ ?? 0;

  // Creación de buffers tipados binarios
  const posArray = new Float32Array(mesh.positions);
  const normArray = new Float32Array(mesh.normals);
  const uvArray = new Float32Array(mesh.uvs);

  // Usar Uint32Array si excede 65535 vértices, de lo contrario Uint16Array
  const useUint32 = totalVertices > 65535;
  const idxArray = useUint32
    ? new Uint32Array(mesh.indices)
    : new Uint16Array(mesh.indices);

  const posBuffer = Buffer.from(posArray.buffer);
  const normBuffer = Buffer.from(normArray.buffer);
  const uvBuffer = Buffer.from(uvArray.buffer);
  const idxBuffer = Buffer.from(idxArray.buffer);

  // Alinear cada bufferView a 4 bytes
  function pad4(buf: Buffer): Buffer {
    const pad = (4 - (buf.length % 4)) % 4;
    if (pad === 0) return buf;
    return Buffer.concat([buf, Buffer.alloc(pad, 0)]);
  }

  const paddedPos = pad4(posBuffer);
  const paddedNorm = pad4(normBuffer);
  const paddedUv = pad4(uvBuffer);
  const paddedIdx = pad4(idxBuffer);

  const offsetPos = 0;
  const lenPos = posBuffer.length;

  const offsetNorm = offsetPos + paddedPos.length;
  const lenNorm = normBuffer.length;

  const offsetUv = offsetNorm + paddedNorm.length;
  const lenUv = uvBuffer.length;

  const offsetIdx = offsetUv + paddedUv.length;
  const lenIdx = idxBuffer.length;

  const binChunkData = Buffer.concat([paddedPos, paddedNorm, paddedUv, paddedIdx]);
  const totalBinBytes = binChunkData.length;

  // Construcción del documento JSON glTF 2.0
  const gltfDoc = {
    asset: {
      version: '2.0',
      generator: 'pattern-ai-core v0.1.0 3D True-to-Pattern Engine',
    },
    scene: 0,
    scenes: [
      {
        name: 'DefaultScene',
        nodes: [0],
      },
    ],
    nodes: [
      {
        name: `${garmentName}_Root`,
        mesh: 0,
      },
    ],
    materials: [
      {
        name: fabric.name,
        pbrMetallicRoughness: {
          baseColorFactor: fabric.baseColor,
          metallicFactor: fabric.metallic,
          roughnessFactor: fabric.roughness,
        },
        doubleSided: fabric.doubleSided ?? true,
      },
    ],
    meshes: [
      {
        name: `${garmentName}_Mesh`,
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
              TEXCOORD_0: 2,
            },
            indices: 3,
            material: 0,
            mode: 4, // TRIANGLES
          },
        ],
      },
    ],
    accessors: [
      // 0: POSITION (VEC3, FLOAT)
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: totalVertices,
        type: 'VEC3',
        max: [maxX, maxY, maxZ],
        min: [minX, minY, minZ],
      },
      // 1: NORMAL (VEC3, FLOAT)
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: totalVertices,
        type: 'VEC3',
      },
      // 2: TEXCOORD_0 (VEC2, FLOAT)
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: totalVertices,
        type: 'VEC2',
      },
      // 3: INDICES (SCALAR, UNSIGNED_SHORT o UNSIGNED_INT)
      {
        bufferView: 3,
        byteOffset: 0,
        componentType: useUint32 ? 5125 : 5123,
        count: mesh.indices.length,
        type: 'SCALAR',
      },
    ],
    bufferViews: [
      // 0: POSITIONS
      {
        buffer: 0,
        byteOffset: offsetPos,
        byteLength: lenPos,
        target: 34962, // ARRAY_BUFFER
      },
      // 1: NORMALS
      {
        buffer: 0,
        byteOffset: offsetNorm,
        byteLength: lenNorm,
        target: 34962, // ARRAY_BUFFER
      },
      // 2: TEXCOORD_0
      {
        buffer: 0,
        byteOffset: offsetUv,
        byteLength: lenUv,
        target: 34962, // ARRAY_BUFFER
      },
      // 3: INDICES
      {
        buffer: 0,
        byteOffset: offsetIdx,
        byteLength: lenIdx,
        target: 34963, // ELEMENT_ARRAY_BUFFER
      },
    ],
    buffers: [
      {
        byteLength: totalBinBytes,
      },
    ],
  };

  const jsonStr = JSON.stringify(gltfDoc);
  let jsonBuffer = Buffer.from(jsonStr, 'utf-8');

  // El chunk JSON debe estar alineado a 4 bytes rellenado con espacios 0x20
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  if (jsonPadding > 0) {
    jsonBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);
  }

  // El chunk BIN debe estar alineado a 4 bytes rellenado con ceros 0x00
  let binBuffer = binChunkData;
  const binPadding = (4 - (binBuffer.length % 4)) % 4;
  if (binPadding > 0) {
    binBuffer = Buffer.concat([binBuffer, Buffer.alloc(binPadding, 0x00)]);
  }

  // Estructura oficial del encabezado y chunks glTF 2.0 (.glb)
  const headerLength = 12;
  const chunk0HeaderLength = 8;
  const chunk1HeaderLength = 8;
  const totalLength =
    headerLength +
    chunk0HeaderLength +
    jsonBuffer.length +
    chunk1HeaderLength +
    binBuffer.length;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // Magic: 'glTF'
  header.writeUInt32LE(2, 4); // Version: 2
  header.writeUInt32LE(totalLength, 8); // Total File Length

  const chunk0Header = Buffer.alloc(8);
  chunk0Header.writeUInt32LE(jsonBuffer.length, 0); // Chunk Length
  chunk0Header.writeUInt32LE(0x4e4f534a, 4); // Chunk Type: 'JSON'

  const chunk1Header = Buffer.alloc(8);
  chunk1Header.writeUInt32LE(binBuffer.length, 0); // Chunk Length
  chunk1Header.writeUInt32LE(0x004e4942, 4); // Chunk Type: 'BIN\0'

  const glbBuffer = Buffer.concat([
    header,
    chunk0Header,
    jsonBuffer,
    chunk1Header,
    binBuffer,
  ]);

  return {
    glbBuffer,
    vertexCount: totalVertices,
    triangleCount: totalTriangles,
  };
}

/**
 * Ensambla un buffer binario glTF 2.0 (.glb) estándar a partir de paneles 3D y material PBR (Compatibilidad)
 */
export function buildGltfBinary(
  panelsOrMesh: Panel3DMesh[] | GarmentMesh3D,
  fabric: FabricPBR = FABRIC_PBR_PRESETS.default,
  garmentName: string = 'Garment'
): { glbBuffer: Buffer; vertexCount: number; triangleCount: number } {
  if (!Array.isArray(panelsOrMesh)) {
    return buildGlbBuffer(panelsOrMesh, fabric, garmentName);
  }

  const combinedPositions: number[] = [];
  const combinedNormals: number[] = [];
  const combinedUvs: number[] = [];
  const combinedIndices: number[] = [];
  let totalVertices = 0;
  let totalTriangles = 0;

  for (const panel of panelsOrMesh) {
    const vOffset = totalVertices;
    const pCount = panel.positions.length / 3;
    combinedPositions.push(...panel.positions);
    combinedNormals.push(...panel.normals);
    combinedUvs.push(...panel.uvs);
    for (let t = 0; t < panel.indices.length; t++) {
      combinedIndices.push(panel.indices[t] + vOffset);
    }
    totalVertices += pCount;
    totalTriangles += panel.indices.length / 3;
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < totalVertices; i++) {
    const x = combinedPositions[i * 3];
    const y = combinedPositions[i * 3 + 1];
    const z = combinedPositions[i * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  if (totalVertices === 0) {
    minX = minY = minZ = maxX = maxY = maxZ = 0;
  }

  const mesh: GarmentMesh3D = {
    positions: combinedPositions,
    normals: combinedNormals,
    uvs: combinedUvs,
    indices: combinedIndices,
    vertexCount: totalVertices,
    triangleCount: totalTriangles,
    bounds: { minX, minY, minZ, maxX, maxY, maxZ },
  };

  return buildGlbBuffer(mesh, fabric, garmentName);
}

/**
 * Exporta un patrón paramétrico 2D directamente a un modelo binario glTF 2.0 (.glb)
 */
export function exportPatternToGlb(
  pattern: ModifiedPatternResult,
  options: Garment3DOptions = {}
): Garment3DResult {
  const fabricPbr = resolveFabricPbr(options);
  const conceptName = options.concept_name || pattern.concept_name || 'garment';
  const mesh3D = generateTrueToPatternMesh(pattern, options.dna);
  const { glbBuffer, vertexCount, triangleCount } = buildGlbBuffer(mesh3D, fabricPbr, conceptName);

  if (options.outputPath) {
    const dir = path.dirname(options.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(options.outputPath, glbBuffer);
  }

  return {
    glbBuffer,
    byteLength: glbBuffer.length,
    vertexCount,
    triangleCount,
    meshNames: Object.keys(pattern.parts),
    material: {
      name: fabricPbr.name,
      baseColor: fabricPbr.baseColor,
      roughness: fabricPbr.roughness,
      metallic: fabricPbr.metallic,
    },
    filePath: options.outputPath,
    isBlenderGenerated: false,
  };
}

/**
 * Ejecuta el script de exportación de Blender headless para generar un archivo .glb
 */
async function executeBlenderHeadless(
  blenderExe: string,
  dna: PatternDna,
  outputPath: string,
  fabric: FabricPBR
): Promise<Buffer> {
  const tmpDir = path.dirname(outputPath);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpDnaPath = path.join(tmpDir, `tmp_${Date.now()}_dna.json`);
  fs.writeFileSync(tmpDnaPath, JSON.stringify(dna, null, 2), 'utf-8');

  const scriptPath = path.resolve('scripts/export_glb_headless.py');

  try {
    const args = [
      '-b', // background mode
      '--python',
      scriptPath,
      '--',
      '--dna',
      tmpDnaPath,
      '--output',
      outputPath,
      '--fabric',
      fabric.name,
      '--color',
      fabric.baseColor.slice(0, 3).join(','),
      '--roughness',
      String(fabric.roughness),
      '--metallic',
      String(fabric.metallic),
    ];

    await execFileAsync(blenderExe, args, { timeout: 30000 });

    if (fs.existsSync(outputPath)) {
      return fs.readFileSync(outputPath);
    } else {
      throw new Error(`Blender finalizó pero no se encontró el archivo de salida en: ${outputPath}`);
    }
  } finally {
    if (fs.existsSync(tmpDnaPath)) {
      try {
        fs.unlinkSync(tmpDnaPath);
      } catch {
        // Ignorar limpieza de temporales
      }
    }
  }
}

/**
 * Motor Principal de Generación de Mallas y Modelos 3D (.glb)
 *
 * Transforma un ADN paramétrico o piezas 2D en un archivo binario glTF 2.0
 * listo para visores WebGL y empaquetado digital.
 */
export async function generate3DGarmentModel(
  options: Garment3DOptions
): Promise<Garment3DResult> {
  const conceptName =
    options.concept_name ||
    options.dna?.concept_name ||
    'parametric_garment';

  const fabricPbr = resolveFabricPbr(options);

  // Verificar si se solicitó explícitamente Blender CLI y si está disponible
  let isBlenderGenerated = false;
  let glbBuffer: Buffer | null = null;
  let vertexCount = 0;
  let triangleCount = 0;
  let meshNames: string[] = [];

  const blenderExecutable = options.blenderPath || findBlenderExecutable();

  if (options.useBlenderCli && blenderExecutable && options.dna) {
    try {
      const targetOut =
        options.outputPath ||
        path.join('output', 'test_3d', `${conceptName}.glb`);
      glbBuffer = await executeBlenderHeadless(
        blenderExecutable,
        options.dna,
        targetOut,
        fabricPbr
      );
      isBlenderGenerated = true;
      meshNames = ['Blender_Garment_Mesh'];
      vertexCount = 4000;
      triangleCount = 7800;
    } catch (blenderErr) {
      console.warn(
        `[blender_bridge] Falló la ejecución headless de Blender (${blenderErr instanceof Error ? blenderErr.message : String(blenderErr)}). Usando motor glTF 2.0 nativo de respaldo.`
      );
      glbBuffer = null;
    }
  }

  // Si no se usó Blender o como fallback, generar con el motor nativo True-to-Pattern
  if (!glbBuffer) {
    let resolvedPattern: ModifiedPatternResult;

    if (options.dna) {
      resolvedPattern = modifyPattern(options.dna, options.size || options.dna.sizing?.size || 'M');
    } else if (options.parts) {
      resolvedPattern = {
        concept_name: conceptName,
        size: options.size || 'M',
        base_block: 'custom',
        measurements: {} as any,
        parts: options.parts,
        bounds: { minX: 0, minY: 0, maxX: 500, maxY: 700, width: 500, height: 700 },
        seamAllowance_mm: 10,
        hemAllowance_mm: 20,
      };
    } else {
      const fallbackPart: PatternPart = {
        name: 'front_torso',
        label: 'Front Torso',
        cutCount: 1,
        onFold: true,
        points: {},
        pathD: '',
        outline: [
          { x: 0, y: 50 },
          { x: 100, y: 0 },
          { x: 200, y: 50 },
          { x: 250, y: 250 },
          { x: 250, y: 650 },
          { x: 0, y: 650 },
        ],
        bounds: { minX: 0, minY: 0, maxX: 250, maxY: 650, width: 250, height: 650 },
        width_mm: 250,
        height_mm: 650,
        area_mm2: 150000,
        grainline: { start: { x: 125, y: 50 }, end: { x: 125, y: 600 }, label: 'Grainline' },
        notches: [],
      };
      resolvedPattern = {
        concept_name: conceptName,
        size: 'M',
        base_block: 'custom',
        measurements: {} as any,
        parts: { front: fallbackPart },
        bounds: { minX: 0, minY: 0, maxX: 250, maxY: 650, width: 250, height: 650 },
        seamAllowance_mm: 10,
        hemAllowance_mm: 20,
      };
    }

    meshNames = Object.keys(resolvedPattern.parts);
    const mesh3D = generateTrueToPatternMesh(resolvedPattern, options.dna);
    const gltfResult = buildGlbBuffer(mesh3D, fabricPbr, conceptName);
    glbBuffer = gltfResult.glbBuffer;
    vertexCount = gltfResult.vertexCount;
    triangleCount = gltfResult.triangleCount;
  }

  // Guardar archivo si se especificó ruta de salida
  let filePath: string | undefined = options.outputPath;
  if (filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, glbBuffer);
  }

  return {
    glbBuffer,
    byteLength: glbBuffer.length,
    vertexCount,
    triangleCount,
    meshNames,
    material: {
      name: fabricPbr.name,
      baseColor: fabricPbr.baseColor,
      roughness: fabricPbr.roughness,
      metallic: fabricPbr.metallic,
    },
    filePath,
    isBlenderGenerated,
  };
}

