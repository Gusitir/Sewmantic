// T-47 constraint matching for the semantic pattern kernel (v2).
//
// This module resolves each `Interface` into a concrete `StitchPair` by
// sampling both sides to arc length and pairing the common run, and evaluates
// the typed constraint set over the whole document:
//
//   - `SEAM_DELTA_LIMIT`        seam length delta above a configurable limit
//                               (default 3 mm)            -> warning
//   - `ORIENTATION_INCOMPATIBLE` start tangents not anti-parallel -> error
//   - `BROKEN_REFERENCE`        interface pointing at a missing sequence/edge
//                                                         -> error
//   - `NON_POSITIVE_LENGTH`     a referenced sequence resolves to <= 0 mm
//                                                         -> error
//
// Geometry is the only authority: stored stitch pairs are never trusted, every
// evaluation re-samples the referenced edges. All outputs are deterministic
// and expressed in millimetres.

import {
  MM_TOLERANCE,
  type ConstraintDiagnostic,
  type DiagnosticSeverity,
  type Edge,
  type EdgeSequence,
  type Interface,
  type PatternDocument,
  type StitchPair,
  type StitchSegment,
} from './contracts.js';
import { CurveContext, resolveCurve } from './geometry/resolve.js';
import { curveLength, sampleResolvedCurve } from './geometry/sampler.js';
import type { SampleOptions } from './geometry/types.js';

/** Default seam delta limit in millimetres (plan: report delta > 3 mm). */
export const DEFAULT_MAX_SEAM_DELTA_MM = 3;

/** Tuning for constraint resolution and evaluation. */
export interface ConstraintOptions {
  /** Seam delta limit in millimetres; default {@link DEFAULT_MAX_SEAM_DELTA_MM}. */
  maxSeamDeltaMm?: number;
  /** Curve sampling tuning used for arc-length and tangent resolution. */
  sample?: SampleOptions;
}

/** Typed failure codes raised when a single interface cannot be resolved. */
export type ConstraintFailureCode = 'BROKEN_REFERENCE' | 'NON_POSITIVE_LENGTH';

/**
 * Error raised by {@link resolveStitchPair} when an interface cannot be
 * resolved against the document. `entities` lists only ids that resolve in
 * the document so diagnostics built from it stay serializable.
 */
export class ConstraintResolutionError extends Error {
  readonly code: ConstraintFailureCode;
  readonly entities: readonly string[];

  constructor(code: ConstraintFailureCode, entities: readonly string[], message: string) {
    super(message);
    this.name = 'ConstraintResolutionError';
    this.code = code;
    this.entities = entities;
  }
}

/** External constraint ids emitted by {@link evaluateConstraints}. */
export const CONSTRAINT_IDS = {
  seamDeltaLimit: 'SEAM_DELTA_LIMIT',
  orientationIncompatible: 'ORIENTATION_INCOMPATIBLE',
  brokenReference: 'BROKEN_REFERENCE',
  nonPositiveLength: 'NON_POSITIVE_LENGTH',
} as const;

/** Resolve the ordered edges of a sequence, or fail with a typed error. */function sequenceEdges(doc: PatternDocument, sequenceId: string): {
  sequence: EdgeSequence;
  edges: Edge[];
} {
  const sequence = doc.sequences.find((s) => s.id === sequenceId);
  if (!sequence) {
    throw new ConstraintResolutionError(
      'BROKEN_REFERENCE',
      [],
      `interface references missing sequence "${sequenceId}"`,
    );
  }
  const edges: Edge[] = [];
  for (const edgeId of sequence.edgeIds) {
    const edge = doc.edges.find((e) => e.id === edgeId);
    if (!edge) {
      throw new ConstraintResolutionError(
        'BROKEN_REFERENCE',
        [sequence.id],
        `sequence "${sequence.id}" references missing edge "${edgeId}"`,
      );
    }
    edges.push(edge);
  }
  if (edges.length === 0) {
    throw new ConstraintResolutionError(
      'BROKEN_REFERENCE',
      [sequence.id],
      `sequence "${sequence.id}" references no edges`,
    );
  }
  return { sequence, edges };
}

