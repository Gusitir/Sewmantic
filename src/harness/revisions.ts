// T-54 revision manager for the Patternist Harness.
//
// Canonical state is a linear stack of byte-identical document snapshots
// produced with the kernel v2 serialization contract (serializeDocument /
// deserializeDocument). Every stored revision is a JSON string, so undo/redo
// round-trips are byte-identical by construction and the history can be
// exported and restored without losing ids or pointer position.
//
// Behaviour:
//   - revision ids are `rev-<n>`, sequential from 1; the initial document is
//     normalized through the serialization contract and committed as the
//     `baseline` revision `rev-1`, so undo can always return to it;
//   - a commit while the pointer is behind the top truncates the redo queue
//     (linear history, no branching); discarded ids are never reused;
//   - when the stack grows beyond `maxRevisions` (default 50) the oldest
//     revisions are discarded and the window re-indexed from 0.

import {
  deserializeDocument,
  serializeDocument,
  type PatternDocument,
} from '../engine/v2/serialization.js';

/** Metadata of one revision (no document payload). */
export interface RevisionEntry {
  /** Stable sequential id: `rev-1`, `rev-2`, ... */
  readonly id: string;
  /** Human-readable label given at commit time. */
  readonly label: string;
  /** ISO-8601 timestamp (injectable clock for deterministic tests). */
  readonly timestamp: string;
  /** Position inside the current revision window (0 = oldest). */
  readonly index: number;
}

/** One serialized snapshot inside an exported {@link RevisionState}. */
export interface RevisionSnapshotState {
  readonly id: string;
  readonly label: string;
  readonly timestamp: string;
  /** Byte-identical serialized document (kernel v2 JSON contract). */
  readonly json: string;
}

/** Serialized revision history: snapshots plus pointer and id counter. */
export interface RevisionState {
  readonly snapshots: readonly RevisionSnapshotState[];
  /** Position of the current revision inside `snapshots` (0 = oldest). */
  readonly pointer: number;
  /** Next sequential id counter (survives round-trips; never reused). */
  readonly nextId: number;
}

/** Options for {@link createRevisionManager}. */
export interface RevisionManagerOptions {
  /** Maximum number of retained revisions (default 50, minimum 1). */
  maxRevisions?: number;
  /** Injectable clock returning ISO-8601 strings (for deterministic tests). */
  now?: () => string;
}

/** Linear undo/redo stack of pattern document snapshots. */
export interface RevisionManager {
  /**
   * Append a snapshot of `doc` on top of the history. A commit issued while
   * the pointer is behind the top truncates the redo queue first.
   */
  commit(label: string, doc: PatternDocument): RevisionEntry;
  /** The document at the current pointer (fresh, detached instance). */
  current(): PatternDocument;
  /** Step back one entry; `null` when already at the oldest revision. */
  undo(): PatternDocument | null;
  /** Step forward one entry; `null` when already at the newest revision. */
  redo(): PatternDocument | null;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Metadata of the retained revisions, oldest first (no payloads). */
  entries(): readonly RevisionEntry[];
  /** Number of retained revisions (including the baseline). */
  size(): number;
  /** Full internal state for lossless persistence (session round-trip). */
  exportState(): RevisionState;
}

const DEFAULT_MAX_REVISIONS = 50;
const BASELINE_LABEL = 'baseline';
const REVISION_ID_PATTERN = /^rev-(\d+)$/;

interface MutableSnapshot {
  id: string;
  label: string;
  timestamp: string;
  json: string;
}

const defaultNow = (): string => new Date().toISOString();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertMaxRevisions(maxRevisions: number): void {
  if (!Number.isInteger(maxRevisions) || maxRevisions < 1) {
    throw new RangeError(
      `harness: maxRevisions must be an integer >= 1; got ${maxRevisions}`,
    );
  }
}

