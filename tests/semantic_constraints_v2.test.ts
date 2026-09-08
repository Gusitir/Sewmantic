// T-47 constraint and operator tests for the semantic pattern kernel (v2).
//
// Gates covered:
//   - interface matching across different segmentations preserves length
//     within <= 0.001 mm (MM_TOLERANCE), for lines (exact) and circular arcs;
//   - typed diagnostics: seam delta > 3 mm (configurable limit), incompatible
//     start-tangent orientation, broken references and non-positive lengths;
//   - atomic operators: split preserves length, dart adds exactly 2*depth,
//     cut updates every affected interface; every rejection leaves the input
//     document byte-identical (serializeDocument before/after);
//   - operators are pure: the input is never mutated, results serialize and
//     round-trip.

import { describe, expect, it } from 'vitest';

import {
  CONSTRAINT_IDS,
  ConstraintResolutionError,
  MM_TOLERANCE,
  SEMANTIC_V2_SCHEMA_VERSION,
  deserializeDocument,
  evaluateConstraints,
  insertDart,
  resolveStitchPair,
  cut,
  serializeDocument,
  splitEdge,
  type ConstraintDiagnostic,
  type PatternDocument,
} from '../src/engine/v2/index.js';

const expectMmClose = (actual: number, expected: number, tol = MM_TOLERANCE): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
};

const cloneJson = (value: PatternDocument): PatternDocument =>
  JSON.parse(JSON.stringify(value)) as PatternDocument;

/**
 * Line fixture: left side is one 100 mm edge, right side is two 50 mm edges
 * traversed in the opposite direction (anti-parallel start tangents).
 */
function buildLineFixture(): PatternDocument {
  const vertices = [
    { id: 'vL0', xMm: 0, yMm: 0 },
    { id: 'vL1', xMm: 0, yMm: 100 },
    { id: 'vR0', xMm: 0, yMm: 100 },
    { id: 'vR1', xMm: 0, yMm: 50 },
    { id: 'vR2', xMm: 0, yMm: 0 },
  ];
  const edges = [
    { id: 'eL0', role: 'boundary' as const, curve: { kind: 'line' as const, startVertexId: 'vL0', endVertexId: 'vL1' } },
    { id: 'eR0', role: 'boundary' as const, curve: { kind: 'line' as const, startVertexId: 'vR0', endVertexId: 'vR1' } },
    { id: 'eR1', role: 'boundary' as const, curve: { kind: 'line' as const, startVertexId: 'vR1', endVertexId: 'vR2' } },
  ];
  const sequences = [
    { id: 'seqL', panelId: 'p0', role: 'side seam', isLoop: false, edgeIds: ['eL0'] },
    { id: 'seqR', panelId: 'p1', role: 'side seam', isLoop: false, edgeIds: ['eR0', 'eR1'] },
  ];
  const panels = [
    { id: 'p0', name: 'left panel', material: 'shell', cutCount: 1, onFold: false, sequenceIds: ['seqL'] },
    { id: 'p1', name: 'right panel', material: 'shell', cutCount: 1, onFold: false, sequenceIds: ['seqR'] },
  ];
  const components = [{ id: 'c0', name: 'bodice', panelIds: ['p0', 'p1'] }];
  const interfaces = [
    { id: 'i0', label: 'side seam', leftSequenceId: 'seqL', rightSequenceId: 'seqR', seamAllowanceMm: 10 },
  ];
  return {
    schemaVersion: SEMANTIC_V2_SCHEMA_VERSION,
    vertices,
    edges,
    sequences,
    panels,
    components,
    interfaces,
    stitchPairs: [],
    diagnostics: [],
  };
}

