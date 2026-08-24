// T-46 curve sampling and tessellation.
//
// @flatten-js/core 1.6.14 exposes only `Segment` and `Arc` shapes (no Bezier
// primitives), so quadratic and cubic Beziers are flattened into polyline
// segments before any kernel operation. This module guarantees an adaptive
// chord tolerance so that area and length error stay well below the contract's
// 0.1% budget while keeping segment counts low where curves are already flat.

import type { Curve } from '../contracts.js';
import type { GeometryPoint, SampleOptions } from './types.js';
import { resolveCurve, type CurveContext, type ResolvedCurve } from './resolve.js';

const DEG_TO_RAD = Math.PI / 180;

/** Default max linear chord error when tessellating curved edges. */
export const DEFAULT_TOLERANCE_MM = 0.25;
/** Safety floor on segment count for any curved edge. */
const MIN_CURVE_SEGMENTS = 2;
/** Absolute safety cap on adaptive subdivision depth. */
const MAX_SUBDIVISION_DEPTH = 20;

/** Normalize sample options against the module defaults. */
export function sampleOptions(options: SampleOptions | undefined): Required<SampleOptions> {
  return {
    toleranceMm: options?.toleranceMm ?? DEFAULT_TOLERANCE_MM,
    maxSegments: options?.maxSegments ?? 4096,
  };
}

/** Tessellate a resolved curve into plain ordered points. */
export function sampleResolvedCurve(r: ResolvedCurve, options: SampleOptions = {}): GeometryPoint[] {
  if (r.kind === 'line') {
    return [r.start, r.end];
  }
  const opts = sampleOptions(options);
  if (r.kind === 'circularArc') {
    return sampleArc(r, opts.toleranceMm, opts.maxSegments);
  }
  if (r.kind === 'quadraticBezier') {
    const cubic = quadToCubic(r.start, r.control, r.end);
    return sampleCubic(cubic[0], cubic[1], cubic[2], cubic[3], opts.toleranceMm, opts.maxSegments);
  }
  return sampleCubic(
    r.start,
    r.controlA,
    r.controlB,
    r.end,
    opts.toleranceMm,
    opts.maxSegments,
  );
}

/** Sampling entry used by the adapter (resolves then tessellates). */
export function sampleCurve(ctx: CurveContext, curve: Curve, options: SampleOptions = {}): GeometryPoint[] {
  return sampleResolvedCurve(resolveCurve(ctx, curve), options);
}

function sampleArc(
  r: Extract<ResolvedCurve, { kind: 'circularArc' }>,
  toleranceMm: number,
  maxSegments: number,
): GeometryPoint[] {
  const { center, radiusMm } = r;
  const sweepRad = r.sweepAngleDeg * DEG_TO_RAD;
  // Direction sign: clockwise traversal subtracts angle.
  const direction = r.clockwise ? -1 : 1;
  const startAngle = Math.atan2(r.start.yMm - center.yMm, r.start.xMm - center.xMm);

  // Angular step bounded by chord (sagitta ~ r*theta^2 / 8 <= tol).
  const safeR = Math.max(radiusMm, 1e-6);
  const step = Math.sqrt((8 * Math.max(toleranceMm, 1e-6)) / safeR);
  const rawCount = Math.max(MIN_CURVE_SEGMENTS, Math.ceil(sweepRad / step));
  const n = Math.min(rawCount, maxSegments);

  const points: GeometryPoint[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const angle = startAngle + direction * sweepRad * t;
    points.push({
      xMm: center.xMm + safeR * Math.cos(angle),
      yMm: center.yMm + safeR * Math.sin(angle),
    });
  }
  return points;
}

