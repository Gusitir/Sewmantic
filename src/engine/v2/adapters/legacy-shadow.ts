// T-48 legacy adapter: PatternPart snapshots -> semantic v2 PatternDocument.
//
// Maps the legacy `PatternPart` geometry (src/engine/geometry.ts) into the
// semantic v2 kernel contracts in READ-ONLY fashion: nothing here mutates the
// input parts, touches the filesystem, or feeds the legacy export pipeline.
//
// Mapping decisions (fixed for this task):
//
// - One document per call. The `sizes` parameter is a PARALLEL array:
//   `sizes[i]` is the legacy size that `parts[i]` belongs to. This lets the
//   pipeline seam snapshot every size's piece set in a single call.
// - One `Panel` per (part, size): id `panel-<name>-<size>`. Panel preserves
//   `label` (as name), `cutCount` and `onFold`.
// - Two `Component`s per (part, size):
//     * `component-<name>-<size>`: name is the legacy part name.
//     * `meta-<name>-<size>`: name is a JSON blob carrying the legacy data
//       that has no dedicated v2 field (grainline, notches). This is the
//       sanctioned overflow area - no new fields were added to contracts.ts.
// - Boundary: `outline` becomes one `Vertex` per point and one `LineCurve`
//   `Edge` per segment, closed implicitly (the last segment returns to the
//   first vertex). A single `EdgeSequence` with `isLoop: true`, role
//   `'outline'`, owns the loop.
// - Degenerate outlines (< 3 points) cannot form a loop: the panel/component
//   metadata is still mapped, no sequence is emitted, and a non-blocking
//   `ConstraintDiagnostic` (constraintId `SHADOW_ADAPTER_FAILURE`, severity
//   `error`) is appended to `document.diagnostics`. The adapter only throws
//   on contract misuse (array length mismatch); runSemanticShadow converts
//   that into a diagnostic as well.
// - No `Interface`s are invented: legacy parts carry no seam pairing data.
// - Ids are stable and unique: part names are unique Record keys per size,
//   the size suffix disambiguates across sizes, and a deterministic numeric
//   suffix guards against accidental key collisions.

import type { PatternPart } from '../../geometry.js';
import type { StandardSize } from '../../../types/pattern.js';
import {
  SEMANTIC_V2_SCHEMA_VERSION,
  type Component,
  type ConstraintDiagnostic,
  type Edge,
  type EdgeSequence,
  type Panel,
  type PatternDocument,
  type Vertex,
} from '../contracts.js';

/** External constraint id for adapter/shadow failures (non-blocking). */
export const SHADOW_ADAPTER_FAILURE_ID = 'SHADOW_ADAPTER_FAILURE';

/**
 * Convert legacy pattern parts into a semantic v2 document snapshot.
 *
 * @param parts Legacy pieces (all sizes, see the parallel-array contract).
 * @param sizes `sizes[i]` is the legacy size of `parts[i]`.
 * @returns A structurally valid `PatternDocument` (no interfaces, no stitch
 *          pairs). Degenerate pieces are reported via `document.diagnostics`.
 */
export function legacyPartsToSemanticDocument(
  parts: PatternPart[],
  sizes: StandardSize[],
): PatternDocument {
  if (parts.length !== sizes.length) {
    throw new Error(
      `legacyPartsToSemanticDocument requires parallel arrays: parts.length (${parts.length}) !== sizes.length (${sizes.length})`,
    );
  }

  const vertices: Vertex[] = [];
  const edges: Edge[] = [];
  const sequences: EdgeSequence[] = [];
  const panels: Panel[] = [];
  const components: Component[] = [];
  const diagnostics: ConstraintDiagnostic[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const size = sizes[i];

    let key = `${part.name}-${size}`;
    let suffix = 2;
    while (seenKeys.has(key)) {
      key = `${part.name}-${size}-${suffix}`;
      suffix += 1;
    }
    seenKeys.add(key);

    const panelId = `panel-${key}`;
    const outline = part.outline;

    if (outline.length >= 3) {
      const sequenceId = `seq-${key}-outline`;
      const panelVertices: Vertex[] = outline.map((p, j) => ({
        id: `v-${key}-${j}`,
        xMm: p.x,
        yMm: p.y,
      }));
      const panelEdges: Edge[] = panelVertices.map((v, j) => ({
        id: `e-${key}-${j}`,
        role: 'boundary',
        curve: {
          kind: 'line',
          startVertexId: v.id,
          endVertexId: panelVertices[(j + 1) % panelVertices.length].id,
        },
      }));
      vertices.push(...panelVertices);
      edges.push(...panelEdges);
      sequences.push({
        id: sequenceId,
        panelId,
        role: 'outline',
        isLoop: true,
        edgeIds: panelEdges.map((e) => e.id),
      });
      panels.push({
        id: panelId,
        name: part.label,
        material: 'legacy-shell',
        cutCount: part.cutCount,
        onFold: part.onFold,
        sequenceIds: [sequenceId],
      });
    } else {
      diagnostics.push({
        id: `cd-${panelId}-degenerate-outline`,
        constraintId: SHADOW_ADAPTER_FAILURE_ID,
        severity: 'error',
        entities: [panelId],
        message: `legacy part "${part.name}" (size ${size}) has a degenerate outline (${outline.length} points); no boundary loop was mapped`,
        measurementsMm: {},
      });
      panels.push({
        id: panelId,
        name: part.label,
        material: 'legacy-shell',
        cutCount: part.cutCount,
        onFold: part.onFold,
        sequenceIds: [],
      });
    }

    components.push({
      id: `component-${key}`,
      name: part.name,
      panelIds: [panelId],
    });
    components.push({
      id: `meta-${key}`,
      name: JSON.stringify({
        part: part.name,
        grainline: {
          start: { x: part.grainline.start.x, y: part.grainline.start.y },
          end: { x: part.grainline.end.x, y: part.grainline.end.y },
          label: part.grainline.label,
        },
        notches: part.notches.map((n) => ({
          point: { x: n.point.x, y: n.point.y },
          angle_deg: n.angle_deg,
          type: n.type,
          label: n.label,
        })),
      }),
      panelIds: [panelId],
    });
  }

  return {
    schemaVersion: SEMANTIC_V2_SCHEMA_VERSION,
    vertices,
    edges,
    sequences,
    panels,
    components,
    interfaces: [],
    stitchPairs: [],
    diagnostics,
  };
}