/** Quarter-circle fixture (r = 25): one 90 deg arc vs two 45 deg arcs. */
function buildArcFixture(): PatternDocument {
  const mid = 25 * Math.cos(Math.PI / 4);
  const vertices = [
    { id: 'vA0', xMm: 25, yMm: 0 },
    { id: 'vA1', xMm: 0, yMm: 25 },
    { id: 'vC', xMm: 0, yMm: 0 },
    { id: 'vM', xMm: mid, yMm: mid },
  ];
  const arc = (startVertexId: string, endVertexId: string, sweepAngleDeg: number) => ({
    kind: 'circularArc' as const,
    startVertexId,
    endVertexId,
    centerVertexId: 'vC',
    radiusMm: 25,
    sweepAngleDeg,
    clockwise: false,
  });
  const edges = [
    { id: 'eA0', role: 'boundary' as const, curve: arc('vA0', 'vA1', 90) },
    { id: 'eB0', role: 'boundary' as const, curve: arc('vA0', 'vM', 45) },
    { id: 'eB1', role: 'boundary' as const, curve: arc('vM', 'vA1', 45) },
  ];
  const sequences = [
    { id: 'seqA', panelId: 'pA', role: 'seam', isLoop: false, edgeIds: ['eA0'] },
    { id: 'seqB', panelId: 'pB', role: 'seam', isLoop: false, edgeIds: ['eB0', 'eB1'] },
  ];
  const panels = [
    { id: 'pA', name: 'arc left', material: 'shell', cutCount: 1, onFold: false, sequenceIds: ['seqA'] },
    { id: 'pB', name: 'arc right', material: 'shell', cutCount: 1, onFold: false, sequenceIds: ['seqB'] },
  ];
  const components = [{ id: 'c0', name: 'arc set', panelIds: ['pA', 'pB'] }];
  const interfaces = [
    { id: 'iArc', label: 'arc seam', leftSequenceId: 'seqA', rightSequenceId: 'seqB', seamAllowanceMm: 10 },
  ];
  return {
    schemaVersion: SEMANTIC_V2_SCHEMA_VERSION,
    vertices,
    edges,
    sequences,
    panels,
    components,
    interfaces,
    stitchPairs: [],
    diagnostics: [],
  };
}

/** Variant of the line fixture whose right side runs in the SAME direction. */
function buildParallelFixture(): PatternDocument {
  const doc = buildLineFixture();
  doc.edges = doc.edges.filter((e) => e.id !== 'eR1');
  doc.vertices = [
    { id: 'vL0', xMm: 0, yMm: 0 },
    { id: 'vL1', xMm: 0, yMm: 100 },
    { id: 'vR0', xMm: 0, yMm: 0 },
    { id: 'vR1', xMm: 0, yMm: 100 },
  ];
  doc.sequences[1].edgeIds = ['eR0'];
  doc.edges[1].curve = { kind: 'line', startVertexId: 'vR0', endVertexId: 'vR1' };
  return doc;
}

/** Line fixture whose right side is 5 mm longer (total 105 vs 100). */
function buildDeltaFixture(): PatternDocument {
  const doc = buildLineFixture();
  doc.vertices[4] = { id: 'vR2', xMm: 0, yMm: -5 };
  return doc;
}

/** Extended fixture: a second interface shares seqL with the first one. */
function buildTwoInterfaceFixture(): PatternDocument {
  const doc = buildLineFixture();
  doc.vertices.push({ id: 'vT0', xMm: 100, yMm: 100 }, { id: 'vT1', xMm: 0, yMm: 100 });
  doc.edges.push({
    id: 'eT0',
    role: 'boundary',
    curve: { kind: 'line', startVertexId: 'vT0', endVertexId: 'vT1' },
  });
  doc.sequences.push({ id: 'seqT', panelId: 'p0', role: 'top seam', isLoop: false, edgeIds: ['eT0'] });
  doc.panels[0].sequenceIds.push('seqT');
  doc.interfaces.push({
    id: 'i1',
    label: 'top seam',
    leftSequenceId: 'seqT',
    rightSequenceId: 'seqL',
    seamAllowanceMm: 10,
  });
  return doc;
}

