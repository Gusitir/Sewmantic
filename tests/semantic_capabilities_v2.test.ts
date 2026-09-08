// T-52 operator SDK, base kernel capabilities and drift-free derivation
// tests for the semantic pattern kernel (v2).
//
// Gates covered:
//   - base capabilities registered: kernel.split-edge, kernel.insert-dart,
//     kernel.cut, kernel.evaluate-constraints, all `experimental` at 0.1.0;
//   - SDK normalization: kernel OperatorResult rejections become typed
//     `CapabilityOperatorRejection`; params are validated through the entry's
//     Zod schema before delegating;
//   - equivalence: `runCapability` via the registry produces the same
//     document / diagnostics as calling the kernel operator directly;
//   - derivation: tool schemas and prompt fragment generated 100% from the
//     registry (id-sorted, highest version per id), typed error for
//     unsupported Zod types;
//   - drift gate: generated derivation matches the versioned snapshot;
//     any mismatch fails with a path diff; UPDATE_SNAPSHOTS=1 regenerates
//     deliberately.

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CapabilityDerivationError,
  CapabilityOperatorRejection,
  CapabilityRegistryError,
  SEMANTIC_V2_SCHEMA_VERSION,
  createCapabilityRegistry,
  cut,
  defineKernelCapability,
  evaluateConstraints,
  generatePromptFragment,
  generateToolSchemas,
  insertDart,
  registerBaseCapabilities,
  runCapability,
  serializeDocument,
  splitEdge,
  type CapabilityEntry,
  type ConstraintDiagnostic,
  type PatternDocument,
} from '../src/engine/v2/index.js';

// --- fixtures -------------------------------------------------------------

/** Line fixture: 100 mm left edge vs two 50 mm right edges, anti-parallel. */
function buildLineFixture(): PatternDocument {
  return {
    schemaVersion: SEMANTIC_V2_SCHEMA_VERSION,
    vertices: [
      { id: 'vL0', xMm: 0, yMm: 0 },
      { id: 'vL1', xMm: 0, yMm: 100 },
      { id: 'vR0', xMm: 0, yMm: 100 },
      { id: 'vR1', xMm: 0, yMm: 50 },
      { id: 'vR2', xMm: 0, yMm: 0 },
    ],
    edges: [
      { id: 'eL0', role: 'boundary', curve: { kind: 'line', startVertexId: 'vL0', endVertexId: 'vL1' } },
      { id: 'eR0', role: 'boundary', curve: { kind: 'line', startVertexId: 'vR0', endVertexId: 'vR1' } },
      { id: 'eR1', role: 'boundary', curve: { kind: 'line', startVertexId: 'vR1', endVertexId: 'vR2' } },
    ],
    sequences: [
      { id: 'seqL', panelId: 'p0', role: 'side seam', isLoop: false, edgeIds: ['eL0'] },
      { id: 'seqR', panelId: 'p1', role: 'side seam', isLoop: false, edgeIds: ['eR0', 'eR1'] },
    ],
    panels: [
      { id: 'p0', name: 'left panel', material: 'shell', cutCount: 1, onFold: false, sequenceIds: ['seqL'] },
      { id: 'p1', name: 'right panel', material: 'shell', cutCount: 1, onFold: false, sequenceIds: ['seqR'] },
    ],
    components: [{ id: 'c0', name: 'bodice', panelIds: ['p0', 'p1'] }],
    interfaces: [
      { id: 'i0', label: 'side seam', leftSequenceId: 'seqL', rightSequenceId: 'seqR', seamAllowanceMm: 10 },
    ],
    stitchPairs: [],
    diagnostics: [],
  };
}

/** Line fixture whose right side is 5 mm longer (total 105 vs 100). */
function buildDeltaFixture(): PatternDocument {
  const doc = buildLineFixture();
  doc.vertices[4] = { id: 'vR2', xMm: 0, yMm: -5 };
  return doc;
}

function freshRegistry() {
  return registerBaseCapabilities(createCapabilityRegistry());
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (err) {
    return err;
  }
  throw new Error('expected an error, nothing was thrown');
}

// --- base capabilities ----------------------------------------------------

