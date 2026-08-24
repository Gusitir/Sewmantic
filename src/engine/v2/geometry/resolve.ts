// T-46 vertex resolution: bind a v2 document's `Vertex[]` and `Curve` objects
// into plain coordinates. This is the single point that turns id-based v2
// curves into the numeric geometry the kernel actually consumes. It deals only
// in v2 contracts and the plain `GeometryPoint` type — no third-party geometry.

import type { Curve, Vertex } from '../contracts.js';
import type { GeometryPoint } from './types.js';

/** Mutable per-call resolver over a `Vertex[]`. */
export class CurveContext {
  private readonly byId = new Map<string, GeometryPoint>();

  constructor(vertices: Vertex[]) {
    for (const v of vertices) {
      this.byId.set(v.id, { xMm: v.xMm, yMm: v.yMm });
    }
  }

  /** Point for a vertex id. Callers must guarantee the id resolves. */
  point(id: string): GeometryPoint {
    const p = this.byId.get(id);
    if (!p) {
      throw new Error(`geometry: unresolved vertex id "${id}"`);
    }
    return p;
  }
}

/** Plain, resolved projection of an edge curve (same discriminated variants). */
export type ResolvedCurve =
  | { kind: 'line'; start: GeometryPoint; end: GeometryPoint }
  | {
      kind: 'circularArc';
      start: GeometryPoint;
      end: GeometryPoint;
      center: GeometryPoint;
      radiusMm: number;
      sweepAngleDeg: number;
      clockwise: boolean;
    }
  | {
      kind: 'quadraticBezier';
      start: GeometryPoint;
      control: GeometryPoint;
      end: GeometryPoint;
    }
  | {
      kind: 'cubicBezier';
      start: GeometryPoint;
      controlA: GeometryPoint;
      controlB: GeometryPoint;
      end: GeometryPoint;
    };

/** Resolve a v2 `Curve` against a context into plain coordinates. */
export function resolveCurve(ctx: CurveContext, curve: Curve): ResolvedCurve {
  switch (curve.kind) {
    case 'line':
      return { kind: 'line', start: ctx.point(curve.startVertexId), end: ctx.point(curve.endVertexId) };
    case 'circularArc':
      return {
        kind: 'circularArc',
        start: ctx.point(curve.startVertexId),
        end: ctx.point(curve.endVertexId),
        center: ctx.point(curve.centerVertexId),
        radiusMm: curve.radiusMm,
        sweepAngleDeg: curve.sweepAngleDeg,
        clockwise: curve.clockwise,
      };
    case 'quadraticBezier':
      return {
        kind: 'quadraticBezier',
        start: ctx.point(curve.startVertexId),
        control: ctx.point(curve.controlVertexId),
        end: ctx.point(curve.endVertexId),
      };
    case 'cubicBezier':
      return {
        kind: 'cubicBezier',
        start: ctx.point(curve.startVertexId),
        controlA: ctx.point(curve.controlVertexAId),
        controlB: ctx.point(curve.controlVertexBId),
        end: ctx.point(curve.endVertexId),
      };
  }
}
