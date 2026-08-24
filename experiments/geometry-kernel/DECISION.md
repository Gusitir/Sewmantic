# T-41 Geometry Kernel Spike

## Decision

Reject both libraries as a drop-in product kernel. Retain Flatten.js as the leading candidate for a later, separately authorized polygon-boolean evaluation: it models polygon faces and holes directly and exposes polygon boolean operations. Maker.js is a useful drawing/CAD companion, but its model is path-centric; its multi-contour hole fixture has no filled-area semantic in this spike.

## Compared versions

| Library | Version | License | npm unpacked package | Relevant API | Maintenance signal |
| --- | --- | --- | ---: | --- | --- |
| `@flatten-js/core` | 1.6.14 | MIT | 1,284,965 bytes | `Polygon`, `BooleanOperations.unify` | Published package with ESM exports; repository: alexbol99/flatten-js |
| `makerjs` | 0.19.2 | Apache-2.0 | 1,087,203 bytes | `model.combineUnion`, `model.outline`, `path.intersection` | Microsoft Garage project; package API remains path/model based |

Both licenses are non-GPL and both packages are pure JavaScript. Their installed transitive dependencies are represented in `package-lock.json`; this comparison records npm's published unpacked package size, not an application bundler result.

## Observed capabilities and limits

| Fixture | Flatten.js | Maker.js | Acceptance |
| --- | --- | --- | --- |
| Concave polygon | Native polygon and area | Closed line model; area reconstructed by runner | Area relative error below 0.1% |
| Hole | Native polygon with inner face | Multiple line contours only; no native filled-hole area | Flatten area accepted; Maker limitation recorded |
| Cut | Segment-edge intersections | `path.intersection` | Two crossings each |
| Boolean union | Native polygon union | `combineUnion` over closed line models | Area relative error below 0.1% |
| Offset/margin | No native offset API in core 1.6.14 | `model.outline` | Maker outline has no unexpected line crossings |

The runner writes SVG diagnostics on each execution and exits non-zero if its supported-operation invariants fail. Latency is printed at runtime because it is machine-dependent; no external service or credential is used.

## Follow-up boundary

Do not integrate either library from this spike. A future task may benchmark Flatten.js against the product's tolerance, curves, seam allowances, and export needs. Maker.js is rejected for semantic polygon/hole ownership, not for its drawing, export, or outline APIs.
