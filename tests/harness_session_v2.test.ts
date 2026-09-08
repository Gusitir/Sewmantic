// T-54 tests for the Patternist Harness canonical state layer: revision
// manager (linear undo/redo over byte-identical kernel v2 snapshots) and
// session store (typed turns/decisions, revision delegation, lossless
// round-trip).
//
// Gates covered:
//   - commit/undo/redo/canUndo/canRedo pointer mechanics with sequential
//     stable revision ids (baseline document committed as rev-1);
//   - byte-identity of current() against the stored snapshots;
//   - redo-queue truncation after a commit behind the pointer (linear
//     history, no branching) and id stability across truncation;
//   - maxRevisions oldest-discard behaviour and injectable timestamps;
//   - session turns/decisions with sequential ids, commitRevision
//     delegation, undo/redo integration with session.currentDoc;
//   - serializeSession/deserializeSession round-trip preserving ids, turns,
//     decisions, revisions, pointer position and a byte-identical document.
//
// Offline: no network, no env dependencies.

import { describe, expect, it } from 'vitest';

import {
  SEMANTIC_V2_SCHEMA_VERSION,
  deserializeDocument,
  serializeDocument,
  type PatternDocument,
} from '../src/engine/v2/index.js';
import {
  createRevisionManager,
  restoreRevisionManager,
} from '../src/harness/revisions.js';
import {
  createHarnessSession,
  deserializeSession,
  serializeSession,
  type HarnessSession,
} from '../src/harness/session.js';

/** Line fixture (copied from tests/semantic_constraints_v2.test.ts). */
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

/** Deterministic clock: the n-th call returns the n-th second of 2026-01-01 UTC. */
function tickClock(): () => string {
  let tick = 0;
  return () => iso(tick++);
}

const iso = (seconds: number): string =>
  new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString();

const bytes = (doc: PatternDocument): string => serializeDocument(doc);

/** Deep clone through the kernel v2 serialization contract, then move one vertex. */
function withVertexYMm(doc: PatternDocument, vertexId: string, yMm: number): PatternDocument {
  const next = deserializeDocument(serializeDocument(doc));
  const vertex = next.vertices.find((v) => v.id === vertexId);
  if (vertex === undefined) {
    throw new Error(`vertex "${vertexId}" not found`);
  }
  vertex.yMm = yMm;
  return next;
}