/** Fixture with a zero-length edge (distinct ids, identical coordinates). */
function buildZeroLengthFixture(): PatternDocument {
  const doc = buildLineFixture();
  doc.vertices.push({ id: 'vZ0', xMm: 5, yMm: 5 }, { id: 'vZ1', xMm: 5, yMm: 5 });
  doc.edges.push({
    id: 'eZ',
    role: 'interior',
    curve: { kind: 'line', startVertexId: 'vZ0', endVertexId: 'vZ1' },
  });
  doc.sequences.push({ id: 'seqZ', panelId: 'p1', role: 'slash', isLoop: false, edgeIds: ['eZ'] });
  doc.panels[1].sequenceIds.push('seqZ');
  doc.interfaces.push({
    id: 'iZ',
    label: 'zero seam',
    leftSequenceId: 'seqL',
    rightSequenceId: 'seqZ',
    seamAllowanceMm: 10,
  });
  return doc;
}

/** Line fixture plus an unreferenced cubic bezier edge. */
function buildCubicFixture(): PatternDocument {
  const doc = buildLineFixture();
  doc.vertices.push(
    { id: 'vC1', xMm: 60, yMm: -20 },
    { id: 'vC2', xMm: 140, yMm: -30 },
  );
  doc.edges.push({
    id: 'eC',
    role: 'interior',
    curve: {
      kind: 'cubicBezier',
      startVertexId: 'vL0',
      controlVertexAId: 'vC1',
      controlVertexBId: 'vC2',
      endVertexId: 'vL1',
    },
  });
  return doc;
}

describe('T-47 fixture sanity', () => {
  it('all fixtures serialize cleanly', () => {
    expect(() => serializeDocument(buildLineFixture())).not.toThrow();
    expect(() => serializeDocument(buildArcFixture())).not.toThrow();
    expect(() => serializeDocument(buildParallelFixture())).not.toThrow();
    expect(() => serializeDocument(buildDeltaFixture())).not.toThrow();
    expect(() => serializeDocument(buildTwoInterfaceFixture())).not.toThrow();
    expect(() => serializeDocument(buildZeroLengthFixture())).not.toThrow();
    expect(() => serializeDocument(buildCubicFixture())).not.toThrow();
  });
});

describe('T-47 interface matching', () => {
  it('matches sides segmented differently preserving length within 0.001 mm', () => {
    const doc = buildLineFixture();
    const iface = doc.interfaces[0];
    const pair = resolveStitchPair(doc, iface);

    expect(pair.interfaceId).toBe('i0');
    expectMmClose(pair.leftLengthMm, 100);
    expectMmClose(pair.rightLengthMm, 100);
    expectMmClose(pair.commonLengthMm, 100);
    expectMmClose(pair.deltaMm, 0);
    expect(pair.deltaExceeds).toBe(false);
    expect(pair.orientationCompatible).toBe(true);
    expect(pair.pairs).toHaveLength(2);
    expectMmClose(pair.pairs[0].aStartMm, 0);
    expectMmClose(pair.pairs[0].aEndMm, 50);
    expectMmClose(pair.pairs[0].bStartMm, 0);
    expectMmClose(pair.pairs[0].bEndMm, 50);
    expectMmClose(pair.pairs[1].aStartMm, 50);
    expectMmClose(pair.pairs[1].aEndMm, 100);
    expectMmClose(pair.pairs[1].bStartMm, 50);
    expectMmClose(pair.pairs[1].bEndMm, 100);

    // The resolved pair must satisfy the serializable stitch contract.
    const attached = cloneJson(doc);
    attached.stitchPairs = [pair];
    expect(() => serializeDocument(attached)).not.toThrow();
    const restored = deserializeDocument(serializeDocument(attached));
    expect(restored.stitchPairs).toHaveLength(1);
  });

  it('matches arcs segmented differently preserving length within 0.001 mm', () => {
    const doc = buildArcFixture();
    const iface = doc.interfaces[0];
    const pair = resolveStitchPair(doc, iface, { sample: { toleranceMm: 0.001 } });
    const expected = 25 * (Math.PI / 2);

    expectMmClose(pair.leftLengthMm, expected);
    expectMmClose(pair.rightLengthMm, expected);
    expectMmClose(pair.commonLengthMm, expected);
    expectMmClose(pair.deltaMm, 0);
    expect(pair.deltaExceeds).toBe(false);
    expect(pair.pairs.length).toBeGreaterThanOrEqual(1);
  });

  it('throws typed errors for unresolvable interfaces', () => {
    const broken = buildLineFixture();
    broken.interfaces[0].rightSequenceId = 'seqGONE';
    try {
      resolveStitchPair(broken, broken.interfaces[0]);
      throw new Error('expected ConstraintResolutionError');
    } catch (err) {
      expect(err).toBeInstanceOf(ConstraintResolutionError);
      if (err instanceof ConstraintResolutionError) {
        expect(err.code).toBe('BROKEN_REFERENCE');
      }
    }

    const zero = buildZeroLengthFixture();
    const ifaceZ = zero.interfaces.find((i) => i.id === 'iZ');
    if (!ifaceZ) throw new Error('fixture interface iZ missing');
    try {
      resolveStitchPair(zero, ifaceZ);
      throw new Error('expected ConstraintResolutionError');
    } catch (err) {
      expect(err).toBeInstanceOf(ConstraintResolutionError);
      if (err instanceof ConstraintResolutionError) {
        expect(err.code).toBe('NON_POSITIVE_LENGTH');
        expect(err.entities).toContain('seqZ');
      }
    }
  });
});

