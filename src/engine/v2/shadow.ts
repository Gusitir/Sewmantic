// T-48 read-only semantic shadow runner for the legacy pipeline.
//
// `runSemanticShadow` builds a semantic v2 snapshot from legacy parts and
// exercises the v2 kernel (validation + constraint evaluation) strictly in
// memory:
//
//   - NO filesystem writes, NO logs beyond a single summary line, NO throws:
//     every v2 failure (adapter, structural validation, constraint
//     evaluation) is captured as a non-blocking `ConstraintDiagnostic` with
//     severity 'error' and constraintId 'SHADOW_ADAPTER_FAILURE'.
//   - The legacy pipeline remains the only authority; the returned document
//     and diagnostics are advisory read-only artifacts.

import type { PatternPart } from '../geometry.js';
import type { StandardSize } from '../../types/pattern.js';
import {
  SEMANTIC_V2_SCHEMA_VERSION,
  type ConstraintDiagnostic,
  type PatternDocument,
} from './contracts.js';
import {
  SHADOW_ADAPTER_FAILURE_ID,
  legacyPartsToSemanticDocument,
} from './adapters/legacy-shadow.js';
import { validatePatternDocument } from './serialization.js';
import { evaluateConstraints } from './constraints.js';

/** Advisory result of a shadow run: the snapshot plus collected diagnostics. */
export interface SemanticShadowResult {
  document: PatternDocument;
  diagnostics: ConstraintDiagnostic[];
}

function emptyDocument(): PatternDocument {
  return {
    schemaVersion: SEMANTIC_V2_SCHEMA_VERSION,
    vertices: [],
    edges: [],
    sequences: [],
    panels: [],
    components: [],
    interfaces: [],
    stitchPairs: [],
    diagnostics: [],
  };
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Run the semantic v2 kernel over a legacy snapshot, in memory, read-only.
 *
 * Never throws toward the pipeline: any adapter/validation/constraint failure
 * becomes a non-blocking diagnostic (constraintId `SHADOW_ADAPTER_FAILURE`).
 */
export function runSemanticShadow(
  parts: PatternPart[],
  sizes: StandardSize[],
): SemanticShadowResult {
  const diagnostics: ConstraintDiagnostic[] = [];
  let failureCount = 0;
  let document: PatternDocument = emptyDocument();

  const pushFailure = (message: string): void => {
    const diagnostic: ConstraintDiagnostic = {
      id: `cd-shadow-${failureCount}-${SHADOW_ADAPTER_FAILURE_ID}`,
      constraintId: SHADOW_ADAPTER_FAILURE_ID,
      severity: 'error',
      entities: [],
      message,
      measurementsMm: {},
    };
    failureCount += 1;
    diagnostics.push(diagnostic);
    document.diagnostics.push(diagnostic);
  };

  let adapterFailed = false;
  try {
    document = legacyPartsToSemanticDocument(parts, sizes);
  } catch (err) {
    adapterFailed = true;
    pushFailure(`semantic shadow adapter failed: ${errorText(err)}`);
  }

  if (!adapterFailed) {
    for (const diagnostic of [...document.diagnostics]) {
      diagnostics.push(diagnostic);
    }
    try {
      for (const error of validatePatternDocument(document)) {
        pushFailure(`semantic v2 validation error: ${error}`);
      }
    } catch (err) {
      pushFailure(`semantic v2 validation crashed: ${errorText(err)}`);
    }
    try {
      diagnostics.push(...evaluateConstraints(document));
    } catch (err) {
      pushFailure(`semantic v2 constraint evaluation crashed: ${errorText(err)}`);
    }
  }

  console.log(
    `[semantic-shadow] parts=${parts.length} panels=${document.panels.length} vertices=${document.vertices.length} edges=${document.edges.length} diagnostics=${diagnostics.length}`,
  );

  return { document, diagnostics };
}
