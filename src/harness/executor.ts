// T-55 bounded executor for the Patternist Harness.
//
// Executes ONE conversational turn made of ordered capability steps against
// the harness session, under three hard bounds: a step-count cap, a draft
// gate and a human approval gate. The registry is a positional parameter
// (`executeTurn(session, registry, steps, options?)`) by design: the session
// never owns a registry (it is pure conversational/revision state from T-54),
// so the caller injects the capability plane explicitly and different turns
// can run against different registries.
//
// Atomicity variant (chosen): ALL steps run first on an in-memory working
// document cloned through the kernel v2 serialization contract; the session
// is touched only if EVERY step succeeds, and then exactly once — ONE
// consolidated revision (`session.commitRevision`, label `turn: <cap, ...>`),
// ONE tool turn (`session.addTurn`) carrying the per-step tool calls, and ONE
// auto decision (`session.addDecision`, `approvedBy: 'auto'`). Any failure
// leaves the session byte-identical: no partial commits, no orphan turns.
//
// Preflight (before any execution, in step order, first failure aborts):
//   1. maxSteps bound       -> MAX_STEPS_EXCEEDED (nothing runs);
//   2. capability resolution -> CAPABILITY_GAP (nothing runs);
//   3. draft gate           -> DRAFT_CAPABILITY_FORBIDDEN (nothing runs);
//   4. human approval       -> STEP_REJECTED_BY_HUMAN (nothing runs).
// `requireApproval` is awaited for every step up front (preflight approval of
// the whole turn), coherent with the kernel's atomicity: a turn is either
// applied completely or not at all.
//
// Execution failures map to STEP_FAILED with the failing step index and the
// step's diagnostics; the underlying tool code is embedded in the message.
// Turn/decision timestamps come from the injectable `now` clock (the session
// keeps its own clock for revision timestamps). An empty step list is a
// caller bug and raises RangeError synchronously (same policy as
// `createRevisionManager` for invalid bounds).

import type { ConstraintDiagnostic } from '../engine/v2/contracts.js';
import { deserializeDocument, serializeDocument } from '../engine/v2/serialization.js';
import { CapabilityRegistryError, type CapabilityRegistry } from '../engine/v2/registry.js';
import type { HarnessSession, HarnessToolCall } from './session.js';
import { capabilityToTool, type HarnessTool } from './tools.js';

/** Typed rejection codes returned by {@link executeTurn}. */
export type TurnRejectionCode =
  | 'MAX_STEPS_EXCEEDED'
  | 'STEP_REJECTED_BY_HUMAN'
  | 'DRAFT_CAPABILITY_FORBIDDEN'
  | 'CAPABILITY_GAP'
  | 'STEP_FAILED';

/** One turn step: a registered capability id plus its raw (JSON) params. */
export interface HarnessStep {
  readonly capability: string;
  readonly params: unknown;
}

/** Approval request handed to the `requireApproval` gate (zero-based index). */
export interface HarnessStepRequest {
  readonly index: number;
  readonly capability: string;
  readonly params: unknown;
}

/** Human approval gate: return false (or a Promise of false) to veto a step. */
export type HarnessApprovalGate = (step: HarnessStepRequest) => boolean | Promise<boolean>;

export interface ExecuteTurnOptions {
  /** Maximum number of steps per turn (default 10). */
  readonly maxSteps?: number;
  /** Preflight human approval gate evaluated for every step before running. */
  readonly requireApproval?: HarnessApprovalGate;
  /** Allow steps referencing capabilities in status `draft` (development only). */
  readonly allowDraft?: boolean;
  /** Injectable clock for turn/decision timestamps (deterministic tests). */
  readonly now?: () => string;
}

/** Successful turn: one consolidated revision with its applied capabilities. */
export interface TurnSuccess {
  readonly ok: true;
  readonly revisionId: string;
  /** Capability ids in step order (one entry per executed step). */
  readonly applied: readonly string[];
  /** Diagnostics consolidated across every step, in step order. */
  readonly diagnostics: readonly ConstraintDiagnostic[];
}

/** Rejected turn: the session was left byte-identical (atomic variant). */
export interface TurnRejection {
  readonly ok: false;
  readonly code: TurnRejectionCode;
  readonly message: string;
  /** Zero-based index of the failing step (absent for turn-level rejections). */
  readonly failedStep?: number;
  readonly diagnostics: readonly ConstraintDiagnostic[];
}

