// T-53 recipe DSL and atomic executor over the capability registry (v2).
//
// A recipe is a declarative JSON document `{ id, version, description,
// steps }` whose steps reference registered capabilities and are applied in
// order. `executeRecipe` validates the structure with Zod, preflights every
// referenced capability and then runs each step on a deep clone of the input
// document via `runCapability` (Zod params validation included):
//   - success -> final document, the capability ids applied per step and the
//     diagnostics of every step consolidated in step order;
//   - any failure -> typed rejection carrying the failing step index and its
//     diagnostics; the caller's document is never touched, because the
//     executor only ever mutates its private deep clone.
//
// Rejection codes:
//   - INVALID_RECIPE             structural validation failure (id namespace
//                                `recipe.<name>`, MAJOR.MINOR.PATCH version,
//                                non-empty description, steps as objects with
//                                a capability id);
//   - EMPTY_STEPS                `steps: []` is rejected as an authoring
//                                mistake: a recipe that runs no step is
//                                almost never intended;
//   - CAPABILITY_GAP             a step references an unregistered capability
//                                (registry error wrapped in the result);
//   - DRAFT_CAPABILITY_FORBIDDEN a step references a capability in status
//                                `draft` without `{ allowDraft: true }`;
//   - STEP_FAILED                a step failed during execution (params
//                                rejected by the capability schema, operator
//                                rejection, unsupported result shape).
//
// Capability resolution and draft gating are preflighted for ALL steps before
// the first step executes, so a recipe referencing an unknown or draft
// capability never runs partially. Read-only capabilities (returning
// constraint diagnostics instead of a document) contribute their diagnostics
// and leave the working document unchanged.

import { z } from 'zod';
import {
  isConstraintDiagnostic,
  isPatternDocument,
  type ConstraintDiagnostic,
  type PatternDocument,
} from './contracts.js';
import { CapabilityRegistryError, type CapabilityRegistry } from './registry.js';
import { CapabilityOperatorRejection, runCapability } from './capabilities/index.js';

/** Typed rejection codes returned by {@link executeRecipe}. */
export type RecipeRejectionCode =
  | 'INVALID_RECIPE'
  | 'EMPTY_STEPS'
  | 'CAPABILITY_GAP'
  | 'DRAFT_CAPABILITY_FORBIDDEN'
  | 'STEP_FAILED';

/** One recipe step: a registered capability id plus its raw (JSON) params. */
export interface RecipeStep {
  readonly capability: string;
  readonly params?: unknown;
}

/** Declarative recipe composing registered capabilities in order. */
export interface Recipe {
  /** Stable recipe id in the `recipe.<name>` namespace. */
  readonly id: string;
  /** Semver of the recipe (MAJOR.MINOR.PATCH). */
  readonly version: string;
  /** Non-empty human description of the garment transformation. */
  readonly description: string;
  /** Ordered capability steps; executed top to bottom. */
  readonly steps: readonly RecipeStep[];
}

/** Options for {@link executeRecipe}. */
export interface RecipeExecutionOptions {
  /** Allow steps referencing capabilities in status `draft` (development only). */
  readonly allowDraft?: boolean;
}

/** Successful recipe result: final document, applied ids, consolidated diagnostics. */
export interface RecipeSuccess {
  readonly ok: true;
  readonly doc: PatternDocument;
  /** Capability ids in step order (one entry per executed step). */
  readonly applied: readonly string[];
  readonly diagnostics: readonly ConstraintDiagnostic[];
}

/** Rejected recipe result: no document is produced, the input stays untouched. */
export interface RecipeRejection {
  readonly ok: false;
  readonly code: RecipeRejectionCode;
  readonly message: string;
  readonly diagnostics: readonly ConstraintDiagnostic[];
  /** Zero-based index of the failing step (absent for structure-level rejections). */
  readonly failedStep?: number;
}

export type RecipeResult = RecipeSuccess | RecipeRejection;

const RECIPE_ID_PATTERN = /^recipe\.[a-z][a-z0-9-]*$/;
const RECIPE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

const recipeStepSchema = z.object({
  capability: z.string().min(1),
  params: z.unknown(),
});

