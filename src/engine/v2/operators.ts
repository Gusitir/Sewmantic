// T-47 atomic operators for the semantic pattern kernel (v2).
//
// Pure, deterministic document operators: `splitEdge`, `insertDart` and `cut`.
// Every operator validates the FULL request first, applies it to a deep clone,
// regenerates the `StitchPair` of every interface and re-evaluates constraints
// on the result. The input document is never mutated; if any step fails the
// operator returns a typed rejection and the caller's document is guaranteed
// byte-identical to what it was before the call (verified by comparing
// `serializeDocument` output in the tests).
//
// Geometric scope (kernel MVP):
//   - `splitEdge`  line / circularArc  -> exact halves, total length preserved
//   - `insertDart` line only           -> adds exactly `2 * depthMm`
//   - `cut`        line only           -> removes an interior open interval

import {
  MM_TOLERANCE,
  type ConstraintDiagnostic,
  type Curve,
  type Edge,
  type PatternDocument,
  type StitchPair,
  type Vertex,
} from './contracts.js';
import { serializeDocument, SemanticV2Error } from './serialization.js';
import {
  ConstraintResolutionError,
  resolveStitchPair,
  evaluateConstraints,
  type ConstraintOptions,
} from './constraints.js';
import { CurveContext, resolveCurve } from './geometry/resolve.js';
import { curveLength, sampleResolvedCurve } from './geometry/sampler.js';
import type { SampleOptions } from './geometry/types.js';

/** Typed rejection codes returned by the atomic operators. */
export type OperatorRejectionCode =
  | 'UNKNOWN_EDGE'
  | 'UNSUPPORTED_CURVE_KIND'
  | 'INVALID_PARAMETERS'
  | 'ID_COLLISION'
  | 'CONSTRAINT_FAILURE'
  | 'SERIALIZATION_FAILED';

/** Successful operator result: a new document and its fresh diagnostics. */
export interface OperatorSuccess {
  ok: true;
  doc: PatternDocument;
  diagnostics: readonly ConstraintDiagnostic[];
}

/** Rejected operator result: no document is produced, input stays untouched. */
export interface OperatorRejection {
  ok: false;
  code: OperatorRejectionCode;
  message: string;
  diagnostics: readonly ConstraintDiagnostic[];
}

export type OperatorResult = OperatorSuccess | OperatorRejection;

const rejection = (
  code: OperatorRejectionCode,
  message: string,
): OperatorRejection => ({ ok: false, code, message, diagnostics: [] });

const cloneDoc = (doc: PatternDocument): PatternDocument =>
  JSON.parse(JSON.stringify(doc)) as PatternDocument;

/** Common tail of every operator: regenerate pairs, re-evaluate, validate. */
function finalize(doc: PatternDocument, options: ConstraintOptions | undefined): OperatorResult {
  const pairs: StitchPair[] = [];
  for (const iface of doc.interfaces) {
    try {
      pairs.push(resolveStitchPair(doc, iface, options));
    } catch (err) {
      if (err instanceof ConstraintResolutionError) {
        return rejection('CONSTRAINT_FAILURE', `stitch pair regeneration failed: ${err.message}`);
      }
      throw err;
    }
  }
  doc.stitchPairs = pairs;
  const diagnostics = evaluateConstraints(doc, options);
  doc.diagnostics = diagnostics;
  try {
    serializeDocument(doc);
  } catch (err) {
    if (err instanceof SemanticV2Error) {
      return rejection('SERIALIZATION_FAILED', `result document rejected: ${err.message}`);
    }
    throw err;
  }
  return { ok: true, doc, diagnostics };
}

const findEdge = (doc: PatternDocument, edgeId: string): Edge | undefined =>
  doc.edges.find((e) => e.id === edgeId);