describe('createRevisionManager', () => {
  it('commits the initial document as a byte-identical detached baseline snapshot', () => {
    const doc = buildLineFixture();
    const manager = createRevisionManager(doc, { now: tickClock() });

    expect(bytes(manager.current())).toBe(bytes(doc));
    expect(manager.current()).not.toBe(doc); // detached instance, no aliasing
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
    expect(manager.size()).toBe(1);
    expect(manager.entries().map((e) => e.id)).toEqual(['rev-1']);
    expect(manager.entries().map((e) => e.label)).toEqual(['baseline']);
  });

  it('returns stable sequential ids and metadata-only entries', () => {
    const doc = buildLineFixture();
    const now = tickClock();
    const manager = createRevisionManager(doc, { now });

    const doc2 = withVertexYMm(doc, 'vL1', 110);
    const entry = manager.commit('widen left panel', doc2);

    expect(entry).toEqual({
      id: 'rev-2',
      label: 'widen left panel',
      timestamp: iso(1),
      index: 1,
    });
    const entries = manager.entries();
    expect(entries).toEqual([
      { id: 'rev-1', label: 'baseline', timestamp: iso(0), index: 0 },
      { id: 'rev-2', label: 'widen left panel', timestamp: iso(1), index: 1 },
    ]);
    // Metadata only: no document payload leaks into entries().
    expect(Object.keys(entries[1]).sort()).toEqual(['id', 'index', 'label', 'timestamp']);
    expect(bytes(manager.current())).toBe(bytes(doc2));
  });

  it('moves the pointer with undo/redo and returns byte-identical documents', () => {
    const doc = buildLineFixture();
    const manager = createRevisionManager(doc, { now: tickClock() });
    const doc2 = withVertexYMm(doc, 'vL1', 110);
    const doc3 = withVertexYMm(doc2, 'vL1', 120);
    manager.commit('a', doc2);
    manager.commit('b', doc3);

    expect(manager.canRedo()).toBe(false);
    const first = manager.undo();
    expect(first).not.toBeNull();
    expect(bytes(first as PatternDocument)).toBe(bytes(doc2));
    expect(manager.canRedo()).toBe(true);

    const second = manager.undo();
    expect(second).not.toBeNull();
    expect(bytes(second as PatternDocument)).toBe(bytes(doc));
    expect(manager.canUndo()).toBe(false);
    expect(manager.undo()).toBeNull(); // no history behind the baseline

    const redone = manager.redo();
    expect(redone).not.toBeNull();
    expect(bytes(redone as PatternDocument)).toBe(bytes(doc2));
    expect(bytes(manager.redo() as PatternDocument)).toBe(bytes(doc3));
    expect(manager.redo()).toBeNull(); // already at the top
    expect(manager.canRedo()).toBe(false);
  });

  it('truncates the redo queue on commit behind the pointer and keeps ids stable', () => {
    const doc = buildLineFixture();
    const manager = createRevisionManager(doc, { now: tickClock() });
    const doc2 = withVertexYMm(doc, 'vL1', 110);
    const doc3 = withVertexYMm(doc, 'vL1', 120);
    const doc4 = withVertexYMm(doc, 'vL1', 130);

    manager.commit('a', doc2); // rev-2
    manager.commit('b', doc3); // rev-3
    const undone = manager.undo(); // pointer at rev-2
    expect(undone).not.toBeNull();
    expect(bytes(undone as PatternDocument)).toBe(bytes(doc2));

    const entryC = manager.commit('c', doc4); // truncates rev-3, appends rev-4
    expect(entryC.id).toBe('rev-4'); // discarded ids are never reused
    expect(manager.canRedo()).toBe(false);
    expect(manager.redo()).toBeNull();
    expect(manager.entries().map((e) => e.id)).toEqual(['rev-1', 'rev-2', 'rev-4']);
    expect(bytes(manager.current())).toBe(bytes(doc4));

    const entryD = manager.commit('d', withVertexYMm(doc, 'vL1', 140));
    expect(entryD.id).toBe('rev-5');
  });

  it('discards the oldest revision when maxRevisions is exceeded', () => {
    const doc = buildLineFixture();
    const manager = createRevisionManager(doc, { maxRevisions: 3, now: tickClock() });
    const doc2 = withVertexYMm(doc, 'vL1', 110);
    const doc3 = withVertexYMm(doc, 'vL1', 120);
    const doc4 = withVertexYMm(doc, 'vL1', 130);

    manager.commit('a', doc2);
    manager.commit('b', doc3);
    expect(manager.size()).toBe(3);
    manager.commit('c', doc4); // rev-1 (baseline) is discarded

    expect(manager.size()).toBe(3);
    expect(manager.entries().map((e) => e.id)).toEqual(['rev-2', 'rev-3', 'rev-4']);
    expect(manager.entries().map((e) => e.index)).toEqual([0, 1, 2]);
    expect(bytes(manager.current())).toBe(bytes(doc4));

    expect(bytes(manager.undo() as PatternDocument)).toBe(bytes(doc3));
    expect(bytes(manager.undo() as PatternDocument)).toBe(bytes(doc2));
    expect(manager.undo()).toBeNull(); // baseline rev-1 no longer retained
    expect(manager.canUndo()).toBe(false);
  });

  it('rejects invalid maxRevisions', () => {
    const doc = buildLineFixture();
    expect(() => createRevisionManager(doc, { maxRevisions: 0 })).toThrow(RangeError);
    expect(() => createRevisionManager(doc, { maxRevisions: 1.5 })).toThrow(RangeError);
  });

  it('leaves the history byte-identical when a commit is rejected', () => {
    const doc = buildLineFixture();
    const manager = createRevisionManager(doc, { now: tickClock() });
    manager.commit('valid', withVertexYMm(doc, 'vL1', 110));

    const invalid = { ...doc, schemaVersion: 99 };
    expect(() => manager.commit('bad', invalid)).toThrow();
    expect(manager.size()).toBe(2);
    expect(manager.entries().map((e) => e.label)).toEqual(['baseline', 'valid']);
    expect(bytes(manager.current())).toBe(bytes(withVertexYMm(doc, 'vL1', 110)));
  });

  it('supports injectable timestamps and parses default timestamps as ISO', () => {
    const doc = buildLineFixture();
    const now = tickClock();
    const manager = createRevisionManager(doc, { now });
    manager.commit('a', withVertexYMm(doc, 'vL1', 110));
    expect(manager.entries().map((e) => e.timestamp)).toEqual([iso(0), iso(1)]);

    const withDefaultClock = createRevisionManager(doc);
    const stamp = withDefaultClock.entries()[0].timestamp;
    expect(Number.isNaN(Date.parse(stamp))).toBe(false);
  });
});

