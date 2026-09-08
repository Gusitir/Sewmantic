// T-45 public surface for the semantic pattern kernel (v2).
// Single import site for domain contracts and versioned serialization.

export {
  SEMANTIC_V2_SCHEMA_VERSION,
  MM_TOLERANCE,
  isVertex,
  isLineCurve,
  isCircularArcCurve,
  isQuadraticBezierCurve,
  isCubicBezierCurve,
  isCurve,
  isEdge,
  isEdgeSequence,
  isPanel,
  isComponent,
  isInterface,
  isStitchSegment,
  isStitchPair,
  isConstraintDiagnostic,
  isPatternDocument,
  type Vertex,
  type Curve,
  type LineCurve,
  type CircularArcCurve,
  type QuadraticBezierCurve,
  type CubicBezierCurve,
  type EdgeRole,
  type Edge,
  type EdgeSequence,
  type Panel,
  type Component,
  type Interface,
  type StitchSegment,
  type StitchPair,
  type DiagnosticSeverity,
  type ConstraintDiagnostic,
  type PatternDocument,
} from './contracts.js';

export {
  SemanticV2Error,
  validatePatternDocument,
  serializeDocument,
  deserializeDocument,
} from './serialization.js';

export {
  DEFAULT_MAX_SEAM_DELTA_MM,
  CONSTRAINT_IDS,
  ConstraintResolutionError,
  resolveStitchPair,
  evaluateConstraints,
  type ConstraintOptions,
  type ConstraintFailureCode,
} from './constraints.js';

export {
  splitEdge,
  insertDart,
  cut,
  type SplitEdgeOptions,
  type InsertDartOptions,
  type CutOptions,
  type OperatorResult,
  type OperatorSuccess,
  type OperatorRejection,
  type OperatorRejectionCode,
} from './operators.js';

export {
  CapabilityRegistry,
  CapabilityRegistryError,
  createCapabilityRegistry,
  type CapabilityApproval,
  type CapabilityEntry,
  type CapabilityErrorCode,
  type CapabilityErrorMetadata,
  type CapabilityOperator,
  type CapabilityStatus,
} from './registry.js';

export {
  CapabilityDerivationError,
  CapabilityOperatorRejection,
  defineKernelCapability,
  generatePromptFragment,
  generateToolSchemas,
  registerBaseCapabilities,
  runCapability,
  type CapabilityToolSchema,
  type JsonSchemaNode,
  type KernelCapabilityDefinition,
  type KernelDocOperator,
} from './capabilities/index.js';

export {
  executeRecipe,
  type Recipe,
  type RecipeExecutionOptions,
  type RecipeRejection,
  type RecipeRejectionCode,
  type RecipeResult,
  type RecipeStep,
  type RecipeSuccess,
} from './recipes.js';

export {
  SHADOW_ADAPTER_FAILURE_ID,
  legacyPartsToSemanticDocument,
} from './adapters/legacy-shadow.js';

export {
  runSemanticShadow,
  type SemanticShadowResult,
} from './shadow.js';
