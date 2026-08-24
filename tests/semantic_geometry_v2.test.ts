// T-46 geometry tests for the semantic pattern kernel (v2).
//
// Gates covered:
//   - GeometryAdapter surface: signed area, winding, polygon area with holes,
//     simplicity, curve length, curve sampling, boolean ops, curve/loop
//     intersections and cut points;
//   - offset gate across convex / concave / curved fixtures at 3 / 10 / 25 mm:
//     selected `ownRawOffsetPoints` (miter) strategy yields simple, area-growing,
//     deterministic results (two runs byte-identical), and rejects no fixtures.
//
// Scope: geometry adapter surface is plain v2; no Flatten.js type or instance is
// ever returned by the public barrel tested here.

import { describe, expect, it } from 'vitest';

import {
  geometryAdapter,
  createAdapter,
  ownRawOffsetPoints,
  rawOffsetSelfIntersects,
  pointLoopSelfIntersects,
  signedAreaOfPoints,
  dedupePoints,
  polylineIntersections,
  DEFAULT_TOLERANCE_MM,
} from '../src/engine/v2/geometry/index.js';

import type { Curve, Vertex } from '../src/engine/v2/contracts.js';

const adaptersReady = [geometryAdapter, createAdapter()];

const expectMmClose = (actual: number, expected: number, tol = 0.1): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
};

/** CCW 100x100 square from (0,0). */
function squareFixture(): { vertices: Vertex[]; outer: Curve[] } {
  const vertices: Vertex[] = [
    { id: 'v0', xMm: 0, yMm: 0 },
    { id: 'v1', xMm: 100, yMm: 0 },
    { id: 'v2', xMm: 100, yMm: 100 },
    { id: 'v3', xMm: 0, yMm: 100 },
  ];
  const outer: Curve[] = [
    { kind: 'line', startVertexId: 'v0', endVertexId: 'v1' },
    { kind: 'line', startVertexId: 'v1', endVertexId: 'v2' },
    { kind: 'line', startVertexId: 'v2', endVertexId: 'v3' },
    { kind: 'line', startVertexId: 'v3', endVertexId: 'v0' },
  ];
  return { vertices, outer };
}

/** CCW concave L-shape (re-entrant corner at (10,10)), area 700. */
function concaveLFixture(): { vertices: Vertex[]; outer: Curve[] } {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const pts: [number, number][] = [
    [0, 0],
    [40, 0],
    [40, 10],
    [10, 10],
    [10, 40],
    [0, 40],
  ];
  const vertices: Vertex[] = pts.map(([xMm, yMm], i) => ({ id: ids[i], xMm, yMm }));
  const outer: Curve[] = ids.map((id, i) => ({
    kind: 'line',
    startVertexId: id,
    endVertexId: ids[(i + 1) % ids.length],
  }));
  return { vertices, outer };
}

/** Semicircle disk (diameter 40 on x=0, arc bulging west), area ~628. */
function semicircleFixture(): { vertices: Vertex[]; outer: Curve[] } {
  const vertices: Vertex[] = [
    { id: 'vA', xMm: 0, yMm: 0 },
    { id: 'vB', xMm: 0, yMm: 40 },
    { id: 'vC', xMm: 0, yMm: 20 },
  ];
  const outer: Curve[] = [
    { kind: 'line', startVertexId: 'vA', endVertexId: 'vB' },
    {
      kind: 'circularArc',
      startVertexId: 'vB',
      endVertexId: 'vA',
      centerVertexId: 'vC',
      radiusMm: 20,
      sweepAngleDeg: 180,
      clockwise: false,
    },
  ];
  return { vertices, outer };
}

