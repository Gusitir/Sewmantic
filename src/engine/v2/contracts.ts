// T-45 productive domain contracts for the semantic pattern kernel (v2).
//
// Design rules enforced by these contracts:
// - Canonical unit is millimetres; every dimensional field is mm-suffixed
//   and documented. Serialized tolerance target is <= 0.001 mm.
// - Curve variants are a discriminated union; the domain never exposes
//   third-party geometry types (no Flatten / Maker.js / GarmentCode).
// - Identifiers are stable, non-empty strings; coordinates alone are never
//   identity.
// - The public surface contains no `any`: validation is done with type guards
//   over `unknown`.

/**
 * Canonical schema version carried by every serialized v2 document.
 * Deserialization rejects any other value.
 */
export const SEMANTIC_V2_SCHEMA_VERSION = 1;

/** Serialization tolerance in millimetres for round-trip assertions. */
export const MM_TOLERANCE = 0.001;

/** A point in the pattern plane. All measure in millimetres. */
export interface Vertex {
  id: string;
  /** x coordinate in millimetres. */
  xMm: number;
  /** y coordinate in millimetres. */
  yMm: number;
}

/**
 * Discriminated curve variants. Each variant references vertices by id so
 * that round-trip preserves identity and audits point at references rather
 * than copied coordinates.
 */
export type Curve =
  | LineCurve
  | CircularArcCurve
  | QuadraticBezierCurve
  | CubicBezierCurve;

/** A straight segment from its start vertex to its end vertex. */
export interface LineCurve {
  kind: 'line';
  /** Start vertex id (must resolve in the document's vertices). */
  startVertexId: string;
  /** End vertex id (must resolve in the document's vertices). */
  endVertexId: string;
}

/** A circular arc by centre, radius and sweep. */
export interface CircularArcCurve {
  kind: 'circularArc';
  /** Start vertex id (on the radius circle). */
  startVertexId: string;
  /** End vertex id (on the radius circle). */
  endVertexId: string;
  /** Centre vertex id. */
  centerVertexId: string;
  /** Arc radius in millimetres (> 0). */
  radiusMm: number;
  /** Sweep angle in degrees (> 0). */
  sweepAngleDeg: number;
}

/** A quadratic Bezier segment with a single control vertex. */
export interface QuadraticBezierCurve {
  kind: 'quadraticBezier';
  /** Start vertex id. */
  startVertexId: string;
  /** Control vertex id (off-curve). */
  controlVertexId: string;
  /** End vertex id. */
  endVertexId: string;
}

/** A cubic Bezier segment with two control vertices. */
export interface CubicBezierCurve {
  kind: 'cubicBezier';
  /** Start vertex id. */
  startVertexId: string;
  /** First control vertex id (off-curve). */
  controlVertexAId: string;
  /** Second control vertex id (off-curve). */
  controlVertexBId: string;
  /** End vertex id. */
  endVertexId: string;
}

/** Whether an edge belongs to a panel boundary or is an interior cut. */
export type EdgeRole = 'boundary' | 'interior';

/** A single edge of a sequence, wrapping one of the four curve variants. */
export interface Edge {
  id: string;
  role: EdgeRole;
  /** The embedded geometry. */
  curve: Curve;
}

/** An ordered run of edges on a panel (a seam target or loop outline). */
export interface EdgeSequence {
  id: string;
  /** Owning panel id (must resolve). */
  panelId: string;
  /** Human-readable seam/loop role, e.g. `'side seam'`. */
  role: string;
  /** True when the run is a closed outline loop. */
  isLoop: boolean;
  /** Ordered edge ids (must resolve and be non-empty). */
  edgeIds: string[];
}

/** A material layer / cut piece aggregating its outline and cut sequences. */
export interface Panel {
  id: string;
  /** Stable display name. */
  name: string;
  /** Material or fabric layer label. */
  material: string;
  /** Number of physical cut copies (count, not a length). */
  cutCount: number;
  /** True when cut on the fold. */
  onFold: boolean;
  /** Sequence ids owned by this panel (must resolve). */
  sequenceIds: string[];
}