describe('T-47 seam delta constraint', () => {
  it('flags a delta above the default 3 mm limit', () => {
    const doc = buildDeltaFixture();
    const diagnostics = evaluateConstraints(doc);

    const delta = diagnostics.filter((d) => d.constraintId === CONSTRAINT_IDS.seamDeltaLimit);
    expect(delta).toHaveLength(1);
    expect(delta[0].severity).toBe('warning');
    expect(delta[0].entities).toContain('i0');
    expectMmClose(delta[0].measurementsMm.deltaMm, 5);
    expectMmClose(delta[0].measurementsMm.maxSeamDeltaMm, 3);

    const pair = resolveStitchPair(doc, doc.interfaces[0]);
    expect(pair.deltaExceeds).toBe(true);
    expectMmClose(pair.deltaMm, 5);
  });

  it('honours a custom limit (parametrizable threshold)', () => {
    const doc = buildDeltaFixture();
    const diagnostics = evaluateConstraints(doc, { maxSeamDeltaMm: 10 });
    expect(diagnostics).toHaveLength(0);

    const pair = resolveStitchPair(doc, doc.interfaces[0], { maxSeamDeltaMm: 10 });
    expectMmClose(pair.deltaMm, 5);
    expect(pair.deltaExceeds).toBe(false);
  });
});

describe('T-47 orientation constraint', () => {
  it('flags start tangents that are not anti-parallel', () => {
    const doc = buildParallelFixture();
    const diagnostics = evaluateConstraints(doc);

    const orientation = diagnostics.filter(
      (d) => d.constraintId === CONSTRAINT_IDS.orientationIncompatible,
    );
    expect(orientation).toHaveLength(1);
    expect(orientation[0].severity).toBe('error');
    expect(orientation[0].entities).toContain('i0');

    const pair = resolveStitchPair(doc, doc.interfaces[0]);
    expect(pair.orientationCompatible).toBe(false);
    expect(pair.deltaExceeds).toBe(false);
  });
});

