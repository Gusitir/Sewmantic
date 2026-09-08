// T-51 capability registry core for the semantic pattern kernel (v2).
//
// Single source of truth where kernel capabilities are registered with a
// versioned id (`kernel.<name>`), a semver version, a maturity status and a
// Zod schema for their parameters. Later work derives prompt fragments, tool
// schemas and recipes from this registry; this module is the generic
// mechanism only.
//
// Guarantees:
//   - validated registration: id namespace, semver, status, Zod params
//     schema, callable operator and non-empty description are all gated with
//     typed errors; duplicate id+version pairs are rejected;
//   - deterministic lookup: without an explicit version the highest semver
//     wins; a missing capability raises `CAPABILITY_GAP`, never a fictitious
//     success;
//   - lifecycle gates: only `draft -> experimental` and
//     `experimental -> stable`; reaching `stable` requires a recorded human
//     approval (`approvedBy`);
//   - immutability: stored entries are frozen and every read returns a fresh
//     frozen copy; promotion never mutates an existing entry, it registers a
//     NEW entry with a patch-bumped version and the new status.

import { z } from 'zod';
import type { PatternDocument } from './contracts.js';

/** Maturity lifecycle of a kernel capability. */
export type CapabilityStatus = 'draft' | 'experimental' | 'stable';

/** Typed error codes raised by the capability registry. */
export type CapabilityErrorCode =
  | 'CAPABILITY_GAP'
  | 'DUPLICATE_ENTRY'
  | 'INVALID_ENTRY'
  | 'INVALID_TRANSITION'
  | 'APPROVAL_REQUIRED';

/** Identifying metadata attached to registry errors. */
export interface CapabilityErrorMetadata {
  readonly id?: string;
  readonly version?: string;
}

/** Error raised for every capability registry gate violation. */
export class CapabilityRegistryError extends Error {
  readonly code: CapabilityErrorCode;
  readonly id?: string;
  readonly version?: string;

  constructor(code: CapabilityErrorCode, message: string, metadata: CapabilityErrorMetadata = {}) {
    super(message);
    this.name = 'CapabilityRegistryError';
    this.code = code;
    this.id = metadata.id;
    this.version = metadata.version;
  }
}

/**
 * Pure capability operator bound to a document: `(doc, params) -> result`.
 * Kernel operators return `OperatorResult`; the registry core stays generic
 * over the result type so any pure `(doc, params) -> X` mapping fits.
 */
export type CapabilityOperator<TParams = unknown, TResult = unknown> = (
  doc: PatternDocument,
  params: TParams,
) => TResult;

/** Human approval recorded when a capability is promoted to `stable`. */
export interface CapabilityApproval {
  readonly approvedBy: string;
}

/**
 * Versioned capability entry, generic over the parameter type inferred from
 * `paramsSchema` and over the operator result type.
 */
export interface CapabilityEntry<TParams = unknown, TResult = unknown> {
  readonly id: string;
  readonly version: string;
  readonly status: CapabilityStatus;
  readonly paramsSchema: z.ZodType<TParams, z.ZodTypeDef, unknown>;
  readonly operator: CapabilityOperator<TParams, TResult>;
  readonly description: string;
}

/** Registry-internal erased view of a capability entry (never exported). */
interface StoredEntry {
  readonly id: string;
  readonly version: string;
  readonly status: CapabilityStatus;
  readonly paramsSchema: z.ZodTypeAny;
  readonly operator: (doc: PatternDocument, params: never) => unknown;
  readonly description: string;
}