/** A higher-level garment component composed of one or more panels. */
export interface Component {
  id: string;
  /** Stable display name. */
  name: string;
  /** Panel ids that make up the component (must resolve). */
  panelIds: string[];
}

/** A seam contract between two edge sequences (one per panel side). */
export interface Interface {
  id: string;
  /** Stable seam label, e.g. `'left side seam'`. */
  label: string;
  /** Left-side sequence id (must resolve). */
  leftSequenceId: string;
  /** Right-side sequence id (must resolve). */
  rightSequenceId: string;
  /** Seam allowance in millimetres (>= 0). */
  seamAllowanceMm: number;
}

/** A resolved matched sub-segment one per side, expressed in arc-length mm. */
export interface StitchSegment {
  /** Arc-length offset on the left side (mm). */
  aStartMm: number;
  /** Arc-length offset on the left side end (mm). */
  aEndMm: number;
  /** Arc-length offset on the right side (mm). */
  bStartMm: number;
  /** Arc-length offset on the right side end (mm). */
  bEndMm: number;
  /** Shared matched length in millimetres. */
  lengthMm: number;
}

/** Concrete resolved stitch segments for an interface after sampling. */
export interface StitchPair {
  id: string;
  /** Owning interface id (must resolve). */
  interfaceId: string;
  /** Total left sequence length in millimetres. */
  leftLengthMm: number;
  /** Total right sequence length in millimetres. */
  rightLengthMm: number;
  /** Common matched length in millimetres. */
  commonLengthMm: number;
  /** Absolute length difference in millimetres. */
  deltaMm: number;
  /** True when delta exceeds the matching tolerance. */
  deltaExceeds: boolean;
  /** True when start tangents point toward each other. */
  orientationCompatible: boolean;
  /** Ordered matched segments. */
  pairs: StitchSegment[];
}

/** Severity of a constraint diagnostic. */
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/** A typed, traceable constraint diagnostic. */
export interface ConstraintDiagnostic {
  id: string;
  /** Constraint id that produced the diagnostic (must resolve). */
  constraintId: string;
  severity: DiagnosticSeverity;
  /** Entity ids the diagnostic refers to (must resolve). */
  entities: string[];
  /** Human-readable non-authoritative description. */
  message: string;
  /** Measured magnitudes in millimetres, keyed by measure name. */
  measurementsMm: Record<string, number>;
}

/** The serialized root aggregate of the semantic pattern kernel. */
export interface PatternDocument {
  schemaVersion: number;
  vertices: Vertex[];
  edges: Edge[];
  sequences: EdgeSequence[];
  panels: Panel[];
  components: Component[];
  interfaces: Interface[];
  stitchPairs: StitchPair[];
  diagnostics: ConstraintDiagnostic[];
}

// --- Type guards -----------------------------------------------------------
// All guards are written over `unknown`; the public surface never exposes
// `any`.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMm(value: unknown): value is number {
  return isFiniteNumber(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isVertex(value: unknown): value is Vertex {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isMm(value.xMm) &&
    isMm(value.yMm)
  );
}

export function isLineCurve(value: unknown): value is LineCurve {
  return (
    isRecord(value) &&
    value.kind === 'line' &&
    isNonEmptyString(value.startVertexId) &&
    isNonEmptyString(value.endVertexId)
  );
}

export function isCircularArcCurve(value: unknown): value is CircularArcCurve {
  return (
    isRecord(value) &&
    value.kind === 'circularArc' &&
    isNonEmptyString(value.startVertexId) &&
    isNonEmptyString(value.endVertexId) &&
    isNonEmptyString(value.centerVertexId) &&
    isMm(value.radiusMm) &&
    value.radiusMm > 0 &&
    isMm(value.sweepAngleDeg) &&
    value.sweepAngleDeg > 0
  );
}