describe('T-47 reference and length constraints', () => {
  it('reports broken interface references (missing sequence and missing edge)', () => {
    const missingSeq = buildLineFixture();
    missingSeq.interfaces[0].rightSequenceId = 'seqGONE';
    const seqDiags = evaluateConstraints(missingSeq);
    expect(seqDiags).toHaveLength(1);
    expect(seqDiags[0].constraintId).toBe(CONSTRAINT_IDS.brokenReference);
    expect(seqDiags[0].severity).toBe('error');
    expect(seqDiags[0].entities).toEqual(['i0']);
    expect(seqDiags[0].message).toContain('seqGONE');

    const missingEdge = buildLineFixture();
    missingEdge.sequences[1].edgeIds = ['eR0', 'eNOPE'];
    const edgeDiags = evaluateConstraints(missingEdge);
    expect(edgeDiags).toHaveLength(1);
    expect(edgeDiags[0].constraintId).toBe(CONSTRAINT_IDS.brokenReference);
    expect(edgeDiags[0].severity).toBe('error');
    expect(edgeDiags[0].entities).toContain('seqR');
  });

  it('reports non-positive sequence lengths', () => {
    const doc = buildZeroLengthFixture();
    const diagnostics = evaluateConstraints(doc);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].constraintId).toBe(CONSTRAINT_IDS.nonPositiveLength);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].entities).toContain('seqZ');
    expect(diagnostics[0].entities).toContain('iZ');
  });
});

describe('T-47 splitEdge operator', () => {
  it('splits a line preserving the sequence length within 0.001 mm', () => {
    const input = buildLineFixture();
    const result = splitEdge(input, 'eL0', { atMm: 30 });
    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);

    const seqL = result.doc.sequences.find((s) => s.id === 'seqL');
    expect(seqL?.edgeIds).toEqual(['eL0__a', 'eL0__b']);
    const splitVertex = result.doc.vertices.find((v) => v.id === 'eL0__split');
    expect(splitVertex?.xMm).toBe(0);
    expectMmClose(splitVertex?.yMm ?? NaN, 30);

    const iface = result.doc.interfaces[0];
    const pair = resolveStitchPair(result.doc, iface);
    expectMmClose(pair.leftLengthMm, 100);
    expectMmClose(pair.rightLengthMm, 100);
    expectMmClose(pair.commonLengthMm, 100);
    expectMmClose(pair.deltaMm, 0);
    expect(pair.pairs).toHaveLength(3);

    expect(result.doc.stitchPairs.map((sp) => sp.id)).toEqual(['sp-i0']);
    const roundtrip = deserializeDocument(serializeDocument(result.doc));
    expect(roundtrip.sequences[0].edgeIds).toEqual(['eL0__a', 'eL0__b']);
  });

  it('splits a circular arc preserving arc length within 0.001 mm', () => {
    const input = buildArcFixture();
    const result = splitEdge(input, 'eA0', {
      sample: { toleranceMm: 0.001 },
    });
    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);

    const seqA = result.doc.sequences.find((s) => s.id === 'seqA');
    expect(seqA?.edgeIds).toEqual(['eA0__a', 'eA0__b']);
    const pair = resolveStitchPair(result.doc, result.doc.interfaces[0], {
      sample: { toleranceMm: 0.001 },
    });
    expectMmClose(pair.leftLengthMm, 25 * (Math.PI / 2));
    expectMmClose(pair.rightLengthMm, 25 * (Math.PI / 2));
    expectMmClose(pair.commonLengthMm, 25 * (Math.PI / 2));
  });

  it('rejects bezier splits, invalid offsets and unknown edges atomically', () => {
    const cubic = buildCubicFixture();
    const before = serializeDocument(cubic);
    const beforeJson = JSON.stringify(cubic);

    const bezier = splitEdge(cubic, 'eC');
    expect(bezier.ok).toBe(false);
    if (!bezier.ok) expect(bezier.code).toBe('UNSUPPORTED_CURVE_KIND');

    const edge = buildLineFixture();
    expect(splitEdge(edge, 'eNOPE').ok).toBe(false);
    const atZero = splitEdge(edge, 'eL0', { atMm: 0 });
    expect(atZero.ok).toBe(false);
    if (!atZero.ok) expect(atZero.code).toBe('INVALID_PARAMETERS');
    const atEnd = splitEdge(edge, 'eL0', { atMm: 1000 });
    expect(atEnd.ok).toBe(false);

    const collision = buildLineFixture();
    collision.vertices.push({ id: 'eL0__split', xMm: 1, yMm: 1 });
    const collided = splitEdge(collision, 'eL0', { atMm: 30 });
    expect(collided.ok).toBe(false);
    if (!collided.ok) expect(collided.code).toBe('ID_COLLISION');

    expect(serializeDocument(cubic)).toBe(before);
    expect(JSON.stringify(cubic)).toBe(beforeJson);
  });
});

