// T-46 geometry surface types for the semantic pattern kernel (v2).
//
// This module owns the *plain* types the GeometryAdapter exposes to the rest
// of v2. The boundary is strict: an adapter API that is visible outside
// `geometry/` accepts and returns only v2 contracts (`Curve`, `Vertex`) and
// the plain shapes declared below. No Flatten.js type or instance ever crosses
// this boundary.
//
// Flatten.js and @flatten-js/polygon-offset are encapsulated behind the adapter
// implementation; consumers never see them.

import type { Curve, Vertex } from '../contracts.js';

/** A plain 2D point in the pattern plane (millimetres). */
export interface GeometryPoint {
  xMm: number;
  yMm: number;
}

/** Winding of a boundary loop, derived from its signed area. */
export type Winding = 'clockwise' | 'counterclockwise';

/** The three boolean polygon operators supported by the adapter. */
export type BooleanOp = 'union' | 'intersect' | 'subtract';

/**
 * Join style for an offset. Only `miter` is supported: it is the single
 * strategy selected by the offset gate (see DECISION.md). `round` and `bevel`
 * are NOT implemented in the v2 adapter and are intentionally absent from this
 * public type rather than silently substituted. Pass any other value at runtime
 * and the adapter throws a clear error.
 */
export type OffsetJoin = 'miter';

/**
 * A (multi-)polygon expressed purely with v2 `Curve` objects. `outer` is one
 * ordered closed boundary; `holes` are zero or more interior island loops.
 * Every curve references vertex ids that must resolve in the `Vertex[]` passed
 * alongside the operation.
 */
export interface LoopPolygon {
  /** Ordered closed outer boundary (one loop). */
  outer: Curve[];
  /** Interior islands, each an ordered closed loop. */
  holes: Curve[][];
}

/**
 * Manifold result of boolean / offset operations. It is self-contained: the
 * returned `vertices` hold the positions referenced by `outer`/`holes`, so the
 * result can be resolved, serialized, or re-fed into another adapter call
 * without touching input state. All values are v2 / plain objects.
 */
export interface PolygonResult {
  /** Synthesized stable vertices referenced by the returned loops. */
  vertices: Vertex[];
  /** Ordered closed outer boundary. */
  outer: Curve[];
  /** Interior islands. */
  holes: Curve[][];
  /** Winding of the outer boundary (contract: non-zero, opposite to holes). */
  winding: Winding;
}

/** Tuning for curve sampling / tessellation. */
export interface SampleOptions {
  /** Max linear chord error in millimetres when tessellating curved edges. */
  toleranceMm?: number;
  /** Hard cap on segment count per curved edge. */
  maxSegments?: number;
}

/** Options for a curve-intersection query. */
export interface IntersectOptions {
  /** Snap distinct intersection points together within this mm distance. */
  snapMm?: number;
}

/**
 * Public surface of the GeometryAdapter. Implementations accept and return only
 * v2 contracts and the plain types above; the concrete Flatten-backed adapter
 * keeps every third-party geometry type internal.
 */
export interface GeometryAdapter {
  /** Arc-length of a single v2 curve in millimetres. */
  curveLengthMm(vertices: Vertex[], curve: Curve): number;

  /** Tessellate a v2 curve into plain points (at least two). */
  sampleCurve(vertices: Vertex[], curve: Curve, options?: SampleOptions): GeometryPoint[];

  /** Signed shoelace area of an ordered closed loop, in mm^2. */
  signedAreaMm2(vertices: Vertex[], outer: Curve[]): number;

  /** Net area of the polygon (outer minus holes). */
  polygonAreaMm2(vertices: Vertex[], outer: Curve[], holes?: Curve[][]): number;

  /** Winding of the outer loop of a polygon. */
  winding(vertices: Vertex[], outer: Curve[]): Winding;

  /** True when the loop boundary is a simple polygon (no self-intersections). */
  isSimple(vertices: Vertex[], outer: Curve[]): boolean;

  /** Distinct intersection points of two v2 curves (any of the four kinds). */
  intersectCurves(
    vertices: Vertex[],
    a: Curve,
    b: Curve,
    options?: IntersectOptions,
  ): GeometryPoint[];

  /** Distinct points where a cut curve crosses a closed loop boundary. */
  cutLoop(vertices: Vertex[], loop: Curve[], cut: Curve): GeometryPoint[];

  /** Perform a boolean polygon operation; result is fully self-contained. */
  boolean(op: BooleanOp, vertices: Vertex[], subject: LoopPolygon, clip: LoopPolygon): PolygonResult;

  /** Offset a polygon boundary; result is fully self-contained. */
  offset(
    vertices: Vertex[],
    loop: LoopPolygon,
    distanceMm: number,
    join?: OffsetJoin,
  ): PolygonResult;
}