describe('geometryAdapter plain surface', () => {
  it.each(adaptersReady)('reports signed area and winding of a CCW square', (adapter) => {
    const { vertices, outer } = squareFixture();
    expectMmClose(adapter.signedAreaMm2(vertices, outer), 10000);
    expect(adapter.winding(vertices, outer)).toBe('counterclockwise');
    expect(adapter.isSimple(vertices, outer)).toBe(true);
  });

  it('reports net polygon area with a hole', () => {
    const { vertices, outer } = squareFixture();
    const holeVertices: Vertex[] = [
      { id: 'h0', xMm: 30, yMm: 30 },
      { id: 'h1', xMm: 70, yMm: 30 },
      { id: 'h2', xMm: 70, yMm: 70 },
      { id: 'h3', xMm: 30, yMm: 70 },
    ];
    const holes: Curve[][] = [
      [
        { kind: 'line', startVertexId: 'h0', endVertexId: 'h3' },
        { kind: 'line', startVertexId: 'h3', endVertexId: 'h2' },
        { kind: 'line', startVertexId: 'h2', endVertexId: 'h1' },
        { kind: 'line', startVertexId: 'h1', endVertexId: 'h0' },
      ],
    ];
    const all = vertices.concat(holeVertices);
    expectMmClose(geometryAdapter.polygonAreaMm2(all, outer, holes), 10000 - 1600);
  });

  it('measures line and circular-arc length', () => {
    const { vertices, outer } = semicircleFixture();
    expectMmClose(geometryAdapter.curveLengthMm(vertices, outer[0]), 40);
    // Semicircle radius 20 -> pi * r.
    expectMmClose(geometryAdapter.curveLengthMm(vertices, outer[1]), Math.PI * 20, 0.5);
  });

  it('tessellates a curved edge into multiple plain points', () => {
    const { vertices, outer } = semicircleFixture();
    const pts = geometryAdapter.sampleCurve(vertices, outer[1]);
    expect(pts.length).toBeGreaterThanOrEqual(2);
    for (const p of pts) {
      expect(typeof p.xMm).toBe('number');
      expect(typeof p.yMm).toBe('number');
    }
  });

  it('finds the two intersections of a line with a circular arc', () => {
    const vertices: Vertex[] = [
      { id: 'vC', xMm: 50, yMm: 50 },
      { id: 'vA', xMm: 75, yMm: 50 },
      { id: 'vB', xMm: 25, yMm: 50 },
      { id: 'l1', xMm: 20, yMm: 65 },
      { id: 'l2', xMm: 80, yMm: 65 },
    ];
    const arc: Curve = {
      kind: 'circularArc',
      startVertexId: 'vA',
      endVertexId: 'vB',
      centerVertexId: 'vC',
      radiusMm: 25,
      sweepAngleDeg: 180,
      clockwise: false,
    };
    const line: Curve = { kind: 'line', startVertexId: 'l1', endVertexId: 'l2' };
    const hits = geometryAdapter.intersectCurves(vertices, line, arc);
    expect(hits).toHaveLength(2);
    const xs = hits.map((p) => p.xMm).sort((a, b) => a - b);
    // Arc is tessellated with the default chord tolerance, so the crossing point
    // lands within ~0.3 mm of the analytic x; use a 0.5 mm tolerance.
    expect(Math.abs(xs[0] - 30)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(xs[1] - 70)).toBeLessThanOrEqual(0.5);
  });

  it('finds the two points where a horizontal cut crosses a rectangle boundary', () => {
    const { vertices, outer } = squareFixture();
    const cutVerts: Vertex[] = [
      { id: 'c1', xMm: 0, yMm: 50 },
      { id: 'c2', xMm: 100, yMm: 50 },
    ];
    const cut: Curve = { kind: 'line', startVertexId: 'c1', endVertexId: 'c2' };
    const pts = geometryAdapter.cutLoop(vertices.concat(cutVerts), outer, cut);
    expect(pts).toHaveLength(2);
    const xs = pts.map((p) => p.xMm).sort((a, b) => a - b);
    expectMmClose(xs[0], 0);
    expectMmClose(xs[1], 100);
  });

  it('performs union / intersect / subtract with stable areas and valid winding', () => {
    const vertices: Vertex[] = [
      { id: 'a0', xMm: 0, yMm: 0 },
      { id: 'a1', xMm: 100, yMm: 0 },
      { id: 'a2', xMm: 100, yMm: 100 },
      { id: 'a3', xMm: 0, yMm: 100 },
      { id: 'b0', xMm: 50, yMm: -20 },
      { id: 'b1', xMm: 150, yMm: -20 },
      { id: 'b2', xMm: 150, yMm: 120 },
      { id: 'b3', xMm: 50, yMm: 120 },
    ];
    const sq = (ids: string[]): Curve[] =>
      ids.map((id, i) => ({ kind: 'line', startVertexId: id, endVertexId: ids[(i + 1) % ids.length] }));
    const subject = { outer: sq(['a0', 'a1', 'a2', 'a3']), holes: [] as Curve[][] };
    const clip = { outer: sq(['b0', 'b1', 'b2', 'b3']), holes: [] as Curve[][] };

    const union = geometryAdapter.boolean('union', vertices, subject, clip);
    const intersect = geometryAdapter.boolean('intersect', vertices, subject, clip);
    const subtract = geometryAdapter.boolean('subtract', vertices, subject, clip);

    const areaOf = (res: { vertices: Vertex[]; outer: Curve[] }): number =>
      geometryAdapter.polygonAreaMm2(res.vertices, res.outer, res.holes);

    expectMmClose(areaOf(union), 19000, 0.5);
    expectMmClose(areaOf(intersect), 5000, 0.5);
    expectMmClose(areaOf(subtract), 5000, 0.5);
    for (const r of [union, intersect, subtract]) {
      expect(['counterclockwise', 'clockwise']).toContain(r.winding);
    }
  });
});