describe('restoreRevisionManager', () => {
  it('rebuilds the manager with ids, pointer and byte-identical snapshots', () => {
    const doc = buildLineFixture();
    const manager = createRevisionManager(doc, { now: tickClock() });
    const doc2 = withVertexYMm(doc, 'vL1', 110);
    manager.commit('a', doc2);
    const state = manager.exportState();

    const restored = restoreRevisionManager(state);
    expect(bytes(restored.current())).toBe(bytes(doc2));
    expect(restored.canUndo()).toBe(true);
    expect(restored.entries().map((e) => e.id)).toEqual(['rev-1', 'rev-2']);
    expect(bytes(restored.undo() as PatternDocument)).toBe(bytes(doc));

    const continued = restored.commit('b', withVertexYMm(doc, 'vL1', 120));
    expect(continued.id).toBe('rev-3'); // id counter survived the round-trip
  });

  it('rejects malformed or tampered state', () => {
    const doc = buildLineFixture();
    const manager = createRevisionManager(doc, { now: tickClock() });
    manager.commit('a', withVertexYMm(doc, 'vL1', 110));
    const state = manager.exportState();

    expect(() => restoreRevisionManager(null)).toThrow();
    expect(() => restoreRevisionManager({ ...state, snapshots: [] })).toThrow();
    expect(() => restoreRevisionManager({ ...state, pointer: 99 })).toThrow();
    expect(() => restoreRevisionManager({ ...state, nextId: 2 })).toThrow(); // counter behind max seq
    expect(() =>
      restoreRevisionManager({
        ...state,
        snapshots: [{ ...state.snapshots[0], id: 'snapshot-9' }],
      }),
    ).toThrow();
  });
});

describe('createHarnessSession', () => {
  it('exposes the canonical shape with a hex id and clock-wired createdAt', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });

    expect(session.id).toMatch(/^sess-[0-9a-f]{8}$/);
    // The manager consumed tick 0 for the baseline snapshot; createdAt is tick 1.
    expect(session.createdAt).toBe(iso(1));
    expect(session.turns).toEqual([]);
    expect(session.decisions).toEqual([]);
    expect(bytes(session.currentDoc)).toBe(bytes(doc));
  });

  it('records typed turns with sequential ids', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });

    const t1 = session.addTurn({
      role: 'user',
      content: 'narrow the cap by 10mm',
      createdAt: iso(5),
    });
    expect(t1).toEqual({ id: 'turn-1', role: 'user', content: 'narrow the cap by 10mm', createdAt: iso(5) });

    const t2 = session.addTurn({
      role: 'tool',
      content: 'applied cap_width',
      revisionId: 'rev-2',
      toolCalls: [{ capability: 'cap_width', params: { deltaMm: -10 }, ok: true }],
      createdAt: iso(6),
    });
    expect(t2.id).toBe('turn-2');
    expect(t2.toolCalls).toEqual([{ capability: 'cap_width', params: { deltaMm: -10 }, ok: true }]);
    expect(session.turns).toEqual([t1, t2]);
  });

  it('records typed decisions with sequential ids', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });

    const d1 = session.addDecision({
      summary: 'cap width accepted',
      approvedBy: 'human',
      createdAt: iso(7),
    });
    expect(d1).toEqual({ id: 'dec-1', summary: 'cap width accepted', approvedBy: 'human', createdAt: iso(7) });

    const d2 = session.addDecision({ summary: 'auto-acknowledged', createdAt: iso(8) });
    expect(d2.id).toBe('dec-2');
    expect(d2).toEqual({ id: 'dec-2', summary: 'auto-acknowledged', createdAt: iso(8) });
    expect(session.decisions).toEqual([d1, d2]);
  });

  it('delegates commitRevision to the manager and updates currentDoc', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });
    const doc2 = withVertexYMm(doc, 'vL1', 108);

    const entry = session.commitRevision('cap -10mm', doc2);
    // Creation consumed iso(0) (baseline) and iso(1) (createdAt); the commit gets iso(2).
    expect(entry).toEqual({ id: 'rev-2', label: 'cap -10mm', timestamp: iso(2), index: 1 });
    expect(bytes(session.currentDoc)).toBe(bytes(doc2));
  });

  it('integrates undo/redo with the session document and revision ids', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });
    const doc2 = withVertexYMm(doc, 'vL1', 108);
    session.commitRevision('cap -10mm', doc2);

    const undone = session.undo();
    if (!undone.ok) throw new Error('expected undo to succeed');
    expect(undone.revisionId).toBe('rev-1');
    expect(bytes(undone.doc)).toBe(bytes(doc));
    expect(bytes(session.currentDoc)).toBe(bytes(doc));

    const redone = session.redo();
    if (!redone.ok) throw new Error('expected redo to succeed');
    expect(redone.revisionId).toBe('rev-2');
    expect(bytes(redone.doc)).toBe(bytes(doc2));
    expect(bytes(session.currentDoc)).toBe(bytes(doc2));
  });

  it('returns ok:false at both ends of the history', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });

    expect(session.undo()).toEqual({ ok: false });
    expect(session.redo()).toEqual({ ok: false });
    expect(bytes(session.currentDoc)).toBe(bytes(doc));
  });
});

