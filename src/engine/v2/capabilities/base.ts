// T-52 base kernel capabilities registered in the capability registry (v2).
//
// The four T-47 kernel operations exposed as versioned capabilities:
//   - kernel.split-edge            atomic edge split (line / circularArc)
//   - kernel.insert-dart           closed dart on a line border edge
//   - kernel.cut                   open interval removal on a line border edge
//   - kernel.evaluate-constraints  read-only constraint evaluation
//
// Params schemas mirror the real operator parameters exactly (T-47
// `SplitEdgeOptions`, `InsertDartOptions`, `CutOptions`, `ConstraintOptions`
// and the embedded `SampleOptions`). The kernel operator remains the domain
// authority (edge existence, positive lengths, id collisions) and answers
// with typed rejections; the Zod schemas fix shape and required fields only.
// All base capabilities start `experimental`: they have full test coverage
// and never ship as `draft`.

import { z } from 'zod';
import { evaluateConstraints } from '../constraints.js';
import { cut, insertDart, splitEdge } from '../operators.js';
import type { CapabilityRegistry } from '../registry.js';
import { defineKernelCapability } from './operator-sdk.js';

const BASE_VERSION = '0.1.0';
const BASE_STATUS = 'experimental' as const;

const sampleOptionsSchema = z.object({
  toleranceMm: z.number().optional(),
  maxSegments: z.number().optional(),
});

const splitEdgeParamsSchema = z.object({
  edgeId: z.string().min(1),
  atMm: z.number().optional(),
  vertexId: z.string().optional(),
  edgeIdA: z.string().optional(),
  edgeIdB: z.string().optional(),
  maxSeamDeltaMm: z.number().optional(),
  sample: sampleOptionsSchema.optional(),
});

export type SplitEdgeParams = z.infer<typeof splitEdgeParamsSchema>;

const insertDartParamsSchema = z.object({
  edgeId: z.string().min(1),
  depthMm: z.number(),
  atMm: z.number().optional(),
  side: z.enum(['left', 'right']).optional(),
  pointVertexId: z.string().optional(),
  apexVertexId: z.string().optional(),
  legInEdgeId: z.string().optional(),
  legOutEdgeId: z.string().optional(),
  edgeIdA: z.string().optional(),
  edgeIdB: z.string().optional(),
  maxSeamDeltaMm: z.number().optional(),
  sample: sampleOptionsSchema.optional(),
});

export type InsertDartParams = z.infer<typeof insertDartParamsSchema>;

const cutParamsSchema = z.object({
  edgeId: z.string().min(1),
  lengthMm: z.number(),
  atMm: z.number().optional(),
  pointAId: z.string().optional(),
  pointBId: z.string().optional(),
  edgeIdA: z.string().optional(),
  edgeIdB: z.string().optional(),
  maxSeamDeltaMm: z.number().optional(),
  sample: sampleOptionsSchema.optional(),
});

export type CutParams = z.infer<typeof cutParamsSchema>;

const evaluateConstraintsParamsSchema = z.object({
  maxSeamDeltaMm: z.number().optional(),
  sample: sampleOptionsSchema.optional(),
});

export type EvaluateConstraintsParams = z.infer<typeof evaluateConstraintsParamsSchema>;

/**
 * Register the four base kernel capabilities on the given registry and
 * return it. Re-registering on a registry that already holds them raises
 * `DUPLICATE_ENTRY`.
 */
export function registerBaseCapabilities(registry: CapabilityRegistry): CapabilityRegistry {
  registry.registerCapability(
    defineKernelCapability<SplitEdgeParams>({
      id: 'kernel.split-edge',
      version: BASE_VERSION,
      status: BASE_STATUS,
      description:
        'Split one edge into two edges at an arc-length offset, replacing it in every referencing sequence.',
      paramsSchema: splitEdgeParamsSchema,
      operator: (doc, params) => splitEdge(doc, params.edgeId, params),
    }),
  );

  registry.registerCapability(
    defineKernelCapability<InsertDartParams>({
      id: 'kernel.insert-dart',
      version: BASE_VERSION,
      status: BASE_STATUS,
      description:
        'Insert a closed dart on a line border edge, adding exactly 2 * depthMm to every referencing sequence.',
      paramsSchema: insertDartParamsSchema,
      operator: (doc, params) => insertDart(doc, params),
    }),
  );

  registry.registerCapability(
    defineKernelCapability<CutParams>({
      id: 'kernel.cut',
      version: BASE_VERSION,
      status: BASE_STATUS,
      description:
        'Cut an open interval out of a line border edge, removing exactly lengthMm from every referencing sequence.',
      paramsSchema: cutParamsSchema,
      operator: (doc, params) => cut(doc, params),
    }),
  );

  registry.registerCapability<EvaluateConstraintsParams, ReturnType<typeof evaluateConstraints>>({
    id: 'kernel.evaluate-constraints',
    version: BASE_VERSION,
    status: BASE_STATUS,
    description:
      'Read-only evaluation of the typed constraint set over every interface; returns the constraint diagnostics without mutating the document.',
    paramsSchema: evaluateConstraintsParamsSchema,
    operator: (doc, params) => evaluateConstraints(doc, params),
  });

  return registry;
}
