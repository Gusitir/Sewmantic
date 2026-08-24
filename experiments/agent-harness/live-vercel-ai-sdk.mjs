// T-43 optional LIVE probe using the REAL Vercel AI SDK + @ai-sdk/fireworks
// provider path (Apache-2.0). Executes a real domain tool call (get_current_pattern)
// with a Zod schema and verifies the tool result flows back into the SDK loop /
// final result via a REAL second provider/model step.
//
// AI SDK 7: generateText defaults stopWhen = isStepCount(1); maxSteps is NOT a
// supported setting and is ignored, so a tool-augmented loop would otherwise
// collapse to a single provider call and never run a terminal assistant step.
// This probe therefore sets the supported stopWhen: stepCountIs(2) so the tool
// result is handed to the model in a genuine second step.
//
// Admissible ONLY when HARNESS_LIVE=1 and a real FIREWORKS_API_KEY is present.
// Hard live budget: at most 2 provider calls and <= 4000 cumulative tokens.
// SECRET-SAFE: never prints/writes the key, auth headers, prompt text, raw provider
// body, or model output text. Persists only safe structured evidence to
// output/live-vercel-ai-sdk.json (gitignored via output/). costUsd stays null
// unless the API itself reports a price (Fireworks does not) — we never invent one.
//
// Invoked explicitly (opt-in), NOT part of the deterministic offline gate:
//   HARNESS_LIVE=1 FIREWORKS_API_KEY=... node experiments/agent-harness/runner.mjs
// (also aliased as `npm run experiment:harness:live`).

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateText, tool, stepCountIs } from 'ai';
import { createFireworks } from '@ai-sdk/fireworks';
import { z } from 'zod';
import 'dotenv/config';
import { createInitialStore, toolGetCurrentPattern } from './harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export const LIVE_BUDGET = { maxCalls: 2, maxTokens: 4000 };

// Zod schema for get_current_pattern: empty strict params object (domain domain).
// Reused from the offline harness so the live path stays shape-consistent.
const GET_CURRENT_PATTERN_SCHEMA = z.strictObject({});

