import { describe, expect, test } from 'bun:test';
import {
  ruleHasGroveExtensionTopic,
  ruleIdNotReserved,
  ruleIdUnique,
  ruleLicenseAllowed,
  ruleManifestValid,
  ruleMinGroveVersion,
  ruleRepoExistsAndPublic,
  ruleVersionMatchesTag,
} from '../../actions/check/validators';
import type { ValidationContext } from '../../actions/check/validators';

function baseCtx(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    type: 'plugins',
    owner: 'example',
    repo: 'sample-kanban',
    releaseTag: 'v1.0.0',
    publishedAt: '2026-01-01T00:00:00.000Z',
    manifestText: '',
    manifest: {
      id: 'kanban',
      name: { default: 'Kanban' },
      description: { default: 'k' },
      version: '1.0.0',
      author: 'paneon',
      minGroveVersion: '1.0.0',
      license: 'MIT',
      entry: 'dist/main.js',
      frontends: ['desktop'],
    },
    topics: ['host-extension'],
    repoExists: true,
    allowedLicenses: new Set(['MIT', 'Apache-2.0']),
    reservedIds: new Set<string>(),
    existingIds: new Map(),
    latestGroveVersion: '1.0.0',
    ...overrides,
  };
}

describe('ruleRepoExistsAndPublic', () => {
  test('passes when repo exists and has a release', () => {
    const r = ruleRepoExistsAndPublic(baseCtx());
    expect(r.pass).toBe(true);
  });
  test('fails when repo missing', () => {
    const r = ruleRepoExistsAndPublic(baseCtx({ repoExists: false }));
    expect(r.pass).toBe(false);
  });
  test('fails when no release tag', () => {
    const r = ruleRepoExistsAndPublic(baseCtx({ releaseTag: undefined }));
    expect(r.pass).toBe(false);
  });
});

describe('ruleManifestValid', () => {
  test('passes a valid plugin manifest', () => {
    const r = ruleManifestValid(baseCtx());
    expect(r.pass).toBe(true);
  });
  test('fails when manifest missing required field', () => {
    const m = { ...baseCtx().manifest, id: undefined } as Record<string, unknown>;
    const r = ruleManifestValid(baseCtx({ manifest: m }));
    expect(r.pass).toBe(false);
    expect(r.message).toMatch(/id/);
  });
  test('fails when manifest is undefined', () => {
    const r = ruleManifestValid(baseCtx({ manifest: undefined }));
    expect(r.pass).toBe(false);
  });
});

describe('ruleIdUnique', () => {
  test('passes when id is free', () => {
    const r = ruleIdUnique(baseCtx());
    expect(r.pass).toBe(true);
  });
  test('passes when id maps back to the same repo (re-listing)', () => {
    const existing = new Map([
      ['kanban', { type: 'plugins' as const, repo: 'example/sample-kanban' }],
    ]);
    const r = ruleIdUnique(baseCtx({ existingIds: existing }));
    expect(r.pass).toBe(true);
  });
  test('fails when id collides with another repo (different type)', () => {
    const existing = new Map([['kanban', { type: 'themes' as const, repo: 'other/repo' }]]);
    const r = ruleIdUnique(baseCtx({ existingIds: existing }));
    expect(r.pass).toBe(false);
    expect(r.message).toContain('other/repo');
    expect(r.message).toContain('themes');
  });
});

describe('ruleIdNotReserved', () => {
  test('passes when id is not on the reserved list', () => {
    const r = ruleIdNotReserved(baseCtx());
    expect(r.pass).toBe(true);
  });
  test('fails when id is reserved', () => {
    const r = ruleIdNotReserved(baseCtx({ reservedIds: new Set(['kanban']) }));
    expect(r.pass).toBe(false);
  });
});

describe('ruleVersionMatchesTag', () => {
  test('passes when tag equals version', () => {
    const r = ruleVersionMatchesTag(baseCtx({ releaseTag: '1.0.0' }));
    expect(r.pass).toBe(true);
  });
  test('passes when tag has leading v', () => {
    const r = ruleVersionMatchesTag(baseCtx({ releaseTag: 'v1.0.0' }));
    expect(r.pass).toBe(true);
  });
  test('fails on mismatch', () => {
    const r = ruleVersionMatchesTag(baseCtx({ releaseTag: 'v2.0.0' }));
    expect(r.pass).toBe(false);
  });
});

describe('ruleLicenseAllowed', () => {
  test('passes for an allowed license', () => {
    const r = ruleLicenseAllowed(baseCtx());
    expect(r.pass).toBe(true);
  });
  test('fails for a disallowed license', () => {
    const m = { ...baseCtx().manifest, license: 'WTFPL' };
    const r = ruleLicenseAllowed(baseCtx({ manifest: m }));
    expect(r.pass).toBe(false);
  });
});

describe('ruleMinGroveVersion', () => {
  test('passes when min ≤ latest', () => {
    const r = ruleMinGroveVersion(baseCtx({ latestGroveVersion: '1.0.0' }));
    expect(r.pass).toBe(true);
  });
  test('fails when min > latest', () => {
    const m = { ...baseCtx().manifest, minGroveVersion: '2.0.0' };
    const r = ruleMinGroveVersion(baseCtx({ manifest: m, latestGroveVersion: '1.0.0' }));
    expect(r.pass).toBe(false);
  });
});

describe('ruleHasGroveExtensionTopic', () => {
  test('passes when topic present', () => {
    const r = ruleHasGroveExtensionTopic(baseCtx());
    expect(r.pass).toBe(true);
  });
  test('fails when topic missing', () => {
    const r = ruleHasGroveExtensionTopic(baseCtx({ topics: [] }));
    expect(r.pass).toBe(false);
  });
});