describe('T-47 insertDart operator', () => {
  it('inserts a dart adding exactly 2*depth to the target border', () => {
    const input = buildLineFixture();
    const before = serializeDocument(input);
    const result = insertDart(input, { edgeId: 'eL0', depthMm: 7, atMm: 40 });
    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);

    const seqL = result.doc.sequences.find((s) => s.id === 'seqL');
    expect(seqL?.edgeIds).toEqual([
      'eL0__dart_a',
      'eL0__dart_leg_in',
      'eL0__dart_leg_out',
      'eL0__dart_b',
    ]);

    const apex = result.doc.vertices.find((v) => v.id === 'eL0__dart_apex');
    expect(apex).toBeDefined();
    expectMmClose(apex?.xMm ?? NaN, -7);
    expectMmClose(apex?.yMm ?? NaN, 40);
    const dartPoint = result.doc.vertices.find((v) => v.id === 'eL0__dart_point');
    expectMmClose(dartPoint?.yMm ?? NaN, 40);

    const pair = result.doc.stitchPairs.find((sp) => sp.interfaceId === 'i0');
    expect(pair).toBeDefined();
    expectMmClose(pair?.leftLengthMm ?? NaN, 114);
    expectMmClose(pair?.rightLengthMm ?? NaN, 100);
    expectMmClose(pair?.deltaMm ?? NaN, 14);
    expect(pair?.deltaExceeds).toBe(true);

    const deltaDiags = result.diagnostics.filter(
      (d) => d.constraintId === CONSTRAINT_IDS.seamDeltaLimit,
    );
    expect(deltaDiags).toHaveLength(1);

    expect(serializeDocument(input)).toBe(before);
    const roundtrip = deserializeDocument(serializeDocument(result.doc));
    expect(roundtrip.sequences[0].edgeIds).toHaveLength(4);
  });

  it('rejects invalid darts atomically leaving the document byte-identical', () => {
    const input = buildLineFixture();
    const before = serializeDocument(input);
    const beforeJson = JSON.stringify(input);

    for (const depthMm of [0, -5, Number.NaN]) {
      const bad = insertDart(input, { edgeId: 'eL0', depthMm });
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.code).toBe('INVALID_PARAMETERS');
    }
    const atBorder = insertDart(input, { edgeId: 'eL0', depthMm: 7, atMm: 0 });
    expect(atBorder.ok).toBe(false);
    const unknown = insertDart(input, { edgeId: 'eNOPE', depthMm: 7 });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.code).toBe('UNKNOWN_EDGE');
    const curved = buildCubicFixture();
    const onCubic = insertDart(curved, { edgeId: 'eC', depthMm: 7 });
    expect(onCubic.ok).toBe(false);
    if (!onCubic.ok) expect(onCubic.code).toBe('UNSUPPORTED_CURVE_KIND');

    expect(serializeDocument(input)).toBe(before);
    expect(JSON.stringify(input)).toBe(beforeJson);
  });
});

