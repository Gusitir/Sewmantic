// T-56 conversational AI tool loop for the Patternist Harness.
//
// Drives ONE conversational turn through a Vercel AI SDK language model
// (`generateText`) whose toolset is derived from the capability registry:
// every registry capability becomes an SDK tool WITHOUT an `execute`
// function, so the model only proposes tool calls; the loop extracts them
// and delegates their application to the T-55 bounded executor
// (`executeTurn`), which applies all steps atomically as ONE consolidated
// revision.
//
// Model integration seam (T-56 decision): `runConversationalTurn` accepts
// any `LanguageModel` the SDK's `generateText` accepts. Tests use a scripted
// `LanguageModelV3` mock (no network, no API keys); pointing
// `options.model` at a real provider model (e.g. `@ai-sdk/fireworks`) is
// the only change needed for live use.
//
// Session atomicity (deferred registration): the session is written only
// after the model answered and every loop-level bound passed:
//   - model error            -> MODEL_ERROR   (session untouched);
//   - unusable tool call     -> MODEL_ERROR   (session untouched);
//   - steps > maxSteps       -> BOUNDED_ABORT (session untouched);
//   - approval veto          -> BOUNDED_ABORT (session untouched);
//   - executor success       -> user turn + assistant turn, then the
//     executor's ONE revision + ONE tool turn + ONE auto decision;
//   - text-only turn         -> user + assistant turns, no revision.
// The human approval gate is evaluated exactly once per step: the loop asks
// it first (preflight, before any registration) and hands the executor a
// memoized view of the same verdicts, so the executor's own preflight sees
// identical decisions without re-invoking the user-provided gate.
//
// Executor rejections map to loop rejections: bounds and human/draft gates
// to BOUNDED_ABORT; capability gaps and step failures to LOOP_FAILED.

import { generateText, tool, type LanguageModel, type ModelMessage, type ToolSet } from 'ai';

import type { CapabilityRegistry } from '../engine/v2/registry.js';
import { executeTurn, type HarnessApprovalGate, type HarnessStep } from './executor.js';
import { registryToTools } from './tools.js';
import type { HarnessSession, HarnessTurn } from './session.js';

/** Typed rejection codes returned by {@link runConversationalTurn}. */
export type LoopRejectionCode = 'LOOP_FAILED' | 'MODEL_ERROR' | 'BOUNDED_ABORT';

/** Capability invocation performed during a conversational loop turn. */
export interface LoopToolCall {
  readonly capability: string;
  readonly params: unknown;
  readonly ok: boolean;
}

/** Successful loop turn: assistant text plus optionally applied capabilities. */
export interface LoopSuccess {
  readonly ok: true;
  readonly text: string;
  /** Revision committed by the executor (absent for text-only turns). */
  readonly revisionId?: string;
  readonly toolCalls: readonly LoopToolCall[];
}

/** Rejected loop turn: model error or bounded abort. */
export interface LoopRejection {
  readonly ok: false;
  readonly code: LoopRejectionCode;
  readonly message: string;
}

export type LoopResult = LoopSuccess | LoopRejection;

export interface HarnessLoopOptions {
  /** Language model accepted by the Vercel AI SDK `generateText`. */
  readonly model: LanguageModel;
  /** Maximum number of capability steps per turn (default 5). */
  readonly maxSteps?: number;
  /** Human approval gate evaluated exactly once per proposed step. */
  readonly requireApproval?: HarnessApprovalGate;
  /** Allow capabilities in status `draft` (development only). */
  readonly allowDraft?: boolean;
  /** Maximum output tokens (mapped to the SDK `maxOutputTokens` setting). */
  readonly maxTokens?: number;
  /** Sampling temperature forwarded to the model. */
  readonly temperature?: number;
  /** System prompt for the model. */
  readonly system?: string;
  /** Injectable clock for turn timestamps (deterministic tests). */
  readonly now?: () => string;
}

const DEFAULT_MAX_STEPS = 5;

const defaultNow = (): string => new Date().toISOString();

/**
 * Derive the SDK toolset from the registry: one tool per capability id with
 * its description and Zod params schema, deliberately WITHOUT `execute` —
 * the model proposes calls, the bounded executor applies them.
 */
function registryToToolSet(registry: CapabilityRegistry, allowDraft?: boolean): ToolSet {
  const toolSet: ToolSet = {};
  for (const harnessTool of registryToTools(registry, { allowDraft })) {
    toolSet[harnessTool.id] = tool({
      description: harnessTool.description,
      inputSchema: harnessTool.paramsSchema,
    });
  }
  return toolSet;
}

