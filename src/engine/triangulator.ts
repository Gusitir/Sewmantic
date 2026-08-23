/**
 * src/engine/triangulator.ts
 * Motor de Triangulación 2D de Polígonos de Moldería Textil (Ear Clipping Triangulator)
 * pattern-ai-core
 *
 * Convierte contornos vectoriales 2D de piezas de moldería (polígonos cóncavos,
 * escotes en V profundos, huecos de sisa curvos, bajos con picos de chaleco,
 * entrepiernas de pantalón, faldas evasé y mangas) en mallas triangulares 2D
 * (Point2D[] -> number[] de índices CCW / front-facing) con preservación exacta del área.
 */

import { Point2D, createPoint, distance, computePolygonArea } from './geometry.js';

/**
 * Representación de un triángulo indexado
 */
export interface IndexedTriangle {
  a: number;
  b: number;
  c: number;
}

/**
 * Opciones de configuración para el triangulador
 */
export interface TriangulatorOptions {
  /** Tolerancia de distancia mínima en mm para considerar vértices duplicados (default: 0.1 mm) */
  tolerance_mm?: number;
  /** Forzar orientación antihoraria CCW en los triángulos resultantes (default: true) */
  ensureCcw?: boolean;
  /** Eliminar vértices colineales redundantes en aristas rectas (default: false) */
  removeCollinear?: boolean;
}

/**
 * Malla 2D triangulada completa con metadatos geométricos
 */
export interface TriangulatedMesh2D {
  points: Point2D[];
  indices: number[];
  triangles: [number, number, number][];
  triangleCount: number;
  area_mm2: number;
  isCcw: boolean;
}

/**
 * Calcula el área con signo (Gauss Shoelace) de un polígono 2D.
 * Positivo = Antihorario (CCW), Negativo = Horario (CW).
 */
