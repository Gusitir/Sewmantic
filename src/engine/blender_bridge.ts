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
import { PatternPart } from './geometry.js';
import { modifyPattern } from './modifier.js';

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
interface Panel3DMesh {
  name: string;
  positions: number[]; // x, y, z (meters)
  normals: number[]; // nx, ny, nz
  uvs: number[]; // u, v
  indices: number[]; // triangle indices
}

/**
 * Genera la malla 3D anatómica con curvatura realista para un panel de moldería 2D
 */
function createPanel3DMesh(
  partName: string,
  part: PatternPart,
  subdivisions: number = 16
): Panel3DMesh {
  const widthMeters = Math.max((part.width_mm || 400) * 0.001, 0.05);
  const heightMeters = Math.max((part.height_mm || 600) * 0.001, 0.05);

  const nx = Math.max(subdivisions, 8);
  const ny = Math.min(Math.max(Math.round(subdivisions * (heightMeters / widthMeters)), 8), 48);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const lowerName = partName.toLowerCase();

  // Clasificación del tipo anatómico de panel
  const isFrontTorso =
    lowerName.includes('front_bodice') ||
    lowerName.includes('front_dress') ||
    lowerName.includes('front_torso') ||
    (lowerName.includes('front') && !lowerName.includes('leg') && !lowerName.includes('skirt'));

  const isBackTorso =
    lowerName.includes('back_bodice') ||
    lowerName.includes('back_dress') ||
    lowerName.includes('back_torso') ||
    (lowerName.includes('back') && !lowerName.includes('leg') && !lowerName.includes('skirt'));

  const isSleeve = lowerName.includes('sleeve') && !lowerName.includes('furisode');
  const isFurisodeSleeve = lowerName.includes('furisode');

  const isFrontLeg = lowerName.includes('front_leg') || (lowerName.includes('leg') && lowerName.includes('front'));
  const isBackLeg = lowerName.includes('back_leg') || (lowerName.includes('leg') && lowerName.includes('back'));

  const isFrontSkirt = lowerName.includes('front_skirt') || (lowerName.includes('skirt') && lowerName.includes('front'));
  const isBackSkirt = lowerName.includes('back_skirt') || (lowerName.includes('skirt') && lowerName.includes('back'));

  const isHood = lowerName.includes('hood');
  const isWaistband = lowerName.includes('waistband') || lowerName.includes('obi_belt');
  const isCollar = lowerName.includes('collar');
  const isPocket = lowerName.includes('pocket');

  // Parámetros antropométricos estándar (en metros)
  const SHOULDER_Y = 1.45;
  const WAIST_Y = 1.05;
  const CROTCH_Y = 0.80;
  const TORSO_RADIUS_X = 0.20;
  const TORSO_RADIUS_Z = 0.13;
  const LEG_CENTER_X = 0.10;
  const LEG_RADIUS = 0.09;
  const SKIRT_WAIST_R = 0.16;
  const SKIRT_HEM_R = 0.28;

  // Generar vértices y UVs en la grilla regular (i, j)
  for (let j = 0; j <= ny; j++) {
    const v = j / ny;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;

      let x = 0;
      let y = 0;
      let z = 0;

      if (isFrontTorso) {
        // Envoltura frontal convexa sobre el torso (Z > 0)
        const theta0 = (72 * Math.PI) / 180;
        const theta = (u - 0.5) * 2 * theta0;
        const waistPinch = 1.0 - 0.08 * Math.sin(v * Math.PI);
        x = TORSO_RADIUS_X * Math.sin(theta) * waistPinch;
        z = TORSO_RADIUS_Z * Math.cos(theta) * waistPinch + 0.02;
        y = SHOULDER_Y - v * heightMeters;
      } else if (isBackTorso) {
        // Envoltura dorsal convexa sobre la espalda (Z < 0)
        const theta0 = (72 * Math.PI) / 180;
        const theta = (0.5 - u) * 2 * theta0;
        const waistPinch = 1.0 - 0.08 * Math.sin(v * Math.PI);
        x = TORSO_RADIUS_X * Math.sin(theta) * waistPinch;
        z = -(TORSO_RADIUS_Z * Math.cos(theta) * waistPinch + 0.02);
        y = SHOULDER_Y - v * heightMeters;
      } else if (isSleeve) {
        // Manga anatómica en postura A-Pose
        const armAngle = (30 * Math.PI) / 180; // 30 grados de inclinación
        const phi = u * 2 * Math.PI;
        const armRadius = 0.075 - 0.025 * v; // Disminuye hacia el puño
        const armDist = v * heightMeters;
        const shoulderX = 0.23;
        const shoulderY = 1.40;

        x = shoulderX + armDist * Math.sin(armAngle) + armRadius * Math.cos(phi) * Math.cos(armAngle);
        y = shoulderY - armDist * Math.cos(armAngle) - armRadius * Math.cos(phi) * Math.sin(armAngle);
        z = armRadius * Math.sin(phi);
      } else if (isFurisodeSleeve) {
        // Manga kimono cuadrada colgante con caída drapeada
        const shoulderX = 0.25;
        const shoulderY = 1.42;
        const drapeFold = Math.sin(u * Math.PI) * 0.035 * (1.0 - 0.3 * v);
        x = shoulderX + (u - 0.5) * widthMeters * 0.7;
        y = shoulderY - v * heightMeters;
        z = drapeFold;
      } else if (isFrontLeg) {
        // Pierna frontal de pantalón (cilindro envolvente)
        const theta = (u - 0.5) * Math.PI;
        const legR = LEG_RADIUS - 0.015 * v;
        x = LEG_CENTER_X + legR * Math.sin(theta);
        z = legR * Math.cos(theta) + 0.015;
        y = WAIST_Y - v * heightMeters;
      } else if (isBackLeg) {
        // Pierna posterior de pantalón (glúteos y pantorrilla)
        const theta = (0.5 - u) * Math.PI;
        const legR = LEG_RADIUS - 0.015 * v;
        x = LEG_CENTER_X + legR * Math.sin(theta);
        z = -(legR * Math.cos(theta) + 0.015);
        y = WAIST_Y - v * heightMeters;
      } else if (isFrontSkirt) {
        // Falda frontal cónica
        const theta = (u - 0.5) * ((150 * Math.PI) / 180);
        const r = SKIRT_WAIST_R + v * (SKIRT_HEM_R - SKIRT_WAIST_R);
        x = r * Math.sin(theta);
        z = r * Math.cos(theta) + 0.01;
        y = WAIST_Y - v * heightMeters;
      } else if (isBackSkirt) {
        // Falda posterior cónica
        const theta = (0.5 - u) * ((150 * Math.PI) / 180);
        const r = SKIRT_WAIST_R + v * (SKIRT_HEM_R - SKIRT_WAIST_R);
        x = r * Math.sin(theta);
        z = -(r * Math.cos(theta) + 0.01);
        y = WAIST_Y - v * heightMeters;
      } else if (isHood) {
        // Capucha anatómica sobre la cabeza
        const hoodY = 1.48 + (1.0 - v) * (heightMeters * 0.8);
        const phi = (u - 0.5) * Math.PI * 0.9;
        const hoodR = 0.12 + 0.04 * Math.sin(v * Math.PI);
        x = hoodR * Math.sin(phi) + 0.05;
        y = hoodY;
        z = hoodR * Math.cos(phi) - 0.02;
      } else if (isWaistband) {
        // Pretina / cinturón toroidal en cintura
        const phi = (u - 0.5) * 2 * Math.PI;
        x = SKIRT_WAIST_R * Math.sin(phi);
        z = (SKIRT_WAIST_R * 0.8) * Math.cos(phi);
        y = WAIST_Y - v * heightMeters;
      } else if (isCollar) {
        // Cuello / ribete
        const phi = (u - 0.5) * 2 * Math.PI;
        x = 0.10 * Math.sin(phi);
        z = 0.09 * Math.cos(phi);
        y = SHOULDER_Y + (1.0 - v) * heightMeters;
      } else if (isPocket) {
        // Bolsillo adosado al frente
        x = 0.08 + (u - 0.5) * widthMeters;
        y = 1.15 - v * heightMeters;
        z = TORSO_RADIUS_Z + 0.035;
      } else {
        // Panel genérico con curvatura suave
        const theta = (u - 0.5) * ((60 * Math.PI) / 180);
        x = (u - 0.5) * widthMeters;
        y = 1.20 - v * heightMeters;
        z = 0.05 * Math.cos(theta);
      }

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  // Generar caras triangulares para cada cuadrilátero de la grilla
  const rowStride = nx + 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v00 = j * rowStride + i;
      const v10 = j * rowStride + (i + 1);
      const v01 = (j + 1) * rowStride + i;
      const v11 = (j + 1) * rowStride + (i + 1);

      // Triángulo 1: [v00, v10, v01]
      indices.push(v00, v10, v01);
      // Triángulo 2: [v10, v11, v01]
      indices.push(v10, v11, v01);
    }
  }

  // Cálculo de normales por vértice (smooth shading)
  const vertexCount = (nx + 1) * (ny + 1);
  const normAcc = new Float32Array(vertexCount * 3);

  for (let t = 0; t < indices.length; t += 3) {
    const idx0 = indices[t];
    const idx1 = indices[t + 1];
    const idx2 = indices[t + 2];

    const p0x = positions[idx0 * 3];
    const p0y = positions[idx0 * 3 + 1];
    const p0z = positions[idx0 * 3 + 2];

    const p1x = positions[idx1 * 3];
    const p1y = positions[idx1 * 3 + 1];
    const p1z = positions[idx1 * 3 + 2];

    const p2x = positions[idx2 * 3];
    const p2y = positions[idx2 * 3 + 1];
    const p2z = positions[idx2 * 3 + 2];

    // E1 = P1 - P0, E2 = P2 - P0
    const e1x = p1x - p0x;
    const e1y = p1y - p0y;
    const e1z = p1z - p0z;

    const e2x = p2x - p0x;
    const e2y = p2y - p0y;
    const e2z = p2z - p0z;

    // Cross product E1 x E2
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

  const normals: number[] = new Array(vertexCount * 3);
  for (let k = 0; k < vertexCount; k++) {
    const nxVal = normAcc[k * 3];
    const nyVal = normAcc[k * 3 + 1];
    const nzVal = normAcc[k * 3 + 2];
    const len = Math.sqrt(nxVal * nxVal + nyVal * nyVal + nzVal * nzVal);

    if (len > 1e-6) {
      normals[k * 3] = nxVal / len;
      normals[k * 3 + 1] = nyVal / len;
      normals[k * 3 + 2] = nzVal / len;
    } else {
      normals[k * 3] = 0;
      normals[k * 3 + 1] = 0;
      normals[k * 3 + 2] = 1;
    }
  }

  return {
    name: partName,
    positions,
    normals,
    uvs,
    indices,
  };
}

