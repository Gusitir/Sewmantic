// T-53 recipe DSL and atomic executor tests for the semantic pattern kernel (v2).
//
// Gates covered:
//   - valid multi-step recipe over the base capabilities: ordered execution on
//     a deep clone, `applied` listing the capability ids per step, consolidated
//     diagnostics, untouched input document, serializable result;
//   - unknown capability -> CAPABILITY_GAP wrapped in the recipe result with
//     the failing step index;
//   - draft gating: DRAFT_CAPABILITY_FORBIDDEN by default, executable with
//     { allowDraft: true };
//   - mid-recipe failure (Zod params validation and operator rejection): the
//     caller's document stays byte-identical (serializeDocument before/after)
//     and the failing step index is reported;
//   - structural validation: INVALID_RECIPE for malformed id/version/steps,
//     EMPTY_STEPS for a zero-step recipe;
//   - both versioned example fixtures load from fixtures/recipes/, validate
//     against a base-capability registry and execute deterministically.

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SEMANTIC_V2_SCHEMA_VERSION,
  createCapabilityRegistry,
  defineKernelCapability,
  deserializeDocument,
  executeRecipe,
  registerBaseCapabilities,
  serializeDocument,
  type CapabilityRegistry,
  type ConstraintDiagnostic,
  type PatternDocument,
  type RecipeResult,
} from '../src/engine/v2/index.js';

// --- fixtures ---------------------------------------------------------------

/** Line fixture: 100 mm left edge vs two 50 mm right edges, anti-parallel. */
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

function freshRegistry(): CapabilityRegistry {
  return registerBaseCapabilities(createCapabilityRegistry());
}