export function isQuadraticBezierCurve(value: unknown): value is QuadraticBezierCurve {
  return (
    isRecord(value) &&
    value.kind === 'quadraticBezier' &&
    isNonEmptyString(value.startVertexId) &&
    isNonEmptyString(value.controlVertexId) &&
    isNonEmptyString(value.endVertexId)
  );
}

export function isCubicBezierCurve(value: unknown): value is CubicBezierCurve {
  return (
    isRecord(value) &&
    value.kind === 'cubicBezier' &&
    isNonEmptyString(value.startVertexId) &&
    isNonEmptyString(value.controlVertexAId) &&
    isNonEmptyString(value.controlVertexBId) &&
    isNonEmptyString(value.endVertexId)
  );
}

export function isCurve(value: unknown): value is Curve {
  return (
    isLineCurve(value) ||
    isCircularArcCurve(value) ||
    isQuadraticBezierCurve(value) ||
    isCubicBezierCurve(value)
  );
}

export function isEdge(value: unknown): value is Edge {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.role === 'boundary' || value.role === 'interior') &&
    isCurve(value.curve)
  );
}

export function isEdgeSequence(value: unknown): value is EdgeSequence {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.panelId) &&
    isString(value.role) &&
    isBoolean(value.isLoop) &&
    isStringArray(value.edgeIds) &&
    value.edgeIds.length > 0
  );
}

export function isPanel(value: unknown): value is Panel {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isString(value.material) &&
    isFiniteNumber(value.cutCount) &&
    value.cutCount >= 1 &&
    isBoolean(value.onFold) &&
    isStringArray(value.sequenceIds)
  );
}

export function isComponent(value: unknown): value is Component {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isStringArray(value.panelIds) &&
    value.panelIds.length > 0
  );
}

export function isInterface(value: unknown): value is Interface {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.label) &&
    isNonEmptyString(value.leftSequenceId) &&
    isNonEmptyString(value.rightSequenceId) &&
    isMm(value.seamAllowanceMm) &&
    value.seamAllowanceMm >= 0
  );
}

export function isStitchSegment(value: unknown): value is StitchSegment {
  return (
    isRecord(value) &&
    isMm(value.aStartMm) &&
    isMm(value.aEndMm) &&
    isMm(value.bStartMm) &&
    isMm(value.bEndMm) &&
    isMm(value.lengthMm)
  );
}

export function isStitchPair(value: unknown): value is StitchPair {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.interfaceId) &&
    isMm(value.leftLengthMm) &&
    isMm(value.rightLengthMm) &&
    isMm(value.commonLengthMm) &&
    isMm(value.deltaMm) &&
    isBoolean(value.deltaExceeds) &&
    isBoolean(value.orientationCompatible) &&
    Array.isArray(value.pairs) &&
    value.pairs.every(isStitchSegment)
  );
}

export function isConstraintDiagnostic(value: unknown): value is ConstraintDiagnostic {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.constraintId) &&
    (value.severity === 'error' ||
      value.severity === 'warning' ||
      value.severity === 'info') &&
    isStringArray(value.entities) &&
    isString(value.message) &&
    isRecord(value.measurementsMm) &&
    Object.values(value.measurementsMm).every(isMm)
  );
}

export function isPatternDocument(value: unknown): value is PatternDocument {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== SEMANTIC_V2_SCHEMA_VERSION) return false;
  return (
    isRecord(value) &&
    value.schemaVersion === SEMANTIC_V2_SCHEMA_VERSION &&
    Array.isArray(value.vertices) &&
    value.vertices.every(isVertex) &&
    Array.isArray(value.edges) &&
    value.edges.every(isEdge) &&
    Array.isArray(value.sequences) &&
    value.sequences.every(isEdgeSequence) &&
    Array.isArray(value.panels) &&
    value.panels.every(isPanel) &&
    Array.isArray(value.components) &&
    value.components.every(isComponent) &&
    Array.isArray(value.interfaces) &&
    value.interfaces.every(isInterface) &&
    Array.isArray(value.stitchPairs) &&
    value.stitchPairs.every(isStitchPair) &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isConstraintDiagnostic)
  );
}