/**
 * Ensambla un buffer binario glTF 2.0 (.glb) estándar a partir de paneles 3D y material PBR
 */
export function buildGltfBinary(
  panels: Panel3DMesh[],
  fabric: FabricPBR,
  garmentName: string = 'Garment'
): { glbBuffer: Buffer; vertexCount: number; triangleCount: number } {
  // Combinar todos los paneles en una estructura unificada
  let totalVertices = 0;
  let totalTriangles = 0;

  const combinedPositions: number[] = [];
  const combinedNormals: number[] = [];
  const combinedUvs: number[] = [];
  const combinedIndices: number[] = [];

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const panel of panels) {
    const vOffset = totalVertices;
    const pCount = panel.positions.length / 3;

    for (let i = 0; i < pCount; i++) {
      const x = panel.positions[i * 3];
      const y = panel.positions[i * 3 + 1];
      const z = panel.positions[i * 3 + 2];

      combinedPositions.push(x, y, z);
      combinedNormals.push(
        panel.normals[i * 3],
        panel.normals[i * 3 + 1],
        panel.normals[i * 3 + 2]
      );
      combinedUvs.push(panel.uvs[i * 2], panel.uvs[i * 2 + 1]);

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    for (let t = 0; t < panel.indices.length; t++) {
      combinedIndices.push(panel.indices[t] + vOffset);
    }

    totalVertices += pCount;
    totalTriangles += panel.indices.length / 3;
  }

  // Manejo de caso vacío
  if (totalVertices === 0) {
    minX = minY = minZ = 0;
    maxX = maxY = maxZ = 0;
  }

  // Creación de buffers tipados binarios
  const posArray = new Float32Array(combinedPositions);
  const normArray = new Float32Array(combinedNormals);
  const uvArray = new Float32Array(combinedUvs);

  // Usar Uint32Array si excede 65535 vértices, de lo contrario Uint16Array
  const useUint32 = totalVertices > 65535;
  const idxArray = useUint32
    ? new Uint32Array(combinedIndices)
    : new Uint16Array(combinedIndices);

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
      generator: 'pattern-ai-core v0.1.0 3D Engine',
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
        count: combinedIndices.length,
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
      // Estimación razonable para resultado Blender
      vertexCount = 4000;
      triangleCount = 7800;
    } catch (blenderErr) {
      console.warn(
        `[blender_bridge] Falló la ejecución headless de Blender (${blenderErr instanceof Error ? blenderErr.message : String(blenderErr)}). Usando motor glTF 2.0 nativo de respaldo.`
      );
      glbBuffer = null;
    }
  }

  // Si no se usó Blender o como fallback, generar con el motor nativo de alta fidelidad
  if (!glbBuffer) {
    let resolvedParts = options.parts;

    if (!resolvedParts && options.dna) {
      const modResult = modifyPattern(options.dna, options.size || options.dna.sizing?.size || 'M');
      resolvedParts = modResult.parts;
    }

    if (!resolvedParts || Object.keys(resolvedParts).length === 0) {
      // Si no hay partes provistas, crear panel base rectangular representativo
      const fallbackPart: PatternPart = {
        name: 'front_torso',
        label: 'Front Torso',
        cutCount: 1,
        onFold: true,
        points: {},
        pathD: '',
        outline: [],
        bounds: { minX: 0, minY: 0, maxX: 500, maxY: 700, width: 500, height: 700 },
        width_mm: 500,
        height_mm: 700,
        area_mm2: 350000,
        grainline: { start: { x: 250, y: 50 }, end: { x: 250, y: 650 }, label: 'Grainline' },
        notches: [],
      };
      resolvedParts = { front: fallbackPart };
    }

    meshNames = Object.keys(resolvedParts);
    const panels: Panel3DMesh[] = [];
    const subdivisions = options.subdivisions || 16;

    for (const [partName, part] of Object.entries(resolvedParts)) {
      const panelMesh = createPanel3DMesh(partName, part, subdivisions);
      panels.push(panelMesh);
    }

    const gltfResult = buildGltfBinary(panels, fabricPbr, conceptName);
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
