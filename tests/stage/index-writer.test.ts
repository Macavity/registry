import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PluginManifest } from '@grove/manifest-schema';
import {
  stringifyIndex,
  substantivelyEqual,
  writeIndex,
} from '../../actions/stage/index-writer';
import { SCHEMA_VERSION, type IndexFile, type RegistryEntry } from '../../actions/stage/types';

function entry(id: string, repository: string): RegistryEntry<PluginManifest> {
  return {
    repository,
    releaseTag: 'v1.0.0',
    downloadUrl: `https://github.com/${repository}/releases/download/v1.0.0/package.zip`,
    publishedAt: '2026-01-01T00:00:00.000Z',
    stars: 42,
    addedAt: '2026-01-01T00:00:00.000Z',
    id,
    name: { default: id },
    description: { default: `the ${id} plugin` },
    version: '1.0.0',
    author: 'tester',
    minGroveVersion: '1.0.0',
    license: 'MIT',
    entry: 'dist/main.js',
    frontends: ['desktop'],
  };
}

describe('stringifyIndex', () => {
  test('sorts entries by id', () => {
    const idx: IndexFile<PluginManifest> = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      manifestSchemaVersion: '0.1.0',
      count: 2,
      entries: [entry('zeta', 'a/z'), entry('alpha', 'a/a')],
    };
    const out = stringifyIndex(idx);
    const ids = [...out.matchAll(/"id":\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(['alpha', 'zeta']);
  });

  test('wrapper keys come first in canonical order', () => {
    const idx: IndexFile<PluginManifest> = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      manifestSchemaVersion: '0.1.0',
      count: 0,
      entries: [],
    };
    const out = stringifyIndex(idx);
    const expected = [
      '"schemaVersion"',
      '"generatedAt"',
      '"manifestSchemaVersion"',
      '"count"',
      '"entries"',
    ];
    let cursor = 0;
    for (const key of expected) {
      const pos = out.indexOf(key, cursor);
      expect(pos).toBeGreaterThanOrEqual(0);
      cursor = pos + key.length;
    }
  });

  test('registry-derived keys come before manifest keys per entry', () => {
    const idx: IndexFile<PluginManifest> = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      manifestSchemaVersion: '0.1.0',
      count: 1,
      entries: [entry('alpha', 'a/a')],
    };
    const out = stringifyIndex(idx);
    expect(out.indexOf('"repository"')).toBeLessThan(out.indexOf('"id"'));
    expect(out.indexOf('"id"')).toBeLessThan(out.indexOf('"name"'));
    expect(out.indexOf('"license"')).toBeLessThan(out.indexOf('"entry"'));
  });

  test('byte-identical output across runs for the same input', () => {
    const idx: IndexFile<PluginManifest> = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      manifestSchemaVersion: '0.1.0',
      count: 2,
      entries: [entry('beta', 'a/b'), entry('alpha', 'a/a')],
    };
    expect(stringifyIndex(idx)).toBe(stringifyIndex(idx));
  });

  test('ends with a trailing newline', () => {
    const idx: IndexFile<PluginManifest> = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      manifestSchemaVersion: '0.1.0',
      count: 0,
      entries: [],
    };
    expect(stringifyIndex(idx).endsWith('\n')).toBe(true);
  });
});

describe('substantivelyEqual', () => {
  const base: IndexFile<PluginManifest> = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: '2026-01-01T00:00:00.000Z',
    manifestSchemaVersion: '0.1.0',
    count: 1,
    entries: [entry('alpha', 'a/a')],
  };

  test('returns true when only generatedAt differs', () => {
    const newer = { ...base, generatedAt: '2026-12-31T23:59:59.000Z' };
    expect(substantivelyEqual(base, newer)).toBe(true);
  });

  test('returns false when entries differ', () => {
    const changed = { ...base, entries: [entry('beta', 'a/b')], count: 1 };
    expect(substantivelyEqual(base, changed)).toBe(false);
  });

  test('returns false when stars change on an existing entry', () => {
    const e = entry('alpha', 'a/a');
    const bumped: IndexFile<PluginManifest> = { ...base, entries: [{ ...e, stars: 99 }] };
    expect(substantivelyEqual(base, bumped)).toBe(false);
  });

  test('returns false when manifestSchemaVersion bumps', () => {
    const bumped = { ...base, manifestSchemaVersion: '0.2.0' };
    expect(substantivelyEqual(base, bumped)).toBe(false);
  });
});

describe('writeIndex', () => {
  let workDir: string;
  let originalCwd: string;
  beforeEach(() => {
    originalCwd = process.cwd();
    workDir = mkdtempSync(join(tmpdir(), 'write-index-'));
    process.chdir(workDir);
  });
  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(workDir, { recursive: true, force: true });
  });

  test('preserves generatedAt when nothing substantive changed', async () => {
    const first: IndexFile<PluginManifest> = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      manifestSchemaVersion: '0.1.0',
      count: 1,
      entries: [entry('alpha', 'a/a')],
    };
    await writeIndex('plugins', first);
    const firstBytes = readFileSync('plugins.json', 'utf8');

    // Second run with a fresh generatedAt but identical content.
    const second: IndexFile<PluginManifest> = { ...first, generatedAt: '2026-06-01T12:00:00.000Z' };
    await writeIndex('plugins', second);
    const secondBytes = readFileSync('plugins.json', 'utf8');

    expect(secondBytes).toBe(firstBytes);
  });

  test('updates generatedAt when entries change', async () => {
    const first: IndexFile<PluginManifest> = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      manifestSchemaVersion: '0.1.0',
      count: 1,
      entries: [entry('alpha', 'a/a')],
    };
    await writeIndex('plugins', first);

    const second: IndexFile<PluginManifest> = {
      ...first,
      generatedAt: '2026-06-01T12:00:00.000Z',
      count: 2,
      entries: [entry('alpha', 'a/a'), entry('beta', 'a/b')],
    };
    await writeIndex('plugins', second);
    const text = readFileSync('plugins.json', 'utf8');
    expect(text).toContain('2026-06-01T12:00:00.000Z');
  });
});
