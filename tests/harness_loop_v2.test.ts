// T-56 tests for the Patternist Harness conversational AI tool loop.
//
// Gates covered (scripted LanguageModelV3 mocks, no network, no API keys):
//   - text-only turn: user + assistant turns registered, no revision;
//   - scripted capability steps: executeTurn applied atomically (ONE
//     consolidated revision, ONE tool turn, ONE auto decision, single undo
//     back to the pre-turn document);
//   - maxSteps bound: BOUNDED_ABORT with a byte-identical session;
//   - human approval veto: BOUNDED_ABORT with a byte-identical session, and
//     exactly ONE gate invocation per step across loop preflight plus
//     executor preflight (memoized verdicts);
//   - session reproducibility: serialize/deserialize round-trip is
//     byte-identical and the restored session continues the conversation;
//   - model errors (doGenerate rejection, unusable tool call): MODEL_ERROR
//     with a byte-identical session.

import { describe, expect, it } from 'vitest';
import type {
  LanguageModelV3,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3Usage,
} from '@ai-sdk/provider';

import {
  SEMANTIC_V2_SCHEMA_VERSION,
  createCapabilityRegistry,
  registerBaseCapabilities,
  serializeDocument,
  type PatternDocument,
} from '../src/engine/v2/index.js';
import { createHarnessSession, deserializeSession, serializeSession } from '../src/harness/session.js';
import { runConversationalTurn } from '../src/harness/loop.js';

// --- fixtures -------------------------------------------------------------

/** Line fixture (copied from tests/harness_executor_v2.test.ts). */
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

function freshRegistry() {
  return registerBaseCapabilities(createCapabilityRegistry());
}

/** Deterministic clock: the n-th call returns the n-th second of 2026-01-01 UTC. */
function tickClock(): () => string {
  let tick = 0;
  return () => iso(tick++);
}

const iso = (seconds: number): string =>
  new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString();

const bytes = (doc: PatternDocument): string => serializeDocument(doc);

// --- scripted models ------------------------------------------------------

interface ScriptedResponse {
  readonly text?: string;
  readonly toolCalls?: readonly { capability: string; params: unknown }[];
}

const SCRIPTED_USAGE: LanguageModelV3Usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

/** Offline LanguageModelV3 mock that answers with a fixed response queue. */
function scriptedModel(responses: readonly ScriptedResponse[]): LanguageModelV3 & { calls(): number } {
  let call = 0;
  return {
    specificationVersion: 'v3',
    provider: 'scripted-provider',
    modelId: 'scripted-loop-model',
    supportedUrls: {},
    calls: () => call,
    async doGenerate(): Promise<LanguageModelV3GenerateResult> {
      call += 1;
      const response = responses[call - 1];
      if (response === undefined) {
        throw new Error('scripted model exhausted');
      }
      const content: LanguageModelV3Content[] = [];
      if (response.text !== undefined) {
        content.push({ type: 'text', text: response.text });
      }
      (response.toolCalls ?? []).forEach((toolCall, index) => {
        content.push({
          type: 'tool-call',
          toolCallId: `call-${call}-${index + 1}`,
          toolName: toolCall.capability,
          input: JSON.stringify(toolCall.params),
        });
      });
      const finishReason: LanguageModelV3FinishReason = {
        unified: (response.toolCalls?.length ?? 0) > 0 ? 'tool-calls' : 'stop',
        raw: undefined,
      };
      return { content, finishReason, usage: SCRIPTED_USAGE, warnings: [] };
    },
    async doStream() {
      throw new Error('scripted model does not stream');
    },
  };
}

/** Offline LanguageModelV3 mock whose doGenerate always rejects. */
function failingModel(error: Error): LanguageModelV3 {
  return {
    specificationVersion: 'v3',
    provider: 'scripted-provider',
    modelId: 'scripted-failing-model',
    supportedUrls: {},
    async doGenerate() {
      throw error;
    },
    async doStream() {
      throw new Error('scripted model does not stream');
    },
  };
}

const USER_MESSAGE = 'split the left side seam at 30 mm and check the constraints';

const SPLIT_STEPS = [
  { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 30 } },
  { capability: 'kernel.insert-dart', params: { edgeId: 'eR0', depthMm: 7, atMm: 25 } },
  { capability: 'kernel.evaluate-constraints', params: {} },
];

const ASSISTANT_TEXT = 'Splitting the side seam and balancing the constraints.';

// --- text-only turns ------------------------------------------------------

