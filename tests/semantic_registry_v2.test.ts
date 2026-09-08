// T-51 capability registry core tests for the semantic pattern kernel (v2).
//
// Gates covered:
//   - validated registration: id namespace `kernel.`, semver, status, Zod
//     params schema, callable operator, non-empty description;
//   - duplicate id+version rejection (DUPLICATE_ENTRY);
//   - deterministic lookup: highest semver wins without explicit version,
//     CAPABILITY_GAP for unknown ids/versions;
//   - promotion gates: draft->experimental and experimental->stable only,
//     human approval required for stable, promotion registers a NEW entry
//     with a patch-bumped version (no in-place mutation);
//   - immutability: frozen fresh copies on every read, registry state
//     unaffected by mutation attempts on returned entries;
//   - status-filtered, id-sorted listings.

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  CapabilityRegistry,
  CapabilityRegistryError,
  SEMANTIC_V2_SCHEMA_VERSION,
  createCapabilityRegistry,
  type CapabilityEntry,
  type PatternDocument,
} from '../src/engine/v2/index.js';

type DepthParams = { depthMm: number };
type DepthEntry = CapabilityEntry<DepthParams>;

const DEPTH_DESCRIPTION = 'test capability for registry gates';
const APPROVER = 'Humano (Usuario)';

function buildEntry(overrides: Partial<DepthEntry> = {}): DepthEntry {
  return {
    id: 'kernel.pocket',
    version: '0.1.0',
    status: 'draft',
    paramsSchema: z.object({ depthMm: z.number().min(0).max(200) }),
    operator: (doc, params) => doc,
    description: DEPTH_DESCRIPTION,
    ...overrides,
  };
}

/** Entry with deliberately broken fields (simulates untyped JS callers). */
function brokenEntry(overrides: Record<string, unknown>): DepthEntry {
  return { ...buildEntry(), ...overrides } as unknown as DepthEntry;
}