describe('T-52 base capabilities', () => {
  it('registers exactly the four kernel capabilities as experimental at 0.1.0', () => {
    const registry = freshRegistry();
    expect(
      registry.listCapabilities().map((entry) => `${entry.id}@${entry.version} [${entry.status}]`),
    ).toEqual([
      'kernel.cut@0.1.0 [experimental]',
      'kernel.evaluate-constraints@0.1.0 [experimental]',
      'kernel.insert-dart@0.1.0 [experimental]',
      'kernel.split-edge@0.1.0 [experimental]',
    ]);
  });

  it('rejects re-registration of the base capabilities (DUPLICATE_ENTRY)', () => {
    const registry = freshRegistry();
    const err = captureError(() => registerBaseCapabilities(registry));
    expect(err).toBeInstanceOf(CapabilityRegistryError);
    if (err instanceof CapabilityRegistryError) {
      expect(err.code).toBe('DUPLICATE_ENTRY');
    }
  });

  it('evaluates constraints read-only, equal to the direct evaluation', () => {
    const registry = freshRegistry();
    const doc = buildDeltaFixture();
    const before = serializeDocument(doc);

    const withDefault = runCapability<ConstraintDiagnostic[]>(
      registry,
      'kernel.evaluate-constraints',
      doc,
      {},
    );
    expect(withDefault).toEqual(evaluateConstraints(doc));
    expect(withDefault.length).toBeGreaterThan(0);

    const withCustomLimit = runCapability<ConstraintDiagnostic[]>(
      registry,
      'kernel.evaluate-constraints',
      doc,
      { maxSeamDeltaMm: 10 },
    );
    expect(withCustomLimit).toEqual([]);

    expect(serializeDocument(doc)).toBe(before);
  });
});

// --- operator SDK ---------------------------------------------------------

describe('T-52 operator SDK', () => {
  it('wraps success and rejection OperatorResults into the capability contract', () => {
    const doc = buildLineFixture();
    const entry = defineKernelCapability<{ flag: boolean }>({
      id: 'kernel.probe',
      version: '0.1.0',
      status: 'draft',
      description: 'sdk wrapper probe capability',
      paramsSchema: z.object({ flag: z.boolean() }),
      operator: (input, params) =>
        params.flag
          ? { ok: true as const, doc: input, diagnostics: [] }
          : { ok: false as const, code: 'INVALID_PARAMETERS' as const, message: 'flag must be true', diagnostics: [] },
    });

    expect(entry.id).toBe('kernel.probe');
    expect(entry.operator(doc, { flag: true })).toBe(doc);

    const err = captureError(() => entry.operator(doc, { flag: false }));
    expect(err).toBeInstanceOf(CapabilityOperatorRejection);
    if (err instanceof CapabilityOperatorRejection) {
      expect(err.code).toBe('INVALID_PARAMETERS');
      expect(err.message).toBe('flag must be true');
      expect(err.diagnostics).toEqual([]);
    }
  });

  it('normalizes kernel rejections into typed CapabilityOperatorRejection', () => {
    const registry = freshRegistry();
    const err = captureError(() =>
      runCapability<PatternDocument>(registry, 'kernel.split-edge', buildLineFixture(), {
        edgeId: 'eGONE',
      }),
    );
    expect(err).toBeInstanceOf(CapabilityOperatorRejection);
    if (err instanceof CapabilityOperatorRejection) {
      expect(err.code).toBe('UNKNOWN_EDGE');
      expect(err.message).toContain('eGONE');
      expect(err.diagnostics).toEqual([]);
    }
  });

  it('validates params through the Zod schema before delegating', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();

    const missing = captureError(() =>
      runCapability<PatternDocument>(registry, 'kernel.insert-dart', doc, { edgeId: 'eL0' }),
    );
    expect(missing).toBeInstanceOf(z.ZodError);

    const wrongType = captureError(() =>
      runCapability<PatternDocument>(registry, 'kernel.insert-dart', doc, {
        edgeId: 'eL0',
        depthMm: 'deep',
      }),
    );
    expect(wrongType).toBeInstanceOf(z.ZodError);
  });
});

// --- equivalence with direct operators ------------------------------------