/** Condense the session history into SDK messages (tool turns as text). */
function historyToMessages(turns: readonly HarnessTurn[]): ModelMessage[] {
  return turns.map((turn) =>
    turn.role === 'tool'
      ? { role: 'assistant', content: `[tool] ${turn.content}` }
      : { role: turn.role, content: turn.content },
  );
}

/**
 * Memoizing view of the human approval gate: the loop preflight and the
 * executor preflight share one verdict per step index, so the
 * user-provided gate runs exactly once per step.
 */
function memoizeApprovalGate(gate: HarnessApprovalGate): HarnessApprovalGate {
  const verdicts = new Map<number, boolean | Promise<boolean>>();
  return (step) => {
    const cached = verdicts.get(step.index);
    if (cached !== undefined) {
      return cached;
    }
    const verdict = gate(step);
    verdicts.set(step.index, verdict);
    return verdict;
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Run ONE conversational turn: query the model with the condensed session
 * history, extract its proposed capability steps from the tool calls and
 * apply them through the bounded executor. See the module header for the
 * session atomicity contract.
 */
export async function runConversationalTurn(
  session: HarnessSession,
  registry: CapabilityRegistry,
  userMessage: string,
  options: HarnessLoopOptions,
): Promise<LoopResult> {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const now = options.now ?? defaultNow;
  const approvalGate =
    options.requireApproval === undefined ? undefined : memoizeApprovalGate(options.requireApproval);

  const messages: ModelMessage[] = historyToMessages(session.turns);
  messages.push({ role: 'user', content: userMessage });

  let text: string;
  let proposed: HarnessStep[];
  try {
    const response = await generateText({
      model: options.model,
      ...(options.system !== undefined ? { system: options.system } : {}),
      messages,
      tools: registryToToolSet(registry, options.allowDraft),
      ...(options.maxTokens !== undefined ? { maxOutputTokens: options.maxTokens } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    });
    text = response.text;
    proposed = [];
    for (const call of response.toolCalls) {
      if (call.dynamic === true) {
        return {
          ok: false,
          code: 'MODEL_ERROR',
          message: `model produced an unusable tool call for "${call.toolName}": ${describeError(call.error)}`,
        };
      }
      proposed.push({ capability: call.toolName, params: call.input });
    }
  } catch (err) {
    return {
      ok: false,
      code: 'MODEL_ERROR',
      message: `model call failed: ${describeError(err)}`,
    };
  }

  if (proposed.length > maxSteps) {
    return {
      ok: false,
      code: 'BOUNDED_ABORT',
      message: `model proposed ${proposed.length} capability steps; the loop bound is maxSteps=${maxSteps}; no step was executed`,
    };
  }

  if (approvalGate !== undefined) {
    for (let index = 0; index < proposed.length; index += 1) {
      const approved = await approvalGate({
        index,
        capability: proposed[index].capability,
        params: proposed[index].params,
      });
      if (!approved) {
        return {
          ok: false,
          code: 'BOUNDED_ABORT',
          message: `step ${index} (${proposed[index].capability}) was rejected by the human approval gate; no step was executed`,
        };
      }
    }
  }

  // Deferred registration: the session is written only now that the model
  // answered and every loop-level bound passed.
  session.addTurn({ role: 'user', content: userMessage, createdAt: now() });
  session.addTurn({ role: 'assistant', content: text, createdAt: now() });

  if (proposed.length === 0) {
    return { ok: true, text, toolCalls: [] };
  }

  const turnResult = await executeTurn(session, registry, proposed, {
    maxSteps,
    allowDraft: options.allowDraft,
    ...(approvalGate !== undefined ? { requireApproval: approvalGate } : {}),
    now,
  });
  if (!turnResult.ok) {
    const bounded =
      turnResult.code === 'MAX_STEPS_EXCEEDED' ||
      turnResult.code === 'STEP_REJECTED_BY_HUMAN' ||
      turnResult.code === 'DRAFT_CAPABILITY_FORBIDDEN';
    return {
      ok: false,
      code: bounded ? 'BOUNDED_ABORT' : 'LOOP_FAILED',
      message: turnResult.message,
    };
  }
  return {
    ok: true,
    text,
    revisionId: turnResult.revisionId,
    toolCalls: proposed.map((step) => ({
      capability: step.capability,
      params: step.params,
      ok: true,
    })),
  };
}
