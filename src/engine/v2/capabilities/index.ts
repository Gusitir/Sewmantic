// T-52 public surface of the capability SDK (operator SDK, base kernel
// capabilities and drift-free derivation). Single import site for consumers
// of the capability layer.

export {
  CapabilityOperatorRejection,
  defineKernelCapability,
  runCapability,
  type KernelCapabilityDefinition,
  type KernelDocOperator,
} from './operator-sdk.js';

export { registerBaseCapabilities } from './base.js';

export {
  CapabilityDerivationError,
  generatePromptFragment,
  generateToolSchemas,
  type CapabilityToolSchema,
  type JsonSchemaNode,
} from './derivation.js';