function assembleManager(
  snapshots: MutableSnapshot[],
  initialPointer: number,
  initialNextId: number,
  maxRevisions: number,
  now: () => string,
): RevisionManager {
  let pointer = initialPointer;
  let nextId = initialNextId;

  const current = (): PatternDocument => deserializeDocument(snapshots[pointer].json);

  const trimOldest = (): void => {
    while (snapshots.length > maxRevisions) {
      snapshots.shift();
      pointer -= 1;
    }
  };

  return {
    commit(label, doc) {
      // serializeDocument validates the payload BEFORE the history is
      // touched, so a rejected commit leaves the stack byte-identical.
      const json = serializeDocument(doc);
      snapshots.length = pointer + 1; // linear history: drop the redo queue
      const id = `rev-${nextId}`;
      nextId += 1;
      const timestamp = now();
      snapshots.push({ id, label, timestamp, json });
      pointer = snapshots.length - 1;
      trimOldest();
      return { id, label, timestamp, index: pointer };
    },
    current,
    undo() {
      if (pointer <= 0) return null;
      pointer -= 1;
      return current();
    },
    redo() {
      if (pointer >= snapshots.length - 1) return null;
      pointer += 1;
      return current();
    },
    canUndo: () => pointer > 0,
    canRedo: () => pointer < snapshots.length - 1,
    entries: () =>
      snapshots.map((s, index) => ({
        id: s.id,
        label: s.label,
        timestamp: s.timestamp,
        index,
      })),
    size: () => snapshots.length,
    exportState: () => ({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        label: s.label,
        timestamp: s.timestamp,
        json: s.json,
      })),
      pointer,
      nextId,
    }),
  };
}

/**
 * Create a manager whose history starts at the initial document, committed as
 * the `baseline` revision `rev-1` with a snapshot produced by the kernel v2
 * serialization contract.
 */
export function createRevisionManager(
  initialDoc: PatternDocument,
  options: RevisionManagerOptions = {},
): RevisionManager {
  const maxRevisions = options.maxRevisions ?? DEFAULT_MAX_REVISIONS;
  assertMaxRevisions(maxRevisions);
  const now = options.now ?? defaultNow;

  const snapshots: MutableSnapshot[] = [
    {
      id: 'rev-1',
      label: BASELINE_LABEL,
      timestamp: now(),
      json: serializeDocument(initialDoc),
    },
  ];
  return assembleManager(snapshots, 0, 2, maxRevisions, now);
}

/**
 * Rebuild a manager from {@link RevisionState} (as produced by
 * {@link RevisionManager.exportState}) without losing ids, pointer position
 * or byte-identical snapshots. The state is validated structurally; document
 * payloads are validated lazily on first access.
 */
export function restoreRevisionManager(
  state: unknown,
  options: RevisionManagerOptions = {},
): RevisionManager {
  const maxRevisions = options.maxRevisions ?? DEFAULT_MAX_REVISIONS;
  assertMaxRevisions(maxRevisions);
  const now = options.now ?? defaultNow;

  if (!isRecord(state)) {
    throw new Error('harness: revision state must be a JSON object');
  }

  const rawSnapshots: readonly unknown[] = Array.isArray(state.snapshots)
    ? state.snapshots
    : [];
  if (rawSnapshots.length === 0) {
    throw new Error('harness: revision state must contain at least one snapshot');
  }

  const snapshots: MutableSnapshot[] = [];
  let maxSeq = 0;
  for (let index = 0; index < rawSnapshots.length; index += 1) {
    const raw: unknown = rawSnapshots[index];
    if (!isRecord(raw)) {
      throw new Error(`harness: revision snapshot ${index} is not an object`);
    }
    const { id, label, timestamp, json } = raw;
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error(`harness: revision snapshot ${index} has an invalid id`);
    }
    if (typeof label !== 'string') {
      throw new Error(`harness: revision "${id}" has an invalid label`);
    }
    if (typeof timestamp !== 'string' || timestamp.length === 0) {
      throw new Error(`harness: revision "${id}" has an invalid timestamp`);
    }
    if (typeof json !== 'string' || json.length === 0) {
      throw new Error(`harness: revision "${id}" has an invalid snapshot payload`);
    }
    const match = REVISION_ID_PATTERN.exec(id);
    if (match === null) {
      throw new Error(`harness: revision id "${id}" is not a sequential rev-<n> id`);
    }
    const seq = Number(match[1]);
    if (seq > maxSeq) maxSeq = seq;
    snapshots.push({ id, label, timestamp, json });
  }

  const pointer = state.pointer;
  if (
    typeof pointer !== 'number' ||
    !Number.isInteger(pointer) ||
    pointer < 0 ||
    pointer >= snapshots.length
  ) {
    throw new Error(`harness: revision pointer ${String(pointer)} is out of range`);
  }

  const nextId = state.nextId;
  if (typeof nextId !== 'number' || !Number.isInteger(nextId) || nextId <= maxSeq) {
    throw new Error(
      `harness: revision id counter ${String(nextId)} is inconsistent with snapshot ids (max ${maxSeq})`,
    );
  }

  return assembleManager(snapshots, pointer, nextId, maxRevisions, now);
}
