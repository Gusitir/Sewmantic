// T-42 semantic kernel spike: minimal GarmentCode-inspired TypeScript-style
// model written as ESM (.mjs) so it needs no new dependency and no build step.
// The kernel models Edge, EdgeSequence, Panel, Interface and StitchPair and
// exposes deterministic seam matching, cut/dart insertion and JSON round-trip.
// This is spike code under experiments/; it is not product code.

const EPSILON = 1e-9;

const dist = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by);
const unit = ([x, y]) => {
  const m = Math.hypot(x, y);
  return m < EPSILON ? [0, 0] : [x / m, y / m];
};
const dirOf = (a, b) => unit([b[0] - a[0], b[1] - a[1]]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

// A single straight garment edge. It carries its own coordinates (convenience
// for SVG/diagnostics) plus vertex identity ids so that round-trip keeps
// vertex coherence and audit traces point references, not copied coordinates.
class Edge {
  constructor({ id, kind = 'boundary', vertexA, vertexB, start, end }) {
    this.id = id;
    this.kind = kind; // 'boundary' | 'interior'
    this.vertexA = vertexA;
    this.vertexB = vertexB;
    this.start = start;
    this.end = end;
  }

  length() {
    return dist(this.start, this.end);
  }

  direction() {
    return dirOf(this.start, this.end);
  }

  splitAt(s) {
    return [
      new Edge({
        id: `${this.id}.s1`,
        kind: this.kind,
        vertexA: this.vertexA,
        vertexB: `${this.vertexA}#${this.vertexB}#mid`,
        start: this.start,
        end: s,
      }),
      new Edge({
        id: `${this.id}.s2`,
        kind: this.kind,
        vertexA: `${this.vertexA}#${this.vertexB}#mid`,
        vertexB: this.vertexB,
        start: s,
        end: this.end,
      }),
    ];
  }

  toJSON() {
    return { id: this.id, kind: this.kind, vertexA: this.vertexA, vertexB: this.vertexB, start: this.start, end: this.end };
  }
}

// An ordered list of edges that form a contiguous run on a panel. A run can be
// a boundary segment (a seam target) or an interior cut. isLoop distinguishes
// closed outline loops from open runs.
class EdgeSequence {
  constructor({ id, panelId, role, isLoop = false, edgeIds = [] }) {
    this.id = id;
    this.panelId = panelId;
    this.role = role; // human-readable seam/loop role, e.g. 'side seam'
    this.isLoop = isLoop;
    this.edgeIds = edgeIds;
  }

  edges(kernel) {
    return this.edgeIds.map((id) => kernel.edges.get(id)).filter(Boolean);
  }

  length(kernel) {
    return this.edges(kernel).reduce((sum, edge) => sum + edge.length(), 0);
  }

  startPoint(kernel) {
    const edge = this.edges(kernel)[0];
    return edge ? edge.start : null;
  }

  endPoint(kernel) {
    const edges = this.edges(kernel);
    return edges.length ? edges[edges.length - 1].end : null;
  }

  // Unit tangent at the run start. Used for orientation compatibility of seams.
  startTangent(kernel) {
    const edge = this.edges(kernel)[0];
    return edge ? edge.direction() : [0, 0];
  }

  // Array of cumulative boundary offsets; length === edgeIds.length + 1.
  cumulative(kernel) {
    const out = [0];
    for (const edge of this.edges(kernel)) out.push(out[out.length - 1] + edge.length());
    return out;
  }

  // Point at arc-length offset s along the run.
  pointAt(kernel, s) {
    const edges = this.edges(kernel);
    const cum = this.cumulative(kernel);
    for (let i = 0; i < edges.length; i += 1) {
      if (s <= cum[i + 1] + EPSILON) {
        const local = s - cum[i];
        const f = edges[i].length() < EPSILON ? 0 : Math.min(1, Math.max(0, local / edges[i].length()));
        return lerp(edges[i].start, edges[i].end, f);
      }
    }
    const last = edges[edges.length - 1];
    return last ? last.end : null;
  }

  toJSON() {
    return { id: this.id, panelId: this.panelId, role: this.role, isLoop: this.isLoop, edgeIds: this.edgeIds };
  }
}

class Panel {
  constructor({ id, name, material, sequenceIds = [] }) {
    this.id = id;
    this.name = name;
    this.material = material;
    this.sequenceIds = sequenceIds;
  }

  sequences(kernel) {
    return this.sequenceIds.map((id) => kernel.sequences.get(id)).filter(Boolean);
  }

  boundaryLength(kernel) {
    return this.sequences(kernel).reduce((sum, seq) => sum + (seq.isLoop ? seq.length(kernel) : 0), 0);
  }

  toJSON() {
    return { id: this.id, name: this.name, material: this.material, sequenceIds: this.sequenceIds };
  }
}

// A seam contract between two EdgeSequences (one per panel side). Matching is
// computed per interface so mutations propagate naturally.
class Interface {
  constructor({ id, label, leftSequenceId, rightSequenceId, seamAllowance = 0 }) {
    this.id = id;
    this.label = label;
    this.leftSequenceId = leftSequenceId;
    this.rightSequenceId = rightSequenceId;
    this.seamAllowance = seamAllowance;
  }

  left(kernel) {
    return kernel.sequences.get(this.leftSequenceId);
  }

  right(kernel) {
    return kernel.sequences.get(this.rightSequenceId);
  }

  match(kernel, toleranceMm = 3) {
    return matchSequences(this, kernel, toleranceMm);
  }

  toJSON() {
    return { id: this.id, label: this.label, leftSequenceId: this.leftSequenceId, rightSequenceId: this.rightSequenceId, seamAllowance: this.seamAllowance };
  }
}

// Concrete, resolved stitch segments for an interface after sampling. Matched
// sub-segments are created by merging both sides' cumulative boundary offsets,
// so each produced pair always covers an equal length on both sides (the
// segmentation differs but no total length is dropped between the run starts).
class StitchPair {
  constructor({ id, interfaceId, leftLength, rightLength, commonLength, delta, deltaExceeds, orientationCompatible, pairs }) {
    this.id = id;
    this.interfaceId = interfaceId;
    this.leftLength = leftLength;
    this.rightLength = rightLength;
    this.commonLength = commonLength;
    this.delta = delta;
    this.deltaExceeds = deltaExceeds;
    this.orientationCompatible = orientationCompatible;
    this.pairs = pairs; // [{ aIndex, bIndex, aStart, aEnd, bStart, bEnd, aLen, bLen, residual }]
  }

  toJSON() {
    return { id: this.id, interfaceId: this.interfaceId, leftLength: this.leftLength, rightLength: this.rightLength, commonLength: this.commonLength, delta: this.delta, deltaExceeds: this.deltaExceeds, orientationCompatible: this.orientationCompatible, pairs: this.pairs };
  }
}

const containingIndex = (cum, s) => {
  for (let i = 0; i < cum.length - 1; i += 1) {
    if (s <= cum[i + 1] + EPSILON) return i;
  }
  return cum.length - 2;
};

function matchSequences(iface, kernel, toleranceMm = 3) {
  const left = iface.left(kernel);
  const right = iface.right(kernel);
  const leftLength = left.length(kernel);
  const rightLength = right.length(kernel);
  const commonLength = Math.min(leftLength, rightLength);
  const delta = Math.abs(leftLength - rightLength);

  const cumLeft = left.cumulative(kernel);
  const cumRight = right.cumulative(kernel);
  const breakpoints = new Set([0, commonLength]);
  for (const b of cumLeft) if (b < commonLength - EPSILON) breakpoints.add(Math.min(b, commonLength));
  for (const b of cumRight) if (b < commonLength - EPSILON) breakpoints.add(Math.min(b, commonLength));
  const breaks = [...breakpoints].sort((a, b) => a - b);

  const pairs = [];
  for (let i = 0; i < breaks.length - 1; i += 1) {
    const s0 = breaks[i];
    const s1 = breaks[i + 1];
    pairs.push({
      aIndex: containingIndex(cumLeft, s0),
      bIndex: containingIndex(cumRight, s0),
      aStart: left.pointAt(kernel, s0),
      aEnd: left.pointAt(kernel, s1),
      bStart: right.pointAt(kernel, s0),
      bEnd: right.pointAt(kernel, s1),
      aLen: s1 - s0,
      bLen: s1 - s0,
      residual: 0,
    });
  }

  // Two runs are seam-compatible when their start tangents face opposite
  // directions (pieces fold toward each other along the seam). Aligned starts
  // indicate a mirrored or mis-oriented pair and are rejected.
  const tangentA = left.startTangent(kernel);
  const tangentB = right.startTangent(kernel);
  const orientationCompatible = tangentA.length > EPSILON && tangentB.length > EPSILON && dot(tangentA, tangentB) < -0.5;

  return new StitchPair({
    id: `${iface.id}.pair`,
    interfaceId: iface.id,
    leftLength,
    rightLength,
    commonLength,
    delta,
    deltaExceeds: delta > toleranceMm + EPSILON,
    orientationCompatible,
    pairs,
  });
}

// The kernel owns the id-indexed state. All mutations flow through it so that
// every change is traceable and round-trip preserves identity.
class SemanticKernel {
  constructor() {
    this.edges = new Map();
    this.sequences = new Map();
    this.panels = new Map();
    this.interfaces = new Map();
  }

  addEdge(edge) {
    this.edges.set(edge.id, edge);
    return edge;
  }

  addSequence(seq) {
    this.sequences.set(seq.id, seq);
    return seq;
  }

  addPanel(panel) {
    this.panels.set(panel.id, panel);
    return panel;
  }

  addInterface(iface) {
    this.interfaces.set(iface.id, iface);
    return iface;
  }

  // Split one edge of a sequence at fraction 0<t<1 (a cut). Total run length is
  // preserved; only segmentation changes. Affected interfaces re-resolve lazily.
  cutSequence(sequenceId, edgeIndex, t) {
    const seq = this.sequences.get(sequenceId);
    if (!seq) throw new Error(`unknown sequence ${sequenceId}`);
    const edge = this.edges.get(seq.edgeIds[edgeIndex]);
    if (!edge) throw new Error(`unknown edge at index ${edgeIndex}`);
    const point = lerp(edge.start, edge.end, t);
    const [a, b] = edge.splitAt(point);
    this.edges.delete(edge.id);
    this.addEdge(a);
    this.addEdge(b);
    seq.edgeIds.splice(edgeIndex, 1, a.id, b.id);
    return point;
  }

  // Insert a dart notch of `depth` mm into the sequence at arc-length offset,
  // replacing the affected edge with a V-shape that adds 2*depth to the run
  // length. The affected interface re-matches against the new length.
  insertDart(sequenceId, atOffset, depth) {
    const seq = this.sequences.get(sequenceId);
    if (!seq) throw new Error(`unknown sequence ${sequenceId}`);
    const cum = seq.cumulative(this);
    const edgeIndex = containingIndex(cum, atOffset);
    const edge = this.edges.get(seq.edgeIds[edgeIndex]);
    const segStartOffset = cum[edgeIndex];
    const segEndOffset = cum[edgeIndex + 1];

    // Snap the realized insertion arc-length to the strict interior of the
    // selected edge. If the caller's atOffset lands exactly on a vertex of the
    // selected edge, both the leading (d1) and trailing (d4) dart legs would
    // otherwise collapse to zero length. Relocating to the edge midpoint keeps
    // the V shape real while preserving the exact +2*depth added length.
    let s = atOffset;
    if (s <= segStartOffset + EPSILON || s >= segEndOffset - EPSILON) {
      s = segStartOffset + (segEndOffset - segStartOffset) / 2;
    }

    const mid = seq.pointAt(this, s);
    const start = edge.start;
    const end = edge.end;
    const tangent = dirOf(start, end);
    const outward = [-tangent[1], tangent[0]];
    const apex = [mid[0] + outward[0] * depth, mid[1] + outward[1] * depth];
    const newEdges = [
      new Edge({ id: `${edge.id}.d1`, kind: 'interior', vertexA: edge.vertexA, vertexB: `${edge.vertexA}#dart`, start, end: mid }),
      new Edge({ id: `${edge.id}.d2`, kind: 'interior', vertexA: `${edge.vertexA}#dart`, vertexB: `${edge.vertexB}#dart`, start: mid, end: apex }),
      new Edge({ id: `${edge.id}.d3`, kind: 'interior', vertexA: `${edge.vertexB}#dart`, vertexB: `${edge.vertexA}#dart`, start: apex, end: mid }),
      new Edge({ id: `${edge.id}.d4`, kind: 'interior', vertexA: `${edge.vertexA}#dart`, vertexB: edge.vertexB, start: mid, end }),
    ];
    this.edges.delete(edge.id);
    newEdges.forEach((e) => this.addEdge(e));
    seq.edgeIds.splice(edgeIndex, 1, ...newEdges.map((e) => e.id));
    return { apex, addedLength: 2 * depth };
  }

  toJSON() {
    return {
      edges: [...this.edges.values()].map((e) => e.toJSON()),
      sequences: [...this.sequences.values()].map((s) => s.toJSON()),
      panels: [...this.panels.values()].map((p) => p.toJSON()),
      interfaces: [...this.interfaces.values()].map((i) => i.toJSON()),
    };
  }

  static fromJSON(data) {
    const kernel = new SemanticKernel();
    for (const e of data.edges) kernel.addEdge(new Edge(e));
    for (const s of data.sequences) kernel.addSequence(new EdgeSequence(s));
    for (const p of data.panels) kernel.addPanel(new Panel(p));
    for (const i of data.interfaces) kernel.addInterface(new Interface(i));
    return kernel;
  }

  idsSnapshot() {
    return {
      edges: [...this.edges.keys()].sort(),
      sequences: [...this.sequences.keys()].sort(),
      panels: [...this.panels.keys()].sort(),
      interfaces: [...this.interfaces.keys()].sort(),
    };
  }

  diagnostic(kernelId = 'kernel') {
    const matches = [...this.interfaces.values()].map((iface) => iface.match(this));
    return {
      kernelId,
      panelCount: this.panels.size,
      sequenceCount: this.sequences.size,
      edgeCount: this.edges.size,
      interfaceCount: this.interfaces.size,
      seamMeters: matches.reduce((sum, m) => sum + m.commonLength, 0),
      interfaces: Object.fromEntries(matches.map((m) => [m.interfaceId, m.toJSON()])),
    };
  }
}

export { Edge, EdgeSequence, Panel, Interface, StitchPair, SemanticKernel, matchSequences };