function dummyDoc(): PatternDocument {
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

function captureRegistryError(action: () => unknown): CapabilityRegistryError {
  try {
    action();
  } catch (err) {
    expect(err).toBeInstanceOf(CapabilityRegistryError);
    return err as CapabilityRegistryError;
  }
  throw new Error('expected CapabilityRegistryError, nothing was thrown');
}

describe('CapabilityRegistry (T-51)', () => {
  describe('registerCapability', () => {
    it('registers a valid capability and returns a frozen typed entry', () => {
      const registry = new CapabilityRegistry();
      const registered = registry.registerCapability(buildEntry());

      expect(registered.id).toBe('kernel.pocket');
      expect(registered.version).toBe('0.1.0');
      expect(registered.status).toBe('draft');
      expect(registered.description).toBe(DEPTH_DESCRIPTION);
      expect(Object.isFrozen(registered)).toBe(true);

      const parsed: DepthParams = registered.paramsSchema.parse({ depthMm: 50 });
      expect(parsed.depthMm).toBe(50);

      const doc = dummyDoc();
      expect(registered.operator(doc, { depthMm: 10 })).toBe(doc);

      expect(registry.getCapability('kernel.pocket').version).toBe('0.1.0');
    });

    it('rejects an id without the kernel.<name> namespace', () => {
      const registry = new CapabilityRegistry();
      for (const badId of ['pocket-flap', 'kernel.Upper', 'kernel.', 'kernelx-foo']) {
        const err = captureRegistryError(() => registry.registerCapability(buildEntry({ id: badId })));
        expect(err.code).toBe('INVALID_ENTRY');
        expect(err.id).toBe(badId);
      }
    });

    it('rejects an invalid semver version', () => {
      const registry = new CapabilityRegistry();
      for (const badVersion of ['1.0', 'v1.0.0', '1.0.0-rc.1', '']) {
        const err = captureRegistryError(() =>
          registry.registerCapability(buildEntry({ version: badVersion })),
        );
        expect(err.code).toBe('INVALID_ENTRY');
        expect(err.version).toBe(badVersion);
      }
    });

    it('rejects an unknown status', () => {
      const registry = new CapabilityRegistry();
      const err = captureRegistryError(() => registry.registerCapability(brokenEntry({ status: 'ga' })));
      expect(err.code).toBe('INVALID_ENTRY');
      expect(err.id).toBe('kernel.pocket');
      expect(err.version).toBe('0.1.0');
    });

    it('rejects a missing params schema', () => {
      const registry = new CapabilityRegistry();
      const err = captureRegistryError(() =>
        registry.registerCapability(brokenEntry({ paramsSchema: undefined })),
      );
      expect(err.code).toBe('INVALID_ENTRY');
      expect(err.name).toBe('CapabilityRegistryError');
    });

    it('rejects a missing operator', () => {
      const registry = new CapabilityRegistry();
      const err = captureRegistryError(() =>
        registry.registerCapability(brokenEntry({ operator: undefined })),
      );
      expect(err.code).toBe('INVALID_ENTRY');
    });

    it('rejects an empty description', () => {
      const registry = new CapabilityRegistry();
      for (const badDescription of ['', '   ']) {
        const err = captureRegistryError(() =>
          registry.registerCapability(brokenEntry({ description: badDescription })),
        );
        expect(err.code).toBe('INVALID_ENTRY');
      }
    });

    it('rejects duplicate id+version and accepts the same id at a new version', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry());

      const err = captureRegistryError(() => registry.registerCapability(buildEntry()));
      expect(err.code).toBe('DUPLICATE_ENTRY');
      expect(err.id).toBe('kernel.pocket');
      expect(err.version).toBe('0.1.0');

      registry.registerCapability(buildEntry({ version: '0.2.0' }));
      expect(registry.getCapability('kernel.pocket', '0.2.0').version).toBe('0.2.0');
    });
  });

  describe('getCapability', () => {
    it('returns the highest semver when no version is given (numeric, not lexicographic)', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ id: 'kernel.a', version: '0.9.0' }));
      registry.registerCapability(buildEntry({ id: 'kernel.a', version: '0.10.0' }));
      expect(registry.getCapability('kernel.a').version).toBe('0.10.0');

      registry.registerCapability(buildEntry({ id: 'kernel.a', version: '1.0.0' }));
      expect(registry.getCapability('kernel.a').version).toBe('1.0.0');
    });

    it('raises CAPABILITY_GAP for an unknown id', () => {
      const registry = new CapabilityRegistry();
      const err = captureRegistryError(() => registry.getCapability('kernel.ghost'));
      expect(err.code).toBe('CAPABILITY_GAP');
      expect(err.id).toBe('kernel.ghost');
      expect(err.version).toBeUndefined();
    });

    it('raises CAPABILITY_GAP for an unknown version of a known id', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry());
      const err = captureRegistryError(() => registry.getCapability('kernel.pocket', '9.9.9'));
      expect(err.code).toBe('CAPABILITY_GAP');
      expect(err.id).toBe('kernel.pocket');
      expect(err.version).toBe('9.9.9');
    });
  });

  describe('promoteCapability', () => {
    it('promotes draft to experimental with a patch version bump, keeping the old entry', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ id: 'kernel.dart', version: '1.2.3', status: 'draft' }));

      const promoted = registry.promoteCapability('kernel.dart', 'draft', 'experimental');

      expect(promoted.id).toBe('kernel.dart');
      expect(promoted.version).toBe('1.2.4');
      expect(promoted.status).toBe('experimental');
      expect(Object.isFrozen(promoted)).toBe(true);

      expect(registry.getCapability('kernel.dart', '1.2.3').status).toBe('draft');
      expect(registry.getCapability('kernel.dart').version).toBe('1.2.4');
    });

    it('requires a non-empty approvedBy to reach stable (APPROVAL_REQUIRED)', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ status: 'experimental' }));

      const missing = captureRegistryError(() =>
        registry.promoteCapability('kernel.pocket', 'experimental', 'stable'),
      );
      expect(missing.code).toBe('APPROVAL_REQUIRED');
      expect(missing.id).toBe('kernel.pocket');

      const blank = captureRegistryError(() =>
        registry.promoteCapability('kernel.pocket', 'experimental', 'stable', { approvedBy: '   ' }),
      );
      expect(blank.code).toBe('APPROVAL_REQUIRED');

      expect(registry.getCapability('kernel.pocket').status).toBe('experimental');
    });

    it('promotes experimental to stable with recorded approval', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ status: 'experimental' }));

      const promoted = registry.promoteCapability('kernel.pocket', 'experimental', 'stable', {
        approvedBy: APPROVER,
      });

      expect(promoted.status).toBe('stable');
      expect(promoted.version).toBe('0.1.1');
      expect(registry.getCapability('kernel.pocket').status).toBe('stable');
      expect(registry.getCapability('kernel.pocket', '0.1.0').status).toBe('experimental');
    });

    it('rejects invalid transitions (draft->stable, stable->experimental, draft->draft)', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ id: 'kernel.a', status: 'draft' }));
      registry.registerCapability(buildEntry({ id: 'kernel.b', status: 'experimental' }));
      registry.promoteCapability('kernel.b', 'experimental', 'stable', { approvedBy: APPROVER });

      const draftToStable = captureRegistryError(() =>
        registry.promoteCapability('kernel.a', 'draft', 'stable'),
      );
      expect(draftToStable.code).toBe('INVALID_TRANSITION');

      const stableToExperimental = captureRegistryError(() =>
        registry.promoteCapability('kernel.b', 'stable', 'experimental'),
      );
      expect(stableToExperimental.code).toBe('INVALID_TRANSITION');

      const draftToDraft = captureRegistryError(() =>
        registry.promoteCapability('kernel.a', 'draft', 'draft'),
      );
      expect(draftToDraft.code).toBe('INVALID_TRANSITION');
    });

    it('rejects a promotion whose from status does not match the current status', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ status: 'draft' }));

      const err = captureRegistryError(() =>
        registry.promoteCapability('kernel.pocket', 'experimental', 'stable', { approvedBy: APPROVER }),
      );
      expect(err.code).toBe('INVALID_TRANSITION');
    });

    it('raises CAPABILITY_GAP when promoting an unknown id', () => {
      const registry = new CapabilityRegistry();
      const err = captureRegistryError(() =>
        registry.promoteCapability('kernel.ghost', 'draft', 'experimental'),
      );
      expect(err.code).toBe('CAPABILITY_GAP');
      expect(err.id).toBe('kernel.ghost');
    });

    it('targets the highest version: a stale from status is an INVALID_TRANSITION', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ version: '1.0.0', status: 'draft' }));
      registry.registerCapability(buildEntry({ version: '1.0.1', status: 'experimental' }));

      const err = captureRegistryError(() =>
        registry.promoteCapability('kernel.pocket', 'draft', 'experimental'),
      );
      expect(err.code).toBe('INVALID_TRANSITION');
      expect(err.version).toBe('1.0.1');
      expect(registry.getCapability('kernel.pocket', '1.0.0').status).toBe('draft');
      expect(registry.getCapability('kernel.pocket', '1.0.1').status).toBe('experimental');
    });
  });

  describe('immutability', () => {
    it('returns frozen copies; mutating a returned entry does not affect the registry', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry());

      const view = registry.getCapability('kernel.pocket');
      expect(Object.isFrozen(view)).toBe(true);
      try {
        (view as { description: string }).description = 'mutated';
      } catch {
        // frozen objects throw on assignment in strict mode
      }

      expect(registry.getCapability('kernel.pocket').description).toBe(DEPTH_DESCRIPTION);
      const snapshot = registry.snapshotEntries();
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].description).toBe(DEPTH_DESCRIPTION);
    });

    it('returns a fresh frozen copy on every access', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry());

      const first = registry.getCapability('kernel.pocket');
      const second = registry.getCapability('kernel.pocket');
      expect(first).not.toBe(second);
      expect(first).toEqual(second);
      expect(Object.isFrozen(second)).toBe(true);
    });

    it('snapshotEntries returns a frozen, id-sorted inventory of every version', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ id: 'kernel.c', version: '0.1.0' }));
      registry.registerCapability(buildEntry({ id: 'kernel.a', version: '0.2.0' }));
      registry.registerCapability(buildEntry({ id: 'kernel.a', version: '0.1.0' }));
      registry.registerCapability(buildEntry({ id: 'kernel.b', version: '1.0.0' }));

      const snapshot = registry.snapshotEntries();
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(snapshot.map((entry) => `${entry.id}@${entry.version}`)).toEqual([
        'kernel.a@0.1.0',
        'kernel.a@0.2.0',
        'kernel.b@1.0.0',
        'kernel.c@0.1.0',
      ]);
    });
  });

  describe('listCapabilities', () => {
    it('lists every entry sorted by id, immutable', () => {
      const registry = createCapabilityRegistry();
      registry.registerCapability(buildEntry({ id: 'kernel.z', version: '0.1.0' }));
      registry.registerCapability(buildEntry({ id: 'kernel.a', version: '0.1.0' }));

      const all = registry.listCapabilities();
      expect(all.map((entry) => entry.id)).toEqual(['kernel.a', 'kernel.z']);
      expect(Object.isFrozen(all)).toBe(true);
    });

    it('filters by status', () => {
      const registry = new CapabilityRegistry();
      registry.registerCapability(buildEntry({ id: 'kernel.draft-a', status: 'draft' }));
      registry.registerCapability(buildEntry({ id: 'kernel.exp-b', status: 'experimental' }));
      registry.registerCapability(buildEntry({ id: 'kernel.stable-c', status: 'stable' }));

      const drafts = registry.listCapabilities({ status: 'draft' });
      expect(drafts.map((entry) => entry.id)).toEqual(['kernel.draft-a']);
      expect(drafts.every((entry) => entry.status === 'draft')).toBe(true);

      expect(registry.listCapabilities({ status: 'experimental' }).map((entry) => entry.id)).toEqual([
        'kernel.exp-b',
      ]);
      expect(registry.listCapabilities({ status: 'stable' }).map((entry) => entry.id)).toEqual([
        'kernel.stable-c',
      ]);
      expect(registry.listCapabilities()).toHaveLength(3);
    });
  });
});