describe('T-52 runCapability equivalence with direct operators', () => {
  it('kernel.split-edge matches splitEdge', () => {
    const registry = freshRegistry();
    const direct = splitEdge(buildLineFixture(), 'eL0', { atMm: 30 });
    if (!direct.ok) throw new Error(`expected success, got ${direct.code}: ${direct.message}`);
    const viaRegistry = runCapability<PatternDocument>(
      registry,
      'kernel.split-edge',
      buildLineFixture(),
      { edgeId: 'eL0', atMm: 30 },
    );
    expect(serializeDocument(viaRegistry)).toBe(serializeDocument(direct.doc));
  });

  it('kernel.insert-dart matches insertDart', () => {
    const registry = freshRegistry();
    const direct = insertDart(buildLineFixture(), { edgeId: 'eL0', depthMm: 7, atMm: 40 });
    if (!direct.ok) throw new Error(`expected success, got ${direct.code}: ${direct.message}`);
    const viaRegistry = runCapability<PatternDocument>(
      registry,
      'kernel.insert-dart',
      buildLineFixture(),
      { edgeId: 'eL0', depthMm: 7, atMm: 40 },
    );
    expect(serializeDocument(viaRegistry)).toBe(serializeDocument(direct.doc));
  });

  it('kernel.cut matches cut', () => {
    const registry = freshRegistry();
    const direct = cut(buildLineFixture(), { edgeId: 'eL0', lengthMm: 20 });
    if (!direct.ok) throw new Error(`expected success, got ${direct.code}: ${direct.message}`);
    const viaRegistry = runCapability<PatternDocument>(
      registry,
      'kernel.cut',
      buildLineFixture(),
      { edgeId: 'eL0', lengthMm: 20 },
    );
    expect(serializeDocument(viaRegistry)).toBe(serializeDocument(direct.doc));
  });

  it('rejections carry the same codes as the direct operator', () => {
    const registry = freshRegistry();
    const direct = cut(buildLineFixture(), { edgeId: 'eL0', lengthMm: 999 });
    expect(direct.ok).toBe(false);
    if (!direct.ok) expect(direct.code).toBe('INVALID_PARAMETERS');

    const err = captureError(() =>
      runCapability<PatternDocument>(registry, 'kernel.cut', buildLineFixture(), {
        edgeId: 'eL0',
        lengthMm: 999,
      }),
    );
    expect(err).toBeInstanceOf(CapabilityOperatorRejection);
    if (err instanceof CapabilityOperatorRejection) {
      expect(err.code).toBe('INVALID_PARAMETERS');
      expect(err.message).toBe(direct.message);
    }
  });
});

// --- derivation -----------------------------------------------------------

const probeEntry = (version: string): CapabilityEntry<{ mark: string }, PatternDocument> => ({
  id: 'kernel.probe',
  version,
  status: 'draft',
  paramsSchema: z.object({ mark: z.string() }),
  operator: (doc) => doc,
  description: 'version resolution probe capability',
});

