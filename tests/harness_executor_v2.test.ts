// T-55 tests for the Patternist Harness capability tools bridge and bounded
// executor.
//
// Gates covered:
//   - capabilityToTool: registry-backed metadata, split-edge execution over a
//     valid document, Zod param rejections normalized to INVALID_PARAMETERS,
//     kernel rejections carried through with their codes, read-only
//     capabilities returning an untouched document, draft gating with
//     DRAFT_CAPABILITY_FORBIDDEN unless { allowDraft: true };
//   - registryToTools: one id-sorted tool per capability, drafts excluded
//     unless allowed;
//   - executeTurn: atomic success (ONE consolidated revision, ONE tool turn,
//     ONE auto decision, single undo back to the pre-turn document),
//     MAX_STEPS_EXCEEDED without touching the session, preflight human
//     approval of the whole turn, CAPABILITY_GAP preflight, mid-turn failure
//     atomicity (session byte-identical + failedStep), draft gating.
//
// Offline: no network, no env dependencies.

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  SEMANTIC_V2_SCHEMA_VERSION,
  createCapabilityRegistry,
  defineKernelCapability,
  registerBaseCapabilities,
  serializeDocument,
  type PatternDocument,
} from '../src/engine/v2/index.js';
import { createHarnessSession, serializeSession } from '../src/harness/session.js';
import { executeTurn, type HarnessStep, type HarnessStepRequest } from '../src/harness/executor.js';
import { capabilityToTool, registryToTools } from '../src/harness/tools.js';

// --- fixtures -------------------------------------------------------------

/** Line fixture (copied from tests/harness_session_v2.test.ts). */
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

/** Base registry plus a draft probe capability (identity operator). */
function freshRegistryWithDraft() {
  const registry = freshRegistry();
  registry.registerCapability(
    defineKernelCapability<{ enabled: boolean }>({
      id: 'kernel.probe-draft',
      version: '0.1.0',
      status: 'draft',
      description: 'draft probe capability for harness gating tests',
      paramsSchema: z.object({ enabled: z.boolean() }),
      operator: (doc, params) =>
        params.enabled
          ? { ok: true as const, doc, diagnostics: [] }
          : { ok: false as const, code: 'INVALID_PARAMETERS' as const, message: 'probe must be enabled', diagnostics: [] },
    }),
  );
  return registry;
}

/** Deterministic clock: the n-th call returns the n-th second of 2026-01-01 UTC. */
function tickClock(): () => string {
  let tick = 0;
  return () => iso(tick++);
}

const iso = (seconds: number): string =>
  new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString();

const bytes = (doc: PatternDocument): string => serializeDocument(doc);

const BASE_IDS = ['kernel.cut', 'kernel.evaluate-constraints', 'kernel.insert-dart', 'kernel.split-edge'];

// --- capabilityToTool -----------------------------------------------------

describe('capabilityToTool', () => {
  it('exposes registry metadata for every base capability', () => {
    const registry = freshRegistry();
    const sampleParams: Record<string, unknown> = {
      'kernel.cut': { edgeId: 'eL0', lengthMm: 10 },
      'kernel.evaluate-constraints': {},
      'kernel.insert-dart': { edgeId: 'eL0', depthMm: 5 },
      'kernel.split-edge': { edgeId: 'eL0' },
    };
    for (const id of BASE_IDS) {
      const entry = registry.getCapability(id);
      const tool = capabilityToTool(registry, id);
      expect(tool.id).toBe(entry.id);
      expect(tool.version).toBe('0.1.0');
      expect(tool.status).toBe('experimental');
      expect(tool.description).toBe(entry.description);
      expect(tool.paramsSchema.safeParse(sampleParams[id]).success).toBe(true);
    }
  });

  it('executes kernel.split-edge over a valid document without touching the input', () => {
    const registry = freshRegistry();
    const tool = capabilityToTool(registry, 'kernel.split-edge');
    const doc = buildLineFixture();
    const before = bytes(doc);

    const result = tool.execute(doc, { edgeId: 'eL0', atMm: 30 });
    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);
    expect(result.doc.edges.length).toBe(4); // eL0 split into two edges
    expect(result.doc.sequences[0].edgeIds.length).toBe(2);
    expect(result.doc.vertices.length).toBe(6); // one new split vertex
    expect(bytes(result.doc)).not.toBe(before);
    expect(bytes(doc)).toBe(before); // caller document untouched

    const viaRegistry = capabilityToTool(registry, 'kernel.split-edge');
    const again = viaRegistry.execute(doc, { edgeId: 'eL0', atMm: 30 });
    if (!again.ok) throw new Error('expected deterministic success');
    expect(bytes(again.doc)).toBe(bytes(result.doc)); // deterministic
  });

  it('normalizes Zod param rejections into INVALID_PARAMETERS', () => {
    const registry = freshRegistry();
    const tool = capabilityToTool(registry, 'kernel.split-edge');
    const result = tool.execute(buildLineFixture(), { edgeId: 42 });
    expect(result).toEqual({
      ok: false,
      code: 'INVALID_PARAMETERS',
      message: expect.stringContaining('edgeId'),
      diagnostics: [],
    });
  });

  it('carries kernel operator rejections through with their codes', () => {
    const registry = freshRegistry();
    const tool = capabilityToTool(registry, 'kernel.split-edge');
    const result = tool.execute(buildLineFixture(), { edgeId: 'eGONE' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UNKNOWN_EDGE');
      expect(result.message).toContain('eGONE');
      expect(result.diagnostics).toEqual([]);
    }
  });

  it('keeps read-only capability documents byte-identical and returns diagnostics', () => {
    const registry = freshRegistry();
    const tool = capabilityToTool(registry, 'kernel.evaluate-constraints');
    const doc = buildDeltaFixture();
    const before = bytes(doc);

    const result = tool.execute(doc, {});
    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);
    expect(bytes(result.doc)).toBe(before);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(bytes(doc)).toBe(before);
  });

  it('rejects draft capabilities unless the tool is created with allowDraft', () => {
    const registry = freshRegistryWithDraft();
    const doc = buildLineFixture();

    const gated = capabilityToTool(registry, 'kernel.probe-draft');
    const rejected = gated.execute(doc, { enabled: true });
    expect(rejected).toEqual({
      ok: false,
      code: 'DRAFT_CAPABILITY_FORBIDDEN',
      message: expect.stringContaining('draft'),
      diagnostics: [],
    });

    const allowed = capabilityToTool(registry, 'kernel.probe-draft', undefined, { allowDraft: true });
    const executed = allowed.execute(doc, { enabled: true });
    if (!executed.ok) throw new Error(`expected success, got ${executed.code}: ${executed.message}`);
    expect(bytes(executed.doc)).toBe(bytes(doc)); // identity probe operator
  });
});

