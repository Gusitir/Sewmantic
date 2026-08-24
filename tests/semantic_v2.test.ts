// T-45 contract tests for the semantic pattern kernel (v2).
//
// Gates covered:
//   - valid versioned round-trip preserving ids, semantic fields, order,
//     references and all measurements within <= 0.001 mm;
//   - rejection of an unknown schemaVersion;
//   - rejection of duplicate ids;
//   - rejection of broken references (vertex, edge, sequence, panel,
//     interface), including a broken internal curve vertex reference;
//   - all four discriminating curve variants survive round-trip.

import { describe, expect, it } from 'vitest';

import {
  deserializeDocument,
  serializeDocument,
  SEMANTIC_V2_SCHEMA_VERSION,
  SemanticV2Error,
  type PatternDocument,
  type StitchSegment,
  type ConstraintDiagnostic,
} from '../src/engine/v2/index.js';

const expectMmClose = (actual: number, expected: number): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.001);
};

/** Stable fixture exercising all collections, curve kinds and references. */
function buildFixture(): PatternDocument {
  const vertices = [
    { id: 'v0', xMm: 0, yMm: 0 },
    { id: 'v1', xMm: 100, yMm: 0 },
    { id: 'v2', xMm: 100, yMm: 200 },
    { id: 'v3', xMm: 0, yMm: 240 },
    { id: 'vC', xMm: 50, yMm: 220 },
    { id: 'vA', xMm: 75, yMm: 220 },
    { id: 'vB', xMm: 50, yMm: 245 },
    { id: 'vQ', xMm: 150, yMm: 60 },
    { id: 'vC1', xMm: 60, yMm: -20 },
    { id: 'vC2', xMm: 140, yMm: -30 },
    { id: 'vK', xMm: 10, yMm: 10 },
  ];

  const edges = [
    { id: 'e0', role: 'boundary' as const, curve: { kind: 'line' as const, startVertexId: 'v0', endVertexId: 'v1' } },
    { id: 'e1', role: 'boundary' as const, curve: { kind: 'quadraticBezier' as const, startVertexId: 'v1', controlVertexId: 'vQ', endVertexId: 'v2' } },
    { id: 'e2', role: 'boundary' as const, curve: { kind: 'circularArc' as const, startVertexId: 'vA', endVertexId: 'vB', centerVertexId: 'vC', radiusMm: 25, sweepAngleDeg: 90, clockwise: true } },
    { id: 'e3', role: 'boundary' as const, curve: { kind: 'line' as const, startVertexId: 'v3', endVertexId: 'v0' } },
    { id: 'e4', role: 'interior' as const, curve: { kind: 'cubicBezier' as const, startVertexId: 'v0', controlVertexAId: 'vC1', controlVertexBId: 'vC2', endVertexId: 'v2' } },
  ];

  const sequences = [
    { id: 'seq0', panelId: 'p0', role: 'outer loop', isLoop: true, edgeIds: ['e0', 'e1', 'e2', 'e3'] },
    { id: 'seq1', panelId: 'p0', role: 'slash cut', isLoop: false, edgeIds: ['e4'] },
  ];

  const panels = [
    { id: 'p0', name: 'front panel', material: 'shell', cutCount: 2, onFold: false, sequenceIds: ['seq0', 'seq1'] },
  ];

  const components = [
    { id: 'c0', name: 'bodice', panelIds: ['p0'] },
  ];

  const interfaces = [
    { id: 'i0', label: 'left side seam', leftSequenceId: 'seq0', rightSequenceId: 'seq1', seamAllowanceMm: 12.25 },
  ];

  const segments: StitchSegment[] = [
    { aStartMm: 0, aEndMm: 340.75, bStartMm: 0, bEndMm: 340.75, lengthMm: 340.75 },
  ];

  const stitchPairs = [
    {
      id: 'sp0',
      interfaceId: 'i0',
      leftLengthMm: 340.75,
      rightLengthMm: 340.75,
      commonLengthMm: 340.75,
      deltaMm: 0,
      deltaExceeds: false,
      orientationCompatible: true,
      pairs: segments,
    },
  ];

  const diagnostics: ConstraintDiagnostic[] = [
    {
      id: 'd0',
      constraintId: 'constraint-seam-length',
      severity: 'warning',
      entities: ['i0', 'sp0'],
      message: 'seam delta exceeds tolerance',
      measurementsMm: { deltaMm: 0.75, seamAllowanceMm: 12.25 },
    },
  ];

  return {
    schemaVersion: SEMANTIC_V2_SCHEMA_VERSION,
    vertices,
    edges,
    sequences,
    panels,
    components,
    interfaces,
    stitchPairs,
    diagnostics,
  };
}