const ID_PATTERN = /^kernel\.[a-z][a-z0-9-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const STATUSES: readonly CapabilityStatus[] = ['draft', 'experimental', 'stable'];
const ALLOWED_PROMOTIONS: readonly string[] = ['draft->experimental', 'experimental->stable'];

function stringifyValue(value: unknown): string {
  const json = JSON.stringify(value);
  return json === undefined ? String(value) : json;
}

function semverTuple(version: string): readonly [number, number, number] {
  const parts = version.split('.');
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

function compareVersions(left: string, right: string): number {
  const a = semverTuple(left);
  const b = semverTuple(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) {
      return a[i] < b[i] ? -1 : 1;
    }
  }
  return 0;
}

function bumpPatch(version: string): string {
  const [major, minor, patch] = semverTuple(version);
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Materialize a fresh frozen copy of a stored entry as a typed public view.
 * The operator cast re-tightens the erased parameter/return types; it is
 * safe because every stored entry passed the registration gates.
 */
function exposeEntry<TParams, TResult>(stored: StoredEntry): CapabilityEntry<TParams, TResult> {
  return Object.freeze({
    id: stored.id,
    version: stored.version,
    status: stored.status,
    paramsSchema: stored.paramsSchema,
    operator: stored.operator as CapabilityOperator<TParams, TResult>,
    description: stored.description,
  });
}

/**
 * Core of the Capability Registry: versioned registration, deterministic
 * lookup, status lifecycle with promotion gates and immutable snapshot
 * access. Registration order never affects observable results (all listings
 * are sorted; version lookups compare semver numerically).
 */
export class CapabilityRegistry {
  private readonly versionsById = new Map<string, StoredEntry[]>();

  /**
   * Validate and register a capability entry. Returns a frozen copy of the
   * stored entry. Raises INVALID_ENTRY for structural violations and
   * DUPLICATE_ENTRY when id+version already exist.
   */
  registerCapability<TParams, TResult>(
    entry: CapabilityEntry<TParams, TResult>,
  ): CapabilityEntry<TParams, TResult> {
    if (typeof entry !== 'object' || entry === null) {
      throw new CapabilityRegistryError('INVALID_ENTRY', 'capability entry must be an object');
    }
    const id = entry.id;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      throw new CapabilityRegistryError(
        'INVALID_ENTRY',
        `capability id must match ^kernel\\.[a-z][a-z0-9-]*$, received: ${stringifyValue(id)}`,
        { id: typeof id === 'string' ? id : undefined },
      );
    }
    const version = entry.version;
    if (typeof version !== 'string' || !VERSION_PATTERN.test(version)) {
      throw new CapabilityRegistryError(
        'INVALID_ENTRY',
        `capability version must be MAJOR.MINOR.PATCH, received: ${stringifyValue(version)}`,
        { id, version: typeof version === 'string' ? version : undefined },
      );
    }
    const status = entry.status;
    if (!(STATUSES as readonly unknown[]).includes(status)) {
      throw new CapabilityRegistryError(
        'INVALID_ENTRY',
        `capability status must be one of ${STATUSES.join('|')}, received: ${stringifyValue(status)}`,
        { id, version },
      );
    }
    if (!(entry.paramsSchema instanceof z.ZodType)) {
      throw new CapabilityRegistryError(
        'INVALID_ENTRY',
        'capability paramsSchema must be a Zod schema instance',
        { id, version },
      );
    }
    if (typeof entry.operator !== 'function') {
      throw new CapabilityRegistryError(
        'INVALID_ENTRY',
        'capability operator must be callable',
        { id, version },
      );
    }
    const description = entry.description;
    if (typeof description !== 'string' || description.trim().length === 0) {
      throw new CapabilityRegistryError(
        'INVALID_ENTRY',
        'capability description must be a non-empty string',
        { id, version },
      );
    }
    const stored: StoredEntry = Object.freeze({
      id,
      version,
      status,
      paramsSchema: entry.paramsSchema,
      operator: entry.operator,
      description,
    });
    this.insert(stored);
    return exposeEntry<TParams, TResult>(stored);
  }

  /**
   * Resolve a capability. Without `version`, the highest semver wins;
   * with `version`, an exact match is required. Missing capabilities raise
   * CAPABILITY_GAP carrying the requested id (and version when given).
   */
  getCapability<TParams = unknown, TResult = unknown>(
    id: string,
    version?: string,
  ): CapabilityEntry<TParams, TResult> {
    return exposeEntry<TParams, TResult>(this.resolveEntry(id, version));
  }

  /** Immutable, id-sorted listing, optionally filtered by status. */
  listCapabilities(filter?: { status?: CapabilityStatus }): readonly CapabilityEntry<unknown, unknown>[] {
    const status = filter?.status;
    const matching = this.allEntriesSorted().filter(
      (entry) => status === undefined || entry.status === status,
    );
    return Object.freeze(matching.map((entry) => exposeEntry<unknown, unknown>(entry)));
  }

  /**
   * Promote a capability through the lifecycle. Only `draft ->
   * experimental` and `experimental -> stable` are allowed; `stable` demands
   * a recorded human approval. The existing entry is never mutated: a NEW
   * entry with a patch-bumped version and the new status is registered.
   */
  promoteCapability(
    id: string,
    from: CapabilityStatus,
    to: CapabilityStatus,
    approval?: CapabilityApproval,
  ): CapabilityEntry<unknown, unknown> {
    const transition = `${from}->${to}`;
    if (!ALLOWED_PROMOTIONS.includes(transition)) {
      throw new CapabilityRegistryError(
        'INVALID_TRANSITION',
        `capability status transition ${transition} is not allowed; allowed: ${ALLOWED_PROMOTIONS.join(', ')}`,
        { id },
      );
    }
    const current = this.resolveEntry(id);
    if (current.status !== from) {
      throw new CapabilityRegistryError(
        'INVALID_TRANSITION',
        `capability ${id}@${current.version} is in status ${current.status}, expected ${from}`,
        { id, version: current.version },
      );
    }
    if (to === 'stable') {
      const approvedBy = approval?.approvedBy;
      if (typeof approvedBy !== 'string' || approvedBy.trim().length === 0) {
        throw new CapabilityRegistryError(
          'APPROVAL_REQUIRED',
          `promoting capability ${id}@${current.version} to stable requires a recorded human approval (approvedBy)`,
          { id, version: current.version },
        );
      }
    }
    const promoted: StoredEntry = Object.freeze({
      ...current,
      version: bumpPatch(current.version),
      status: to,
    });
    this.insert(promoted);
    return exposeEntry<unknown, unknown>(promoted);
  }

  /** Immutable, id-sorted inventory of every registered entry version. */
  snapshotEntries(): readonly CapabilityEntry<unknown, unknown>[] {
    return Object.freeze(this.allEntriesSorted().map((entry) => exposeEntry<unknown, unknown>(entry)));
  }

  /** Insert a frozen entry, keeping per-id versions sorted ascending. */
  private insert(stored: StoredEntry): void {
    const versions = this.versionsById.get(stored.id);
    if (versions === undefined) {
      this.versionsById.set(stored.id, [stored]);
      return;
    }
    for (const existing of versions) {
      if (existing.version === stored.version) {
        throw new CapabilityRegistryError(
          'DUPLICATE_ENTRY',
          `capability ${stored.id}@${stored.version} is already registered`,
          { id: stored.id, version: stored.version },
        );
      }
    }
    versions.push(stored);
    versions.sort((left, right) => compareVersions(left.version, right.version));
  }

  private resolveEntry(id: string, version?: string): StoredEntry {
    const versions = this.versionsById.get(id);
    if (versions === undefined || versions.length === 0) {
      throw new CapabilityRegistryError(
        'CAPABILITY_GAP',
        version === undefined
          ? `no capability registered for id: ${id}`
          : `no capability registered for id: ${id} at version: ${version}`,
        { id, version },
      );
    }
    if (version === undefined) {
      return versions[versions.length - 1];
    }
    const found = versions.find((entry) => entry.version === version);
    if (found === undefined) {
      throw new CapabilityRegistryError(
        'CAPABILITY_GAP',
        `no capability registered for id: ${id} at version: ${version}`,
        { id, version },
      );
    }
    return found;
  }

  private allEntriesSorted(): StoredEntry[] {
    const all: StoredEntry[] = [];
    for (const versions of this.versionsById.values()) {
      for (const entry of versions) {
        all.push(entry);
      }
    }
    all.sort((left, right) => {
      if (left.id !== right.id) {
        return left.id < right.id ? -1 : 1;
      }
      return compareVersions(left.version, right.version);
    });
    return all;
  }
}

/** Factory form of the registry for composition-friendly call sites. */
export function createCapabilityRegistry(): CapabilityRegistry {
  return new CapabilityRegistry();
}
