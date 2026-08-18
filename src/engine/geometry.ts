/**
 * src/engine/geometry.ts
 * Utilidades y estructuras geométricas 2D para pattern-ai-core
 */

export interface Point2D {
  x: number;
  y: number;
  name?: string;
}

export interface BezierCurve {
  start: Point2D;
  cp1: Point2D;
  cp2: Point2D;
  end: Point2D;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface TechnicalNotch {
  point: Point2D;
  angle_deg?: number;
  type: 'single' | 'double' | 'triple';
  label?: string;
}

export interface TechnicalGrainline {
  start: Point2D;
  end: Point2D;
  label: string;
}

export interface PatternPart {
  name: string;
  label: string;
  cutCount: number;
  onFold: boolean;
  points: Record<string, Point2D>;
  pathD: string;
  outline: Point2D[];
  bounds: BoundingBox;
  width_mm: number;
  height_mm: number;
  area_mm2: number;
  grainline: TechnicalGrainline;
  notches: TechnicalNotch[];
  seamAllowance_mm?: number;
  hemAllowance_mm?: number;
}

export function createPoint(x: number, y: number, name?: string): Point2D {
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    ...(name ? { name } : {}),
  };
}

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(p1: Point2D, p2: Point2D): Point2D {
  return createPoint((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
}

export function calculateAngle(p1: Point2D, p2: Point2D): number {
  const rad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  return Math.round(((rad * 180) / Math.PI) * 100) / 100;
}

export function bezierPoint(
  start: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  end: Point2D,
  t: number
): Point2D {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * start.x + 3 * uu * t * cp1.x + 3 * u * tt * cp2.x + ttt * end.x;
  const y = uuu * start.y + 3 * uu * t * cp1.y + 3 * u * tt * cp2.y + ttt * end.y;

  return createPoint(x, y);
}

export function sampleBezier(
  start: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  end: Point2D,
  steps = 12
): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(bezierPoint(start, cp1, cp2, end, t));
  }
  return pts;
}

/**
 * Calcula la longitud de arco real de una curva Bezier cúbica por aproximación numérica
 */
export function bezierLength(
  start: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  end: Point2D,
  steps = 60
): number {
  let len = 0;
  let prev = start;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const curr = bezierPoint(start, cp1, cp2, end, t);
    len += distance(prev, curr);
    prev = curr;
  }
  return Math.round(len * 100) / 100;
}

/**
 * Calcula la longitud total de una polilínea o secuencia de puntos muestreados
 */
export function polylineLength(points: Point2D[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += distance(points[i], points[i + 1]);
  }
  return Math.round(total * 100) / 100;
}

/**
 * Encuentra un punto a una distancia de longitud de arco específica a lo largo de una polilínea
 */
export function pointAlongPolyline(points: Point2D[], targetLength: number): Point2D {
  if (points.length === 0) return createPoint(0, 0);
  if (points.length === 1 || targetLength <= 0) return points[0];

  let accumulated = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segLen = distance(p1, p2);

    if (accumulated + segLen >= targetLength) {
      const remaining = targetLength - accumulated;
      const ratio = segLen > 0 ? remaining / segLen : 0;
      return createPoint(
        p1.x + (p2.x - p1.x) * ratio,
        p1.y + (p2.y - p1.y) * ratio
      );
    }
    accumulated += segLen;
  }

  return points[points.length - 1];
}

/**
 * Encuentra un punto a una distancia de longitud de arco específica a lo largo de una curva Bezier
 */
export function pointAlongBezier(
  start: Point2D,
  cp1: Point2D,
  cp2: Point2D,
  end: Point2D,
  targetLength: number,
  steps = 60
): Point2D {
  const samples = sampleBezier(start, cp1, cp2, end, steps);
  return pointAlongPolyline(samples, targetLength);
}

/**
 * Calcula el área de un polígono cerrado usando el algoritmo Shoelace (fórmula de Gauss)
 */
export function computePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.round(Math.abs(area) / 2 * 100) / 100;
}

/**
 * Calcula la caja delimitadora (BoundingBox) de un conjunto de puntos
 */
export function computeBounds(points: Point2D[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = Math.round((maxX - minX) * 100) / 100;
  const height = Math.round((maxY - minY) * 100) / 100;

  return {
    minX: Math.round(minX * 100) / 100,
    minY: Math.round(minY * 100) / 100,
    maxX: Math.round(maxX * 100) / 100,
    maxY: Math.round(maxY * 100) / 100,
    width,
    height,
  };
}

/**
 * Combina múltiples BoundingBox en una sola
 */
export function combineBounds(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of boxes) {
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  return {
    minX: Math.round(minX * 100) / 100,
    minY: Math.round(minY * 100) / 100,
    maxX: Math.round(maxX * 100) / 100,
    maxY: Math.round(maxY * 100) / 100,
    width: Math.round((maxX - minX) * 100) / 100,
    height: Math.round((maxY - minY) * 100) / 100,
  };
}