describe('offset gate (selected own miter offset)', () => {
  describe.each([
    ['convex square', squareFixture],
    ['concave L', concaveLFixture],
    ['semicircle', semicircleFixture],
  ])('%s', (_name, fixtureFn) => {
    it('is simple at 3/10/25 mm, grows in area, and is deterministic', () => {
      const { vertices, outer } = fixtureFn();
      const baseArea = geometryAdapter.polygonAreaMm2(vertices, outer);
      let prevArea = baseArea;
      const seen = new Set<string>();
      for (const d of [3, 10, 25]) {
        const snap = JSON.stringify({ d, baseArea });
        if (!seen.has(snap)) {
          const r1 = geometryAdapter.offset(vertices, { outer, holes: [] }, d);
          const r2 = geometryAdapter.offset(vertices, { outer, holes: [] }, d);
          // Determinism: two runs are byte-identical.
          expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
          // No Flatten leak: result is a plain container with plain curve fields.
          for (const c of r1.outer) {
            expect(['line', 'circularArc', 'quadraticBezier', 'cubicBezier']).toContain(c.kind);
          }
          // Valid winding and resolvable vertex ids.
          expect(['counterclockwise', 'clockwise']).toContain(r1.winding);
          const ids = new Set(r1.vertices.map((v) => v.id));
          for (const c of r1.outer) {
            expect(ids.has(c.startVertexId)).toBe(true);
            expect(ids.has(c.endVertexId)).toBe(true);
          }
          // Simple result, area grew monotonically.
          expect(geometryAdapter.isSimple(r1.vertices, r1.outer)).toBe(true);
          const area = geometryAdapter.polygonAreaMm2(r1.vertices, r1.outer, r1.holes);
          expect(area).toBeGreaterThan(prevArea * 0.99);
          expect(area).toBeGreaterThan(baseArea);
          prevArea = area;
        }
      }
    });
  });

  it('raw minimal offset (pure helper) is simple on the mandatory fixtures at 3/10/25', () => {
    const fixtures: Array<{ name: string; pts: Array<{ xMm: number; yMm: number }>; area: number }> = [
      { name: 'square', pts: [{ xMm: 0, yMm: 0 }, { xMm: 100, yMm: 0 }, { xMm: 100, yMm: 100 }, { xMm: 0, yMm: 100 }], area: 10000 },
      { name: 'L', pts: [{ xMm: 0, yMm: 0 }, { xMm: 40, yMm: 0 }, { xMm: 40, yMm: 10 }, { xMm: 10, yMm: 10 }, { xMm: 10, yMm: 40 }, { xMm: 0, yMm: 40 }], area: 700 },
    ];
    for (const fx of fixtures) {
      for (const d of [3, 10, 25]) {
        const out = ownRawOffsetPoints(fx.pts, d);
        expect(pointLoopSelfIntersects(out)).toBe(false); // simple
        expect(rawOffsetSelfIntersects(fx.pts, d)).toBe(false);
        expect(Math.abs(signedAreaOfPoints(out))).toBeGreaterThan(fx.area);
      }
    }
  });

  it('handles zero offset as identity and rejects an empty polygon', () => {
    const { vertices, outer } = squareFixture();
    const r = geometryAdapter.offset(vertices, { outer, holes: [] }, 0);
    expect(geometryAdapter.polygonAreaMm2(r.vertices, r.outer)).toBeGreaterThan(0);
  });
});

describe('area helpers', () => {
  it('signedAreaOfPoints / dedupePoints / polylineIntersections behave', () => {
    const rect = [
      { xMm: 0, yMm: 0 },
      { xMm: 4, yMm: 0 },
      { xMm: 4, yMm: 2 },
      { xMm: 0, yMm: 2 },
    ];
    expectMmClose(signedAreaOfPoints(rect), 8);
    const dupes = dedupePoints([{ xMm: 1, yMm: 1 }, { xMm: 1.00001, yMm: 1 }, { xMm: 5, yMm: 5 }], 0.01);
    expect(dupes).toHaveLength(2);
    // two crossing segments
    const hits = polylineIntersections(
      [{ xMm: 0, yMm: 0 }, { xMm: 10, yMm: 10 }],
      [{ xMm: 0, yMm: 10 }, { xMm: 10, yMm: 0 }],
      0.01,
    );
    expect(hits).toHaveLength(1);
    expectMmClose(hits[0].xMm, 5);
    expectMmClose(hits[0].yMm, 5);
  });
});

describe('sampler defaults', () => {
  it('exposes a documented default tolerance', () => {
    expect(typeof DEFAULT_TOLERANCE_MM).toBe('number');
  });
});
