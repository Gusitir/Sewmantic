// T-46 concrete `GeometryAdapter`. Polygon booleans and face I/O are backed by
// Flatten.js; the selected offset strategy is the own deterministic miter offset
// (see DECISION.md / offset.ts). Implements the plain surface in `types.ts`; all
// third-party geometry stays internal.

import Flatten from '@flatten-js/core';
import type { Curve, Vertex } from '../contracts.js';
import type {
  BooleanOp,
  GeometryAdapter,
  GeometryPoint,
  IntersectOptions,
  LoopPolygon,
  OffsetJoin,
  PolygonResult,
  SampleOptions,
  Winding,
} from './types.js';
import { CurveContext, resolveCurve } from './resolve.js';
import { curveLength, sampleCurve, sampleOptions, DEFAULT_TOLERANCE_MM } from './sampler.js';
import {
  buildFlattenPolygon,
  readFlattenPolygon,
} from './flatten.js';
import { buildPointPolygonResult, closedLoopPoints, ownRawOffsetPoints } from './offset.js';
import {
  polylineIntersections,
  pointLoopSelfIntersects,
  signedAreaOfPoints,
  distanceAlong,
} from './area.js';

const DEFAULT_SNAP_MM = 0.01;

/** Default singleton adapter. Deterministic, stateless between calls. */
export const geometryAdapter: GeometryAdapter = createAdapter();

/** Build a fresh adapter instance (stateless; safe to run several in parallel). */
export function createAdapter(): GeometryAdapter {
  const resolveLoop = (vertices: Vertex[]) => {
    const ctx = new CurveContext(vertices);
    return (curve: Curve) => resolveCurve(ctx, curve);
  };

  const sampleClosed = (vertices: Vertex[], outer: Curve[], toleranceMm: number): GeometryPoint[] => {
    const ctx = new CurveContext(vertices);
    return closedLoopPoints(ctx, outer, { toleranceMm });
  };

  return {
    curveLengthMm(vertices, curve) {
      return curveLength(new CurveContext(vertices), curve);
    },

    sampleCurve(vertices, curve, options) {
      return sampleCurve(new CurveContext(vertices), curve, options);
    },

    signedAreaMm2(vertices, outer) {
      const opts = sampleOptions({ toleranceMm: DEFAULT_TOLERANCE_MM });
      return signedAreaOfPoints(sampleClosed(vertices, outer, opts.toleranceMm));
    },

    polygonAreaMm2(vertices, outer, holes) {
      const outerArea = Math.abs(this.signedAreaMm2(vertices, outer));
      let holeArea = 0;
      for (const hole of holes ?? []) {
        holeArea += Math.abs(this.signedAreaMm2(vertices, hole));
      }
      return outerArea - holeArea;
    },

    winding(vertices, outer) {
      return this.signedAreaMm2(vertices, outer) > 0 ? 'counterclockwise' : 'clockwise';
    },

    isSimple(vertices, outer) {
      const opts = sampleOptions({ toleranceMm: DEFAULT_TOLERANCE_MM });
      return !pointLoopSelfIntersects(sampleClosed(vertices, outer, opts.toleranceMm));
    },

    intersectCurves(vertices, a, b, options) {
      const ctx = new CurveContext(vertices);
      const snap = options?.snapMm ?? DEFAULT_SNAP_MM;
      const opts = sampleOptions({});
      const pa = sampleCurve(ctx, a, opts);
      const pb = sampleCurve(ctx, b, opts);
      return polylineIntersections(pa, pb, snap);
    },

    cutLoop(vertices, loop, cut) {
      const ctx = new CurveContext(vertices);
      const opts = sampleOptions({});
      let loopPts: GeometryPoint[] = [];
      for (const c of loop) loopPts = loopPts.concat(sampleCurve(ctx, c, opts));
      const cutPts = sampleCurve(ctx, cut, opts);
      const hits = polylineIntersections(loopPts, cutPts, DEFAULT_SNAP_MM);
      return hits.sort((u, v) => distanceAlong(cutPts, u) - distanceAlong(cutPts, v));
    },

    boolean(op, vertices, subject, clip) {
      const resolve = resolveLoop(vertices);
      const subjectPoly = buildFlattenPolygon(resolve, subject.outer, subject.holes);
      const clipPoly = buildFlattenPolygon(resolve, clip.outer, clip.holes);
      let result: Flatten.Polygon;
      if (op === 'union') {
        result = Flatten.BooleanOperations.unify(subjectPoly, clipPoly);
      } else if (op === 'intersect') {
        result = Flatten.BooleanOperations.intersect(subjectPoly, clipPoly);
      } else {
        result = Flatten.BooleanOperations.subtract(subjectPoly, clipPoly);
      }
      return readFlattenPolygon(result);
    },

    offset(vertices, loop, distanceMm, join) {
      // Selected strategy (see DECISION.md): own minimal miter offset.
      // Deterministic, boolean-free, no Flatten internals; passes the convex /
      // concave / curved gate fixtures at 3 / 10 / 25 mm. Only miter is
      // supported; round/bevel are not implemented and are rejected rather than
      // silently substituted (the public type restricts callers to 'miter').
      if (join !== undefined && join !== 'miter') {
        throw new Error(
          `geometry: offset join "${String(join)}" is not supported; only 'miter' is implemented (see DECISION.md)`,
        );
      }
      const ctx = new CurveContext(vertices);
      const outerPts = closedLoopPoints(ctx, loop.outer);
      const holePts = (loop.holes ?? []).map((h) => closedLoopPoints(ctx, h));
      const offsetOuter = ownRawOffsetPoints(outerPts, distanceMm);
      const offsetHoles = holePts.map((h) => ownRawOffsetPoints(h, distanceMm));
      return buildPointPolygonResult([offsetOuter, ...offsetHoles]);
    },
  };
}
