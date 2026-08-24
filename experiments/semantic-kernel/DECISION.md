# T-42 Semantic Kernel Spike

## Decision

A minimal, dependency-free semantic kernel inspired by the GarmentCode model is
feasible and small enough to keep as a bounded contract: `Edge`, `EdgeSequence`,
`Panel`, `Interface` and `StitchPair` model a garment seam topologically, and a
single sampling function merges both sides' cumulative boundary offsets so that
two interfaces with different segmentation stitch together without dropping any
total length. The spike requires **no new runtime dependency**; it is plain ESM.

This is spike evidence only. No code under `experiments/` is promoted to
`src/`. No GarmentCode Python framework is copied; only its core idea
(segment-agnostic seam matching over edge sequences) is re-derived in TypeScript.

## Core model and matching surfaces

| Entity | Responsibility |
| --- | --- |
| `Edge` | Ordered straight garment edge with start/end coordinates and vertex identity ids plus `const kind` (`boundary`/`interior`). Provides `length()`, `direction()`, `splitAt(t)`. |
| `EdgeSequence` | Ordered run of edges on a panel (a seam target or loop). Provides arc-length `pointAt(s)` and cumulative offsets. |
| `Panel` | Owns sequences; `boundaryLength()` over loop sequences. |
| `Interface` | A seam contract (left sequence, right sequence, seam allowance). `match()` produces the resolved `StitchPair`. |
| `StitchPair` | Resolution of an interface: merged stitch segments, left/right/common length, `delta`, `deltaExceeds`, `orientationCompatible`, segment pairs. |

`matchSequences` builds the merged set of breakpoints from both sides'
cumulative offsets, then emits one pair per interval; every pair covers an equal
length on both sides by construction, so different segmentations match without
losing total length. Orientation compatibility requires the two start tangents
to face opposite directions (`dot < -0.5`), which is how two panels of a seam
fold toward each other; same-direction starts indicate a mirrored or
mis-oriented pair and are flagged invalid.

## Invariants proven by the runner (`npm run experiment:semantic`)

- Different segmentation, equal total length (100 mm, 2 vs 4 edges): `delta 0`,
  merged into 4+ stitch pairs, orientation compatible. Total length preserved.
- A second seam (waist, 60 mm) also matches across a 2-vs-4 edge split.
- A mis-oriented twin (same traversal direction) is detected as
  `orientationCompatible === false`.
- A cut splits an edge (2 -> 3 edges): total length invariant (still 100 mm)
  and the affected interface re-resolves with `delta 0`.
- A dart notched 4 mm adds exactly `2*depth = 8` mm; the affected interface
  re-matches and reports seam `delta > 3 mm`.
- JSON round-trip (`toJSON`/`fromJSON`) preserves all ids, interface wiring
  semantics, and measures (lengths and deltas) within 0.001 mm.

## Edge cases, limits and audit notes

- Edge sequences are currently straight segments; curved seams must be sampled
  into straight segments by the caller (same approach the product already uses
  for PDF/2D rendering).
- A dart extends seam length in this spike; real darting changes bulk without
  moving seam endpoints. The criterion here is only that the affected interface
  is kept updated against the new length/segmentation.
- Vertex identity is traceable via string ids on edges; no geometric vertex
  recycling is attempted yet.
- No external service, no credentials, no new dependency. Diagnostics are
  deterministic and omit runtime-dependent `latencyMs`.

## T-42 Micro-correction Evidence

The runner was executed in the working tree with these results:

- `npm run experiment:semantic`: `18/18` invariants passed, exit code 0.
- All exercised edges and every `StitchPair.aLen`/`StitchPair.bLen` field have
  strictly positive lengths.
- `npm run build`: PASS.
- `npm test`: `21/21` suites, `556/556` tests PASS.
- Deterministic diagnostics written: `panels.svg` (two cosible panels plus the
  mis-oriented mirror) and `roundtrip.json` (full snapshot, rebuilt id sets,
  before/after measures); neither contains `latencyMs`.

## Follow-up boundary

The next spikes (T-43 patternist harness, T-44 local RAG) remain unstarted.
The Engineer/Architect decide whether this semantic model is retained as the
north-star contract. No promotion to `src/`, no new dependency, no GarmentCode
port.
