# Vendoring `@grove/manifest-schema`

This repo ships an in-tree copy of the `@grove/manifest-schema` package at `vendor/manifest-schema/`. This document explains why, how it's wired up, and when to remove it.

## Why

The schema package is the source of truth for the five manifest shapes (`PluginManifest`, `ThemeManifest`, `IconPackManifest`, `TemplateManifest`, `WidgetManifest`). Both the host application and this registry need it.

At time of writing the upstream monorepo is private and the schema is not on npm. We can't `bun install @grove/manifest-schema` from outside, and we don't want to block on the upstream going public to ship the registry. Vendoring keeps the registry self-contained without forking the schema — application code still imports `@grove/manifest-schema`, and the path alias in `tsconfig.json` quietly points at `vendor/manifest-schema/src/index.ts`.

## How it's wired

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@grove/manifest-schema": ["./vendor/manifest-schema/src/index.ts"],
      "@grove/manifest-schema/schemas/*": ["./vendor/manifest-schema/schemas/*"]
    }
  }
}
```

Bun honors `tsconfig` path aliases natively, so `import { parsePluginManifest } from '@grove/manifest-schema'` resolves to the vendored source at runtime.

The vendored copy includes:

- `src/*.ts` (excluding `*.test.ts`) — the schemas, validators, and exported types
- `schemas/*.json` — the JSON Schema files for IDE autocomplete
- `package.json` — trimmed metadata (no scripts, no dev deps)
- `PROVENANCE.md` — upstream branch + commit + sync date

## Sync

```bash
bun run vendor:sync /path/to/host-monorepo
```

The script (`scripts/sync-vendor.sh`) mirrors `packages/manifest-schema/{src,schemas}` from the supplied checkout into `vendor/manifest-schema/`, drops `*.test.ts`, and rewrites the commit hash + date in `vendor/manifest-schema/PROVENANCE.md`. Commit the resulting diff under `chore(vendor): sync manifest-schema`.

## Removal

Once the upstream publishes `@grove/manifest-schema` to npm:

1. `rm -rf vendor/manifest-schema scripts/sync-vendor.sh`
2. Remove the `paths` entry for `@grove/manifest-schema` from `tsconfig.json`.
3. Remove the `vendor:sync` script from `package.json`.
4. Add `"@grove/manifest-schema": "^x.y.z"` to `dependencies` in `package.json`.
5. `bun install`.

No application code needs to change — the import string `@grove/manifest-schema` stays the same.
