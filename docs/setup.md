# Maintainer Setup

This document captures everything a maintainer of `Macavity/registry` needs to know about running the registry. Author-facing submission docs live in [`submission.md`](submission.md).

## Initial GitHub setup

1. Create the repo under the `Macavity` namespace. It **must be public** so `raw.githubusercontent.com` serves the JSON indexes to host clients without auth.
2. Set a clear description: e.g. *"Extension registry."*
3. Push this codebase to `main`.

## Create the `Check` label

PR re-runs are triggered by labeling a PR `Check`. Create the label once:

```bash
gh label create Check \
  --color fbca04 \
  --description "Re-run pr-check workflow"
```

How it's used:

- A contributor pushes new commits to their PR → `pr-check` runs automatically (`synchronize` trigger).
- A maintainer wants to re-trigger checks without pushing → apply the `Check` label. The workflow runs, then removes the label so it can be re-applied later.
- The workflow itself removes the label on completion (success or failure).

## Secrets

**None required for v1.**

The workflows use `${{ secrets.GITHUB_TOKEN }}`, which GitHub Actions auto-provides. For a public repo at any realistic registry size, that's plenty:

| Registry size | Stage requests / run | GITHUB_TOKEN budget |
|---|---|---|
| 100 | ~6 | 1000 / hr |
| 1000 | ~60 | 1000 / hr |
| 5000 | ~300 | 1000 / hr |

### Escalating to a PAT (only if needed)

If the registry grows past ~5000 entries or GraphQL complexity starts hitting limits:

1. Create a fine-grained PAT with `public_repo: read` scope (no other permissions).
2. Add it as an **org-level** secret named `PAT` under the `Macavity` org.
3. In both `.github/workflows/stage.yml` and `.github/workflows/pr-check.yml`, change `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to `GITHUB_TOKEN: ${{ secrets.PAT }}`.

That's the only change required — both actions read `process.env.GITHUB_TOKEN`.

## Manual stage run

The stage workflow runs every 15 minutes on cron, but it's useful to trigger it ad-hoc after a merge or a config change:

```bash
gh workflow run stage.yml --repo Macavity/registry
gh run watch --repo Macavity/registry
```

## Removal flow

When an author wants their extension delisted:

1. Author (or maintainer on their behalf) opens a PR removing the `owner/repo` line from the appropriate `.txt`.
2. PR check passes trivially (removals don't validate manifests).
3. Maintainer merges.
4. Next stage run drops the corresponding entry from `*.json`.
5. Host clients fetching the next index no longer see the extension for install. **Existing installations are unaffected** — the host never auto-uninstalls.

## License allowlist updates

Adding an SPDX identifier to `config/licenses.txt` is itself a PR. Suggested label: `License-Allowlist` — apply it manually for review attention. The allowlist is intentionally inclusive; PRs adding exotic licenses are the friction point for unusual cases.

## Backing off cron

If CI cost or rate limits become a concern (won't happen at v1 scale), edit `.github/workflows/stage.yml`:

```yaml
schedule:
  - cron: '0 * * * *' # hourly instead of every 15 min
```

## Backups

Source of truth is git — the entire history of `*.txt`, `*.json`, and config files lives in `main`. No additional backup needed.
