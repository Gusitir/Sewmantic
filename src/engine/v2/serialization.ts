// T-45 versioned JSON serialization for the semantic pattern kernel (v2).
//
// Serialization preserves field order and element order (JSON preserves array
// order and object key insertion order), so the round-trip surface is stable.
// JSON numbers round-trip `number` doubles exactly, which is well below the
// <= 0.001 mm serialization tolerance required by the contract.
//
// Deserialization is a hard gate:
//   - rejects an unknown schemaVersion;
//   - rejects duplicate entity ids;
//   - rejects broken references (vertex/edge/sequence/panel/interface ids
//     that do not resolve inside the document);
//   - rejects structurally invalid or non-finite measurement data.

import {
  isConstraintDiagnostic,
  isEdge,
  isEdgeSequence,
  isInterface,
  isPanel,
  isPatternDocument,
  isStitchPair,
  isVertex,
  SEMANTIC_V2_SCHEMA_VERSION,
  type Component,
  type ConstraintDiagnostic,
  type Curve,
  type DiagnosticSeverity,
  type Edge,
  type EdgeRole,
  type EdgeSequence,
  type Interface,
  type Panel,
  type PatternDocument,
  type StitchPair,
  type Vertex,
} from './contracts.js';

/** Error raised when a serialized payload fails the v2 validation gates. */
export class SemanticV2Error extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`semantic v2 validation failed: ${errors.join('; ')}`);
    this.name = 'SemanticV2Error';
    this.errors = errors;
  }
}

const raw = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

/** Collect duplicate non-empty ids across all top-level collections. */
function checkDuplicateIds(doc: PatternDocument, errors: string[]): void {
  const seen = new Map<string, string>();
  const record = (id: string, source: string): void => {
    const prev = seen.get(id);
    if (prev !== undefined) {
      errors.push(`duplicate id "${id}" (${prev} and ${source})`);
    } else {
      seen.set(id, source);
    }
  };
  for (const v of doc.vertices) record(v.id, 'vertices');
  for (const e of doc.edges) record(e.id, 'edges');
  for (const s of doc.sequences) record(s.id, 'sequences');
  for (const p of doc.panels) record(p.id, 'panels');
  for (const c of doc.components) record(c.id, 'components');
  for (const i of doc.interfaces) record(i.id, 'interfaces');
  for (const s of doc.stitchPairs) record(s.id, 'stitchPairs');
  for (const d of doc.diagnostics) record(d.id, 'diagnostics');
}

/** Resolve the id sets used for reference validation. */
function indexDocument(doc: PatternDocument): {
  vertices: Set<string>;
  edges: Set<string>;
  sequences: Set<string>;
  panels: Set<string>;
  components: Set<string>;
  interfaces: Set<string>;
  stitchPairs: Set<string>;
  diagnostics: Set<string>;
} {
  return {
    vertices: new Set(doc.vertices.map((v) => v.id)),
    edges: new Set(doc.edges.map((e) => e.id)),
    sequences: new Set(doc.sequences.map((s) => s.id)),
    panels: new Set(doc.panels.map((p) => p.id)),
    components: new Set(doc.components.map((c) => c.id)),
    interfaces: new Set(doc.interfaces.map((i) => i.id)),
    stitchPairs: new Set(doc.stitchPairs.map((s) => s.id)),
    diagnostics: new Set(doc.diagnostics.map((d) => d.id)),
  };
}

function checkVertexRefs(curve: Curve, vertices: Set<string>, errors: string[]): void {
  const need = (id: string, what: string): void => {
    if (id.trim().length === 0) {
      errors.push(`empty ${what} vertex id`);
    } else if (!vertices.has(id)) {
      errors.push(`broken ${what} vertex reference "${id}"`);
    }
  };
  need(curve.startVertexId, 'start');
  need(curve.endVertexId, 'end');
  if (curve.kind === 'circularArc') need(curve.centerVertexId, 'center');
  if (curve.kind === 'quadraticBezier') need(curve.controlVertexId, 'quadratic control');
  if (curve.kind === 'cubicBezier') {
    need(curve.controlVertexAId, 'cubic control A');
    need(curve.controlVertexBId, 'cubic control B');
  }
}

