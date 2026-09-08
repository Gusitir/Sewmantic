// T-54 harness session store: canonical conversational state over the
// revision manager. A session owns typed turns (user / assistant / tool),
// typed decisions, and the canonical PatternDocument history; undo/redo and
// revision commits delegate to the internal revision manager, whose snapshots
// follow the kernel v2 serialization contract (byte-identical round-trips).
//
// Determinism: ids are strictly sequential (`turn-<n>`, `dec-<n>`) and
// timestamps come from an injectable clock. `serializeSession` /
// `deserializeSession` persist the full state — including the revision
// snapshots, pointer and id counter — so a restored session continues the
// history with the very next sequential id.

import { randomUUID } from 'node:crypto';

import {
  deserializeDocument,
  serializeDocument,
  type PatternDocument,
} from '../engine/v2/serialization.js';
import {
  createRevisionManager,
  restoreRevisionManager,
  type RevisionEntry,
  type RevisionManager,
  type RevisionManagerOptions,
} from './revisions.js';

/** Who produced a turn. */
export type HarnessRole = 'user' | 'assistant' | 'tool';

/** Who approved a decision. */
export type HarnessApprover = 'human' | 'agent' | 'auto';

/** One capability invocation recorded on a tool turn. */
export interface HarnessToolCall {
  readonly capability: string;
  readonly params: unknown;
  readonly ok: boolean;
}

/** One typed conversational turn. */
export interface HarnessTurn {
  readonly id: string;
  readonly role: HarnessRole;
  readonly content: string;
  /** Revision produced (or targeted) by this turn, when applicable. */
  readonly revisionId?: string;
  /** Capability invocations performed by a tool turn. */
  readonly toolCalls?: readonly HarnessToolCall[];
  readonly createdAt: string;
}

/** One typed decision recorded on the session. */
export interface HarnessDecision {
  readonly id: string;
  readonly summary: string;
  readonly approvedBy?: HarnessApprover;
  readonly revisionId?: string;
  readonly createdAt: string;
}

/** Result of a session-level undo/redo. */
export type HarnessUndoRedoResult =
  | { readonly ok: true; readonly doc: PatternDocument; readonly revisionId: string }
  | { readonly ok: false };

/** Canonical conversational state over the kernel v2 document. */
export interface HarnessSession {
  readonly id: string;
  readonly createdAt: string;
  readonly turns: HarnessTurn[];
  readonly decisions: HarnessDecision[];
  /** Canonical document, kept in sync with the revision pointer. */
  readonly currentDoc: PatternDocument;
  addTurn(turn: Omit<HarnessTurn, 'id'>): HarnessTurn;
  addDecision(decision: Omit<HarnessDecision, 'id'>): HarnessDecision;
  /** Commit a new revision; returns its metadata (id, label, timestamp). */
  commitRevision(label: string, doc: PatternDocument): RevisionEntry;
  undo(): HarnessUndoRedoResult;
  redo(): HarnessUndoRedoResult;
}

export interface HarnessSessionOptions {
  /** Explicit session id; defaults to `sess-<8 hex>` via node:crypto UUID. */
  id?: string;
  /** Injectable clock returning ISO-8601 strings (deterministic tests). */
  now?: () => string;
}

const SESSION_INVARIANT = 'pattern-ai-core harness session v1';
const SESSION_SCHEMA_VERSION = 1;
const TURN_SEQUENCE_PATTERN = /^turn-\d+$/;
const DECISION_SEQUENCE_PATTERN = /^dec-\d+$/;
const REVISION_REF_PATTERN = /^rev-\d+$/;

const defaultNow = (): string => new Date().toISOString();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRole(value: unknown): value is HarnessRole {
  return value === 'user' || value === 'assistant' || value === 'tool';
}

function isApprover(value: unknown): value is HarnessApprover {
  return value === 'human' || value === 'agent' || value === 'auto';
}

/**
 * Internal manager registry: keeps the revision manager reachable for
 * serialization without exposing it on the public session surface.
 */
const managerRegistry = new WeakMap<HarnessSession, RevisionManager>();

interface SessionParts {
  readonly id: string;
  readonly createdAt: string;
  readonly turns: HarnessTurn[];
  readonly decisions: HarnessDecision[];
  readonly manager: RevisionManager;
  readonly turnCounter: number;
  readonly decisionCounter: number;
}