/** Unit tangent at the start of a curve (first distinct sample pair). */
function startTangent(ctx: CurveContext, edge: Edge, sample: SampleOptions): {
  xMm: number;
  yMm: number;
} {
  const points = sampleResolvedCurve(resolveCurve(ctx, edge.curve), sample);
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].xMm - points[0].xMm;
    const dy = points[i].yMm - points[0].yMm;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      return { xMm: dx / len, yMm: dy / len };
    }
  }
  throw new ConstraintResolutionError(
    'NON_POSITIVE_LENGTH',
    [edge.id],
    `edge "${edge.id}" has no resolvable start tangent (zero-length sampling)`,
  );
}

/**
 * Resolve one interface into a concrete `StitchPair`.
 *
 * Both sides are sampled to arc length with the configured tolerance and
 * paired greedily from offset 0, so the emitted segments are an ordered
 * tiling of `commonLengthMm` on both sides (serializable without gaps or
 * overlaps). Start tangents are anti-parallel (dot < 0) when compatible:
 * shared seams are traversed in opposite directions by convention.
 *
 * Throws {@link ConstraintResolutionError} on broken references or
 * non-positive edge lengths.
 */
export function resolveStitchPair(
  doc: PatternDocument,
  iface: Interface,
  options: ConstraintOptions = {},
): StitchPair {
  const maxSeamDeltaMm = options.maxSeamDeltaMm ?? DEFAULT_MAX_SEAM_DELTA_MM;
  const sample: SampleOptions = options.sample ?? {};
  const ctx = new CurveContext(doc.vertices);

  const left = sequenceEdges(doc, iface.leftSequenceId);
  const right = sequenceEdges(doc, iface.rightSequenceId);

  const measure = (side: { sequence: EdgeSequence; edges: Edge[] }): {
    lengths: number[];
    totalMm: number;
  } => {
    const lengths = side.edges.map((edge) => {
      const len = curveLength(ctx, edge.curve, sample);
      if (!(len > MM_TOLERANCE)) {
        throw new ConstraintResolutionError(
          'NON_POSITIVE_LENGTH',
          [side.sequence.id],
          `edge "${edge.id}" in sequence "${side.sequence.id}" resolves to non-positive length ${len} mm`,
        );
      }
      return len;
    });
    const totalMm = lengths.reduce((sum, len) => sum + len, 0);
    return { lengths, totalMm };
  };

  const a = measure(left);
  const b = measure(right);

  const pairs: StitchSegment[] = [];
  let i = 0;
  let j = 0;
  let posA = 0;
  let posB = 0;
  let remA = a.lengths[0] ?? 0;
  let remB = b.lengths[0] ?? 0;
  while (i < a.lengths.length && j < b.lengths.length) {
    const take = Math.min(remA, remB);
    const seg: StitchSegment = {
      aStartMm: posA,
      aEndMm: posA + take,
      bStartMm: posB,
      bEndMm: posB + take,
      lengthMm: take,
    };
    pairs.push(seg);
    posA += take;
    posB += take;
    remA -= take;
    remB -= take;
    if (remA <= MM_TOLERANCE) {
      i += 1;
      remA = a.lengths[i] ?? 0;
    }
    if (remB <= MM_TOLERANCE) {
      j += 1;
      remB = b.lengths[j] ?? 0;
    }
  }
  const commonLengthMm = Math.min(a.totalMm, b.totalMm);
  const deltaMm = Math.abs(a.totalMm - b.totalMm);

  const tangentA = startTangent(ctx, left.edges[0], sample);
  const tangentB = startTangent(ctx, right.edges[0], sample);
  const orientationCompatible = tangentA.xMm * tangentB.xMm + tangentA.yMm * tangentB.yMm < 0;

  return {
    id: `sp-${iface.id}`,
    interfaceId: iface.id,
    leftLengthMm: a.totalMm,
    rightLengthMm: b.totalMm,
    commonLengthMm,
    deltaMm,
    deltaExceeds: deltaMm > maxSeamDeltaMm,
    orientationCompatible,
    pairs,
  };
}