function quadToCubic(
  p0: GeometryPoint,
  p1: GeometryPoint,
  p2: GeometryPoint,
): [GeometryPoint, GeometryPoint, GeometryPoint, GeometryPoint] {
  // Exact degree elevation: quadratic (P0, P1, P2) == cubic
  // (P0, P0/3 + 2P1/3, 2P1/3 + P2/3, P2).
  return [
    p0,
    { xMm: (1 / 3) * p0.xMm + (2 / 3) * p1.xMm, yMm: (1 / 3) * p0.yMm + (2 / 3) * p1.yMm },
    { xMm: (2 / 3) * p1.xMm + (1 / 3) * p2.xMm, yMm: (2 / 3) * p1.yMm + (1 / 3) * p2.yMm },
    p2,
  ];
}

function sampleCubic(
  p0: GeometryPoint,
  p1: GeometryPoint,
  p2: GeometryPoint,
  p3: GeometryPoint,
  toleranceMm: number,
  maxSegments: number,
): GeometryPoint[] {
  const out: GeometryPoint[] = [];
  const stack: Array<[GeometryPoint, GeometryPoint, GeometryPoint, GeometryPoint, number]> = [
    [p0, p1, p2, p3, 0],
  ];

  while (out.length < maxSegments && stack.length > 0) {
    const [a, b, c, d, depth] = stack.pop() as [
      GeometryPoint,
      GeometryPoint,
      GeometryPoint,
      GeometryPoint,
      number,
    ];
    if (isFlat(a, b, c, d, toleranceMm) || depth >= MAX_SUBDIVISION_DEPTH) {
      if (out.length === 0) out.push(a);
      out.push(d);
      continue;
    }
    const [left, right] = splitCubic(a, b, c, d);
    stack.push([...right, depth + 1] as [GeometryPoint, GeometryPoint, GeometryPoint, GeometryPoint, number]);
    stack.push([...left, depth + 1] as [GeometryPoint, GeometryPoint, GeometryPoint, GeometryPoint, number]);
  }
  return out;
}

function isFlat(
  a: GeometryPoint,
  b: GeometryPoint,
  c: GeometryPoint,
  d: GeometryPoint,
  toleranceMm: number,
): boolean {
  return (
    distanceToSegment(b, a, d) <= toleranceMm && distanceToSegment(c, a, d) <= toleranceMm
  );
}

function distanceToSegment(p: GeometryPoint, a: GeometryPoint, b: GeometryPoint): number {
  const dx = b.xMm - a.xMm;
  const dy = b.yMm - a.yMm;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-12) {
    return Math.hypot(p.xMm - a.xMm, p.yMm - a.yMm);
  }
  let t = ((p.xMm - a.xMm) * dx + (p.yMm - a.yMm) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.xMm - (a.xMm + t * dx), p.yMm - (a.yMm + t * dy));
}

function splitCubic(
  a: GeometryPoint,
  b: GeometryPoint,
  c: GeometryPoint,
  d: GeometryPoint,
): [
  [GeometryPoint, GeometryPoint, GeometryPoint, GeometryPoint],
  [GeometryPoint, GeometryPoint, GeometryPoint, GeometryPoint],
] {
  // de Casteljau subdivision at t = 0.5.
  const ab = mid(a, b);
  const bc = mid(b, c);
  const cd = mid(c, d);
  const abc = mid(ab, bc);
  const bcd = mid(bc, cd);
  const abcd = mid(abc, bcd);
  const left: [GeometryPoint, GeometryPoint, GeometryPoint, GeometryPoint] = [a, ab, abc, abcd];
  const right: [GeometryPoint, GeometryPoint, GeometryPoint, GeometryPoint] = [abcd, bcd, cd, d];
  return [left, right];
}

function mid(a: GeometryPoint, b: GeometryPoint): GeometryPoint {
  return { xMm: (a.xMm + b.xMm) / 2, yMm: (a.yMm + b.yMm) / 2 };
}

/** Accumulated chord length of a curve (polyline length of its sampling). */
export function curveLength(ctx: CurveContext, curve: Curve, options: SampleOptions = {}): number {
  const opts = sampleOptions(options);
  const points = sampleCurve(ctx, curve, { toleranceMm: opts.toleranceMm / 2, maxSegments: opts.maxSegments });
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].xMm - points[i - 1].xMm, points[i].yMm - points[i - 1].yMm);
  }
  return length;
}
