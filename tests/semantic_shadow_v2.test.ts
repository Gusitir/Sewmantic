// tests/semantic_shadow_v2.test.ts
// T-48 legacy adapter & read-only semantic shadow mode tests.
//
// Gates covered:
//   - legacyPartsToSemanticDocument maps top/bottom/dress fixtures in TWO
//     sizes preserving name/label, cutCount, onFold, grainline, notches and
//     outlines (vertices/edges form the closed boundary loop); the document
//     serializes and round-trips byte-exactly.
//   - runSemanticShadow never throws, reporting degenerate inputs (empty or
//     2-point outlines, misaligned arrays) as non-blocking diagnostics with
//     constraintId SHADOW_ADAPTER_FAILURE / severity 'error'.
//   - Pipeline integration: with SEMANTIC_SHADOW=on the full
//     generatePatternPipeline run produces byte-identical deliverables (same
//     file names, same bytes) versus SEMANTIC_SHADOW=off. The clock (Date
//     only) is pinned so PDF/techpack timestamps do not mask the comparison.
//     ON-vs-OFF wall time is measured and reported without a hard threshold.

import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { generatePatternPipeline } from '../src/pipeline.js';
import type { PatternPart, Point2D } from '../src/engine/geometry.js';
import type { StandardSize } from '../src/types/pattern.js';
import {
  SHADOW_ADAPTER_FAILURE_ID,
  deserializeDocument,
  legacyPartsToSemanticDocument,
  runSemanticShadow,
  serializeDocument,
  validatePatternDocument,
  type PatternDocument,
} from '../src/engine/v2/index.js';

// --- Legacy PatternPart fixtures -------------------------------------------

interface PartSpec {
  name: string;
  label: string;
  cutCount: number;
  onFold: boolean;
  notchCount: number;
}

// top (torso set), bottom (trouser set) and dress piece sets, mirroring the
// legacy pipeline part naming.
const PART_SPECS: PartSpec[] = [
  { name: 'front_torso', label: 'Front Torso', cutCount: 2, onFold: false, notchCount: 2 },
  { name: 'back_torso', label: 'Back Torso', cutCount: 1, onFold: false, notchCount: 1 },
  { name: 'sleeve', label: 'Sleeve', cutCount: 2, onFold: false, notchCount: 1 },
  { name: 'front_leg', label: 'Front Leg', cutCount: 2, onFold: false, notchCount: 1 },
  { name: 'back_leg', label: 'Back Leg', cutCount: 2, onFold: false, notchCount: 2 },
  { name: 'waistband', label: 'Waistband', cutCount: 1, onFold: true, notchCount: 0 },
  { name: 'bodice_front', label: 'Bodice Front', cutCount: 1, onFold: true, notchCount: 1 },
  { name: 'skirt_front', label: 'Skirt Front', cutCount: 1, onFold: true, notchCount: 0 },
];

function makeOutline(scale: number): Point2D[] {
  return [
    { x: 0 * scale, y: 0 * scale },
    { x: 200 * scale, y: 0 * scale },
    { x: 220 * scale, y: 150 * scale },
    { x: 100 * scale, y: 260 * scale },
    { x: -20 * scale, y: 150 * scale },
  ];
}

function makePart(spec: PartSpec, scale: number): PatternPart {
  const outline = makeOutline(scale);
  const notches = Array.from({ length: spec.notchCount }, (_, i) => ({
    point: { x: 50 * scale + i * 10, y: 75 * scale },
    angle_deg: 90 + i * 5,
    type: (i % 3 === 0 ? 'single' : i % 3 === 1 ? 'double' : 'triple') as
      | 'single'
      | 'double'
      | 'triple',
    label: `${spec.name}-notch-${i}`,
  }));
  return {
    name: spec.name,
    label: spec.label,
    cutCount: spec.cutCount,
    onFold: spec.onFold,
    points: {},
    pathD: '',
    outline,
    bounds: { minX: -20, minY: 0, maxX: 220, maxY: 260, width: 240, height: 260 },
    width_mm: 240 * scale,
    height_mm: 260 * scale,
    area_mm2: 240 * 260 * scale * scale,
    grainline: {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 100 * scale },
      label: `${spec.name}-grain`,
    },
    notches,
  };
}

/** Top/bottom/dress fixtures in two sizes (S scale 1.0, M scale 1.1). */
function buildFixture(): { parts: PatternPart[]; sizes: StandardSize[] } {
  const parts: PatternPart[] = [];
  const sizes: StandardSize[] = [];
  for (const size of ['S', 'M'] as StandardSize[]) {
    const scale = size === 'S' ? 1 : 1.1;
    for (const spec of PART_SPECS) {
      parts.push(makePart(spec, scale));
      sizes.push(size);
    }
  }
  return { parts, sizes };
}

