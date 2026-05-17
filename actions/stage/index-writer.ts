import { readFile, writeFile } from 'node:fs/promises';
import type { AnyManifest, IndexFile, RegistryEntry, ResourceType } from './types';
import { SCHEMA_VERSION } from './types';

const WRAPPER_KEY_ORDER = [
  'schemaVersion',
  'generatedAt',
  'manifestSchemaVersion',
  'count',
  'entries',
] as const;

const ENTRY_REGISTRY_KEYS = [
  'repository',
  'releaseTag',
  'downloadUrl',
  'publishedAt',
  'stars',
  'addedAt',
] as const;

const ENTRY_COMMON_KEYS = [
  '$schema',
  'id',
  'name',
  'description',
  'version',
  'author',
  'authorUrl',
  'minGroveVersion',
  'license',
  'keywords',
  'readme',
] as const;

/**
 * Reorder an object so its keys come out in the canonical order. Bun/V8
 * preserves insertion order in `JSON.stringify`, so we just build a new object
 * literal in the right order and stringify it.
 */
function orderEntry<M extends AnyManifest>(entry: RegistryEntry<M>): Record<string, unknown> {
  const src = entry as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of ENTRY_REGISTRY_KEYS) {
    if (k in src) out[k] = src[k];
  }
  for (const k of ENTRY_COMMON_KEYS) {
    if (k in src) out[k] = src[k];
  }
  // Any extra type-specific fields (entry, frontends, modes, iconEntry, …) — preserved in
  // their natural insertion order, which for parsed valibot objects is schema-declaration order.
  for (const k of Object.keys(src)) {
    if (
      !(ENTRY_REGISTRY_KEYS as readonly string[]).includes(k) &&
      !(ENTRY_COMMON_KEYS as readonly string[]).includes(k)
    ) {
      out[k] = src[k];
    }
  }
  return out;
}

function orderIndex<M extends AnyManifest>(idx: IndexFile<M>): Record<string, unknown> {
  const src = idx as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of WRAPPER_KEY_ORDER) {
    if (k === 'entries') {
      const sorted = [...idx.entries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      out[k] = sorted.map(orderEntry);
    } else {
      out[k] = src[k];
    }
  }
  return out;
}

export function stringifyIndex<M extends AnyManifest>(idx: IndexFile<M>): string {
  return JSON.stringify(orderIndex(idx), null, 2) + '\n';
}

export async function writeIndex<M extends AnyManifest>(
  type: ResourceType,
  idx: IndexFile<M>,
): Promise<void> {
  await writeFile(`${type}.json`, stringifyIndex(idx));
}

export async function readIndex<M extends AnyManifest>(type: ResourceType): Promise<IndexFile<M>> {
  const text = await readFile(`${type}.json`, 'utf8');
  return JSON.parse(text) as IndexFile<M>;
}

export function emptyIndex<M extends AnyManifest>(manifestSchemaVersion: string): IndexFile<M> {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    manifestSchemaVersion,
    count: 0,
    entries: [],
  };
}