describe('T-52 derivation', () => {
  it('derives one id-sorted tool schema per capability', () => {
    const schemas = generateToolSchemas(freshRegistry());
    expect(schemas.map((schema) => schema.id)).toEqual([
      'kernel.cut',
      'kernel.evaluate-constraints',
      'kernel.insert-dart',
      'kernel.split-edge',
    ]);
    expect(schemas.every((schema) => schema.status === 'experimental')).toBe(true);
  });

  it('derives params mirroring the real operator parameters', () => {
    const schemas = generateToolSchemas(freshRegistry());
    const dart = schemas.find((schema) => schema.id === 'kernel.insert-dart');
    expect(dart?.params.type).toBe('object');
    expect(dart?.params.required).toEqual(['edgeId', 'depthMm']);
    const dartProps = dart?.params.properties ?? {};
    expect(dartProps.depthMm).toEqual({ type: 'number' });
    expect(dartProps.side).toEqual({ type: 'string', enum: ['left', 'right'] });
    expect(dartProps.sample).toEqual({
      type: 'object',
      properties: { toleranceMm: { type: 'number' }, maxSegments: { type: 'number' } },
    });
    expect((dartProps.sample as { required?: unknown }).required).toBeUndefined();

    const split = schemas.find((schema) => schema.id === 'kernel.split-edge');
    expect(split?.params.required).toEqual(['edgeId']);
    expect(split?.params.properties?.atMm).toEqual({ type: 'number' });

    const evaluate = schemas.find((schema) => schema.id === 'kernel.evaluate-constraints');
    expect(evaluate?.params.required).toBeUndefined();
  });

  it('derives array and enum params', () => {
    const probe = createCapabilityRegistry();
    probe.registerCapability({
      id: 'kernel.probe',
      version: '0.1.0',
      status: 'draft',
      description: 'serializer probe capability',
      paramsSchema: z.object({
        tags: z.array(z.string()),
        kind: z.enum(['a', 'b']),
        enabled: z.boolean(),
      }),
      operator: (doc) => doc,
    });

    const [schema] = generateToolSchemas(probe);
    expect(schema?.params.properties?.tags).toEqual({ type: 'array', items: { type: 'string' } });
    expect(schema?.params.properties?.kind).toEqual({ type: 'string', enum: ['a', 'b'] });
    expect(schema?.params.properties?.enabled).toEqual({ type: 'boolean' });
    expect(schema?.params.required).toEqual(['tags', 'kind', 'enabled']);
  });

  it('throws a typed error for unsupported Zod types at generation time', () => {
    const probe = createCapabilityRegistry();
    probe.registerCapability({
      id: 'kernel.probe',
      version: '0.1.0',
      status: 'draft',
      description: 'unsupported serializer probe capability',
      paramsSchema: z.object({ mapping: z.record(z.string(), z.number()) }),
      operator: (doc) => doc,
    });

    const err = captureError(() => generateToolSchemas(probe));
    expect(err).toBeInstanceOf(CapabilityDerivationError);
    if (err instanceof CapabilityDerivationError) {
      expect(err.zodType).toBe('ZodRecord');
      expect(err.message).toContain('ZodRecord');
    }
  });

  it('derives only the highest registered version per id', () => {
    const probe = createCapabilityRegistry();
    for (const version of ['0.1.0', '0.2.0', '0.10.0']) {
      probe.registerCapability(probeEntry(version));
    }

    const schemas = generateToolSchemas(probe);
    expect(schemas).toHaveLength(1);
    expect(schemas[0]?.id).toBe('kernel.probe');

    const fragment = generatePromptFragment(probe);
    const lines = fragment.split('\n').filter((line) => line.startsWith('- kernel.probe'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('v0.10.0');
  });

  it('prompt fragment is deterministic and lists id, version, status, description and params', () => {
    const first = generatePromptFragment(freshRegistry());
    const second = generatePromptFragment(freshRegistry());
    expect(first).toBe(second);
    expect(first.split('\n')[0]).toBe('kernel capabilities:');

    for (const id of [
      'kernel.cut',
      'kernel.evaluate-constraints',
      'kernel.insert-dart',
      'kernel.split-edge',
    ]) {
      expect(first).toContain(`- ${id} v0.1.0 [experimental]:`);
    }
    expect(first).toContain('edgeId: string');
    expect(first).toContain('depthMm: number');
    expect(first).toContain('side: enum<left|right> (optional)');
    expect(first).toContain('sample: object{toleranceMm:number, maxSegments:number} (optional)');
  });
});

// --- drift gate -----------------------------------------------------------

const SNAPSHOT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'snapshots',
  'capabilities-derivation.snapshot.json',
);

interface DerivationSnapshot {
  readonly toolSchemas: unknown;
  readonly promptFragment: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function preview(value: unknown): string {
  const json = JSON.stringify(value) ?? String(value);
  return json.length > 120 ? `${json.slice(0, 117)}...` : json;
}

function diffPaths(base: string, left: unknown, right: unknown): string[] {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return [`${base}: value kind mismatch`];
    }
    const out: string[] = [];
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i += 1) {
      const at = `${base}[${i}]`;
      if (i >= left.length) out.push(`${at} added: ${preview(right[i])}`);
      else if (i >= right.length) out.push(`${at} removed`);
      else out.push(...diffPaths(at, left[i], right[i]));
    }
    return out;
  }
  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) {
      return [`${base}: value kind mismatch`];
    }
    const out: string[] = [];
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
    for (const key of keys) {
      const at = `${base}.${key}`;
      if (!(key in left)) out.push(`${at} added: ${preview(right[key])}`);
      else if (!(key in right)) out.push(`${at} removed`);
      else out.push(...diffPaths(at, left[key], right[key]));
    }
    return out;
  }
  return JSON.stringify(left) === JSON.stringify(right)
    ? []
    : [`${base}: ${preview(left)} !== ${preview(right)}`];
}

function buildDerivation(): DerivationSnapshot {
  const registry = freshRegistry();
  return {
    toolSchemas: generateToolSchemas(registry),
    promptFragment: generatePromptFragment(registry),
  };
}

function writeSnapshot(snapshot: DerivationSnapshot): void {
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
}

describe('T-52 derivation drift gate', () => {
  it('matches the versioned derivation snapshot', () => {
    const derived = buildDerivation();

    if (!existsSync(SNAPSHOT_PATH)) {
      writeSnapshot(derived);
      console.log(`[T-52] capabilities derivation snapshot generated: true (${SNAPSHOT_PATH})`);
      return;
    }

    const stored = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as DerivationSnapshot;
    const drift = diffPaths('derivation', stored, derived);
    if (drift.length > 0) {
      throw new Error(
        `capability derivation drifted from the versioned snapshot (${drift.length} path(s)); ` +
          'approved capability changes require a deliberate regeneration with UPDATE_SNAPSHOTS=1.\n' +
          drift.map((path) => `  - ${path}`).join('\n'),
      );
    }
  });

  it('regenerates the snapshot only under UPDATE_SNAPSHOTS=1', () => {
    if (process.env.UPDATE_SNAPSHOTS !== '1') {
      return;
    }
    writeSnapshot(buildDerivation());
    console.log(
      `[T-52] capabilities derivation snapshot regenerated (UPDATE_SNAPSHOTS=1): ${SNAPSHOT_PATH}`,
    );
  });
});