/** Assert the given ids do not collide with existing vertex/edge ids. */
function assertIdsFree(
  doc: PatternDocument,
  vertexIds: readonly string[],
  edgeIds: readonly string[],
): OperatorRejection | null {
  const vertexSet = new Set(doc.vertices.map((v) => v.id));
  for (const id of vertexIds) {
    if (vertexSet.has(id)) {
      return rejection('ID_COLLISION', `generated vertex id "${id}" already exists`);
    }
  }
  const edgeSet = new Set(doc.edges.map((e) => e.id));
  for (const id of edgeIds) {
    if (edgeSet.has(id)) {
      return rejection('ID_COLLISION', `generated edge id "${id}" already exists`);
    }
  }
  return null;
}

/** Replace every occurrence of `edgeId` in sequences with `replacementIds`. */
function replaceEdgeInSequences(
  doc: PatternDocument,
  edgeId: string,
  replacementIds: readonly string[],
): void {
  for (const sequence of doc.sequences) {
    const index = sequence.edgeIds.indexOf(edgeId);
    if (index >= 0) {
      sequence.edgeIds.splice(index, 1, ...replacementIds);
    }
  }
}

/** Point at arc length `atMm` along a resolved polyline sampling. */
function pointAtArcLength(
  ctx: CurveContext,
  edge: Edge,
  atMm: number,
  sample: SampleOptions,
): { xMm: number; yMm: number } {
  const points = sampleResolvedCurve(resolveCurve(ctx, edge.curve), sample);
  let acc = 0;
  for (let i = 1; i < points.length; i += 1) {
    const step = Math.hypot(points[i].xMm - points[i - 1].xMm, points[i].yMm - points[i - 1].yMm);
    if (acc + step >= atMm) {
      const t = step === 0 ? 0 : (atMm - acc) / step;
      return {
        xMm: points[i - 1].xMm + t * (points[i].xMm - points[i - 1].xMm),
        yMm: points[i - 1].yMm + t * (points[i].yMm - points[i - 1].yMm),
      };
    }
    acc += step;
  }
  const last = points[points.length - 1];
  return { xMm: last.xMm, yMm: last.yMm };
}

/** Options for {@link splitEdge}. */
export interface SplitEdgeOptions extends ConstraintOptions {
  /** Arc-length offset of the split point; default: edge midpoint. */
  atMm?: number;
  /** New vertex id at the split point; default `${edgeId}__split`. */
  vertexId?: string;
  /** First half edge id; default `${edgeId}__a`. */
  edgeIdA?: string;
  /** Second half edge id; default `${edgeId}__b`. */
  edgeIdB?: string;
}

/**
 * Split one edge into two edges at an arc-length offset, replacing it in
 * every referencing sequence. Total sequence length is preserved exactly for
 * lines and within sampling tolerance for circular arcs. Bezier kinds are
 * rejected (atomic, no mutation).
 */