describe('runConversationalTurn: text-only turn', () => {
  it('registers user and assistant turns without any revision', async () => {
    const clock = tickClock();
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: clock });
    const registry = freshRegistry();
    const model = scriptedModel([{ text: ASSISTANT_TEXT }]);

    const result = await runConversationalTurn(session, registry, USER_MESSAGE, {
      model,
      now: clock,
    });

    expect(result).toEqual({
      ok: true,
      text: ASSISTANT_TEXT,
      toolCalls: [],
    });
    expect(model.calls()).toBe(1);
    expect(session.turns.map((turn) => turn.role)).toEqual(['user', 'assistant']);
    expect(session.turns[0].content).toBe(USER_MESSAGE);
    expect(session.turns[0].createdAt).toBe(iso(2));
    expect(session.turns[1].content).toBe(ASSISTANT_TEXT);
    expect(session.turns[1].createdAt).toBe(iso(3));
    expect(session.decisions).toEqual([]);
    expect(session.undo()).toEqual({ ok: false }); // no revision beyond the baseline
    expect(bytes(session.currentDoc)).toBe(bytes(doc));
  });
});

// --- capability steps -----------------------------------------------------

describe('runConversationalTurn: scripted capability steps', () => {
  it('applies the proposed steps atomically through executeTurn', async () => {
    const clock = tickClock();
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: clock });
    const registry = freshRegistry();
    const model = scriptedModel([{ text: ASSISTANT_TEXT, toolCalls: SPLIT_STEPS }]);

    const result = await runConversationalTurn(session, registry, USER_MESSAGE, {
      model,
      now: clock,
    });

    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);
    expect(result.text).toBe(ASSISTANT_TEXT);
    expect(result.revisionId).toBe('rev-2');
    expect(result.toolCalls).toEqual(
      SPLIT_STEPS.map((step) => ({ ...step, ok: true })),
    );

    // Turn order user -> assistant -> tool, with deterministic timestamps.
    expect(session.turns.map((turn) => turn.role)).toEqual(['user', 'assistant', 'tool']);
    expect(session.turns[0].createdAt).toBe(iso(2));
    expect(session.turns[1].createdAt).toBe(iso(3));
    expect(session.turns[2].revisionId).toBe('rev-2');
    expect(session.turns[2].createdAt).toBe(iso(5)); // session clock tick 4 = revision timestamp
    expect(session.turns[2].toolCalls).toEqual(SPLIT_STEPS.map((step) => ({ ...step, ok: true })));
    expect(session.decisions.length).toBe(1);
    expect(session.decisions[0].approvedBy).toBe('auto');
    expect(session.decisions[0].revisionId).toBe('rev-2');
    expect(session.decisions[0].createdAt).toBe(iso(6));

    // The document changed (split + dart) exactly one revision ahead.
    expect(bytes(session.currentDoc)).not.toBe(bytes(doc));
    const undone = session.undo();
    if (!undone.ok) throw new Error('expected undo to succeed');
    expect(undone.revisionId).toBe('rev-1');
    expect(bytes(undone.doc)).toBe(bytes(doc));
  });

  it('rejects turns exceeding maxSteps without touching the session', async () => {
    const clock = tickClock();
    const session = createHarnessSession(buildLineFixture(), { now: clock });
    const registry = freshRegistry();
    const model = scriptedModel([{ text: ASSISTANT_TEXT, toolCalls: SPLIT_STEPS }]);
    const before = serializeSession(session);

    const result = await runConversationalTurn(session, registry, USER_MESSAGE, {
      model,
      maxSteps: 2,
      now: clock,
    });

    expect(result).toEqual({
      ok: false,
      code: 'BOUNDED_ABORT',
      message: expect.stringContaining('maxSteps=2'),
    });
    expect(model.calls()).toBe(1);
    expect(serializeSession(session)).toBe(before); // byte-identical session
    expect(session.turns).toEqual([]);
  });
});

// --- human approval -------------------------------------------------------

