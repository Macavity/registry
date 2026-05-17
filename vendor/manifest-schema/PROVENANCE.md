# Vendored `@grove/manifest-schema`

This directory is a verbatim copy of `packages/manifest-schema/{src,schemas}` from the [grove monorepo](https://github.com/grove-notes/grove), trimmed to the runtime-essential files (no tests, no build scripts, no `dist/`).

## Provenance

- **Upstream repo:** `grove-notes/grove` (private at time of vendoring)
- **Source branch:** `feat/charming-ptolemy-dedd85`
- **Upstream commit:** `2c0d377f74846484732d27e39b90b50ce4a0c778`
- **Vendored on:** 2026-05-17

## Why vendored

The grove monorepo is still private and `@grove/manifest-schema` has not been published to npm. Vendoring keeps this registry self-contained so CI can run today against the canonical schema validators.

Bun resolves `import … from '@grove/manifest-schema'` to `vendor/manifest-schema/src/index.ts` via the path alias in the repo-root `tsconfig.json`. Application code never references the vendor path directly.

## Sync

To refresh from a local Grove checkout:

```bash
bun run vendor:sync
```

The script (`scripts/sync-vendor.sh`) takes the path to your Grove checkout as an argument, mirrors `packages/manifest-schema/{src,schemas}` over the top of `vendor/manifest-schema/` (excluding `*.test.ts`), and rewrites the commit hash in this file.

## Removal trigger

Once Grove is public and `@grove/manifest-schema` is published to npm:

1. `bun remove` is not applicable (no npm install yet). Just `rm -rf vendor/manifest-schema/`.
2. Drop the `paths` entry for `@grove/manifest-schema` from `tsconfig.json`.
3. Add `"@grove/manifest-schema": "^x.y.z"` to `dependencies` in the top-level `package.json`.
4. `bun install`. No application code changes required.

See [`docs/vendoring.md`](../../docs/vendoring.md) for the broader rationale.