async function runLiveVercelProbe() {
  const apiKey = (process.env.FIREWORKS_API_KEY || '').trim();
  const baseUrl = (process.env.FIREWORKS_BASE_URL || '').trim() || 'https://api.fireworks.ai/inference/v1';
  const modelName = (process.env.FIREWORKS_MODEL || '').trim() || 'accounts/fireworks/models/qwen3p8-max';

  if (!apiKey || apiKey === 'tu_fireworks_api_key_aqui') {
    return {
      executed: false,
      sdk: 'vercel-ai-sdk+@ai-sdk/fireworks',
      model: modelName,
      reason: 'FIREWORKS_API_KEY absent or placeholder; live Vercel probe not executed (offline gate unaffected)',
      calls: 0,
      totalTokens: 0,
      tokenBudget: LIVE_BUDGET.maxTokens,
      callBudget: LIVE_BUDGET.maxCalls,
      costUsd: null,
      noSecrets: true,
      status: 'not-executed',
      success: false,
      toolCallEmitted: false,
      toolResultReachedLoop: false,
      finalStepHasText: false,
      finalStepIndex: null,
      finalStepLength: 0,
      steps: [],
    };
  }

  const provider = createFireworks({ apiKey, baseURL: baseUrl });
  const model = provider.chatModel(modelName);

  const state = createInitialStore();
  let calls = 0;
  let totalTokens = 0;
  let status = 'pass';
  let abortReason = null;
  const stepsSeen = [];

  try {
    const { toolCalls, toolResults, text, steps, usage } = await generateText({
      model,
      maxOutputTokens: 1024,
      temperature: 0.1,
      // Supported AI SDK 7 stop condition: halt after 2 completed steps, i.e. the
      // initial completion (step 1, emits the tool call) + a single tool round
      // (step 2, receives the tool result and produces the terminal assistant
      // text). This is exactly 2 real provider/model steps (== 2 provider calls).
      stopWhen: stepCountIs(2),
      onStepFinish({ toolCalls: stepToolCalls, usage: stepUsage }) {
        calls += 1;
        const stepTokens = stepUsage?.totalTokens ?? 0;
        totalTokens += stepTokens;
        stepsSeen.push({
          step: calls,
          streamedTokens: stepTokens,
          toolCallCount: stepToolCalls?.length ?? 0,
        });
        // Hard cap on provider calls (2nd call is the final). A 3rd aborts.
        if (calls > LIVE_BUDGET.maxCalls) {
          abortReason = `provider-call-budget exceeded (${calls}>${LIVE_BUDGET.maxCalls})`;
          status = 'call-budget-exceeded';
        }
        // Hard cap on cumulative tokens.
        if (totalTokens > LIVE_BUDGET.maxTokens) {
          abortReason = abortReason || `token-budget exceeded (${totalTokens}>${LIVE_BUDGET.maxTokens})`;
          status = 'token-budget-exceeded';
        }
      },
      prompt:
        'Report the current parametric pattern. You MUST call the get_current_pattern tool exactly once, ' +
        'then state its returned revision number in one short sentence. No other tools.',
      tools: {
        get_current_pattern: tool({
          description: 'Return the current committed parametric pattern params and revision.',
          parameters: GET_CURRENT_PATTERN_SCHEMA,
          execute: async (args) => {
            // Real domain function from the offline harness (deterministic, no I/O).
            const r = toolGetCurrentPattern(state);
            return { ok: r.ok, rev: r.rev, params: r.params, hasProvisional: r.hasProvisional };
          },
        }),
      },
    });

    const verifiedToolCallEmitted = (toolCalls ?? []).some((tc) => tc.toolName === 'get_current_pattern');
    // In this SDK, the executed tool's return value is surfaced as `output` on the
    // toolResults entry; it is what the SDK loop passes back into the assistant
    // step. `result` is a legacy alias. We accept either.
    const executedToolResult = (toolResults ?? []).find((tr) => tr.toolName === 'get_current_pattern');
    const toolResultPayload = executedToolResult
      ? (executedToolResult.output ?? executedToolResult.result ?? null)
      : null;
    const verifiedToolResultReachedLoop = !!(
      executedToolResult && toolResultPayload && toolResultPayload.ok === true && typeof toolResultPayload.rev === 'number'
    );
    // Whether the terminal step (step 2) carried final assistant text — proof
    // that the tool result was actually handed back to the model and that a real
    // second model step produced a closing answer (not a truncated tool-call loop).
    const finalStepHasText = !!(steps && steps.length && steps[steps.length - 1].text);

    // Strengthened success: exactly 2 real steps/calls (within the <=2 budget),
    // a valid get_current_pattern tool call, its executed output reached the loop,
    // and the terminal second step returned final assistant text.
    const success = calls === 2
      && verifiedToolCallEmitted
      && verifiedToolResultReachedLoop
      && finalStepHasText
      && status === 'pass';
    if (!success && status === 'pass') status = 'fail';
    if (!success && !abortReason) {
      abortReason = 'success criteria unmet: need exactly 2 steps/calls, a valid get_current_pattern call, its executed output in the loop, and a final second-step assistant text';
    }

    // ONLY safe structured evidence. Never persist/compose the model's text,
    // the prompt, or any raw provider body.
    return {
      executed: true,
      sdk: 'vercel-ai-sdk+@ai-sdk/fireworks',
      provider: 'createFireworks',
      model: modelName,
      status,
      success,
      abortReason,
      reason: 'live Vercel probe ran with real Vercel AI SDK + @ai-sdk/fireworks provider',
      calls,
      totalTokens,
      callBudget: LIVE_BUDGET.maxCalls,
      tokenBudget: LIVE_BUDGET.maxTokens,
      maxOutputTokens: 1024,
      costUsd: null, // Fireworks API does not report pricing; never assume a rate.
      toolCallEmitted: verifiedToolCallEmitted,
      toolResultReachedLoop: verifiedToolResultReachedLoop,
      finalStepHasText,
      finalStepIndex: steps && steps.length ? steps.length - 1 : null,
      finalStepLength: finalStepHasText ? (steps[steps.length - 1].text?.length ?? 0) : 0,
      toolResultSummary: verifiedToolResultReachedLoop
        ? { ok: true, rev: toolResultPayload.rev ?? null, params: toolResultPayload.params ?? null, hasProvisional: toolResultPayload.hasProvisional ?? null }
        : null,
      steps: stepsSeen,
      noSecrets: true,
    };
  } catch (err) {
    status = status === 'pass' ? (abortReason ? status : 'error') : status;
    return {
      executed: true,
      sdk: 'vercel-ai-sdk+@ai-sdk/fireworks',
      provider: 'createFireworks',
      model: modelName,
      status,
      success: false,
      abortReason: abortReason || (err instanceof Error ? err.message : String(err)),
      reason: 'live Vercel probe attempted but did not complete cleanly',
      calls,
      totalTokens,
      callBudget: LIVE_BUDGET.maxCalls,
      tokenBudget: LIVE_BUDGET.maxTokens,
      maxOutputTokens: 1024,
      costUsd: null,
      toolCallEmitted: false,
      toolResultReachedLoop: false,
      finalStepHasText: false,
      finalStepIndex: null,
      finalStepLength: 0,
      toolResultSummary: null,
      steps: stepsSeen,
      noSecrets: true,
    };
  }
}

export async function maybeSaveVercelLiveEvidence() {
  const wantLive = process.env.HARNESS_LIVE === '1';
  if (!wantLive) return { wantLive: false, result: null, file: null };
  const result = await runLiveVercelProbe();
  const file = join(here, 'output', 'live-vercel-ai-sdk.json');
  mkdirSync(join(here, 'output'), { recursive: true });
  writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
  return { wantLive: true, result, file };
}
