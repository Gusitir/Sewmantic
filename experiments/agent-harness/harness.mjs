// T-43 harness: deterministic, offline, provider-agnostic agent orchestration.
// Scope: experiments/agent-harness/**. No SDK runtimes are installed; SDK APIs,
// licenses, compat, streaming, sessions, HITL and lock-in are DOCUMENTED from
// real registry metadata in comparative.md. The mock below is 100% offline and
// reproducible.

import { createHash } from 'node:crypto';

// ---- Zod schemas for the parametric pattern domain (FreeSewing-aligned) ----
const z = (await import('zod')).z;

export const PATTERN_PARAMS_SCHEMA = z.strictObject({
  baseBlock: z.enum(['jacket', 'vest', 'trouser', 'oversized-tee']),
  easeMm: z.number().min(-40).max(300),
  seamAllowanceMm: z.number().min(0).max(50),
  grainlineDeg: z.number().min(0).max(359),
  sizes: z.array(z.string().trim().min(1)).min(1).max(12),
  fabricMeters: z.number().gt(0).max(20),
});

// Column denylist: tools must NEVER accept shell / fs / arbitrary-exec vectors.
export const FORBIDDEN_PARAM_KEYS = [
  'shell', 'exec', 'spawn', 'command', 'cmd', 'fs', 'path', 'readfile',
  'writefile', 'readdir', 'rm', 'rmrf', 'require', 'import', 'eval', 'child_process',
];

// ---- State store: persistent local JSON with head + provisional + revisions ----
function hash(record) {
  return createHash('sha256').update(JSON.stringify(record ?? null)).digest('hex');
}

export function initialState() {
  return {
    invariant: 'T-43 agent-harness state schema v1',
    schemaVersion: 1,
    headParams: {
      baseBlock: 'vest',
      easeMm: 60,
      seamAllowanceMm: 10,
      grainlineDeg: 0,
      sizes: ['S', 'M', 'L'],
      fabricMeters: 1.6,
    },
    headHash: '',
    provisional: null, // { params, note, patch }
    revisions: [], // [{ rev, hash, params, note }]
  };
}

// board head into revision 0 if absent from a persisted file (deterministic boot).
function ensureHead(state) {
  if (!state.headHash) {
    state.headHash = hash(state.headParams);
    state.revisions = [{
      rev: 0,
      hash: state.headHash,
      params: JSON.parse(JSON.stringify(state.headParams)),
      note: 'baseline',
    }];
  }
  return state;
}

export function loadStore(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (parsed.invariant !== initialState().invariant || parsed.schemaVersion !== 1) {
    throw new Error(`agent-harness: unsupported persisted state (${parsed.invariant} v${parsed.schemaVersion})`);
  }
  return ensureHead(parsed);
}

export function createInitialStore() {
  return ensureHead(initialState());
}

export function currentParams(state) {
  return state.provisional ? state.provisional.params : state.headParams;
}

export function serializeStore(state) {
  return JSON.stringify(state, null, 2) + '\n';
}

// ---- Tool implementations (pure, deterministic, no I/O) ----
export function getUntrustedKeys(paramKeys) {
  return paramKeys.filter((k) => FORBIDDEN_PARAM_KEYS.includes(k.toLowerCase()));
}

export function toolGetCurrentPattern(state) {
  const p = currentParams(state);
  return { ok: true, rev: state.revisions.length - 1, params: JSON.parse(JSON.stringify(p)), hasProvisional: !!state.provisional };
}

export function toolListCapabilities(state) {
  const direct = ['get_current_pattern', 'list_capabilities', 'apply_pattern_patch', 'validate_pattern', 'create_revision', 'undo_revision'];
  return {
    ok: true,
    tools: direct.map((name) => ({
      name,
      required: name !== 'list_capabilities' && name !== 'get_current_pattern',
      zodValidated: true,
    })),
    provider: 'fireworks-(openai-compatible)',
    sdk: 'agnostic-mock',
  };
}

export function toolValidatePattern(state, { params } = {}) {
  const target = params ?? currentParams(state);
  const r = PATTERN_PARAMS_SCHEMA.safeParse(target);
  if (!r.success) {
    return { ok: false, valid: false, issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) };
  }
  return { ok: true, valid: true, issues: [] };
}