/** Verify cross-entity references resolve within the document. */
function checkReferences(doc: PatternDocument, errors: string[]): void {
  const ids = indexDocument(doc);

  for (const e of doc.edges) {
    checkVertexRefs(e.curve, ids.vertices, errors);
  }
  for (const s of doc.sequences) {
    if (!ids.panels.has(s.panelId)) {
      errors.push(`sequence "${s.id}" references missing panel "${s.panelId}"`);
    }
    for (const edgeId of s.edgeIds) {
      if (!ids.edges.has(edgeId)) {
        errors.push(`sequence "${s.id}" references missing edge "${edgeId}"`);
      }
    }
  }
  for (const p of doc.panels) {
    for (const seqId of p.sequenceIds) {
      if (!ids.sequences.has(seqId)) {
        errors.push(`panel "${p.id}" references missing sequence "${seqId}"`);
      }
    }
  }
  for (const c of doc.components) {
    for (const panelId of c.panelIds) {
      if (!ids.panels.has(panelId)) {
        errors.push(`component "${c.id}" references missing panel "${panelId}"`);
      }
    }
  }
  for (const i of doc.interfaces) {
    if (!ids.sequences.has(i.leftSequenceId)) {
      errors.push(`interface "${i.id}" references missing left sequence "${i.leftSequenceId}"`);
    }
    if (!ids.sequences.has(i.rightSequenceId)) {
      errors.push(`interface "${i.id}" references missing right sequence "${i.rightSequenceId}"`);
    }
  }
  for (const s of doc.stitchPairs) {
    if (!ids.interfaces.has(s.interfaceId)) {
      errors.push(`stitchPair "${s.id}" references missing interface "${s.interfaceId}"`);
    }
  }
  for (const d of doc.diagnostics) {
    const all = new Set([
      ...ids.vertices,
      ...ids.edges,
      ...ids.sequences,
      ...ids.panels,
      ...ids.components,
      ...ids.interfaces,
      ...ids.stitchPairs,
      ...ids.diagnostics,
    ]);
    for (const entity of d.entities) {
      if (!all.has(entity)) {
        errors.push(`diagnostic "${d.id}" references missing entity "${entity}"`);
      }
    }
  }
}

/** Validate a parsed `unknown` value, returning accumulated errors. */
export function validatePatternDocument(value: unknown): string[] {
  const errors: string[] = [];
  if (!isPatternDocument(value)) {
    if (!isRecordLike(value)) {
      errors.push('payload is not a JSON object');
    } else {
      const version = raw(value).schemaVersion;
      if (version !== SEMANTIC_V2_SCHEMA_VERSION) {
        errors.push(`unsupported schemaVersion "${String(version)}"; expected ${SEMANTIC_V2_SCHEMA_VERSION}`);
      }
      errors.push('payload failed structural type guards (see rejected type)');
    }
    return errors;
  }
  const doc: PatternDocument = value;

  checkDuplicateIds(doc, errors);
  checkReferences(doc, errors);

  return errors;
}

function isRecordLike(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Serialize a v2 pattern document to a JSON string. */
export function serializeDocument(doc: PatternDocument): string {
  return JSON.stringify(doc);
}

/**
 * Deserialize a JSON string into a valid v2 pattern document.
 *
 * Throws {@link SemanticV2Error} when the payload has an unsupported
 * schemaVersion, duplicate ids, broken references, or fails structural guards.
 */
export function deserializeDocument(json: string): PatternDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new SemanticV2Error(['payload is not valid JSON']);
  }
  const errors = validatePatternDocument(parsed);
  if (errors.length > 0) {
    throw new SemanticV2Error(errors);
  }
  return parsed as PatternDocument;
}

// Re-export the contract types so a single import site covers the v2 surface.
export type {
  Component,
  ConstraintDiagnostic,
  Curve,
  DiagnosticSeverity,
  Edge,
  EdgeRole,
  EdgeSequence,
  Interface,
  Panel,
  PatternDocument,
  StitchPair,
  Vertex,
};
