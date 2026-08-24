// T-46 planar geometry math: signed areas, segment intersection and loop
// self-intersection detection. Pure and deterministic; used by the adapter and
// by offset evaluation. No Flatten.js involvement.

import type { GeometryPoint } from './types.js';

/** Signed shoelace area of a closed loop of points (positive = CCW). */
export function signedAreaOfPoints(pts: GeometryPoint[]): number {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    sum += p.xMm * q.yMm - q.xMm * p.yMm;
  }
  return sum / 2;
}

function cross(ox: number, oy: number, ax: number, ay: number, bx: number, by: number): number {
  return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

const EPS = 1e-9;

/**
 * Intersection of segments [a1,a2] and [b1,b2]. Returns the intersection point
 * for a proper crossing or an endpoint touch; returns `null` when disjoint or
 * when the two segments are collinear and overlap (degenerate, treated as no
 * single crossing point).
 */
export function segmentIntersection(
  a1: GeometryPoint,
  a2: GeometryPoint,
  b1: GeometryPoint,
  b2: GeometryPoint,
): GeometryPoint | null {
  const d1 = cross(b1.xMm, b1.yMm, b2.xMm, b2.yMm, a1.xMm, a1.yMm);
  const d2 = cross(b1.xMm, b1.yMm, b2.xMm, b2.yMm, a2.xMm, a2.yMm);
  const d3 = cross(a1.xMm, a1.yMm, a2.xMm, a2.yMm, b1.xMm, b1.yMm);
  const d4 = cross(a1.xMm, a1.yMm, a2.xMm, a2.yMm, b2.xMm, b2.yMm);

  const onSegment = (px: number, py: number, q1: GeometryPoint, q2: GeometryPoint): boolean =>
    px >= Math.min(q1.xMm, q2.xMm) - EPS &&
    px <= Math.max(q1.xMm, q2.xMm) + EPS &&
    py >= Math.min(q1.yMm, q2.yMm) - EPS &&
    py <= Math.max(q1.yMm, q2.yMm) + EPS;

  // Proper crossing.
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) &&
      ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) {
    const denominator = (a2.xMm - a1.xMm) * (b2.yMm - b1.yMm) - (a2.yMm - a1.yMm) * (b2.xMm - b1.xMm);
    const t = ((b1.xMm - a1.xMm) * (b2.yMm - b1.yMm) - (b1.yMm - a1.yMm) * (b2.xMm - b1.xMm)) / denominator;
    return { xMm: a1.xMm + t * (a2.xMm - a1.xMm), yMm: a1.yMm + t * (a2.yMm - a1.yMm) };
  }

  // Endpoint touch: a1 on b segment, or b1 on a segment (skip collinear-overlap).
  if (Math.abs(d1) <= EPS && onSegment(a1.xMm, a1.yMm, b1, b2)) return { ...a1 };
  if (Math.abs(d2) <= EPS && onSegment(a2.xMm, a2.yMm, b1, b2)) return { ...a2 };
  // b endpoints on a segment.
  const db = (px: number, py: number): number => cross(a1.xMm, a1.yMm, a2.xMm, a2.yMm, px, py);
  if (Math.abs(db(b1.xMm, b1.yMm)) <= EPS && onSegment(b1.xMm, b1.yMm, a1, a2)) return { ...b1 };
  if (Math.abs(db(b2.xMm, b2.yMm)) <= EPS && onSegment(b2.xMm, b2.yMm, a1, a2)) return { ...b2 };

  return null;
}

/**
 * True when the closed point loop has any self-intersection strictly between
 * non-adjacent edges. Adjacent edges are allowed to meet at their shared
 * corner; degenerate overlapping collinear edges count as self-intersection.
 */
export function pointLoopSelfIntersects(pts: GeometryPoint[]): boolean {
  const n = pts.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i += 1) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 1; j < n; j += 1) {
      // Skip adjacent segment pairs (they share the corner vertex).
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const b1 = pts[j];
      const b2 = pts[(j + 1) % n];
      const ip = segmentIntersection(a1, a2, b1, b2);
      if (ip !== null) return true;
    }
  }
  return false;
}

/** Merge points that lie within `snapMm`; keeps insertion order. */
export function dedupePoints(pts: GeometryPoint[], snapMm: number): GeometryPoint[] {
  const out: GeometryPoint[] = [];
  for (const p of pts) {
    const dup = out.some(
      (q) => Math.hypot(q.xMm - p.xMm, q.yMm - p.yMm) <= snapMm,
    );
    if (!dup) out.push(p);
  }
  return out;
}

/**
 * Intersections between two ordered point polylines. Returns distinct points
 * snapped to `snapMm`. Used by the adapter for curve/curve and cut/loop
 * queries after tessellation.
 */
export function polylineIntersections(
  a: GeometryPoint[],
  b: GeometryPoint[],
  snapMm: number,
): GeometryPoint[] {
  const hits: GeometryPoint[] = [];
  for (let i = 0; i < a.length - 1; i += 1) {
    for (let j = 0; j < b.length - 1; j += 1) {
      const ip = segmentIntersection(a[i], a[i + 1], b[j], b[j + 1]);
      if (ip !== null) hits.push(ip);
    }
  }
  return dedupePoints(hits, snapMm);
}

/** Distance along an ordered polyline from its start to a given point. */
export function distanceAlong(poly: GeometryPoint[], p: GeometryPoint): number {
  let best = Number.POSITIVE_INFINITY;
  let acc = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const segLen = i > 0 ? Math.hypot(poly[i].xMm - poly[i - 1].xMm, poly[i].yMm - poly[i - 1].yMm) : 0;
    if (i > 0) {
      const d = Math.hypot(p.xMm - poly[i].xMm, p.yMm - poly[i].yMm) + acc;
      if (d < best) best = d;
    }
    acc += segLen;
  }
  return best;
}