describe('T-47 cut operator', () => {
  it('updates every affected interface or fails atomically', () => {
    const input = buildTwoInterfaceFixture();
    const result = cut(input, { edgeId: 'eL0', lengthMm: 20 });
    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);

    const seqL = result.doc.sequences.find((s) => s.id === 'seqL');
    expect(seqL?.edgeIds).toEqual(['eL0__cut_a', 'eL0__cut_b']);

    expect(result.doc.stitchPairs).toHaveLength(2);
    const pair0 = result.doc.stitchPairs.find((sp) => sp.interfaceId === 'i0');
    const pair1 = result.doc.stitchPairs.find((sp) => sp.interfaceId === 'i1');
    expect(pair0).toBeDefined();
    expect(pair1).toBeDefined();
    expectMmClose(pair0?.leftLengthMm ?? NaN, 80);
    expectMmClose(pair0?.rightLengthMm ?? NaN, 100);
    expectMmClose(pair0?.commonLengthMm ?? NaN, 80);
    expectMmClose(pair1?.leftLengthMm ?? NaN, 100);
    expectMmClose(pair1?.rightLengthMm ?? NaN, 80);
    expectMmClose(pair1?.commonLengthMm ?? NaN, 80);

    const deltaDiags = result.diagnostics.filter(
      (d) => d.constraintId === CONSTRAINT_IDS.seamDeltaLimit,
    );
    expect(deltaDiags).toHaveLength(2);

    const roundtrip = deserializeDocument(serializeDocument(result.doc));
    expect(roundtrip.stitchPairs).toHaveLength(2);
  });

  it('rejects invalid cuts atomically leaving the document byte-identical', () => {
    const input = buildLineFixture();
    const before = serializeDocument(input);
    const beforeJson = JSON.stringify(input);

    for (const lengthMm of [0, -3, 100, 120]) {
      const bad = cut(input, { edgeId: 'eL0', lengthMm });
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.code).toBe('INVALID_PARAMETERS');
    }
    const unknown = cut(input, { edgeId: 'eNOPE', lengthMm: 10 });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.code).toBe('UNKNOWN_EDGE');
    const curved = buildCubicFixture();
    const onCubic = cut(curved, { edgeId: 'eC', lengthMm: 10 });
    expect(onCubic.ok).toBe(false);
    if (!onCubic.ok) expect(onCubic.code).toBe('UNSUPPORTED_CURVE_KIND');

    expect(serializeDocument(input)).toBe(before);
    expect(JSON.stringify(input)).toBe(beforeJson);
  });
});

describe('T-47 operator purity and atomicity', () => {
  it('never mutates the input document on success', () => {
    const input = buildLineFixture();
    const before = serializeDocument(input);
    const beforeJson = JSON.stringify(input);

    const split = splitEdge(input, 'eL0', { atMm: 30 });
    expect(split.ok).toBe(true);
    const dart = insertDart(input, { edgeId: 'eL0', depthMm: 5, atMm: 20 });
    expect(dart.ok).toBe(true);
    const snip = cut(input, { edgeId: 'eL0', lengthMm: 10 });
    expect(snip.ok).toBe(true);

    expect(serializeDocument(input)).toBe(before);
    expect(JSON.stringify(input)).toBe(beforeJson);
  });

  it('leaves the input byte-identical after any rejection', () => {
    const input = buildTwoInterfaceFixture();
    const before = serializeDocument(input);

    const r1 = splitEdge(input, 'eL0', { atMm: 0 });
    const r2 = insertDart(input, { edgeId: 'eL0', depthMm: -1 });
    const r3 = cut(input, { edgeId: 'eL0', lengthMm: 999 });
    const r4 = splitEdge(input, 'eMISSING');
    for (const r of [r1, r2, r3, r4]) {
      expect(r.ok).toBe(false);
    }

    expect(serializeDocument(input)).toBe(before);
  });
});

describe('T-47 diagnostic typing', () => {
  it('emits uniquely identified diagnostics with non-empty external ids', () => {
    const doc = buildTwoInterfaceFixture();
    doc.vertices[4] = { id: 'vR2', xMm: 0, yMm: -5 };
    const diagnostics = evaluateConstraints(doc);
    expect(diagnostics.length).toBeGreaterThan(0);

    const ids = new Set<string>();
    for (const d of diagnostics as ConstraintDiagnostic[]) {
      expect(d.id.trim().length).toBeGreaterThan(0);
      expect(ids.has(d.id)).toBe(false);
      ids.add(d.id);
      expect(Object.values(CONSTRAINT_IDS)).toContain(d.constraintId);
      expect(d.constraintId.trim().length).toBeGreaterThan(0);
      expect(d.entities.length).toBeGreaterThan(0);
      expect(typeof d.message).toBe('string');
      expect(Object.keys(d.measurementsMm).length).toBeGreaterThan(0);
    }
  });
});
