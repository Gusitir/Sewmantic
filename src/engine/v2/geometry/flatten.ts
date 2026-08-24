// T-46 internal Flatten.js bridge.
//
// Everything in this module is an implementation detail of the adapter. No
// Flatten.js type or instance is ever returned to a caller outside
// `geometry/`. The bridge converts *into* Flatten shapes and *out of* Flatten
// faces into plain numeric curve geometry; vertex-id binding happens once, at
// materialization, so the resulting v2 `Curve` objects always resolve against
// the returned `Vertex[]`.
//
// Because @flatten-js/core 1.6.14 has no Bezier primitives, Bezier input is
// tessellated into `Segment`s (sampler.ts); `line` becomes a `Segment` and
// `circularArc` becomes an `Arc` natively.

import Flatten from '@flatten-js/core';
import type { Curve, Vertex } from '../contracts.js';
import type { GeometryPoint, PolygonResult, Winding } from './types.js';
import type { ResolvedCurve } from './resolve.js';
import { sampleResolvedCurve } from './sampler.js';
import { signedAreaOfPoints } from './area.js';

const COORD_SNAP = 1e-6;

/** Plain numeric geometry of a curve, independent of vertex ids. */
export type CurveGeom =
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
  | { kind: 'quadraticBezier'; start: GeometryPoint; control: GeometryPoint; end: GeometryPoint }
  | {
      kind: 'cubicBezier';
      start: GeometryPoint;
      controlA: GeometryPoint;
      controlB: GeometryPoint;
      end: GeometryPoint;
    };

/** A closed loop plus its per-curve geometry (unitarity for sampling). */
export interface GeomLoop {
  curves: CurveGeom[];
}

function geomToResolved(g: CurveGeom): ResolvedCurve {
  switch (g.kind) {
    case 'line':
      return { kind: 'line', start: g.start, end: g.end };
    case 'circularArc':
      return {
        kind: 'circularArc',
        start: g.start,
        end: g.end,
        center: g.center,
        radiusMm: g.radiusMm,
        sweepAngleDeg: g.sweepAngleDeg,
        clockwise: g.clockwise,
      };
    case 'quadraticBezier':
      return { kind: 'quadraticBezier', start: g.start, control: g.control, end: g.end };
    case 'cubicBezier':
      return { kind: 'cubicBezier', start: g.start, controlA: g.controlA, controlB: g.controlB, end: g.end };
  }
}

/** Closed point loop for a geom loop (shared endpoints de-duplicated). */
export function geomLoopPoints(g: GeomLoop): GeometryPoint[] {
  if (g.curves.length === 0) return [];
  const pts: GeometryPoint[] = [];
  for (let i = 0; i < g.curves.length; i += 1) {
    const sample = sampleResolvedCurve(geomToResolved(g.curves[i]));
    const isLastCurve = i === g.curves.length - 1;
    const dropEnd = !isLastCurve;
    for (let j = 0; j < sample.length; j += 1) {
      if (dropEnd && j === sample.length - 1) continue;
      pts.push(sample[j]);
    }
  }
  return pts;
}

/** Signed shoelace area of a geom loop. */
export function geomLoopSignedArea(g: GeomLoop): number {
  return signedAreaOfPoints(geomLoopPoints(g));
}

/** Convert a resolved v2 curve into Flatten shape(s); beziers become segments. */
export function resolvedCurveToShapes(r: ResolvedCurve): Array<Flatten.Segment | Flatten.Arc> {
  switch (r.kind) {
    case 'line':
      return [new Flatten.Segment(new Flatten.Point(r.start.xMm, r.start.yMm), new Flatten.Point(r.end.xMm, r.end.yMm))];
    case 'circularArc': {
      const startAngle = Math.atan2(r.start.yMm - r.center.yMm, r.start.xMm - r.center.xMm);
      const sweepRad = (r.sweepAngleDeg * Math.PI) / 180;
      const endAngle = r.clockwise ? startAngle - sweepRad : startAngle + sweepRad;
      return [
        new Flatten.Arc(
          new Flatten.Point(r.center.xMm, r.center.yMm),
          Math.max(r.radiusMm, 1e-6),
          startAngle,
          endAngle,
          !r.clockwise,
        ),
      ];
    }
    case 'quadraticBezier':
    case 'cubicBezier': {
      const pts = sampleResolvedCurve(r);
      const shapes: Array<Flatten.Segment | Flatten.Arc> = [];
      for (let i = 0; i < pts.length - 1; i += 1) {
        shapes.push(
          new Flatten.Segment(new Flatten.Point(pts[i].xMm, pts[i].yMm), new Flatten.Point(pts[i + 1].xMm, pts[i + 1].yMm)),
        );
      }
      return shapes;
    }
  }
}

function curveShapes(ctx: { resolve: (c: Curve) => ResolvedCurve }, loop: Curve[]): Array<Flatten.Segment | Flatten.Arc> {
  const shapes: Array<Flatten.Segment | Flatten.Arc> = [];
  for (const c of loop) shapes.push(...resolvedCurveToShapes(ctx.resolve(c)));
  return shapes;
}