export function splitEdge(
  doc: PatternDocument,
  edgeId: string,
  options: SplitEdgeOptions = {},
): OperatorResult {
  const next = cloneDoc(doc);
  const edge = findEdge(next, edgeId);
  if (!edge) {
    return rejection('UNKNOWN_EDGE', `edge "${edgeId}" not found`);
  }
  const sample: SampleOptions = options.sample ?? {};
  const ctx = new CurveContext(next.vertices);
  const totalMm = curveLength(ctx, edge.curve, sample);
  if (!(totalMm > MM_TOLERANCE)) {
    return rejection('INVALID_PARAMETERS', `edge "${edgeId}" is degenerate (${totalMm} mm)`);
  }
  const atMm = options.atMm ?? totalMm / 2;
  if (!(atMm > MM_TOLERANCE) || !(totalMm - atMm > MM_TOLERANCE)) {
    return rejection(
      'INVALID_PARAMETERS',
      `split offset ${atMm} mm must be strictly inside edge "${edgeId}" of length ${totalMm} mm`,
    );
  }

  const vertexId = options.vertexId ?? `${edgeId}__split`;
  const edgeIdA = options.edgeIdA ?? `${edgeId}__a`;
  const edgeIdB = options.edgeIdB ?? `${edgeId}__b`;
  const collision = assertIdsFree(next, [vertexId], [edgeIdA, edgeIdB]);
  if (collision) return collision;

  const at = pointAtArcLength(ctx, edge, atMm, sample);
  const vertex: Vertex = { id: vertexId, xMm: at.xMm, yMm: at.yMm };
  const role = edge.role;
  let curveA: Curve;
  let curveB: Curve;

  if (edge.curve.kind === 'line') {
    curveA = { kind: 'line', startVertexId: edge.curve.startVertexId, endVertexId: vertexId };
    curveB = { kind: 'line', startVertexId: vertexId, endVertexId: edge.curve.endVertexId };
  } else if (edge.curve.kind === 'circularArc') {
    const fraction = atMm / totalMm;
    const sweepA = edge.curve.sweepAngleDeg * fraction;
    const sweepB = edge.curve.sweepAngleDeg * (1 - fraction);
    curveA = {
      kind: 'circularArc',
      startVertexId: edge.curve.startVertexId,
      endVertexId: vertexId,
      centerVertexId: edge.curve.centerVertexId,
      radiusMm: edge.curve.radiusMm,
      sweepAngleDeg: sweepA,
      clockwise: edge.curve.clockwise,
    };
    curveB = {
      kind: 'circularArc',
      startVertexId: vertexId,
      endVertexId: edge.curve.endVertexId,
      centerVertexId: edge.curve.centerVertexId,
      radiusMm: edge.curve.radiusMm,
      sweepAngleDeg: sweepB,
      clockwise: edge.curve.clockwise,
    };
  } else {
    return rejection(
      'UNSUPPORTED_CURVE_KIND',
      `splitEdge supports line and circularArc only; edge "${edgeId}" is ${edge.curve.kind}`,
    );
  }

  const edgeA: Edge = { id: edgeIdA, role, curve: curveA };
  const edgeB: Edge = { id: edgeIdB, role, curve: curveB };
  const index = next.edges.findIndex((e) => e.id === edgeId);
  next.edges.splice(index, 1, edgeA, edgeB);
  next.vertices.push(vertex);
  replaceEdgeInSequences(next, edgeId, [edgeIdA, edgeIdB]);

  return finalize(next, options);
}

/** Options for {@link insertDart}. */
export interface InsertDartOptions extends ConstraintOptions {
  /** Target border edge (must be a line). */
  edgeId: string;
  /** Dart depth in millimetres (> 0); the border gains exactly `2 * depthMm`. */
  depthMm: number;
  /** Dart point offset along the edge; default: edge midpoint. */
  atMm?: number;
  /** Inward side relative to the edge direction; default `'left'`. */
  side?: 'left' | 'right';
  /** Dart point vertex id; default `${edgeId}__dart_point`. */
  pointVertexId?: string;
  /** Apex vertex id; default `${edgeId}__dart_apex`. */
  apexVertexId?: string;
  /** Leg-in edge id (point -> apex); default `${edgeId}__dart_leg_in`. */
  legInEdgeId?: string;
  /** Leg-out edge id (apex -> point); default `${edgeId}__dart_leg_out`. */
  legOutEdgeId?: string;
  /** Border edge id before the dart; default `${edgeId}__dart_a`. */
  edgeIdA?: string;
  /** Border edge id after the dart; default `${edgeId}__dart_b`. */
  edgeIdB?: string;
}

/**
 * Insert a closed dart on a line edge: the border is opened at one point and
 * two interior legs of exactly `depthMm` run to the apex and back, adding
 * exactly `2 * depthMm` to every referencing sequence. Updates every affected
 * interface's stitch pair or fails atomically.
 */