/** Build a typed diagnostic with a stable, unique, non-empty id. */
function makeDiagnostic(
  counter: { value: number },
  constraintId: string,
  severity: DiagnosticSeverity,
  entities: readonly string[],
  message: string,
  measurementsMm: Record<string, number>,
): ConstraintDiagnostic {
  const id = `cd-${counter.value}-${constraintId}`;
  counter.value += 1;
  return {
    id,
    constraintId,
    severity,
    entities: [...entities],
    message,
    measurementsMm,
  };
}

/**
 * Evaluate the typed constraint set over every interface of the document.
 *
 * Diagnostics are emitted in document order (per interface: broken references
 * first, then resolution failures, then delta and orientation). Stored stitch
 * pairs are ignored: geometry re-sampling is the only authority. Diagnostic
 * `entities` reference only ids that resolve in the document, so attaching
 * the result to `doc.diagnostics` keeps the document serializable whenever
 * the document itself has no broken references.
 */
export function evaluateConstraints(
  doc: PatternDocument,
  options: ConstraintOptions = {},
): ConstraintDiagnostic[] {
  const maxSeamDeltaMm = options.maxSeamDeltaMm ?? DEFAULT_MAX_SEAM_DELTA_MM;
  const counter = { value: 0 };
  const diagnostics: ConstraintDiagnostic[] = [];

  for (const iface of doc.interfaces) {
    const hasLeft = doc.sequences.some((s) => s.id === iface.leftSequenceId);
    const hasRight = doc.sequences.some((s) => s.id === iface.rightSequenceId);
    if (!hasLeft) {
      diagnostics.push(
        makeDiagnostic(
          counter,
          CONSTRAINT_IDS.brokenReference,
          'error',
          [iface.id],
          `interface "${iface.id}" references missing left sequence "${iface.leftSequenceId}"`,
          {},
        ),
      );
    }
    if (!hasRight) {
      diagnostics.push(
        makeDiagnostic(
          counter,
          CONSTRAINT_IDS.brokenReference,
          'error',
          [iface.id],
          `interface "${iface.id}" references missing right sequence "${iface.rightSequenceId}"`,
          {},
        ),
      );
    }
    if (!hasLeft || !hasRight) {
      continue;
    }

    let pair: StitchPair;
    try {
      pair = resolveStitchPair(doc, iface, options);
    } catch (err) {
      if (err instanceof ConstraintResolutionError) {
        diagnostics.push(
          makeDiagnostic(
            counter,
            err.code === 'BROKEN_REFERENCE'
              ? CONSTRAINT_IDS.brokenReference
              : CONSTRAINT_IDS.nonPositiveLength,
            'error',
            [iface.id, ...err.entities],
            `interface "${iface.id}": ${err.message}`,
            {},
          ),
        );
        continue;
      }
      throw err;
    }

    if (pair.deltaExceeds) {
      diagnostics.push(
        makeDiagnostic(
          counter,
          CONSTRAINT_IDS.seamDeltaLimit,
          'warning',
          [iface.id, pair.id],
          `interface "${iface.id}" seam delta ${pair.deltaMm.toFixed(3)} mm exceeds limit ${maxSeamDeltaMm} mm`,
          {
            deltaMm: pair.deltaMm,
            maxSeamDeltaMm,
            leftLengthMm: pair.leftLengthMm,
            rightLengthMm: pair.rightLengthMm,
            commonLengthMm: pair.commonLengthMm,
          },
        ),
      );
    }
    if (!pair.orientationCompatible) {
      diagnostics.push(
        makeDiagnostic(
          counter,
          CONSTRAINT_IDS.orientationIncompatible,
          'error',
          [iface.id, pair.id],
          `interface "${iface.id}" start tangents are not anti-parallel (orientation incompatible)`,
          {
            leftLengthMm: pair.leftLengthMm,
            rightLengthMm: pair.rightLengthMm,
            commonLengthMm: pair.commonLengthMm,
          },
        ),
      );
    }
  }

  return diagnostics;
}
