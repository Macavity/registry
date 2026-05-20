# Submission Guide

This guide is for authors who want to list an extension in the marketplace.

## Prerequisites

Before submitting, your repository must:

1. **Be public** on GitHub.
2. **Have a tagged release** (e.g. `v1.0.0`) with:
   - A `package.zip` asset attached (this is what the host downloads on install).
   - A manifest file at the **repo root** for the release tag — `plugin.json`, `theme.json`, `icon-pack.json`, `template.json`, or `widget.json` depending on the extension type.
3. **Use an SPDX license** present in [`config/licenses.txt`](../config/licenses.txt). If you need a license that's not on the list, open a PR adding it first.

## Manifest format

Manifest shapes are defined by the [`@grove-notes/manifest-schema`](https://www.npmjs.com/package/@grove-notes/manifest-schema) package on npm. JSON Schema files for IDE autocomplete ship inside the package at `node_modules/@grove-notes/manifest-schema/schemas/*.schema.json` and are also served from `https://unpkg.com/@grove-notes/manifest-schema/schemas/`.

Example `plugin.json`:

```json
{
  "id": "kanban",
  "name": { "default": "Kanban Board" },
  "description": { "default": "Drag-and-drop kanban columns." },
  "version": "1.0.0",
  "author": "Paneon",
  "minGroveVersion": "1.0.0",
  "license": "MIT",
  "entry": "dist/main.js",
  "frontends": ["desktop", "web"]
}
```

Every manifest field is reproduced into the published index entry verbatim (after HTML-escaping of `name` and `description`).

## Submitting

1. **Fork** [`Macavity/registry`](https://github.com/Macavity/registry).
2. **Add one line** `owner/repo` to the appropriate file (any casing — GitHub's display form is recommended and preserved):
   - Plugins → `plugins.txt`
   - Themes → `themes.txt`
   - Icon packs → `icons.txt`
   - Templates → `templates.txt`
   - Widgets → `widgets.txt`
3. **Sort and clean** locally:

   ```bash
   bun install
   bun run sort
   ```

4. **Open a PR** with title like `Add example/sample-kanban`. The `pr-check` workflow will validate within ~1 minute and comment with the result.

## What the PR check verifies

The check runs 10 rules. Each one posts a fix hint on failure:

| Rule | What it checks |
|------|---------------|
| Repo exists & public | GitHub returns repo metadata. |
| `package.zip` exists | Release asset present (HEAD request). |
| Manifest present | Right filename at repo root for the resource type. |
| Manifest validates | Passes `@grove-notes/manifest-schema` strict validation. |
| `id` unique | No conflict with any other listed extension (any type). |
| `id` not reserved | Not on `config/reserved-ids.txt`. |
| `version` ↔ tag | `manifest.version` matches the release tag (modulo leading `v`). |
| License allowed | `manifest.license` in `config/licenses.txt`. |
| Min host version | `minGroveVersion` ≤ latest published host version. |
| Paths resolve | `entry`, `readme[*]`, `iconEntry` (for themes) all 200 at the tag. |

## Updates after first listing

**You do not need to PR again.** Once your extension is in the index, the `stage` workflow auto-detects new releases:

1. Cut a new tagged release on GitHub with updated `package.zip` and manifest.
2. Within 15 minutes, `stage` notices the new tag, fetches the new manifest, validates it, and updates the index entry.
3. Host clients see the new version on their next index fetch and offer the update.

If validation fails on the new release (e.g. manifest schema regression), the index keeps the prior version — your existing installations are not affected, but the new release is not advertised until you fix the manifest and tag a corrected release.

## Removing your extension

Open a PR removing your `owner/repo` line from the appropriate `.txt`. After merge, the next `stage` run drops the entry. Users with the extension already installed keep it; it just stops appearing in the marketplace browser.

## Asking for a re-check

If the PR check failed, push fixes to the same branch — `pr-check` re-runs automatically.

If you need to retry without a push (e.g. you fixed something on the release side), the maintainer can apply the `Check` label to your PR to re-fire the workflow.