const recipeSchema = z.object({
  id: z.string().regex(RECIPE_ID_PATTERN, `recipe id must match ${RECIPE_ID_PATTERN.source}`),
  version: z.string().regex(RECIPE_VERSION_PATTERN, 'recipe version must be MAJOR.MINOR.PATCH'),
  description: z.string().trim().min(1),
  steps: z.array(recipeStepSchema),
});

const cloneDoc = (doc: PatternDocument): PatternDocument =>
  JSON.parse(JSON.stringify(doc)) as PatternDocument;

const rejection = (
  code: RecipeRejectionCode,
  message: string,
  diagnostics: readonly ConstraintDiagnostic[] = [],
  failedStep?: number,
): RecipeRejection =>
  failedStep === undefined
    ? { ok: false, code, message, diagnostics }
    : { ok: false, code, message, diagnostics, failedStep };

function zodDetail(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Execute a recipe atomically against the registry: validate the structure,
 * preflight every referenced capability (existence, draft gate), then apply
 * the steps in order on a deep clone of `doc`. A read-only capability result
 * (constraint diagnostics) consolidates diagnostics without changing the
 * working document; a document result becomes the new working document. The
 * input document is never mutated, on success or on failure.
 */
export function executeRecipe(
  registry: CapabilityRegistry,
  recipe: unknown,
  doc: PatternDocument,
  options: RecipeExecutionOptions = {},
): RecipeResult {
  const parsed = recipeSchema.safeParse(recipe);
  if (!parsed.success) {
    return rejection('INVALID_RECIPE', `recipe structure rejected: ${zodDetail(parsed.error)}`);
  }
  const steps = parsed.data.steps;
  if (steps.length === 0) {
    return rejection(
      'EMPTY_STEPS',
      `recipe "${parsed.data.id}" declares no steps; declare at least one capability step`,
    );
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    let entry: { id: string; version: string; status: string };
    try {
      entry = registry.getCapability(step.capability);
    } catch (err) {
      if (err instanceof CapabilityRegistryError && err.code === 'CAPABILITY_GAP') {
        return rejection('CAPABILITY_GAP', `step ${index}: ${err.message}`, [], index);
      }
      throw err;
    }
    if (entry.status === 'draft' && options.allowDraft !== true) {
      return rejection(
        'DRAFT_CAPABILITY_FORBIDDEN',
        `step ${index} references capability "${entry.id}@${entry.version}" in status "draft"; recipes require "experimental" or "stable" capabilities unless { allowDraft: true }`,
        [],
        index,
      );
    }
  }

  const applied: string[] = [];
  const consolidated: ConstraintDiagnostic[] = [];
  let current: PatternDocument = cloneDoc(doc);

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    let result: unknown;
    try {
      result = runCapability<unknown>(registry, step.capability, current, step.params);
    } catch (err) {
      if (err instanceof CapabilityOperatorRejection) {
        return rejection(
          'STEP_FAILED',
          `step ${index} (${step.capability}) rejected: ${err.code}: ${err.message}`,
          [...err.diagnostics],
          index,
        );
      }
      if (err instanceof CapabilityRegistryError && err.code === 'CAPABILITY_GAP') {
        return rejection('CAPABILITY_GAP', `step ${index}: ${err.message}`, [], index);
      }
      if (err instanceof z.ZodError) {
        return rejection(
          'STEP_FAILED',
          `step ${index} (${step.capability}) params rejected by the capability schema: ${zodDetail(err)}`,
          [],
          index,
        );
      }
      throw err;
    }
    if (isPatternDocument(result)) {
      consolidated.push(...result.diagnostics);
      current = result;
    } else if (Array.isArray(result) && result.every(isConstraintDiagnostic)) {
      consolidated.push(...result);
    } else {
      return rejection(
        'STEP_FAILED',
        `step ${index} (${step.capability}) returned an unsupported result type; expected a pattern document or constraint diagnostics`,
        [],
        index,
      );
    }
    applied.push(step.capability);
  }

  return { ok: true, doc: current, applied, diagnostics: consolidated };
}