export function insertDart(doc: PatternDocument, options: InsertDartOptions): OperatorResult {
  const next = cloneDoc(doc);
  const edge = findEdge(next, options.edgeId);
  if (!edge) {
    return rejection('UNKNOWN_EDGE', `edge "${options.edgeId}" not found`);
  }
  if (edge.curve.kind !== 'line') {
    return rejection(
      'UNSUPPORTED_CURVE_KIND',
      `insertDart supports line edges only; edge "${options.edgeId}" is ${edge.curve.kind}`,
    );
  }
  const sample: SampleOptions = options.sample ?? {};
  const ctx = new CurveContext(next.vertices);
  const totalMm = curveLength(ctx, edge.curve, sample);
  const depthMm = options.depthMm;
  if (!(typeof depthMm === 'number' && Number.isFinite(depthMm) && depthMm > MM_TOLERANCE)) {
    return rejection('INVALID_PARAMETERS', `dart depthMm must be > 0; got ${depthMm}`);
  }
  const atMm = options.atMm ?? totalMm / 2;
  if (!(atMm > MM_TOLERANCE) || !(totalMm - atMm > MM_TOLERANCE)) {
    return rejection(
      'INVALID_PARAMETERS',
      `dart point ${atMm} mm must be strictly inside edge "${options.edgeId}" of length ${totalMm} mm`,
    );
  }

  const pointId = options.pointVertexId ?? `${options.edgeId}__dart_point`;
  const apexId = options.apexVertexId ?? `${options.edgeId}__dart_apex`;
  const legInId = options.legInEdgeId ?? `${options.edgeId}__dart_leg_in`;
  const legOutId = options.legOutEdgeId ?? `${options.edgeId}__dart_leg_out`;
  const edgeIdA = options.edgeIdA ?? `${options.edgeId}__dart_a`;
  const edgeIdB = options.edgeIdB ?? `${options.edgeId}__dart_b`;
  const collision = assertIdsFree(
    next,
    [pointId, apexId],
    [legInId, legOutId, edgeIdA, edgeIdB],
  );
  if (collision) return collision;

  const start = ctx.point(edge.curve.startVertexId);
  const end = ctx.point(edge.curve.endVertexId);
  const dx = end.xMm - start.xMm;
  const dy = end.yMm - start.yMm;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const t = atMm / totalMm;
  const px = start.xMm + t * dx;
  const py = start.yMm + t * dy;
  const sign = options.side === 'right' ? -1 : 1;
  const apexX = px + sign * -uy * depthMm;
  const apexY = py + sign * ux * depthMm;

  const pointVertex: Vertex = { id: pointId, xMm: px, yMm: py };
  const apexVertex: Vertex = { id: apexId, xMm: apexX, yMm: apexY };
  const role = edge.role;
  const edgeA: Edge = {
    id: edgeIdA,
    role,
    curve: { kind: 'line', startVertexId: edge.curve.startVertexId, endVertexId: pointId },
  };
  const legIn: Edge = {
    id: legInId,
    role: 'interior',
    curve: { kind: 'line', startVertexId: pointId, endVertexId: apexId },
  };
  const legOut: Edge = {
    id: legOutId,
    role: 'interior',
    curve: { kind: 'line', startVertexId: apexId, endVertexId: pointId },
  };
  const edgeB: Edge = {
    id: edgeIdB,
    role,
    curve: { kind: 'line', startVertexId: pointId, endVertexId: edge.curve.endVertexId },
  };

  const index = next.edges.findIndex((e) => e.id === options.edgeId);
  next.edges.splice(index, 1, edgeA, legIn, legOut, edgeB);
  next.vertices.push(pointVertex, apexVertex);
  replaceEdgeInSequences(next, options.edgeId, [edgeIdA, legInId, legOutId, edgeIdB]);

  return finalize(next, options);
}