describe('serializeSession / deserializeSession', () => {
  it('round-trips ids, turns, decisions and a byte-identical document', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });
    const doc2 = withVertexYMm(doc, 'vL1', 108);
    const doc3 = withVertexYMm(doc2, 'vR2', -12);
    const e2 = session.commitRevision('cap -10mm', doc2); // rev-2
    const e3 = session.commitRevision('hem -12mm', doc3); // rev-3
    const t1 = session.addTurn({ role: 'user', content: 'lower the hem 12mm', createdAt: iso(10) });
    const t2 = session.addTurn({
      role: 'tool',
      content: 'ran hem_shift',
      revisionId: e3.id,
      toolCalls: [{ capability: 'hem_shift', params: { deltaMm: -12 }, ok: true }],
      createdAt: iso(11),
    });
    const decision = session.addDecision({
      summary: 'accept hem shift',
      approvedBy: 'human',
      revisionId: e2.id,
      createdAt: iso(12),
    });

    const undone = session.undo(); // park the pointer mid-history (rev-2)
    if (!undone.ok) throw new Error('expected undo to succeed');
    expect(undone.revisionId).toBe('rev-2');

    const restored = deserializeSession(serializeSession(session));
    expect(restored.id).toBe(session.id);
    expect(restored.createdAt).toBe(iso(1));
    expect(restored.turns).toEqual([t1, t2]);
    expect(restored.decisions).toEqual([decision]);
    expect(bytes(restored.currentDoc)).toBe(bytes(doc2));
  });

  it('preserves pointer position and continues the revision id sequence', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });
    const doc2 = withVertexYMm(doc, 'vL1', 108);
    const doc3 = withVertexYMm(doc2, 'vR2', -12);
    session.commitRevision('cap -10mm', doc2);
    session.commitRevision('hem -12mm', doc3);
    session.undo(); // pointer at rev-2

    const restored = deserializeSession(serializeSession(session));

    const redone = restored.redo(); // pointer position survived
    if (!redone.ok) throw new Error('expected redo to succeed');
    expect(redone.revisionId).toBe('rev-3');
    expect(bytes(redone.doc)).toBe(bytes(doc3));
    expect(bytes(restored.currentDoc)).toBe(bytes(doc3));

    const entry = restored.commitRevision('post-restore', withVertexYMm(doc3, 'vL0', 5));
    expect(entry.id).toBe('rev-4'); // id counter survived the round-trip

    // Walking back reaches the baseline document bytes.
    restored.undo();
    restored.undo();
    restored.undo();
    expect(bytes(restored.currentDoc)).toBe(bytes(doc));
  });

  it('rejects invalid payloads', () => {
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: tickClock() });
    const good = serializeSession(session);

    expect(() => deserializeSession('not json')).toThrow();
    expect(() => deserializeSession(JSON.stringify({ noop: true }))).toThrow(/invariant/i);

    const badVersion = JSON.parse(good) as Record<string, unknown>;
    badVersion.schemaVersion = 99;
    expect(() => deserializeSession(JSON.stringify(badVersion))).toThrow(/schemaVersion/);

    const badTurns = JSON.parse(good) as Record<string, unknown>;
    badTurns.turns = 'nope';
    expect(() => deserializeSession(JSON.stringify(badTurns))).toThrow(/turns/);

    const badPointer = JSON.parse(good) as Record<string, unknown>;
    (badPointer.revisions as Record<string, unknown>).pointer = 99;
    expect(() => deserializeSession(JSON.stringify(badPointer))).toThrow();

    const badSeq = JSON.parse(good) as Record<string, unknown>;
    badSeq.turns = [{ id: 'turn-7', role: 'user', content: 'x', createdAt: iso(1) }];
    expect(() => deserializeSession(JSON.stringify(badSeq))).toThrow(/sequential/);
  });

  it('refuses to serialize sessions created outside the factory', () => {
    const impostor = {} as unknown as HarnessSession;
    expect(() => serializeSession(impostor)).toThrow(/createHarnessSession/);
  });
});
