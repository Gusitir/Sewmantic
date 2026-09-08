// T-52 operator SDK for the capability registry (semantic kernel v2).
//
// Bridges the T-47 kernel operators (which return `OperatorResult`) into the
// pure capability contract `(doc, params) -> PatternDocument`: on success the
// new document is returned directly; on rejection a typed
// `CapabilityOperatorRejection` is thrown carrying the operator rejection
// code, message and fresh diagnostics. The input document is never mutated.
//
// `defineKernelCapability` wraps a kernel operator into a `CapabilityEntry`
// ready for `registerCapability`; `runCapability` resolves an entry from the
// registry, validates params through its Zod schema and executes the wrapped
// operator.

import type { ZodType, ZodTypeDef } from 'zod';
import type { ConstraintDiagnostic, PatternDocument } from '../contracts.js';
import type { OperatorRejectionCode, OperatorResult } from '../operators.js';
import type { CapabilityEntry, CapabilityOperator, CapabilityRegistry, CapabilityStatus } from '../registry.js';

/** Formal contract of a document operator capability: pure, deterministic. */
export type KernelDocOperator<TParams> = (doc: PatternDocument, params: TParams) => PatternDocument;

/**
 * Typed rejection raised when a wrapped kernel operator rejects. The caller's
 * document is guaranteed untouched, exactly as with the direct operator call.
 */
export class CapabilityOperatorRejection extends Error {
  readonly code: OperatorRejectionCode;
  readonly diagnostics: readonly ConstraintDiagnostic[];

  constructor(
    code: OperatorRejectionCode,
    message: string,
    diagnostics: readonly ConstraintDiagnostic[] = [],
  ) {
    super(message);
    this.name = 'CapabilityOperatorRejection';
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

/** Definition accepted by {@link defineKernelCapability}. */
export interface KernelCapabilityDefinition<TParams> {
  /** Stable registry id in the `kernel.<name>` namespace. */
  readonly id: string;
  /** Semver of this capability version. */
  readonly version: string;
  /** Initial maturity status. */
  readonly status: CapabilityStatus;
  /** Non-empty human description (reused by prompt/tool derivation). */
  readonly description: string;
  /** Zod schema mirroring the real kernel operator parameters. */
  readonly paramsSchema: ZodType<TParams, ZodTypeDef, unknown>;
  /** Kernel operator returning `OperatorResult`; normalized by the SDK. */
  readonly operator: (doc: PatternDocument, params: TParams) => OperatorResult;
}

/**
 * Wrap a kernel `OperatorResult` operator into a registry-ready
 * `CapabilityEntry<TParams, PatternDocument>`: success yields the new
 * document, rejection throws a typed `CapabilityOperatorRejection`.
 */
export function defineKernelCapability<TParams>(
  definition: KernelCapabilityDefinition<TParams>,
): CapabilityEntry<TParams, PatternDocument> {
  const operator: CapabilityOperator<TParams, PatternDocument> = (doc, params) => {
    const result = definition.operator(doc, params);
    if (result.ok) {
      return result.doc;
    }
    throw new CapabilityOperatorRejection(result.code, result.message, result.diagnostics);
  };
  return {
    id: definition.id,
    version: definition.version,
    status: definition.status,
    paramsSchema: definition.paramsSchema,
    operator,
    description: definition.description,
  };
}

/**
 * Resolve a capability from the registry (highest semver unless `version` is
 * given), validate `params` through the entry's Zod schema and execute the
 * wrapped operator. Unknown capabilities raise `CAPABILITY_GAP`; invalid
 * params raise the Zod error; kernel rejections raise a typed
 * `CapabilityOperatorRejection`.
 */
export function runCapability<TResult>(
  registry: CapabilityRegistry,
  id: string,
  doc: PatternDocument,
  params: unknown,
  version?: string,
): TResult {
  const entry = registry.getCapability<unknown, TResult>(id, version);
  const parsed = entry.paramsSchema.parse(params);
  return entry.operator(doc, parsed);
}