// --- Adapter assertions -----------------------------------------------------

function expectPartMapped(
  doc: PatternDocument,
  part: PatternPart,
  size: StandardSize
): void {
  const key = `${part.name}-${size}`;
  const panelId = `panel-${key}`;

  const panel = doc.panels.find((p) => p.id === panelId);
  expect(panel, panelId).toBeDefined();
  expect(panel!.name).toBe(part.label);
  expect(panel!.cutCount).toBe(part.cutCount);
  expect(panel!.onFold).toBe(part.onFold);

  const component = doc.components.find((c) => c.id === `component-${key}`);
  expect(component, `component-${key}`).toBeDefined();
  expect(component!.name).toBe(part.name);
  expect(component!.panelIds).toEqual([panelId]);

  const meta = doc.components.find((c) => c.id === `meta-${key}`);
  expect(meta, `meta-${key}`).toBeDefined();
  expect(JSON.parse(meta!.name)).toEqual({
    part: part.name,
    grainline: {
      start: { x: part.grainline.start.x, y: part.grainline.start.y },
      end: { x: part.grainline.end.x, y: part.grainline.end.y },
      label: part.grainline.label,
    },
    notches: part.notches.map((n) => ({
      point: { x: n.point.x, y: n.point.y },
      angle_deg: n.angle_deg,
      type: n.type,
      label: n.label,
    })),
  });

  const n = part.outline.length;
  const seq = doc.sequences.find((s) => s.id === `seq-${key}-outline`);
  expect(seq, `seq-${key}-outline`).toBeDefined();
  expect(seq!.panelId).toBe(panelId);
  expect(seq!.role).toBe('outline');
  expect(seq!.isLoop).toBe(true);
  expect(seq!.edgeIds).toHaveLength(n);

  part.outline.forEach((p, j) => {
    const v = doc.vertices.find((v) => v.id === `v-${key}-${j}`);
    expect(v, `v-${key}-${j}`).toBeDefined();
    expect(v!.xMm).toBe(p.x);
    expect(v!.yMm).toBe(p.y);
  });

  seq!.edgeIds.forEach((edgeId, j) => {
    const edge = doc.edges.find((e) => e.id === edgeId);
    expect(edge, edgeId).toBeDefined();
    expect(edge!.role).toBe('boundary');
    expect(edge!.curve.kind).toBe('line');
    if (edge!.curve.kind === 'line') {
      expect(edge!.curve.startVertexId).toBe(`v-${key}-${j}`);
      expect(edge!.curve.endVertexId).toBe(`v-${key}-${(j + 1) % n}`);
    }
  });
}

// --- Tests ------------------------------------------------------------------

describe('T-48 legacy adapter: legacyPartsToSemanticDocument', () => {
  it('mapea fixtures top/bottom/dress en DOS tallas preservando metadatos y contornos', () => {
    const { parts, sizes } = buildFixture();
    const doc = legacyPartsToSemanticDocument(parts, sizes);

    expect(doc.schemaVersion).toBe(1);
    expect(doc.panels).toHaveLength(parts.length);
    expect(doc.interfaces).toHaveLength(0);
    expect(doc.stitchPairs).toHaveLength(0);
    expect(doc.diagnostics).toHaveLength(0);

    parts.forEach((part, i) => expectPartMapped(doc, part, sizes[i]));

    // Round-trip: the snapshot is a valid, serializable v2 document.
    const json = serializeDocument(doc);
    expect(deserializeDocument(json)).toEqual(doc);
  });

  it('asigna ids estables y únicos por (parte, talla)', () => {
    const { parts, sizes } = buildFixture();
    const doc = legacyPartsToSemanticDocument(parts, sizes);

    const panelIds = doc.panels.map((p) => p.id);
    expect(new Set(panelIds).size).toBe(panelIds.length);
    expect(panelIds).toContain('panel-front_torso-S');
    expect(panelIds).toContain('panel-front_torso-M');
    expect(panelIds).toContain('panel-waistband-M');
  });
});