function assembleSession(parts: SessionParts): HarnessSession {
  const { manager } = parts;
  let currentDoc: PatternDocument = manager.current();
  let turnCounter = parts.turnCounter;
  let decisionCounter = parts.decisionCounter;

  const addTurn = (turn: Omit<HarnessTurn, 'id'>): HarnessTurn => {
    turnCounter += 1;
    const full: HarnessTurn = {
      id: `turn-${turnCounter}`,
      role: turn.role,
      content: turn.content,
      ...(turn.revisionId !== undefined ? { revisionId: turn.revisionId } : {}),
      ...(turn.toolCalls !== undefined ? { toolCalls: turn.toolCalls } : {}),
      createdAt: turn.createdAt,
    };
    parts.turns.push(full);
    return full;
  };

  const addDecision = (decision: Omit<HarnessDecision, 'id'>): HarnessDecision => {
    decisionCounter += 1;
    const full: HarnessDecision = {
      id: `dec-${decisionCounter}`,
      summary: decision.summary,
      ...(decision.approvedBy !== undefined ? { approvedBy: decision.approvedBy } : {}),
      ...(decision.revisionId !== undefined ? { revisionId: decision.revisionId } : {}),
      createdAt: decision.createdAt,
    };
    parts.decisions.push(full);
    return full;
  };

  const move = (direction: 'undo' | 'redo'): HarnessUndoRedoResult => {
    const doc = direction === 'undo' ? manager.undo() : manager.redo();
    if (doc === null) return { ok: false };
    currentDoc = doc;
    const state = manager.exportState();
    const revisionId = state.snapshots[state.pointer]?.id;
    if (revisionId === undefined) {
      throw new Error('harness: revision pointer has no snapshot; session state is corrupt');
    }
    return { ok: true, doc, revisionId };
  };

  const session: HarnessSession = {
    id: parts.id,
    createdAt: parts.createdAt,
    turns: parts.turns,
    decisions: parts.decisions,
    get currentDoc() {
      return currentDoc;
    },
    addTurn,
    addDecision,
    commitRevision: (label, doc) => {
      const entry = manager.commit(label, doc);
      currentDoc = manager.current();
      return entry;
    },
    undo: () => move('undo'),
    redo: () => move('redo'),
  };
  managerRegistry.set(session, manager);
  return session;
}

interface SessionPayload {
  invariant: string;
  schemaVersion: number;
  id: string;
  createdAt: string;
  turns: readonly HarnessTurn[];
  decisions: readonly HarnessDecision[];
  currentDoc: PatternDocument;
  revisions: unknown;
}

/**
 * Create a session whose revision history starts at the initial document
 * (baseline revision `rev-1`). With an injected clock, creation consumes two
 * ticks: one for the baseline revision timestamp, one for `createdAt`.
 */
export function createHarnessSession(
  initialDoc: PatternDocument,
  options: HarnessSessionOptions = {},
): HarnessSession {
  const now = options.now ?? defaultNow;
  const managerOptions: RevisionManagerOptions = { now };
  const manager = createRevisionManager(initialDoc, managerOptions);
  return assembleSession({
    id: options.id ?? `sess-${randomUUID().slice(0, 8)}`,
    createdAt: now(),
    turns: [],
    decisions: [],
    manager,
    turnCounter: 0,
    decisionCounter: 0,
  });
}

/**
 * Serialize the full session state (id, createdAt, turns, decisions, current
 * document and the complete revision history with pointer and id counter).
 * Only sessions produced by {@link createHarnessSession} or
 * {@link deserializeSession} can be serialized.
 */
export function serializeSession(session: HarnessSession): string {
  const manager = managerRegistry.get(session);
  if (manager === undefined) {
    throw new Error(
      'harness: cannot serialize a session that was not created by createHarnessSession or deserializeSession',
    );
  }
  const payload: SessionPayload = {
    invariant: SESSION_INVARIANT,
    schemaVersion: SESSION_SCHEMA_VERSION,
    id: session.id,
    createdAt: session.createdAt,
    turns: session.turns,
    decisions: session.decisions,
    currentDoc: session.currentDoc,
    revisions: manager.exportState(),
  };
  return JSON.stringify(payload);
}

function parseToolCall(value: unknown, turnIndex: number, callIndex: number): HarnessToolCall {
  const where = `harness: turn ${turnIndex} toolCall ${callIndex}`;
  if (!isRecord(value)) {
    throw new Error(`${where} is not an object`);
  }
  const { capability, params, ok } = value;
  if (typeof capability !== 'string' || capability.trim().length === 0) {
    throw new Error(`${where} has an invalid capability id`);
  }
  if (typeof ok !== 'boolean') {
    throw new Error(`${where} has an invalid ok flag`);
  }
  return { capability, params, ok };
}