function cloneJson(value: PatternDocument): PatternDocument {
  return JSON.parse(JSON.stringify(value)) as PatternDocument;
}

/** Module-level fixture factory shared across all describe blocks. */
const fixture = (): PatternDocument => buildFixture();

describe('semantic v2 contract round-trip', () => {
  const fixture = () => buildFixture();
  const roundtrip = (doc: PatternDocument): PatternDocument =>
    deserializeDocument(serializeDocument(doc));

  it('resolves to itself and rejects an unknown schemaVersion', () => {
    const original = fixture();
    const restored = roundtrip(original);
    expect(restored.schemaVersion).toBe(SEMANTIC_V2_SCHEMA_VERSION);
    expect(isEqualWithinTolerance(original, restored)).toBe(true);
  });

  it('preserves entity order across collections and within references', () => {
    const restored = roundtrip(fixture());
    expect(restored.vertices.map((v) => v.id)).toEqual(['v0', 'v1', 'v2', 'v3', 'vC', 'vA', 'vB', 'vQ', 'vC1', 'vC2', 'vK']);
    expect(restored.edges.map((e) => e.id)).toEqual(['e0', 'e1', 'e2', 'e3', 'e4']);
    expect(restored.sequences.map((s) => s.id)).toEqual(['seq0', 'seq1']);
    expect(restored.panels.map((p) => p.id)).toEqual(['p0']);
    expect(restored.components.map((c) => c.id)).toEqual(['c0']);
    expect(restored.sequences[0].edgeIds).toEqual(['e0', 'e1', 'e2', 'e3']);
    expect(restored.interfaces[0].leftSequenceId).toBe('seq0');
  });

  it('preserves all four curve variants and their references', () => {
    const restored = roundtrip(fixture());
    expect(restored.edges[0].curve.kind).toBe('line');
    expect(restored.edges[0].curve.startVertexId).toBe('v0');
    expect(restored.edges[1].curve.kind).toBe('quadraticBezier');
    expect(restored.edges[1].curve.controlVertexId).toBe('vQ');
    expect(restored.edges[2].curve.kind).toBe('circularArc');
    if (restored.edges[2].curve.kind === 'circularArc') {
      expect(restored.edges[2].curve.startVertexId).toBe('vA');
      expect(restored.edges[2].curve.endVertexId).toBe('vB');
      expect(restored.edges[2].curve.centerVertexId).toBe('vC');
      expect(restored.edges[2].curve.radiusMm).toBe(25);
      expect(restored.edges[2].curve.sweepAngleDeg).toBe(90);
      expect(restored.edges[2].curve.clockwise).toBe(true);
    }
    expect(restored.edges[4].curve.kind).toBe('cubicBezier');
    if (restored.edges[4].curve.kind === 'cubicBezier') {
      expect(restored.edges[4].curve.controlVertexAId).toBe('vC1');
      expect(restored.edges[4].curve.controlVertexBId).toBe('vC2');
    }
  });

  it('preserves semantic fields and measurements within 0.001 mm', () => {
    const original = fixture();
    const restored = roundtrip(original);
    expect(isEqualWithinTolerance(original, restored)).toBe(true);

    const px = restored.panels[0];
    expect(px.cutCount).toBe(2);
    expect(px.onFold).toBe(false);
    expect(restored.interfaces[0].seamAllowanceMm).toBe(12.25);
    expectMmClose(restored.stitchPairs[0].leftLengthMm, 340.75);
    expectMmClose(restored.stitchPairs[0].commonLengthMm, 340.75);
    expect(restored.stitchPairs[0].pairs[0].lengthMm).toBe(340.75);
  });

  it('rejects an unknown schemaVersion', () => {
    const corrupted = cloneJson(fixture());
    corrupted.schemaVersion = 999;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(SemanticV2Error);
    try {
      deserializeDocument(JSON.stringify(corrupted));
    } catch (err) {
      expect(err).toBeInstanceOf(SemanticV2Error);
      expect((err as SemanticV2Error).errors.join(' ')).toContain('schemaVersion');
    }
  });

  it('rejects duplicate ids', () => {
    const corrupted = cloneJson(fixture());
    corrupted.vertices.push(corrupted.vertices[0]);
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/duplicate id/);
  });

  it('rejects duplicate ids even across different collections', () => {
    const corrupted = cloneJson(fixture());
    corrupted.panels.push({ ...corrupted.panels[0], id: corrupted.sequences[0].id });
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/duplicate id/);
  });

  it('rejects a broken vertex reference inside a curve and a dangling edge', () => {
    const badCurve = cloneJson(fixture());
    (badCurve.edges[0].curve as { endVertexId: string }).endVertexId = 'vNOPE';
    expect(() => deserializeDocument(JSON.stringify(badCurve)))
      .toThrowError(/vertex reference "vNOPE"/);

    const badEdge = cloneJson(fixture());
    badEdge.sequences[0].edgeIds.push('eNOPE');
    expect(() => deserializeDocument(JSON.stringify(badEdge)))
      .toThrowError(/missing edge "eNOPE"/);
  });

  it('rejects broken sequence, panel, interface and diagnostic references', () => {
    const badPanel = cloneJson(fixture());
    badPanel.sequences[0].panelId = 'pNOPE';
    expect(() => deserializeDocument(JSON.stringify(badPanel)))
      .toThrowError(/missing panel "pNOPE"/);

    const badComponent = cloneJson(fixture());
    badComponent.components[0].panelIds.push('pNOPE2');
    expect(() => deserializeDocument(JSON.stringify(badComponent)))
      .toThrowError(/missing panel "pNOPE2"/);

    const badInterface = cloneJson(fixture());
    badInterface.interfaces[0].rightSequenceId = 'seqNOPE';
    expect(() => deserializeDocument(JSON.stringify(badInterface)))
      .toThrowError(/missing right sequence "seqNOPE"/);

    const badStitch = cloneJson(fixture());
    badStitch.stitchPairs[0].interfaceId = 'iNOPE';
    expect(() => deserializeDocument(JSON.stringify(badStitch)))
      .toThrowError(/missing interface "iNOPE"/);

    const badDiag = cloneJson(fixture());
    badDiag.diagnostics[0].entities.push('vNOPE');
    expect(() => deserializeDocument(JSON.stringify(badDiag)))
      .toThrowError(/missing entity "vNOPE"/);
  });

  it('rejects structurally invalid measurement data', () => {
    const badRadius = cloneJson(fixture());
    if (badRadius.edges[2].curve.kind === 'circularArc') {
      badRadius.edges[2].curve.radiusMm = Number.NaN;
    }
    expect(() => deserializeDocument(JSON.stringify(badRadius)))
      .toThrowError(SemanticV2Error);

    const badVersion = cloneJson(fixture());
    // @ts-expect-error intentionally invalid element count breaks the guard
    badVersion.vertices = badVersion.vertices.filter((_, i) => i < 2);
    expect(() => deserializeDocument(JSON.stringify(badVersion)))
      .toThrowError(SemanticV2Error);
  });
});