export function toolApplyPatternPatch(state, { patch, note }) {
  const forbidden = getUntrustedKeys(Object.keys(patch));
  if (forbidden.length) {
    return { ok: false, error: `patch rejected: keys denied by safety denylist: ${forbidden.join(', ')}`, rev: state.revisions.length - 1 };
  }
  const nextProvisionalParams = {
    ...currentParams(state),
    ...patch,
  };
  const validation = toolValidatePattern(state, { params: nextProvisionalParams });
  if (!validation.valid) {
    return { ok: false, error: 'patch rejected by Zod/domain validation', issues: validation.issues, rev: state.revisions.length - 1 };
  }
  state.provisional = { params: nextProvisionalParams, note: note ?? null, patch };
  return { ok: true, params: JSON.parse(JSON.stringify(nextProvisionalParams)), hasProvisional: true, rev: state.revisions.length - 1 };
}

export function toolCreateRevision(state, { note }) {
  if (!state.provisional) {
    return { ok: false, error: 'no provisional patch to commit; apply_pattern_patch first', rev: state.revisions.length - 1 };
  }
  const params = JSON.parse(JSON.stringify(state.provisional.params));
  const rev = state.revisions.length;
  state.revisions.push({ rev, hash: hash(params), params, note: note ?? state.provisional.note ?? `revision ${rev}` });
  state.headParams = params;
  state.headHash = hash(params);
  state.provisional = null;
  return { ok: true, rev, hash: hash(params), committed: true };
}

// Exact undo: restores the committed head (clears any provisional window), so
// params become byte-identical to the last committed revision (provable via hash).
export function toolUndoRevision(state) {
  if (!state.provisional && state.revisions.length <= 1) {
    return { ok: true, error: 'nothing to undo; already at baseline revision 0', restoredHash: state.headHash, rev: state.revisions.length - 1 };
  }
  const committed = state.revisions[state.revisions.length - 1];
  state.provisional = null;
  if (state.revisions.length > 1) {
    state.revisions = state.revisions.slice(0, -1);
  }
  const head = state.revisions[state.revisions.length - 1];
  state.headParams = JSON.parse(JSON.stringify(head.params));
  state.headHash = hash(head.params);
  return { ok: true, restoredHash: head.hash, rev: head.rev, committedRev: committed ? committed.rev : null };
}

// ---- Dispatcher: registry + deterministic step budget + unknown-tool denial ----
export const TOOL_REGISTRY = {
  get_current_pattern: { params: z.strictObject({}).optional(), run: toolGetCurrentPattern },
  list_capabilities: { params: z.strictObject({}).optional(), run: toolListCapabilities },
  validate_pattern: { params: z.object({ params: z.unknown().optional() }).optional(), run: toolValidatePattern },
  apply_pattern_patch: {
    params: z.strictObject({
      patch: z.record(z.string(), z.unknown()).refine((v) => Object.keys(v).length > 0, { message: 'patch must be non-empty' }),
      note: z.string().max(200).optional(),
    }),
    run: toolApplyPatternPatch,
  },
  create_revision: { params: z.strictObject({ note: z.string().max(200).optional() }).optional(), run: toolCreateRevision },
  undo_revision: { params: z.strictObject({}).optional(), run: toolUndoRevision },
};

export function dispatch(state, name, rawArgs, budget) {
  if (budget != null && budget.steps >= budget.maxSteps) {
    return { ok: false, error: `max_steps_exceeded (${budget.steps}>=${budget.maxSteps})`, tool: name, notExecuted: true };
  }
  const entry = TOOL_REGISTRY[name];
  if (!entry) {
    return { ok: false, error: `unknown_tool: "${name}" is not registered and was NOT executed`, tool: name, notExecuted: true };
  }
  const schema = entry.params;
  const parsed = schema?.safeParse(rawArgs ?? {});
  if (parsed && !parsed.success) {
    return { ok: false, error: 'invalid_tool_input', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })), tool: name, notExecuted: true };
  }
  if (budget) budget.steps += 1;
  return entry.run(state, parsed ? parsed.data : undefined);
}