function parseTurns(value: unknown): HarnessTurn[] {
  if (!Array.isArray(value)) {
    throw new Error('harness: session turns must be an array');
  }
  const items: readonly unknown[] = value;
  const turns: HarnessTurn[] = [];
  items.forEach((raw, index) => {
    if (!isRecord(raw)) {
      throw new Error(`harness: turn ${index} is not an object`);
    }
    const { id, role, content, createdAt } = raw;
    if (typeof id !== 'string' || !TURN_SEQUENCE_PATTERN.test(id)) {
      throw new Error(`harness: turn ${index} has an invalid id`);
    }
    if (id !== `turn-${index + 1}`) {
      throw new Error(`harness: turn ids must be sequential from turn-1; got "${id}" at index ${index}`);
    }
    if (!isRole(role)) {
      throw new Error(`harness: turn ${index} has an invalid role`);
    }
    if (typeof content !== 'string') {
      throw new Error(`harness: turn ${index} has invalid content`);
    }
    if (typeof createdAt !== 'string' || createdAt.length === 0) {
      throw new Error(`harness: turn ${index} has an invalid createdAt`);
    }
    let revisionId: string | undefined;
    if (raw.revisionId !== undefined) {
      if (
        typeof raw.revisionId !== 'string' ||
        !REVISION_REF_PATTERN.test(raw.revisionId)
      ) {
        throw new Error(`harness: turn ${index} has an invalid revisionId`);
      }
      revisionId = raw.revisionId;
    }
    let toolCalls: HarnessToolCall[] | undefined;
    if (raw.toolCalls !== undefined) {
      if (!Array.isArray(raw.toolCalls)) {
        throw new Error(`harness: turn ${index} has invalid toolCalls`);
      }
      const calls: readonly unknown[] = raw.toolCalls;
      toolCalls = calls.map((call, callIndex) => parseToolCall(call, index, callIndex));
    }
    turns.push({
      id,
      role,
      content,
      ...(revisionId !== undefined ? { revisionId } : {}),
      ...(toolCalls !== undefined ? { toolCalls } : {}),
      createdAt,
    });
  });
  return turns;
}

function parseDecisions(value: unknown): HarnessDecision[] {
  if (!Array.isArray(value)) {
    throw new Error('harness: session decisions must be an array');
  }
  const items: readonly unknown[] = value;
  const decisions: HarnessDecision[] = [];
  items.forEach((raw, index) => {
    if (!isRecord(raw)) {
      throw new Error(`harness: decision ${index} is not an object`);
    }
    const { id, summary, createdAt } = raw;
    if (typeof id !== 'string' || !DECISION_SEQUENCE_PATTERN.test(id)) {
      throw new Error(`harness: decision ${index} has an invalid id`);
    }
    if (id !== `dec-${index + 1}`) {
      throw new Error(
        `harness: decision ids must be sequential from dec-1; got "${id}" at index ${index}`,
      );
    }
    if (typeof summary !== 'string') {
      throw new Error(`harness: decision ${index} has an invalid summary`);
    }
    if (typeof createdAt !== 'string' || createdAt.length === 0) {
      throw new Error(`harness: decision ${index} has an invalid createdAt`);
    }
    let approvedBy: HarnessApprover | undefined;
    if (raw.approvedBy !== undefined) {
      if (!isApprover(raw.approvedBy)) {
        throw new Error(`harness: decision ${index} has an invalid approvedBy`);
      }
      approvedBy = raw.approvedBy;
    }
    let revisionId: string | undefined;
    if (raw.revisionId !== undefined) {
      if (
        typeof raw.revisionId !== 'string' ||
        !REVISION_REF_PATTERN.test(raw.revisionId)
      ) {
        throw new Error(`harness: decision ${index} has an invalid revisionId`);
      }
      revisionId = raw.revisionId;
    }
    decisions.push({
      id,
      summary,
      ...(approvedBy !== undefined ? { approvedBy } : {}),
      ...(revisionId !== undefined ? { revisionId } : {}),
      createdAt,
    });
  });
  return decisions;
}

/**
 * Restore a session from {@link serializeSession} output: turns, decisions,
 * revision snapshots, pointer and id counter are rebuilt so the restored
 * session continues the history with the next sequential revision id and its
 * `currentDoc` serializes byte-identically to the original.
 */
export function deserializeSession(json: string): HarnessSession {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('harness: session payload is not valid JSON');
  }
  if (!isRecord(parsed) || parsed.invariant !== SESSION_INVARIANT) {
    throw new Error('harness: session payload is not a pattern-ai-core harness session (invariant mismatch)');
  }
  if (parsed.schemaVersion !== SESSION_SCHEMA_VERSION) {
    throw new Error(`harness: unsupported session schemaVersion ${String(parsed.schemaVersion)}`);
  }
  const { id, createdAt } = parsed;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('harness: session payload has an invalid id');
  }
  if (typeof createdAt !== 'string' || createdAt.length === 0) {
    throw new Error('harness: session payload has an invalid createdAt');
  }
  const turns = parseTurns(parsed.turns);
  const decisions = parseDecisions(parsed.decisions);
  const manager = restoreRevisionManager(parsed.revisions);
  return assembleSession({
    id,
    createdAt,
    turns,
    decisions,
    manager,
    turnCounter: turns.length,
    decisionCounter: decisions.length,
  });
}