describe('semantic v2 circular arc contract', () => {
  const arc = (doc: PatternDocument) =>
    doc.edges[2].curve.kind === 'circularArc' ? doc.edges[2].curve : null;

  it('rejects an arc with a non-boolean / missing clockwise', () => {
    for (const bad of ['yes', 1, null, undefined]) {
      const corrupted = cloneJson(fixture());
      const a = arc(corrupted);
      if (!a) throw new Error('fixture arc missing');
      // @ts-expect-error intentionally invalid clockwise breaks the guard
      (a as Record<string, unknown>).clockwise = bad;
      expect(() => deserializeDocument(JSON.stringify(corrupted)))
        .toThrowError(SemanticV2Error);
    }
  });

  it('rejects a zero or >360 sweep angle', () => {
    for (const sweep of [0, -90, 361]) {
      const corrupted = cloneJson(fixture());
      const a = arc(corrupted);
      if (!a) throw new Error('fixture arc missing');
      a.sweepAngleDeg = sweep;
      expect(() => deserializeDocument(JSON.stringify(corrupted)))
        .toThrowError(SemanticV2Error);
    }
  });

  it('accepts a 360 sweep (full circle) geometry', () => {
    // Full circle with coincident start/end kept on the radius circle.
    const doc = cloneJson(fixture());
    const a = arc(doc);
    if (!a) throw new Error('fixture arc missing');
    a.sweepAngleDeg = 360;
    a.endVertexId = 'vA';
    expect(() => deserializeDocument(JSON.stringify(doc))).not.toThrow();
  });

  it('rejects a radius that does not match the resolved geometry', () => {
    const corrupted = cloneJson(fixture());
    const a = arc(corrupted);
    if (!a) throw new Error('fixture arc missing');
    a.radiusMm = 999;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(SemanticV2Error);
    try {
      deserializeDocument(JSON.stringify(corrupted));
    } catch (err) {
      expect((err as SemanticV2Error).errors.join(' ')).toContain('radiusMm');
    }
  });

  it('rejects a start vertex off the radius circle', () => {
    const corrupted = cloneJson(fixture());
    const vA = corrupted.vertices.find((v) => v.id === 'vA');
    if (!vA) throw new Error('fixture vertex vA missing');
    vA.xMm = 90;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/center-to-start/);
  });

  it('rejects an end vertex off the radius circle', () => {
    const corrupted = cloneJson(fixture());
    const vB = corrupted.vertices.find((v) => v.id === 'vB');
    if (!vB) throw new Error('fixture vertex vB missing');
    vB.yMm = 260;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/center-to-end/);
  });
});