/** Build a Flatten polygon from v2 loops (outer + holes as faces). */
export function buildFlattenPolygon(
  resolve: (curve: Curve) => ResolvedCurve,
  outer: Curve[],
  holes: Curve[][],
): Flatten.Polygon {
  const poly = new Flatten.Polygon();
  poly.addFace(curveShapes({ resolve }, outer));
  for (const hole of holes) poly.addFace(curveShapes({ resolve }, hole));
  return poly;
}

/** Per-face geometry read back from a Flatten polygon. */
export function readFlattenFaces(poly: Flatten.Polygon): GeomLoop[] {
  const loops: GeomLoop[] = [];
  for (const face of [...poly.faces] as unknown as Array<Flatten.Face>) {
    const curves: CurveGeom[] = [];
    for (const shape of face.shapes) {
      if (shape instanceof Flatten.Segment) {
        curves.push({
          kind: 'line',
          start: { xMm: shape.start.x, yMm: shape.start.y },
          end: { xMm: shape.end.x, yMm: shape.end.y },
        });
      } else if (shape instanceof Flatten.Arc) {
        curves.push({
          kind: 'circularArc',
          start: { xMm: shape.start.x, yMm: shape.start.y },
          end: { xMm: shape.end.x, yMm: shape.end.y },
          center: { xMm: shape.center.x, yMm: shape.center.y },
          radiusMm: shape.r,
          sweepAngleDeg: (shape.sweep * 180) / Math.PI,
          clockwise: !shape.counterClockwise,
        });
      }
    }
    if (curves.length > 0) loops.push({ curves });
  }
  return loops;
}

/**
 * Turn Flatten polygon faces into a canonical, self-contained v2 `PolygonResult`.
 * The largest-|area| face becomes the outer boundary (normalized to
 * counterclockwise positive area); the remaining faces become holes normalized
 * to the opposite winding. Vertices are synthesized with stable ids and
 * coordinate deduplication so every curve reference resolves.
 */
export function readFlattenPolygon(poly: Flatten.Polygon): PolygonResult {
  const loops = readFlattenFaces(poly).map((l) => ({ ...l, area: geomLoopSignedArea(l) }));
  if (loops.length === 0) {
    throw new Error('geometry: offset/boolean produced an empty polygon');
  }
  loops.sort((a, b) => Math.abs(b.area) - Math.abs(a.area));

  // Canonicalize outer to positive (CCW) area.
  let outer = loops[0].curves;
  if (loops[0].area < 0) outer = reverseGeomLoop(outer);

  const holes: CurveGeom[][] = [];
  for (let i = 1; i < loops.length; i += 1) {
    let hole = loops[i].area > 0 ? reverseGeomLoop(loops[i].curves) : [...loops[i].curves];
    if (geomLoopSignedArea({ curves: hole }) > 0) hole = reverseGeomLoop(hole);
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

  const materialize = (loop: CurveGeom[]): Curve[] => {
    return loop.map((g): Curve => {
      const startId = ensure(g.start);
      const endId = ensure(g.end);
      switch (g.kind) {
        case 'line':
          return { kind: 'line', startVertexId: startId, endVertexId: endId };
        case 'circularArc':
          return {
            kind: 'circularArc',
            startVertexId: startId,
            endVertexId: endId,
            centerVertexId: ensure(g.center),
            radiusMm: g.radiusMm,
            sweepAngleDeg: g.sweepAngleDeg,
            clockwise: g.clockwise,
          };
        case 'quadraticBezier':
          return {
            kind: 'quadraticBezier',
            startVertexId: startId,
            controlVertexId: ensure(g.control),
            endVertexId: endId,
          };
        case 'cubicBezier':
          return {
            kind: 'cubicBezier',
            startVertexId: startId,
            controlVertexAId: ensure(g.controlA),
            controlVertexBId: ensure(g.controlB),
            endVertexId: endId,
          };
      }
    });
  };

  const outerCurves = materialize(outer);
  const holeCurves = holes.map((h) => materialize(h));
  const winding: Winding = geomLoopSignedArea({ curves: outer }) > 0 ? 'counterclockwise' : 'clockwise';

  return { vertices, outer: outerCurves, holes: holeCurves, winding };
}

/** Reverse a geom loop (order + per-curve orientation). */
export function reverseGeomLoop(loop: CurveGeom[]): CurveGeom[] {
  const out: CurveGeom[] = [];
  for (let i = loop.length - 1; i >= 0; i -= 1) {
    out.push(reverseCurveGeom(loop[i]));
  }
  return out;
}

function reverseCurveGeom(g: CurveGeom): CurveGeom {
  switch (g.kind) {
    case 'line':
      return { kind: 'line', start: g.end, end: g.start };
    case 'circularArc':
      return {
        kind: 'circularArc',
        start: g.end,
        end: g.start,
        center: g.center,
        radiusMm: g.radiusMm,
        sweepAngleDeg: g.sweepAngleDeg,
        clockwise: !g.clockwise,
      };
    case 'quadraticBezier':
      return { kind: 'quadraticBezier', start: g.end, control: g.control, end: g.start };
    case 'cubicBezier':
      return {
        kind: 'cubicBezier',
        start: g.end,
        controlA: g.controlB,
        controlB: g.controlA,
        end: g.start,
      };
  }
}