describe('runConversationalTurn: human approval gate', () => {
  it('vetoes with BOUNDED_ABORT leaving the session byte-identical', async () => {
    const clock = tickClock();
    const session = createHarnessSession(buildLineFixture(), { now: clock });
    const registry = freshRegistry();
    const model = scriptedModel([
      { text: ASSISTANT_TEXT, toolCalls: [SPLIT_STEPS[0]] },
    ]);
    const before = serializeSession(session);
    const seen: { index: number; capability: string }[] = [];

    const result = await runConversationalTurn(session, registry, USER_MESSAGE, {
      model,
      requireApproval: (step) => {
        seen.push({ index: step.index, capability: step.capability });
        return false;
      },
      now: clock,
    });

    expect(result).toEqual({
      ok: false,
      code: 'BOUNDED_ABORT',
      message: expect.stringContaining('approval gate'),
    });
    expect(seen).toEqual([{ index: 0, capability: 'kernel.split-edge' }]);
    expect(serializeSession(session)).toBe(before); // byte-identical session
    expect(session.turns).toEqual([]);
  });

  it('asks the user-provided gate exactly once per step and applies the turn on approval', async () => {
    const clock = tickClock();
    const doc = buildLineFixture();
    const session = createHarnessSession(doc, { now: clock });
    const registry = freshRegistry();
    const model = scriptedModel([{ text: ASSISTANT_TEXT, toolCalls: SPLIT_STEPS }]);
    let gateCalls = 0;

    const result = await runConversationalTurn(session, registry, USER_MESSAGE, {
      model,
      requireApproval: () => {
        gateCalls += 1;
        return true;
      },
      now: clock,
    });

    if (!result.ok) throw new Error(`expected success, got ${result.code}: ${result.message}`);
    expect(gateCalls).toBe(SPLIT_STEPS.length); // loop preflight only; the executor reuses the verdicts
    expect(result.revisionId).toBe('rev-2');
    expect(session.turns.map((turn) => turn.role)).toEqual(['user', 'assistant', 'tool']);
  });
});

// --- reproducibility ------------------------------------------------------

describe('runConversationalTurn: session reproducibility', () => {
  it('round-trips the session byte-identically and continues the conversation', async () => {
    const clock = tickClock();
    const doc = buildLineFixture();
    const registry = freshRegistry();
    const session = createHarnessSession(doc, { now: clock });

    await runConversationalTurn(session, registry, USER_MESSAGE, {
      model: scriptedModel([{ text: ASSISTANT_TEXT, toolCalls: SPLIT_STEPS }]),
      now: clock,
    });

    const json = serializeSession(session);
    const restored = deserializeSession(json);
    expect(serializeSession(restored)).toBe(json);
    expect(bytes(restored.currentDoc)).toBe(bytes(session.currentDoc));
    expect(restored.turns.map((turn) => turn.role)).toEqual(['user', 'assistant', 'tool']);
    expect(restored.decisions.length).toBe(1);

    // The restored session continues the history with the next sequential ids.
    const second = await runConversationalTurn(
      restored,
      registry,
      'check the constraints again',
      {
        model: scriptedModel([{ text: 'Constraints re-evaluated.', toolCalls: [
          { capability: 'kernel.evaluate-constraints', params: {} },
        ] }]),
        now: clock,
      },
    );
    if (!second.ok) throw new Error(`expected success, got ${second.code}: ${second.message}`);
    expect(second.revisionId).toBe('rev-3');
    expect(restored.turns.map((turn) => turn.id)).toEqual([
      'turn-1',
      'turn-2',
      'turn-3',
      'turn-4',
      'turn-5',
      'turn-6',
    ]);
    expect(restored.decisions.length).toBe(2);
  });
});

// --- model errors ---------------------------------------------------------

describe('runConversationalTurn: model errors', () => {
  it('maps a doGenerate rejection to MODEL_ERROR without touching the session', async () => {
    const clock = tickClock();
    const session = createHarnessSession(buildLineFixture(), { now: clock });
    const registry = freshRegistry();
    const before = serializeSession(session);

    const result = await runConversationalTurn(session, registry, USER_MESSAGE, {
      model: failingModel(new Error('provider down')),
      now: clock,
    });

    expect(result).toEqual({
      ok: false,
      code: 'MODEL_ERROR',
      message: expect.stringContaining('model call failed: provider down'),
    });
    expect(serializeSession(session)).toBe(before); // byte-identical session
    expect(session.turns).toEqual([]);
  });

  it('maps an unusable tool call (unknown capability) to MODEL_ERROR without touching the session', async () => {
    const clock = tickClock();
    const session = createHarnessSession(buildLineFixture(), { now: clock });
    const registry = freshRegistry();
    const before = serializeSession(session);

    const result = await runConversationalTurn(session, registry, USER_MESSAGE, {
      model: scriptedModel([
        { text: ASSISTANT_TEXT, toolCalls: [{ capability: 'kernel.does-not-exist', params: {} }] },
      ]),
      now: clock,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('MODEL_ERROR');
      expect(result.message).toContain('unusable tool call');
      expect(result.message).toContain('kernel.does-not-exist');
    }
    expect(serializeSession(session)).toBe(before); // byte-identical session
    expect(session.turns).toEqual([]);
  });
});