describe('T-48 shadow runner: runSemanticShadow', () => {
  it('con piezas válidas no produce diagnósticos de error y no lanza', () => {
    const { parts, sizes } = buildFixture();
    const { document, diagnostics } = runSemanticShadow(parts, sizes);

    expect(document.panels).toHaveLength(parts.length);
    expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(validatePatternDocument(document)).toEqual([]);
  });

  it('con entrada vacía no lanza y devuelve un documento válido', () => {
    const { document, diagnostics } = runSemanticShadow([], []);
    expect(document.panels).toHaveLength(0);
    expect(diagnostics).toHaveLength(0);
    expect(validatePatternDocument(document)).toEqual([]);
  });

  it('con piezas degeneradas (sin puntos) reporta diagnóstico sin lanzar', () => {
    const valid = makePart(PART_SPECS[0], 1);
    const noPoints = makePart(PART_SPECS[2], 1);
    noPoints.outline = [];
    const twoPoints = makePart(PART_SPECS[5], 1);
    twoPoints.outline = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];

    const { document, diagnostics } = runSemanticShadow(
      [valid, noPoints, twoPoints],
      ['M', 'M', 'M']
    );

    expect(document.panels).toHaveLength(3);
    const failures = diagnostics.filter(
      (d) => d.constraintId === SHADOW_ADAPTER_FAILURE_ID
    );
    expect(failures.length).toBeGreaterThanOrEqual(2);
    expect(failures.every((d) => d.severity === 'error')).toBe(true);
    expect(validatePatternDocument(document)).toEqual([]);
  });

  it('captura el fallo del adapter (arrays desalineados) como diagnóstico no bloqueante', () => {
    const parts = [makePart(PART_SPECS[0], 1)];
    const { document, diagnostics } = runSemanticShadow(parts, ['M', 'M']);

    expect(document.panels).toHaveLength(0);
    expect(
      diagnostics.some(
        (d) =>
          d.constraintId === SHADOW_ADAPTER_FAILURE_ID && d.severity === 'error'
      )
    ).toBe(true);
  });
});

// --- Pipeline integration: OFF vs ON byte-identical -------------------------

const SHADOW_OFF_DIR = path.resolve('tests/output_shadow_off');
const SHADOW_ON_DIR = path.resolve('tests/output_shadow_on');

describe('T-48 integración pipeline: SEMANTIC_SHADOW off vs on', () => {
  beforeAll(async () => {
    await fs.promises.rm(SHADOW_OFF_DIR, { recursive: true, force: true });
    await fs.promises.rm(SHADOW_ON_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.promises.rm(SHADOW_OFF_DIR, { recursive: true, force: true });
    await fs.promises.rm(SHADOW_ON_DIR, { recursive: true, force: true });
  });

  it('produce entregables byte-idénticos con shadow OFF y ON (overhead medido)', async () => {
    const run = (outputDir: string) =>
      generatePatternPipeline({
        prompt: 'classic crew tee',
        provider: 'mock',
        outputDir,
        sizes: ['S', 'M'],
      });

    // Pin the clock (Date only) so PDF/techpack timestamps are identical
    // across runs; timers/promises stay real.
    vi.useFakeTimers({
      now: new Date('2026-09-07T12:00:00Z'),
      toFake: ['Date'],
    });
    try {
      delete process.env.SEMANTIC_SHADOW;
      const startOff = performance.now();
      const resOff = await run(SHADOW_OFF_DIR);
      const offMs = performance.now() - startOff;

      process.env.SEMANTIC_SHADOW = 'on';
      const startOn = performance.now();
      const resOn = await run(SHADOW_ON_DIR);
      const onMs = performance.now() - startOn;

      expect(resOff.success).toBe(true);
      expect(resOn.success).toBe(true);

      const overheadMs = onMs - offMs;
      console.log(
        `[semantic-shadow overhead] OFF=${offMs.toFixed(1)}ms ON=${onMs.toFixed(1)}ms delta=${overheadMs.toFixed(1)}ms`
      );
      expect(Number.isFinite(overheadMs)).toBe(true);

      const keys = Object.keys(resOff.files).filter(
        (k) =>
          typeof resOff.files[k as keyof typeof resOff.files] === 'string'
      );
      expect(keys).toHaveLength(9);

      const namesOff = keys
        .map((k) =>
          path.basename(resOff.files[k as keyof typeof resOff.files] as string)
        )
        .sort();
      const namesOn = keys
        .map((k) =>
          path.basename(resOn.files[k as keyof typeof resOn.files] as string)
        )
        .sort();
      expect(namesOn).toEqual(namesOff);

      for (const key of keys) {
        const fileOff = resOff.files[key as keyof typeof resOff.files] as string;
        const fileOn = resOn.files[key as keyof typeof resOn.files] as string;
        const bufOff = fs.readFileSync(fileOff);
        const bufOn = fs.readFileSync(fileOn);
        expect(
          bufOn.equals(bufOff),
          `entregable "${key}" (${path.basename(fileOff)}) difiere entre OFF y ON`
        ).toBe(true);
      }
    } finally {
      delete process.env.SEMANTIC_SHADOW;
      vi.useRealTimers();
    }
  });
});