/** Options for {@link cut}. */
export interface CutOptions extends ConstraintOptions {
  /** Target border edge (must be a line). */
  edgeId: string;
  /** Length of the removed interior interval in millimetres (> 0). */
  lengthMm: number;
  /** Start offset of the removed interval; default: centered on the edge. */
  atMm?: number;
  /** First cut-point vertex id; default `${edgeId}__cut_point_a`. */
  pointAId?: string;
  /** Second cut-point vertex id; default `${edgeId}__cut_point_b`. */
  pointBId?: string;
  /** Remaining edge id before the gap; default `${edgeId}__cut_a`. */
  edgeIdA?: string;
  /** Remaining edge id after the gap; default `${edgeId}__cut_b`. */
  edgeIdB?: string;
}

/**
 * Cut an open interval out of a line edge: the border loses exactly
 * `lengthMm` and every referencing sequence is updated. Every affected
 * interface's stitch pair is regenerated or the operator fails atomically.
 */
export function cut(doc: PatternDocument, options: CutOptions): OperatorResult {
  const next = cloneDoc(doc);
  const edge = findEdge(next, options.edgeId);
  if (!edge) {
    return rejection('UNKNOWN_EDGE', `edge "${options.edgeId}" not found`);
  }
  if (edge.curve.kind !== 'line') {
    return rejection(
      'UNSUPPORTED_CURVE_KIND',
      `cut supports line edges only; edge "${options.edgeId}" is ${edge.curve.kind}`,
    );
  }
  const sample: SampleOptions = options.sample ?? {};
  const ctx = new CurveContext(next.vertices);
  const totalMm = curveLength(ctx, edge.curve, sample);
  const lengthMm = options.lengthMm;
  if (!(typeof lengthMm === 'number' && Number.isFinite(lengthMm) && lengthMm > MM_TOLERANCE)) {
    return rejection('INVALID_PARAMETERS', `cut lengthMm must be > 0; got ${lengthMm}`);
  }
  const atMm = options.atMm ?? (totalMm - lengthMm) / 2;
  if (!(atMm > MM_TOLERANCE) || !(atMm + lengthMm < totalMm - MM_TOLERANCE)) {
    return rejection(
      'INVALID_PARAMETERS',
      `cut [${atMm}, ${atMm + lengthMm}] mm must be strictly inside edge "${options.edgeId}" of length ${totalMm} mm`,
    );
  }

  const pointAId = options.pointAId ?? `${options.edgeId}__cut_point_a`;
  const pointBId = options.pointBId ?? `${options.edgeId}__cut_point_b`;
  const edgeIdA = options.edgeIdA ?? `${options.edgeId}__cut_a`;
  const edgeIdB = options.edgeIdB ?? `${options.edgeId}__cut_b`;
  const collision = assertIdsFree(next, [pointAId, pointBId], [edgeIdA, edgeIdB]);
  if (collision) return collision;

  const tA = atMm / totalMm;
  const tB = (atMm + lengthMm) / totalMm;
  const start = ctx.point(edge.curve.startVertexId);
  const end = ctx.point(edge.curve.endVertexId);
  const pointA: Vertex = {
    id: pointAId,
    xMm: start.xMm + tA * (end.xMm - start.xMm),
    yMm: start.yMm + tA * (end.yMm - start.yMm),
  };
  const pointB: Vertex = {
    id: pointBId,
    xMm: start.xMm + tB * (end.xMm - start.xMm),
    yMm: start.yMm + tB * (end.yMm - start.yMm),
  };
  const role = edge.role;
  const edgeA: Edge = {
    id: edgeIdA,
    role,
    curve: { kind: 'line', startVertexId: edge.curve.startVertexId, endVertexId: pointAId },
  };
  const edgeB: Edge = {
    id: edgeIdB,
    role,
    curve: { kind: 'line', startVertexId: pointBId, endVertexId: edge.curve.endVertexId },
  };

  const index = next.edges.findIndex((e) => e.id === options.edgeId);
  next.edges.splice(index, 1, edgeA, edgeB);
  next.vertices.push(pointA, pointB);
  replaceEdgeInSequences(next, options.edgeId, [edgeIdA, edgeIdB]);

  return finalize(next, options);
}
