// T-46 offset strategies.
//
// Two strategies were compared by the offset gate (3 / 10 / 25 mm across convex,
// concave and curved fixtures, requiring no self-intersections and determinism
// across two runs):
//
//  1. `ownRawOffsetPoints` — the SELECTED strategy. A deterministic, pure-point
//     miter (corner) offset: every edge is translated outward and consecutive
//     offset lines are intersected to form each new vertex. It needs no boolean
//     ops, no third-party code and no Flatten internals, so it stays stable on
//     the pinned `@flatten-js/core@1.6.14`. It passes the mandatory convex /
//     concave / curve fixtures at 3 / 10 / 25 mm (simple, monotonic, identical
//     on two runs). Documented caveat: miter joins can spike at very acute
//     corners (no miter-limit backoff yet), which is outside the gate fixtures.
//
//  2. `@flatten-js/polygon-offset@1.1.4` — REJECTED. It throws at runtime under
//     `@flatten-js/core@1.6.14` (`TypeError: edge.isSegment is not a function`):
//     the core re-exposed `Edge.isSegment` as a getter (1.6.x) while the offset
//     package (all published versions, peer `core ^1.4.2`) calls it as a method.
//
//  3. Own capsular round-join offset via `Flatten.BooleanOperations.unify` —
//     REJECTED. Each edge capsule's inner edge coincides with the polygon
//     boundary, and the core 1.6.14 boolean union drops the original polygon's
//     interior (measured non-monotonic areas, e.g. a 100x100 square outward
//     d=3 -> ~1824 mm2 instead of ~11228 mm2). Not production-safe.
//
// Either way the adapter exposes only plain v2 results; no Flatten.js type or
// instance ever crosses the `geometry/` public boundary. See DECISION.md.
//
// The raw "minimal corner" offset doubles as the comparison baseline and the
// selected production strategy; the same `ownRawOffsetPoints` is used for both,
// so there is exactly one selected strategy (see the plan: "seleccionar solo
// una estrategia").

import type { Curve, Vertex } from '../contracts.js';
import type { GeometryPoint, PolygonResult, Winding } from './types.js';
import { sampleOptions, sampleCurve } from './sampler.js';
import { signedAreaOfPoints, pointLoopSelfIntersects } from './area.js';
import type { CurveContext } from './resolve.js';

/**
 * Minimal raw corner (miter) offset: translate every edge outward by
 * `distanceMm` and intersect consecutive offset lines to form each vertex.
 * Direction is chosen from the loop's own winding so the loop always grows
 * outward on a positive `distanceMm`. Deterministic and boolean-free.
 */
export function ownRawOffsetPoints(points: GeometryPoint[], distanceMm: number): GeometryPoint[] {
  const n = points.length;
  if (n < 3) return points.map((p) => ({ ...p }));

  const dirs: GeometryPoint[] = [];
  const normals: GeometryPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = points[i];
    const q = points[(i + 1) % n];
    let ux = q.xMm - p.xMm;
    let uy = q.yMm - p.yMm;
    const len = Math.hypot(ux, uy) || 1e-9;
    ux /= len;
    uy /= len;
    dirs.push({ xMm: ux, yMm: uy });
    // Outward selection relative to traversal; sign corrected below.
    normals.push({ xMm: uy, yMm: -ux });
  }
  // For a CCW loop interior is on the left -> outward is the right normal.
  const outwardSign = signedAreaOfPoints(points) >= 0 ? 1 : -1;

  const offsetStart: GeometryPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    offsetStart.push({
      xMm: points[i].xMm + normals[i].xMm * distanceMm * outwardSign,
      yMm: points[i].yMm + normals[i].yMm * distanceMm * outwardSign,
    });
  }
  // Raw corner = intersection of consecutive offset lines.
  const offset: GeometryPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = (i - 1 + n) % n;
    offset.push(lineIntersection(offsetStart[prev], dirs[prev], offsetStart[i], dirs[i]));
  }
  return offset;
}