function expectSuccess(result: RecipeResult): Extract<RecipeResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected recipe success, got ${result.code}: ${result.message}`);
  }
  return result;
}

function expectRejection(result: RecipeResult): Extract<RecipeResult, { ok: false }> {
  if (result.ok) {
    throw new Error('expected a recipe rejection, got a success');
  }
  return result;
}

const draftProbeSchema = z.object({ marker: z.string() });

/** Register a `draft` pass-through capability emitting one marker diagnostic. */
function registerDraftProbe(registry: CapabilityRegistry): void {
  registry.registerCapability(
    defineKernelCapability<{ marker: string }>({
      id: 'kernel.probe-draft',
      version: '0.1.0',
      status: 'draft',
      description: 'temporary draft capability used to gate recipe execution',
      paramsSchema: draftProbeSchema,
      operator: (doc, params) => {
        const marker: ConstraintDiagnostic = {
          id: 'cd-probe-0',
          constraintId: `RECIPE_PROBE:${params.marker}`,
          severity: 'info',
          entities: [],
          message: 'draft probe executed',
          measurementsMm: {},
        };
        return {
          ok: true as const,
          doc: { ...doc, diagnostics: [...doc.diagnostics, marker] },
          diagnostics: [marker],
        };
      },
    }),
  );
}

// --- executor --------------------------------------------------------------

describe('T-53 recipe executor', () => {
  it('applies a valid recipe in order with consolidated diagnostics and an untouched input', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();
    const before = serializeDocument(doc);

    const result = executeRecipe(registry, {
      id: 'recipe.test-split-dart',
      version: '0.1.0',
      description: 'test recipe: split the left border and open a dart on the upper segment',
      steps: [
        {
          capability: 'kernel.split-edge',
          params: {
            edgeId: 'eL0',
            atMm: 40,
            vertexId: 'vSplitTest',
            edgeIdA: 'eSplitTestA',
            edgeIdB: 'eSplitTestB',
          },
        },
        {
          capability: 'kernel.insert-dart',
          params: { edgeId: 'eSplitTestA', depthMm: 15, atMm: 20, maxSeamDeltaMm: 30 },
        },
        { capability: 'kernel.evaluate-constraints', params: { maxSeamDeltaMm: 30 } },
      ],
    }, doc);
    const success = expectSuccess(result);

    expect(success.applied).toEqual([
      'kernel.split-edge',
      'kernel.insert-dart',
      'kernel.evaluate-constraints',
    ]);
    expect(success.doc.edges.map((edge) => edge.id)).toEqual([
      'eSplitTestA__dart_a',
      'eSplitTestA__dart_leg_in',
      'eSplitTestA__dart_leg_out',
      'eSplitTestA__dart_b',
      'eSplitTestB',
      'eR0',
      'eR1',
    ]);
    expect(success.doc.vertices.map((vertex) => vertex.id)).toContain('eSplitTestA__dart_apex');
    expect(success.doc.sequences[0].edgeIds).toContain('eSplitTestA__dart_leg_in');
    expect(success.diagnostics).toEqual([]);
    expect(success.doc.diagnostics).toEqual([]);
    expect(serializeDocument(doc)).toBe(before);
    expect(deserializeDocument(serializeDocument(success.doc))).toEqual(success.doc);
  });

  it('reports CAPABILITY_GAP for an unregistered capability at the failing step', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();
    const before = serializeDocument(doc);

    const result = executeRecipe(registry, {
      id: 'recipe.test-gap',
      version: '0.1.0',
      description: 'test recipe referencing an unregistered capability in step 2',
      steps: [
        { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 40 } },
        { capability: 'kernel.does-not-exist', params: {} },
        { capability: 'kernel.evaluate-constraints', params: {} },
      ],
    }, doc);
    const rejection = expectRejection(result);

    expect(rejection.code).toBe('CAPABILITY_GAP');
    expect(rejection.failedStep).toBe(1);
    expect(rejection.message).toContain('kernel.does-not-exist');
    expect(rejection.diagnostics).toEqual([]);
    expect(serializeDocument(doc)).toBe(before);
  });

  it('forbids draft capabilities by default and runs them with allowDraft', () => {
    const registry = freshRegistry();
    registerDraftProbe(registry);
    const doc = buildLineFixture();
    const before = serializeDocument(doc);
    const recipe = {
      id: 'recipe.test-draft-gate',
      version: '0.1.0',
      description: 'test recipe referencing a draft capability',
      steps: [
        { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 40 } },
        { capability: 'kernel.probe-draft', params: { marker: 'alpha' } },
      ],
    };

    const gated = expectRejection(executeRecipe(registry, recipe, doc));
    expect(gated.code).toBe('DRAFT_CAPABILITY_FORBIDDEN');
    expect(gated.failedStep).toBe(1);
    expect(gated.message).toContain('kernel.probe-draft@0.1.0');
    expect(serializeDocument(doc)).toBe(before);

    const allowed = expectSuccess(
      executeRecipe(registry, recipe, doc, { allowDraft: true }),
    );
    expect(allowed.applied).toEqual(['kernel.split-edge', 'kernel.probe-draft']);
    expect(allowed.diagnostics.map((diagnostic) => diagnostic.constraintId)).toEqual([
      'RECIPE_PROBE:alpha',
    ]);
    expect(allowed.doc.edges.map((edge) => edge.id)).toEqual(['eL0__a', 'eL0__b', 'eR0', 'eR1']);
    expect(serializeDocument(doc)).toBe(before);
  });

  it('keeps the document byte-identical when a mid step fails on params validation', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();
    const before = serializeDocument(doc);

    const result = executeRecipe(registry, {
      id: 'recipe.test-params-failure',
      version: '0.1.0',
      description: 'test recipe whose step 2 misses the required depthMm param',
      steps: [
        { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 40 } },
        { capability: 'kernel.insert-dart', params: { edgeId: 'eL0__a' } },
        { capability: 'kernel.evaluate-constraints', params: {} },
      ],
    }, doc);
    const rejection = expectRejection(result);

    expect(rejection.code).toBe('STEP_FAILED');
    expect(rejection.failedStep).toBe(1);
    expect(rejection.message).toContain('depthMm');
    expect(rejection.diagnostics).toEqual([]);
    expect(serializeDocument(doc)).toBe(before);
  });

  it('keeps the document byte-identical when a mid step is rejected by the operator', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();
    const before = serializeDocument(doc);

    const result = executeRecipe(registry, {
      id: 'recipe.test-operator-failure',
      version: '0.1.0',
      description: 'test recipe whose step 2 targets an unknown edge',
      steps: [
        { capability: 'kernel.split-edge', params: { edgeId: 'eL0', atMm: 40 } },
        { capability: 'kernel.cut', params: { edgeId: 'eMissing', lengthMm: 10 } },
        { capability: 'kernel.evaluate-constraints', params: {} },
      ],
    }, doc);
    const rejection = expectRejection(result);

    expect(rejection.code).toBe('STEP_FAILED');
    expect(rejection.failedStep).toBe(1);
    expect(rejection.message).toContain('UNKNOWN_EDGE');
    expect(rejection.diagnostics).toEqual([]);
    expect(serializeDocument(doc)).toBe(before);
  });

  it('rejects structurally invalid recipes with INVALID_RECIPE', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();
    const before = serializeDocument(doc);
    const cases: readonly { readonly name: string; readonly recipe: unknown }[] = [
      {
        name: 'missing steps',
        recipe: { id: 'recipe.test-invalid', version: '1.0.0', description: 'no steps at all' },
      },
      {
        name: 'id outside the recipe namespace',
        recipe: {
          id: 'kernel.split-edge',
          version: '1.0.0',
          description: 'wrong id namespace',
          steps: [{ capability: 'kernel.cut', params: {} }],
        },
      },
      {
        name: 'non-semver version',
        recipe: {
          id: 'recipe.test-invalid',
          version: '1.0',
          description: 'version is not MAJOR.MINOR.PATCH',
          steps: [{ capability: 'kernel.cut', params: {} }],
        },
      },
      {
        name: 'step without capability id',
        recipe: {
          id: 'recipe.test-invalid',
          version: '1.0.0',
          description: 'step misses the capability id',
          steps: [{ params: {} }],
        },
      },
      { name: 'non-object recipe', recipe: 'recipe-test-invalid' },
    ];

    for (const testCase of cases) {
      const rejection = expectRejection(executeRecipe(registry, testCase.recipe, doc));
      expect(rejection.code, testCase.name).toBe('INVALID_RECIPE');
      expect(rejection.failedStep, testCase.name).toBeUndefined();
      expect(rejection.message, testCase.name).toContain('recipe structure rejected');
    }
    expect(serializeDocument(doc)).toBe(before);
  });

  it('rejects an empty step list with EMPTY_STEPS', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();
    const before = serializeDocument(doc);

    const rejection = expectRejection(
      executeRecipe(registry, {
        id: 'recipe.test-empty',
        version: '1.0.0',
        description: 'structurally valid recipe with zero steps',
        steps: [],
      }, doc),
    );

    expect(rejection.code).toBe('EMPTY_STEPS');
    expect(rejection.failedStep).toBeUndefined();
    expect(serializeDocument(doc)).toBe(before);
  });
});

// --- versioned example fixtures ---------------------------------------------

describe('T-53 example recipe fixtures', () => {
  const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'recipes');

  const loadFixture = (name: string): unknown =>
    JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8')) as unknown;

  it('executes haori-fusion.v1.json over the base capabilities', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();
    const before = serializeDocument(doc);

    const success = expectSuccess(executeRecipe(registry, loadFixture('haori-fusion.v1.json'), doc));

    expect(success.applied).toEqual([
      'kernel.split-edge',
      'kernel.insert-dart',
      'kernel.evaluate-constraints',
    ]);
    expect(success.doc.edges.map((edge) => edge.id)).toEqual([
      'eHaoriDartBefore',
      'eHaoriDartLegIn',
      'eHaoriDartLegOut',
      'eHaoriDartAfter',
      'eHaoriLower',
      'eR0',
      'eR1',
    ]);
    expect(success.doc.vertices.map((vertex) => vertex.id)).toContain('vHaoriDartApex');
    expect(success.diagnostics).toEqual([]);
    expect(deserializeDocument(serializeDocument(success.doc))).toEqual(success.doc);
    expect(serializeDocument(doc)).toBe(before);
  });

  it('executes vest-welt.v1.json over the base capabilities', () => {
    const registry = freshRegistry();
    const doc = buildLineFixture();
    const before = serializeDocument(doc);

    const success = expectSuccess(executeRecipe(registry, loadFixture('vest-welt.v1.json'), doc));

    expect(success.applied).toEqual(['kernel.cut', 'kernel.cut', 'kernel.evaluate-constraints']);
    expect(success.doc.edges.map((edge) => edge.id)).toEqual([
      'eWeltLeftBefore',
      'eWeltLeftAfter',
      'eR0',
      'eWeltRightBefore',
      'eWeltRightAfter',
    ]);
    expect(success.diagnostics).toEqual([]);
    expect(deserializeDocument(serializeDocument(success.doc))).toEqual(success.doc);
    expect(serializeDocument(doc)).toBe(before);
  });
});
