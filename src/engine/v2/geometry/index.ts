// T-46 public barrel for `geometry/`. Exposes the plain surface and the concrete
// adapter. Nothing Flatten.js-related is exported; consumers interact only via
// v2 contracts + the plain types in `types.ts`.

export {
  geometryAdapter,
  createAdapter,
} from './adapter.js';

export { ownRawOffsetPoints, rawOffsetSelfIntersects } from './offset.js';

export {
  pointLoopSelfIntersects,
  signedAreaOfPoints,
  dedupePoints,
  polylineIntersections,
} from './area.js';

export {
  DEFAULT_TOLERANCE_MM,
} from './sampler.js';

export type {
  GeometryAdapter,
  GeometryPoint,
  Winding,
  BooleanOp,
  OffsetJoin,
  LoopPolygon,
  PolygonResult,
  SampleOptions,
  IntersectOptions,
} from './types.js';