export type TurnResult = TurnSuccess | TurnRejection;

const DEFAULT_MAX_STEPS = 10;

const defaultNow = (): string => new Date().toISOString();

/**
 * Execute one bounded, atomic turn: preflight every step (bound, resolution,
 * draft gate, human approval), run all steps on a detached clone of the
 * session document and, only on full success, commit ONE consolidated
 * revision plus ONE tool turn and ONE auto decision. On any rejection the
 * session is left byte-identical.
 */
export async function executeTurn(
  session: HarnessSession,
  registry: CapabilityRegistry,
  steps: readonly HarnessStep[],
  options: ExecuteTurnOptions = {},
): Promise<TurnResult> {
  if (steps.length === 0) {
    throw new RangeError('harness: executeTurn requires at least one step; an empty turn is a caller bug');
  }

  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  if (steps.length > maxSteps) {
    return {
      ok: false,
      code: 'MAX_STEPS_EXCEEDED',
      message: `turn declares ${steps.length} steps; the executor bound is maxSteps=${maxSteps}; no step was executed`,
      diagnostics: [],
    };
  }

  // Preflight in step order: resolve the tool, gate drafts, ask for human
  // approval. The first failure aborts the turn before anything executes.
  const tools: HarnessTool[] = [];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    let tool: HarnessTool;
    try {
      tool = capabilityToTool(registry, step.capability, undefined, {
        allowDraft: options.allowDraft,
      });
    } catch (err) {
      if (err instanceof CapabilityRegistryError && err.code === 'CAPABILITY_GAP') {
        return {
          ok: false,
          code: 'CAPABILITY_GAP',
          message: `step ${index}: ${err.message}`,
          failedStep: index,
          diagnostics: [],
        };
      }
      throw err;
    }
    if (tool.status === 'draft' && options.allowDraft !== true) {
      return {
        ok: false,
        code: 'DRAFT_CAPABILITY_FORBIDDEN',
        message: `step ${index} references capability "${tool.id}@${tool.version}" in status "draft"; turns require "experimental" or "stable" capabilities unless { allowDraft: true }`,
        failedStep: index,
        diagnostics: [],
      };
    }
    tools.push(tool);

    if (options.requireApproval !== undefined) {
      const approved = await options.requireApproval({
        index,
        capability: step.capability,
        params: step.params,
      });
      if (!approved) {
        return {
          ok: false,
          code: 'STEP_REJECTED_BY_HUMAN',
          message: `step ${index} (${step.capability}) was rejected by the human approval gate; no step was executed`,
          failedStep: index,
          diagnostics: [],
        };
      }
    }
  }

  // Atomic execution on a detached working clone; the session is untouched
  // until every step has succeeded.
  let working = deserializeDocument(serializeDocument(session.currentDoc));
  const applied: string[] = [];
  const diagnostics: ConstraintDiagnostic[] = [];
  const toolCalls: HarnessToolCall[] = [];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const result = tools[index].execute(working, step.params);
    if (!result.ok) {
      return {
        ok: false,
        code: 'STEP_FAILED',
        message: `step ${index} (${step.capability}) failed: ${result.code}: ${result.message}`,
        failedStep: index,
        diagnostics: [...result.diagnostics],
      };
    }
    working = result.doc;
    diagnostics.push(...result.diagnostics);
    applied.push(step.capability);
    toolCalls.push({ capability: step.capability, params: step.params, ok: true });
  }

  // Consolidated commit: ONE revision, ONE tool turn, ONE auto decision.
  const label = `turn: ${applied.join(', ')}`;
  const revision = session.commitRevision(label, working);
  const now = options.now ?? defaultNow;
  session.addTurn({
    role: 'tool',
    content: `applied ${applied.length} capabilities: ${applied.join(', ')}`,
    revisionId: revision.id,
    toolCalls,
    createdAt: now(),
  });
  session.addDecision({
    summary: `auto-approved turn: ${applied.join(', ')}`,
    approvedBy: 'auto',
    revisionId: revision.id,
    createdAt: now(),
  });
  return { ok: true, revisionId: revision.id, applied, diagnostics };
}