// --- registryToTools ------------------------------------------------------

describe('registryToTools', () => {
  it('derives one id-sorted tool per capability and excludes drafts by default', () => {
    const registry = freshRegistryWithDraft();
    expect(registryToTools(registry).map((tool) => tool.id)).toEqual(BASE_IDS);

    const withDraft = registryToTools(registry, { allowDraft: true });
    expect(withDraft.map((tool) => tool.id)).toEqual([...BASE_IDS.slice(0, 3), 'kernel.probe-draft', BASE_IDS[3]]);
    expect(withDraft.every((tool) => tool.id !== 'kernel.probe-draft' || tool.status === 'draft')).toBe(true);
  });
});

// --- executeTurn ----------------------------------------------------------

describe('executeTurn', () => {
  it('executes a successful turn atomically as ONE consolidated revision', async () => {
    const clock = tickClock();
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: clock });
    const registry = freshRegistry();
    const steps: HarnessStep[] = [
      { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 30 } },
      { capability: 'kernel.insert-dart', params: { edgeId: 'eR0', depthMm: 7, atMm: 25 } },
      { capability: 'kernel.evaluate-constraints', params: {} },
    ];

    const result = await executeTurn(session, registry, steps, { now: clock });
    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);
    expect(result.revisionId).toBe('rev-2');
    expect(result.applied).toEqual([
      'kernel.split-edge',
      'kernel.insert-dart',
      'kernel.evaluate-constraints',
    ]);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.every((d) => d.constraintId === 'SEAM_DELTA_LIMIT')).toBe(true);

    // The document changed (split + dart) exactly one revision ahead.
    expect(bytes(session.currentDoc)).not.toBe(bytes(doc));

    // Exactly ONE consolidated revision: a single undo returns to the
    // pre-turn document bytes.
    const undone = session.undo();
    if (!undone.ok) throw new Error('expected undo to succeed');
    expect(undone.revisionId).toBe('rev-1');
    expect(bytes(undone.doc)).toBe(bytes(doc));

    // ONE tool turn carrying every tool call, with deterministic timestamps
    // (session clock tick 2 = revision, executor ticks 3 and 4).
    expect(session.turns.length).toBe(1);
    const turn = session.turns[0];
    expect(turn.role).toBe('tool');
    expect(turn.revisionId).toBe('rev-2');
    expect(turn.createdAt).toBe(iso(3));
    expect(turn.content).toContain('3 capabilities');
    expect(turn.toolCalls).toEqual(
      steps.map((step) => ({ capability: step.capability, params: step.params, ok: true })),
    );

    // ONE auto decision.
    expect(session.decisions.length).toBe(1);
    expect(session.decisions[0].approvedBy).toBe('auto');
    expect(session.decisions[0].revisionId).toBe('rev-2');
    expect(session.decisions[0].createdAt).toBe(iso(4));
  });

  it('rejects turns exceeding maxSteps without touching the session', async () => {
    const session = createHarnessSession(buildLineFixture(), { now: tickClock() });
    const registry = freshRegistry();
    const steps: HarnessStep[] = [
      { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 30 } },
      { capability: 'kernel.insert-dart', params: { edgeId: 'eR0', depthMm: 7, atMm: 25 } },
      { capability: 'kernel.evaluate-constraints', params: {} },
    ];
    const before = serializeSession(session);

    const result = await executeTurn(session, registry, steps, { maxSteps: 2 });
    expect(result).toEqual({
      ok: false,
      code: 'MAX_STEPS_EXCEEDED',
      message: expect.stringContaining('maxSteps=2'),
      diagnostics: [],
    });
    expect(serializeSession(session)).toBe(before); // byte-identical session
  });

  it('preflights human approval for the whole turn before executing anything', async () => {
    const session = createHarnessSession(buildLineFixture(), { now: tickClock() });
    const registry = freshRegistry();
    const steps: HarnessStep[] = [
      { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 30 } },
      { capability: 'kernel.insert-dart', params: { edgeId: 'eR0', depthMm: 7, atMm: 25 } },
      { capability: 'kernel.evaluate-constraints', params: {} },
    ];
    const before = serializeSession(session);

    const seen: HarnessStepRequest[] = [];
    const rejected = await executeTurn(session, registry, steps, {
      requireApproval: (step) => {
        seen.push(step);
        return step.index !== 1;
      },
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.code).toBe('STEP_REJECTED_BY_HUMAN');
      expect(rejected.failedStep).toBe(1);
      expect(rejected.message).toContain('kernel.insert-dart');
    }
    expect(seen.map((step) => step.index)).toEqual([0, 1]); // step 2 never reached
    expect(seen[0]).toEqual({ index: 0, capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 30 } });
    expect(serializeSession(session)).toBe(before); // nothing executed

    // Full approval lets the whole turn run.
    const approved = await executeTurn(session, registry, steps, { requireApproval: () => true });
    if (!approved.ok) throw new Error(`expected success, got ${approved.code}: ${approved.message}`);
    expect(approved.revisionId).toBe('rev-2');
    expect(session.turns.length).toBe(1);
    expect(session.decisions.length).toBe(1);
  });

  it('rejects unknown capabilities with CAPABILITY_GAP before executing anything', async () => {
    const session = createHarnessSession(buildLineFixture(), { now: tickClock() });
    const registry = freshRegistry();
    const steps: HarnessStep[] = [
      { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 30 } },
      { capability: 'kernel.does-not-exist', params: {} },
    ];
    const before = serializeSession(session);

    const result = await executeTurn(session, registry, steps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('CAPABILITY_GAP');
      expect(result.failedStep).toBe(1);
      expect(result.message).toContain('kernel.does-not-exist');
    }
    expect(serializeSession(session)).toBe(before); // preflight prevented partial runs
    expect(session.turns.length).toBe(0);
  });

  it('keeps the session byte-identical when a mid-turn step fails (atomic variant)', async () => {
    const session = createHarnessSession(buildLineFixture(), { now: tickClock() });
    const registry = freshRegistry();
    const steps: HarnessStep[] = [
      { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 30 } },
      { capability: 'kernel.insert-dart', params: { edgeId: 'eR0' } }, // missing depthMm
      { capability: 'kernel.evaluate-constraints', params: {} },
    ];
    const before = serializeSession(session);

    const result = await executeTurn(session, registry, steps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('STEP_FAILED');
      expect(result.failedStep).toBe(1);
      expect(result.message).toContain('INVALID_PARAMETERS');
    }
    // No tool turn, no decision, no revision: the failed turn never existed.
    expect(serializeSession(session)).toBe(before);
    expect(session.turns.length).toBe(0);
    expect(session.decisions.length).toBe(0);
  });

  it('gates draft steps by default and executes them with allowDraft', async () => {
    const session = createHarnessSession(buildLineFixture(), { now: tickClock() });
    const registry = freshRegistryWithDraft();
    const steps: HarnessStep[] = [{ capability: 'kernel.probe-draft', params: { enabled: true } }];
    const before = serializeSession(session);

    const rejected = await executeTurn(session, registry, steps);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.code).toBe('DRAFT_CAPABILITY_FORBIDDEN');
      expect(rejected.failedStep).toBe(0);
    }
    expect(serializeSession(session)).toBe(before);

    const executed = await executeTurn(session, registry, steps, { allowDraft: true });
    if (!executed.ok) throw new Error(`expected success, got ${executed.code}: ${executed.message}`);
    expect(executed.applied).toEqual(['kernel.probe-draft']);
    expect(executed.revisionId).toBe('rev-2');
    expect(session.turns.length).toBe(1);
    expect(session.turns[0].toolCalls).toEqual([
      { capability: 'kernel.probe-draft', params: { enabled: true }, ok: true },
    ]);
  });

  it('rejects empty turns as a caller bug (RangeError, no TurnResult)', async () => {
    const session = createHarnessSession(buildLineFixture(), { now: tickClock() });
    const registry = freshRegistry();
    await expect(executeTurn(session, registry, [])).rejects.toThrow(RangeError);
  });
});