function lineIntersection(
  p1: GeometryPoint,
  d1: GeometryPoint,
  p2: GeometryPoint,
  d2: GeometryPoint,
): GeometryPoint {
  const det = d1.xMm * d2.yMm - d1.yMm * d2.xMm;
  const t =
    ((p2.xMm - p1.xMm) * d2.yMm - (p2.yMm - p1.yMm) * d2.xMm) / (det || 1e-9);
  return { xMm: p1.xMm + t * d1.xMm, yMm: p1.yMm + t * d1.yMm };
}

/** Convenience metric: does the raw offset of a point loop self-intersect? */
export function rawOffsetSelfIntersects(points: GeometryPoint[], distanceMm: number): boolean {
  return pointLoopSelfIntersects(ownRawOffsetPoints(points, distanceMm));
}

/**
 * Tessellate a closed v2 loop into a single ordered point loop, dropping the
 * duplicated endpoints shared between consecutive curves so no zero-length edge
 * appears. The loop is implicitly closed (last point joins the first).
 */
export function closedLoopPoints(
  ctx: CurveContext,
  curves: Curve[],
  options: { toleranceMm?: number; maxSegments?: number } = {},
): GeometryPoint[] {
  const opts = sampleOptions(options);
  const pts: GeometryPoint[] = [];
  for (const c of curves) {
    const s = sampleCurve(ctx, c, { toleranceMm: opts.toleranceMm, maxSegments: opts.maxSegments });
    for (let i = 0; i < s.length - 1; i += 1) pts.push(s[i]);
  }
  return pts;
}

function reversePointLoop(loop: GeometryPoint[]): GeometryPoint[] {
  return loop.map((p) => ({ xMm: p.xMm, yMm: p.yMm })).reverse();
}

const COORD_SNAP = 1e-6;

/**
 * Build a self-contained v2 `PolygonResult` from one or more closed point loops.
 * The largest-|area| loop becomes the outer boundary (normalized to
 * counterclockwise); the remaining loops become holes (normalized to the
 * opposite winding). Vertices are synthesized with stable ids and coordinate
 * deduplication so every returned line curve resolves.
 */
export function buildPointPolygonResult(loops: GeometryPoint[][]): PolygonResult {
  if (loops.length === 0) {
    throw new Error('geometry: offset produced an empty polygon');
  }
  const withArea = loops.map((loop) => ({ loop, area: signedAreaOfPoints(loop) }));
  withArea.sort((a, b) => Math.abs(b.area) - Math.abs(a.area));

  let outer = withArea[0].loop;
  if (withArea[0].area < 0) outer = reversePointLoop(outer);

  const holes: GeometryPoint[][] = [];
  for (let i = 1; i < withArea.length; i += 1) {
    let hole = withArea[i].area > 0 ? reversePointLoop(withArea[i].loop) : [...withArea[i].loop];
    if (signedAreaOfPoints(hole) > 0) hole = reversePointLoop(hole);
    holes.push(hole);
  }

  const vertices: Vertex[] = [];
  const coordToId = new Map<string, string>();
  let next = 0;
  const ensure = (p: GeometryPoint): string => {
    const k = `${Math.round(p.xMm / COORD_SNAP) * COORD_SNAP},${Math.round(p.yMm / COORD_SNAP) * COORD_SNAP}`;
    const existing = coordToId.get(k);
    if (existing !== undefined) return existing;
    const id = `g${next}`;
    next += 1;
    coordToId.set(k, id);
    vertices.push({ id, xMm: p.xMm, yMm: p.yMm });
    return id;
  };

  const materialize = (loop: GeometryPoint[]): Curve[] =>
    loop.map((p, i) => {
      const endId = ensure(loop[(i + 1) % loop.length]);
      const startId = ensure(p);
      return { kind: 'line', startVertexId: startId, endVertexId: endId };
    });

  const outerCurves = materialize(outer);
  const holeCurves = holes.map((h) => materialize(h));
  const winding: Winding = signedAreaOfPoints(outer) > 0 ? 'counterclockwise' : 'clockwise';

  return { vertices, outer: outerCurves, holes: holeCurves, winding };
}