export function computeSignedPolygonArea(points: Point2D[]): number {
  if (!points || points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return area / 2;
}

/**
 * Determina la orientación del devanado de un polígono 2D.
 */
export function getPolygonOrientation(points: Point2D[]): 'CCW' | 'CW' | 'COLINEAR' {
  const signed = computeSignedPolygonArea(points);
  if (signed > 1e-6) return 'CCW';
  if (signed < -1e-6) return 'CW';
  return 'COLINEAR';
}

/**
 * Calcula el producto cruzado 2D (orientación de giro) de tres puntos (A -> B -> C).
 * > 0: Giro a la izquierda (Convexo en polígono CCW)
 * < 0: Giro a la derecha (Cóncavo/Reflex en polígono CCW)
 * = 0: Colineales
 */
export function crossProduct2D(a: Point2D, b: Point2D, c: Point2D): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/**
 * Verifica si un punto P está estrictamente dentro de un triángulo (A, B, C).
 * El triángulo debe estar orientado en CCW.
 */
export function isPointInTriangle(
  p: Point2D,
  a: Point2D,
  b: Point2D,
  c: Point2D,
  eps: number = 1e-7
): boolean {
  // Si P coincide con alguno de los vértices del triángulo, no es un intruso interno
  if (
    (Math.abs(p.x - a.x) < eps && Math.abs(p.y - a.y) < eps) ||
    (Math.abs(p.x - b.x) < eps && Math.abs(p.y - b.y) < eps) ||
    (Math.abs(p.x - c.x) < eps && Math.abs(p.y - c.y) < eps)
  ) {
    return false;
  }

  const c1 = crossProduct2D(a, b, p);
  const c2 = crossProduct2D(b, c, p);
  const c3 = crossProduct2D(c, a, p);

  // Los puntos sobre el perímetro no bloquean una oreja válida.
  return c1 > eps && c2 > eps && c3 > eps;
}

/**
 * Limpia vértices redundantes consecutivos y duplicados de cierre de anillo
 */
export function cleanPolygonVertices(
  points: Point2D[],
  tolerance_mm: number = 0.1,
  removeCollinear: boolean = false
): { points: Point2D[]; indicesMap: number[] } {
  if (!points || points.length === 0) {
    return { points: [], indicesMap: [] };
  }

  const cleanedPts: Point2D[] = [];
  const indicesMap: number[] = [];

  // 1. Filtrar vértices consecutivos con distancia < tolerance_mm
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (cleanedPts.length === 0) {
      cleanedPts.push(pt);
      indicesMap.push(i);
    } else {
      const prev = cleanedPts[cleanedPts.length - 1];
      if (distance(prev, pt) >= tolerance_mm) {
        cleanedPts.push(pt);
        indicesMap.push(i);
      }
    }
  }

  // 2. Si el último punto es duplicado del primer punto (cierre de anillo), eliminarlo
  if (cleanedPts.length > 2) {
    const first = cleanedPts[0];
    const last = cleanedPts[cleanedPts.length - 1];
    if (distance(first, last) < tolerance_mm) {
      cleanedPts.pop();
      indicesMap.pop();
    }
  }

  // 3. Filtrar puntos colineales si fue solicitado
  if (removeCollinear && cleanedPts.length > 3) {
    let changed = true;
    while (changed && cleanedPts.length > 3) {
      changed = false;
      const n = cleanedPts.length;
      for (let i = 0; i < n; i++) {
        const prev = (i - 1 + n) % n;
        const next = (i + 1) % n;
        const cp = crossProduct2D(cleanedPts[prev], cleanedPts[i], cleanedPts[next]);
        const d1 = distance(cleanedPts[prev], cleanedPts[i]);
        const d2 = distance(cleanedPts[i], cleanedPts[next]);
        const dTotal = distance(cleanedPts[prev], cleanedPts[next]);

        // Si es colineal y el punto intermedio está entre prev y next
        if (Math.abs(cp) < 1e-5 && Math.abs(d1 + d2 - dTotal) < 1e-4) {
          cleanedPts.splice(i, 1);
          indicesMap.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
  }

  return { points: cleanedPts, indicesMap };
}

/**
 * Determina si el vértice i de un polígono CCW es una "oreja" (Ear) cortable.
 */
function isEar(poly: Point2D[], i: number, eps: number = 1e-7): boolean {
  const n = poly.length;
  if (n < 3) return false;

  const prevIdx = (i - 1 + n) % n;
  const currIdx = i;
  const nextIdx = (i + 1) % n;

  const a = poly[prevIdx];
  const b = poly[currIdx];
  const c = poly[nextIdx];

  // 1. Debe ser estrictamente convexo (> 0 en CCW)
  const cp = crossProduct2D(a, b, c);
  if (cp <= eps) {
    return false;
  }

  // 2. Ningún otro vértice del polígono restante debe estar contenido dentro de este triángulo
  for (let k = 0; k < n; k++) {
    if (k === prevIdx || k === currIdx || k === nextIdx) continue;
    const p = poly[k];
    if (isPointInTriangle(p, a, b, c, eps)) {
      return false;
    }
  }

  return true;
}

function isCollinearBetween(a: Point2D, b: Point2D, c: Point2D, eps: number = 1e-7): boolean {
  if (Math.abs(crossProduct2D(a, b, c)) > eps) return false;
  return (b.x - a.x) * (b.x - c.x) + (b.y - a.y) * (b.y - c.y) <= eps;
}

/**
 * Determina si un polígono 2D es estrictamente convexo
 */
export function isPolygonConvex(points: Point2D[]): boolean {
  const { points: cleaned } = cleanPolygonVertices(points, 0.1);
  const n = cleaned.length;
  if (n < 3) return false;

  let orientation = 0;
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const next = (i + 1) % n;
    const cp = crossProduct2D(cleaned[prev], cleaned[i], cleaned[next]);
    if (Math.abs(cp) > 1e-7) {
      const sign = cp > 0 ? 1 : -1;
      if (orientation === 0) {
        orientation = sign;
      } else if (orientation !== sign) {
        return false;
      }
    }
  }

  return orientation !== 0;
}

/**
 * Algoritmo determinista de triangulación de polígonos 2D por corte de orejas (Ear Clipping)
 * Especializado para siluetas de moldería textil (cóncavas, escotes V, bajos en pico, sisas).
 *
 * @param outline Array de puntos 2D que define el contorno del patrón
 * @param options Opciones de tolerancia y orientación
 * @returns Array plano de índices de triángulos (ej: [0, 1, 2, 0, 2, 3, ...])
 */
export function triangulatePolygon(
  outline: Point2D[],
  options: TriangulatorOptions = {}
): number[] {
  const tolerance = options.tolerance_mm ?? 0.1;
  const removeCollinear = options.removeCollinear ?? false;

  const cleaned = cleanPolygonVertices(outline, tolerance, removeCollinear);
  const n = cleaned.points.length;
  if (n < 3) {
    return [];
  }

  // Copia de trabajo de puntos e índices originales mapeados
  let pts = [...cleaned.points];
  let origIndices = [...cleaned.indicesMap];

  // Si el polígono es horario (CW), invertir el orden para normalizar a CCW
  const signedArea = computeSignedPolygonArea(pts);
  if (signedArea < 0) {
    pts.reverse();
    origIndices.reverse();
  }

  const indices: number[] = [];

  // Caso base: polígono de 3 vértices
  if (pts.length === 3) {
    indices.push(origIndices[0], origIndices[1], origIndices[2]);
    return indices;
  }

  let count = pts.length;
  const maxIterations = count * count * 4;
  let iter = 0;
  let currIdx = 0;

  while (count > 3 && iter < maxIterations) {
    iter++;
    let earFound = false;

    // Procesar primero las orejas junto a cadenas colineales evita que queden
    // como el único contorno restante, sin descartar sus vértices.
    for (let step = 0; step < count; step++) {
      const i = (currIdx + step) % count;
      const prev = (i - 1 + count) % count;
      const next = (i + 1) % count;
      const nextNext = (i + 2) % count;
      if (
        (isCollinearBetween(pts[prev], pts[i], pts[next]) ||
          isCollinearBetween(pts[i], pts[next], pts[nextNext])) &&
        (isEar(pts, i) || isEar(pts, i, 0))
      ) {
        // Agregar triángulo con orientación CCW garantizada
        indices.push(origIndices[prev], origIndices[i], origIndices[next]);

        // Cortar la oreja
        pts.splice(i, 1);
        origIndices.splice(i, 1);
        count--;

        currIdx = prev % count;
        earFound = true;
        break;
      }
    }

    // Buscar cualquier oreja válida. Si la tolerancia normal no encuentra una,
    // repetir con precisión estricta conserva el ear clipping sin abanicos.
    for (let step = 0; !earFound && step < count; step++) {
      const i = (currIdx + step) % count;
      if (isEar(pts, i) || isEar(pts, i, 0)) {
        const prev = (i - 1 + count) % count;
        const next = (i + 1) % count;

        // Agregar triángulo con orientación CCW garantizada
        indices.push(origIndices[prev], origIndices[i], origIndices[next]);

        // Cortar la oreja
        pts.splice(i, 1);
        origIndices.splice(i, 1);
        count--;

        currIdx = prev % count;
        earFound = true;
        break;
      }
    }

    if (!earFound) {
      throw new Error('Unable to triangulate polygon with ear clipping');
    }
  }

  // Agregar el último triángulo de 3 vértices restante
  if (count === 3) {
    indices.push(origIndices[0], origIndices[1], origIndices[2]);
  }

  return indices;
}

/**
 * Calcula el área total de la malla triangulada sumando el área individual de cada triángulo
 * Fórmula de producto cruzado 2D:
 * Área = ∑ (1/2) * |(x1 - x0)*(y2 - y0) - (x2 - x0)*(y1 - y0)|
 */
export function computeTriangulatedArea(points: Point2D[], indices: number[]): number {
  if (!points || points.length < 3 || !indices || indices.length < 3) {
    return 0;
  }

  let totalArea = 0;
  const triCount = Math.floor(indices.length / 3);

  for (let k = 0; k < triCount; k++) {
    const i0 = indices[k * 3];
    const i1 = indices[k * 3 + 1];
    const i2 = indices[k * 3 + 2];

    const p0 = points[i0];
    const p1 = points[i1];
    const p2 = points[i2];

    if (p0 && p1 && p2) {
      const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
      totalArea += 0.5 * Math.abs(cross);
    }
  }

  return Math.round(totalArea * 100) / 100;
}

/**
 * Valida que todos los triángulos indexados tengan devanado antihorario (CCW)
 */
export function validateTriangleOrientations(points: Point2D[], indices: number[]): boolean {
  if (!points || !indices || indices.length < 3) return true;
  const triCount = Math.floor(indices.length / 3);
  for (let k = 0; k < triCount; k++) {
    const p0 = points[indices[k * 3]];
    const p1 = points[indices[k * 3 + 1]];
    const p2 = points[indices[k * 3 + 2]];
    if (!p0 || !p1 || !p2) return false;
    const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if (cross < -1e-7) {
      return false;
    }
  }
  return true;
}

/**
 * Genera una estructura de malla 2D triangulada completa para un contorno vectorial
 */
export function triangulatePolygonMesh(
  outline: Point2D[],
  options: TriangulatorOptions = {}
): TriangulatedMesh2D {
  const indices = triangulatePolygon(outline, options);
  const triangles: [number, number, number][] = [];
  for (let i = 0; i < indices.length; i += 3) {
    triangles.push([indices[i], indices[i + 1], indices[i + 2]]);
  }

  const area = computeTriangulatedArea(outline, indices);
  const isCcw = validateTriangleOrientations(outline, indices);

  return {
    points: outline,
    indices,
    triangles,
    triangleCount: triangles.length,
    area_mm2: area,
    isCcw,
  };
}
