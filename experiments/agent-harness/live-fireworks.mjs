// T-43 optional live Fireworks probe (OpenAI-compatible /v1/chat/completions).
// Admissible ONLY when credentials are present. Enforced budget: max 8 calls,
// max 48_000 cumulative tokens. Never prints secrets. Offline failure is
// declared "not executed" and never blocks the offline mock gate.
//
// Invoked explicitly (opt-in) and NOT part of the deterministic gate:
//   HARNESS_LIVE=1 node experiments/agent-harness/runner.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import 'dotenv/config';

const here = dirname(fileURLToPath(import.meta.url));

const MAX_CALLS = 8;
const MAX_TOKENS = 48_000;
const MODEL = (process.env.FIREWORKS_MODEL || '').trim() || 'accounts/fireworks/models/qwen3p8-max';

export async function runLiveFireworksProbe() {
  const apiKey = (process.env.FIREWORKS_API_KEY || '').trim();
  const rawBaseUrl = (process.env.FIREWORKS_BASE_URL || '').trim() || 'https://api.fireworks.ai/inference/v1';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/chat/completions`;

  if (!apiKey || apiKey === 'tu_fireworks_api_key_aqui') {
    return {
      executed: false, reason: 'FIREWORKS_API_KEY absent or placeholder; live probe not executed (offline mock unaffected)',
      calls: 0, totalTokens: 0, maxCalls: MAX_CALLS, maxTokens: MAX_TOKENS,
    };
  }

  const calls = [];
  let totalTokens = 0;
  let costUsd = null;
  let status = 'pass';

  const prompts = [
    'Report the parametric DNA keys this codebase uses (concept_name, base_block, ease...). 1 line.',
  ];

  for (let i = 0; i < Math.min(prompts.length, MAX_CALLS); i++) {
    if (totalTokens >= MAX_TOKENS) { status = 'token-budget-exhausted'; break; }
    const started = Date.now();
    let one;
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: MODEL, max_tokens: 512, temperature: 0.1, messages: [{ role: 'system', content: 'You are a terse technical assistant answering in under 40 words.' }, { role: 'user', content: prompts[i] }] }),
      });
      if (!resp.ok) {
        status = `http-error-${resp.status}`;
        one = { httpStatus: resp.status, ok: false };
      } else {
        const data = await resp.json();
        const use = data.usage || {};
        totalTokens += (use.total_tokens ?? 0);
        one = { ok: true, model: data.model ?? MODEL, promptTokens: use.prompt_tokens ?? null, completionTokens: use.completion_tokens ?? null, totalTokens: use.total_tokens ?? null, latencyMs: Date.now() - started };
      }
    } catch (err) {
      status = 'network-error';
      one = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    calls.push({ call: i + 1, ...one });
  }

  // Cost only if the API returns pricing; Fireworks /v1 does not expose it here,
  // so we record null and disclose that rather than inventing a rate.
  return {
    executed: true, reason: 'live probe ran with present credentials', endpoint: baseUrl,
    model: MODEL, calls: calls.length, totalTokens, costUsd, callBudget: MAX_CALLS, tokenBudget: MAX_TOKENS,
    status, calls, noSecrets: true,
  };
}

export async function maybeSaveLiveEvidence() {
  const wantLive = process.env.HARNESS_LIVE === '1';
  if (!wantLive) return { wantLive: false, result: null };
  const result = await runLiveFireworksProbe();
  const outDir = join(here, 'output');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'live-fireworks.json'), JSON.stringify(result, null, 2) + '\n');
  return { wantLive: true, result };
}