describe('semantic v2 degenerate line contract', () => {
  it('rejects a line whose start vertex equals its end vertex', () => {
    const corrupted = cloneJson(fixture());
    if (corrupted.edges[0].curve.kind === 'line') {
      corrupted.edges[0].curve.endVertexId = corrupted.edges[0].curve.startVertexId;
    }
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/degenerate/);
  });
});

describe('semantic v2 stitch contract', () => {
  const pair = (doc: PatternDocument) => doc.stitchPairs[0];

  it('rejects a segment with a negative offset', () => {
    const corrupted = cloneJson(fixture());
    pair(corrupted).pairs[0].aStartMm = -1;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(SemanticV2Error);
    try {
      deserializeDocument(JSON.stringify(corrupted));
    } catch (err) {
      expect((err as SemanticV2Error).errors.join(' ')).toContain('>= 0');
    }
  });

  it('rejects a degenerate A span (end <= start)', () => {
    const corrupted = cloneJson(fixture());
    pair(corrupted).pairs[0].aEndMm = pair(corrupted).pairs[0].aStartMm;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/aEndMm > aStartMm/);
  });

  it('rejects a degenerate B span (end <= start)', () => {
    const corrupted = cloneJson(fixture());
    pair(corrupted).pairs[0].bEndMm = 0;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/bEndMm > bStartMm/);
  });

  it('rejects an A span that differs from lengthMm', () => {
    const corrupted = cloneJson(fixture());
    pair(corrupted).pairs[0].aEndMm = 200;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/A span/);
  });

  it('rejects a B span that differs from lengthMm', () => {
    const corrupted = cloneJson(fixture());
    pair(corrupted).pairs[0].bEndMm = 200;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/B span/);
  });

  it('rejects an empty pair list', () => {
    const corrupted = cloneJson(fixture());
    pair(corrupted).pairs = [];
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/at least one segment/);
  });

  it('rejects negative left/right/common/delta lengths', () => {
    for (const key of ['leftLengthMm', 'rightLengthMm', 'commonLengthMm', 'deltaMm'] as const) {
      const corrupted = cloneJson(fixture());
      // @ts-expect-error intentionally invalid negative length
      pair(corrupted)[key] = -5;
      expect(() => deserializeDocument(JSON.stringify(corrupted)))
        .toThrowError(SemanticV2Error);
    }
  });

  it('rejects a deltaMm incoherent with abs(left - right)', () => {
    const corrupted = cloneJson(fixture());
    pair(corrupted).deltaMm = 1.5;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/deltaMm/);
  });

  it('rejects a commonLengthMm incoherent with pair coverage', () => {
    const corrupted = cloneJson(fixture());
    pair(corrupted).commonLengthMm = 10;
    expect(() => deserializeDocument(JSON.stringify(corrupted)))
      .toThrowError(/commonLengthMm/);
  });

  it('round-trips a valid multi-segment stitch pair', () => {
    const doc = cloneJson(fixture());
    const p = pair(doc);
    p.leftLengthMm = 100;
    p.rightLengthMm = 100;
    p.deltaMm = 0;
    p.deltaExceeds = false;
    p.pairs = [
      { aStartMm: 0, aEndMm: 40, bStartMm: 0, bEndMm: 40, lengthMm: 40 },
      { aStartMm: 40, aEndMm: 100, bStartMm: 40, bEndMm: 100, lengthMm: 60 },
    ];
    p.commonLengthMm = 100;
    expect(() => deserializeDocument(JSON.stringify(doc))).not.toThrow();
    const restored = deserializeDocument(serializeDocument(doc));
    expect(restored.stitchPairs[0].pairs.length).toBe(2);
  });
});

