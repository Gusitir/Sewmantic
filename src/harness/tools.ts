// T-55 capability tools bridge for the Patternist Harness.
//
// Converts capability registry entries into harness tools that a bounded
// executor can drive: `capabilityToTool` resolves ONE registry entry (a
// missing capability raises `CAPABILITY_GAP` from the factory itself) and
// returns a frozen `HarnessTool` whose `execute` delegates to `runCapability`
// and normalizes every typed outcome into a plain result object:
//   - document result             -> { ok: true, doc, diagnostics }
//   - read-only diagnostics array -> { ok: true, doc (untouched), diagnostics }
//   - CapabilityOperatorRejection -> { ok: false, code, message, diagnostics }
//   - ZodError (params rejection) -> { ok: false, code: 'INVALID_PARAMETERS' }
//   - CapabilityRegistryError     -> { ok: false, code: 'CAPABILITY_GAP' }
// Only errors outside the typed contract (a buggy operator) are re-thrown.
//
// Capabilities in status `draft` are gated at execute time with
// `DRAFT_CAPABILITY_FORBIDDEN` unless the tool was created with
// `{ allowDraft: true }`. Success results always carry the fresh step
// `diagnostics` (the document's own for mutating capabilities, the returned
// array for read-only ones) so an executor can consolidate them without
// re-deriving capability semantics.
//
// `registryToTools` derives the full toolset from a registry: exactly one
// tool per capability id (highest semver, id-sorted, deterministic).
// Capabilities in status `draft` are excluded unless `{ allowDraft: true }`.

import { z } from 'zod';

import {
  isConstraintDiagnostic,
  isPatternDocument,
  type ConstraintDiagnostic,
  type PatternDocument,
} from '../engine/v2/contracts.js';
import { CapabilityOperatorRejection, runCapability } from '../engine/v2/capabilities/index.js';
import type { OperatorRejectionCode } from '../engine/v2/operators.js';
import {
  CapabilityRegistryError,
  type CapabilityRegistry,
  type CapabilityStatus,
} from '../engine/v2/registry.js';

/** Typed failure codes carried by a harness tool result. */
export type HarnessToolErrorCode =
  | OperatorRejectionCode
  | 'CAPABILITY_GAP'
  | 'DRAFT_CAPABILITY_FORBIDDEN'
  | 'UNSUPPORTED_RESULT';

/**
 * Normalized result of one harness tool execution. Typed outcomes never
 * throw; only operator bugs outside the capability contract propagate.
 */
export type HarnessToolResult =
  | {
      readonly ok: true;
      readonly doc: PatternDocument;
      /** Fresh diagnostics produced by this step (possibly empty). */
      readonly diagnostics: readonly ConstraintDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly code: HarnessToolErrorCode;
      readonly message: string;
      readonly diagnostics: readonly ConstraintDiagnostic[];
    };

/** One registry-backed tool exposed to the harness executor. */
export interface HarnessTool {
  readonly id: string;
  readonly version: string;
  readonly status: CapabilityStatus;
  readonly description: string;
  /** Zod schema of the raw params (the registry entry's own schema). */
  readonly paramsSchema: z.ZodTypeAny;
  execute(doc: PatternDocument, params: unknown): HarnessToolResult;
}

export interface CapabilityToolOptions {
  /** Allow executing capabilities in status `draft` (development only). */
  readonly allowDraft?: boolean;
}

function zodDetail(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Build a harness tool from one registry capability. Unknown capabilities
 * raise `CapabilityRegistryError` (`CAPABILITY_GAP`) from this factory; the
 * returned tool never throws for typed outcomes.
 */
export function capabilityToTool(
  registry: CapabilityRegistry,
  id: string,
  version?: string,
  options: CapabilityToolOptions = {},
): HarnessTool {
  const entry = registry.getCapability(id, version);
  const allowDraft = options.allowDraft === true;
  return Object.freeze({
    id: entry.id,
    version: entry.version,
    status: entry.status,
    description: entry.description,
    paramsSchema: entry.paramsSchema,
    execute(doc: PatternDocument, params: unknown): HarnessToolResult {
      if (entry.status === 'draft' && !allowDraft) {
        return {
          ok: false,
          code: 'DRAFT_CAPABILITY_FORBIDDEN',
          message: `capability "${entry.id}@${entry.version}" is in status "draft"; draft capabilities cannot execute unless the tool is created with { allowDraft: true }`,
          diagnostics: [],
        };
      }
      try {
        const result = runCapability<unknown>(registry, entry.id, doc, params, entry.version);
        if (isPatternDocument(result)) {
          return { ok: true, doc: result, diagnostics: [...result.diagnostics] };
        }
        if (Array.isArray(result) && result.every(isConstraintDiagnostic)) {
          // Read-only capability (e.g. kernel.evaluate-constraints): the
          // working document is returned untouched and the fresh diagnostics
          // become the step result.
          return { ok: true, doc, diagnostics: result };
        }
        return {
          ok: false,
          code: 'UNSUPPORTED_RESULT',
          message: `capability "${entry.id}@${entry.version}" returned an unsupported result type; expected a pattern document or constraint diagnostics`,
          diagnostics: [],
        };
      } catch (err) {
        if (err instanceof CapabilityOperatorRejection) {
          return {
            ok: false,
            code: err.code,
            message: err.message,
            diagnostics: [...err.diagnostics],
          };
        }
        if (err instanceof z.ZodError) {
          return {
            ok: false,
            code: 'INVALID_PARAMETERS',
            message: `params rejected by the capability schema: ${zodDetail(err)}`,
            diagnostics: [],
          };
        }
        if (err instanceof CapabilityRegistryError) {
          return { ok: false, code: 'CAPABILITY_GAP', message: err.message, diagnostics: [] };
        }
        throw err;
      }
    },
  });
}

/**
 * Derive one harness tool per capability id (highest semver, id-sorted).
 * Capabilities in status `draft` are only included with `{ allowDraft: true }`.
 */
export function registryToTools(
  registry: CapabilityRegistry,
  options: CapabilityToolOptions = {},
): readonly HarnessTool[] {
  const ids = Array.from(new Set(registry.snapshotEntries().map((entry) => entry.id))).sort();
  const tools: HarnessTool[] = [];
  for (const id of ids) {
    const latest = registry.getCapability(id);
    if (latest.status === 'draft' && options.allowDraft !== true) {
      continue;
    }
    tools.push(capabilityToTool(registry, id, latest.version, options));
  }
  return tools;
}
