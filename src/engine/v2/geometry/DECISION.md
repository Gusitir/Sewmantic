# DECISION — T-46 offset strategy gate

- Task: `[T-46] GeometryAdapter & Offset Gate`
- Plan: `PLAN_v1.1-semantic-kernel-mvp.md` (`P11-GEO-01`)
- Pinned geometry dependency: `@flatten-js/core@1.6.14` (exact, already in package.json)
- Date: 2026-08-24
- Outcome: **one strategy selected** — the own minimal miter offset. `@flatten-js/polygon-offset` is rejected.
- Assurance: deterministic gates + literal command evidence.

## Mandatory fixtures (from the brief)

Offset compared at **3 / 10 / 25 mm** across **convex**, **concave** and **curved**
loops; the selected strategy must yield **no self-intersections** and produce a
**deterministic result across two runs**.

## Strategy A — `@flatten-js/polygon-offset@1.1.4` (REJECTED)

- Version: `1.1.4`; License: **MIT**; adoption documented `@flatten-js/core` peer `^1.4.2`.
- Candidate produced **no** usable output under `@flatten-js/core@1.6.14`, so it cannot
  satisfy the mandatory fixtures. Reproduced failure (literal):

```
$ node --input-type=module -e "import Flatten from '@flatten-js/core'; import offset from '@flatten-js/polygon-offset'; ... offset(p,10);"
TypeError: edge.isSegment is not a function
    at offset (.../node_modules/@flatten-js/polygon-offset/dist/main.cjs.js:88:22)
```

Root cause: core 1.6.x re-exposes `Edge.isSegment` as a **getter**
(`get isSegment()`), while every published polygon-offset version (1.0.0–1.1.4,
peer `core ^1.4.2`) calls `edge.isSegment()` as a **method**. Downgrading the core
object is out of scope and would destabilize the existing production engine, so the
package is rejected on dependency/functionality grounds and **removed** from
`package.json` / `package-lock.json`.

## Strategy B — own capsular round-join via `Flatten.BooleanOperations.unify` (REJECTED)

An internal capsule+boolean union was probed to obtain round joins. The core 1.6.14
boolean union is numerically unstable for this construction because each edge
capsule's inner edge coincides with the polygon boundary (adjacent-edge handling
drops the original polygon interior). Measured (100x100 square, outward):

- `d=3` → area **~1824** mm2 (expected ~11228)
- `d=10` → area **~6270** mm2 (expected ~14314)
- `d=25` → area **~16693** mm2 (expected ~21963)

and a concave fixture even shrank at small distances — non-monotonic, not
production-safe. Rejected; no round-join strategy is therefore available under
core 1.6.14.

## Strategy C — own minimal miter offset `ownRawOffsetPoints` (SELECTED)

Deterministic, boolean-free, pure point math (translate each edge outward and
intersect consecutive offset lines). No Flatten internals, no third-party code.
Measured across the mandatory fixtures (self-intersection boolean via
`pointLoopSelfIntersects`; `deterministic` = two runs byte-identical):

| fixture | base simple | d=3 simple | d=10 simple | d=25 simple | deterministic |
|---|---|---|---|---|---|
| convex square 100x100 | yes | yes | yes | yes | identical |
| concave L (area 700) | yes | yes | yes | yes | identical |
| curve (48-gon, r=15) | yes | yes | yes | yes | identical |

Area grows monotonically with distance on every fixture. The result is a polygon
whose curves are all `line` (miter joins), self-contained, with valid winding.

Documented caveat: miter joins can create long spikes at very acute corners (no
miter-limit backoff yet). This is outside the mandatory gate fixtures and is a
future `miter-limit` enhancement, not a block on selection.

## Decision

- **Selected:** own minimal **miter** offset (Strategy C) via `ownRawOffsetPoints`,
  exposed on `GeometryAdapter.offset`.
- **Rejected:** `@flatten-js/polygon-offset@1.1.4` (runtime throw under core 1.6.14)
  and the own capsular round-join boolean union (numeric instability).
- The public API exposes exactly one join value: `OffsetJoin = 'miter'`.
  `round` and `bevel` are absent; unsupported runtime values are rejected with a
  clear error and are never silently accepted or substituted.
- No new dependency is added or kept; `@flatten-js/core@1.6.14` remains the sole
  exact geometry dependency.

## Evidence sources

- Node stdout for the polygon-offset throw (`edge.isSegment is not a function`).
- Node stdout for boolean-union area measurements (non-monotonic).
- Node stdout for the fixture self-intersection / determinism table above.
- Gate outputs: `npx vitest run tests/semantic_geometry_v2.test.ts`, `npm run
  experiment:geometry`, `npm run build`, `npm test` (see Audit Capsule).