describe('semantic v2 serializeDocument validation', () => {
  it('rejects an unsupported schema version before stringify', () => {
    const corrupted = cloneJson(fixture());
    corrupted.schemaVersion = 999;
    expect(() => serializeDocument(corrupted)).toThrowError(SemanticV2Error);
  });

  it('rejects NaN measurements before stringify', () => {
    const corrupted = cloneJson(fixture());
    const arc = corrupted.edges[2];
    if (arc.curve.kind === 'circularArc') {
      arc.curve.radiusMm = Number.NaN;
    }
    expect(() => serializeDocument(corrupted)).toThrowError(SemanticV2Error);
  });

  it('rejects broken references before stringify', () => {
    const corrupted = cloneJson(fixture());
    if (corrupted.edges[0].curve.kind === 'line') {
      corrupted.edges[0].curve.endVertexId = 'vNOPE';
    }
    expect(() => serializeDocument(corrupted)).toThrowError(/vertex reference "vNOPE"/);
  });

  it('rejects duplicate ids before stringify', () => {
    const corrupted = cloneJson(fixture());
    corrupted.vertices.push(corrupted.vertices[0]);
    expect(() => serializeDocument(corrupted)).toThrowError(/duplicate id/);
  });

  it('serializes a valid document without throwing', () => {
    expect(() => serializeDocument(fixture())).not.toThrow();
  });
});

describe('semantic v2 neighborless constraintId', () => {
  it('enforces non-empty constraintId but does not resolve it as an entity', () => {
    // A Capability-Registry external id that matches no top-level entity must
    // still validate (it is not resolved in Phase 11).
    const ok = cloneJson(fixture());
    ok.diagnostics[0].constraintId = 'registry://capability/not-an-entity';
    expect(() => deserializeDocument(JSON.stringify(ok))).not.toThrow();

    const empty = cloneJson(fixture());
    empty.diagnostics[0].constraintId = '   ';
    expect(() => deserializeDocument(JSON.stringify(empty)))
      .toThrowError(SemanticV2Error);
  });
});

/** Structural deep-equality with 0.001 mm tolerance on every finite number. */
function isEqualWithinTolerance(a: PatternDocument, b: PatternDocument): boolean {
  return deepClose(a as unknown, b as unknown);
}

function deepClose(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 0.001;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepClose(item, b[index]));
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      key in (b as Record<string, unknown>) &&
      deepClose((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }
  return a === b;
}
