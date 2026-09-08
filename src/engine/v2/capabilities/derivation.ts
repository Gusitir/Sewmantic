// T-52 drift-free derivation from the capability registry (v2).
//
// `generateToolSchemas` and `generatePromptFragment` are 100% derived from a
// `CapabilityRegistry`; they never hardcode capability ids. For an id with
// several registered versions only the highest semver is derived, and the
// listing is always sorted by id.
//
// The Zod-to-JSON-Schema serializer supports exactly the subset of Zod types
// used by registered capability params: object, number, string, boolean,
// array, enum and optional. Any other type raises a typed
// `CapabilityDerivationError` at generation time instead of silently
// emitting a wrong schema.

import { z } from 'zod';
import type { CapabilityRegistry, CapabilityStatus } from '../registry.js';

/** Typed error raised when a registered params schema cannot be derived. */
export class CapabilityDerivationError extends Error {
  /** Zod type name that has no supported JSON-Schema mapping. */
  readonly zodType: string;

  constructor(zodType: string) {
    super(
      `capability params schema uses a Zod type that cannot be derived to a tool schema: ${zodType}`,
    );
    this.name = 'CapabilityDerivationError';
    this.zodType = zodType;
  }
}

/** Minimal JSON-Schema-like node emitted by the derivation. */
export interface JsonSchemaNode {
  readonly type: 'object' | 'number' | 'integer' | 'string' | 'boolean' | 'array';
  readonly properties?: Readonly<Record<string, JsonSchemaNode>>;
  readonly required?: readonly string[];
  readonly items?: JsonSchemaNode;
  readonly enum?: readonly string[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
}

/** One tool-schema entry per capability (highest version per id, id-sorted). */
export interface CapabilityToolSchema {
  readonly id: string;
  readonly description: string;
  readonly status: CapabilityStatus;
  readonly params: JsonSchemaNode;
}

function zodTypeName(schema: z.ZodTypeAny): string {
  const typeName = (schema._def as { typeName?: unknown }).typeName;
  return typeof typeName === 'string' ? typeName : 'unknown';
}

function numberNode(schema: z.ZodNumber): JsonSchemaNode {
  const node: {
    type: 'number' | 'integer';
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
  } = { type: 'number' };
  for (const check of schema._def.checks) {
    if (check.kind === 'min') {
      if (check.inclusive) node.minimum = check.value;
      else node.exclusiveMinimum = check.value;
    } else if (check.kind === 'max') {
      if (check.inclusive) node.maximum = check.value;
      else node.exclusiveMaximum = check.value;
    } else if (check.kind === 'int') {
      node.type = 'integer';
    }
  }
  return node;
}

function toSchemaNode(schema: z.ZodTypeAny): JsonSchemaNode {
  if (schema instanceof z.ZodOptional) {
    return toSchemaNode(schema.unwrap());
  }
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  if (schema instanceof z.ZodNumber) {
    return numberNode(schema);
  }
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: [...schema._def.values] };
  }
  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: toSchemaNode(schema._def.type) };
  }
  if (schema instanceof z.ZodObject) {
    const properties: Record<string, JsonSchemaNode> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(schema.shape)) {
      const field = value as z.ZodTypeAny;
      properties[key] = toSchemaNode(field);
      if (!field.isOptional()) {
        required.push(key);
      }
    }
    return required.length > 0
      ? { type: 'object', properties, required }
      : { type: 'object', properties };
  }
  throw new CapabilityDerivationError(zodTypeName(schema));
}

/** Latest registered version per id, in id order. */
function latestEntriesById(registry: CapabilityRegistry): readonly {
  id: string;
  version: string;
  status: CapabilityStatus;
  paramsSchema: z.ZodTypeAny;
  description: string;
}[] {
  const ids = Array.from(new Set(registry.snapshotEntries().map((entry) => entry.id))).sort();
  return ids.map((id) => registry.getCapability(id));
}

/** Derive one JSON-Schema-like tool entry per capability from the registry. */
export function generateToolSchemas(registry: CapabilityRegistry): readonly CapabilityToolSchema[] {
  return latestEntriesById(registry).map((entry) => ({
    id: entry.id,
    description: entry.description,
    status: entry.status,
    params: toSchemaNode(entry.paramsSchema),
  }));
}

function describeNode(node: JsonSchemaNode): string {
  if (node.type === 'object') {
    const inner = Object.entries(node.properties ?? {})
      .map(([key, child]) => `${key}:${describeNode(child)}`)
      .join(', ');
    return inner.length > 0 ? `object{${inner}}` : 'object';
  }
  if (node.type === 'array') {
    return `array<${node.items ? describeNode(node.items) : 'unknown'}>`;
  }
  if (node.type === 'string' && node.enum) {
    return `enum<${node.enum.join('|')}>`;
  }
  return node.type;
}

/**
 * Derive a deterministic prompt fragment listing every capability (id,
 * version, status, description and parameters) in id order, for injection
 * into future operator prompts.
 */
export function generatePromptFragment(registry: CapabilityRegistry): string {
  const lines: string[] = ['kernel capabilities:'];
  for (const entry of latestEntriesById(registry)) {
    lines.push(`- ${entry.id} v${entry.version} [${entry.status}]: ${entry.description}`);
    const params = toSchemaNode(entry.paramsSchema);
    const parts = Object.entries(params.properties ?? {}).map(([key, child]) => {
      const required = (params.required ?? []).includes(key);
      return `${key}: ${describeNode(child)}${required ? '' : ' (optional)'}`;
    });
    lines.push(`  params: ${parts.length > 0 ? parts.join('; ') : '(none)'}`);
  }
  return lines.join('\n');
}
