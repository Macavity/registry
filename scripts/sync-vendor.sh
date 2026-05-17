#!/usr/bin/env bash
# Refresh vendor/manifest-schema/ from a local upstream checkout.
#
# Usage:
#   bun run vendor:sync /path/to/host-monorepo
#
# What it does:
#   1. Mirrors packages/manifest-schema/{src,schemas} into vendor/manifest-schema/
#   2. Excludes *.test.ts and dist/
#   3. Rewrites the commit hash + date in vendor/manifest-schema/PROVENANCE.md
#
# This script is intended as a temporary measure until @grove/manifest-schema
# is published to npm. See docs/vendoring.md.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <path-to-upstream-checkout>" >&2
  exit 2
fi

GROVE_ROOT="$1"
PKG="$GROVE_ROOT/packages/manifest-schema"

if [ ! -d "$PKG/src" ] || [ ! -d "$PKG/schemas" ]; then
  echo "error: $PKG does not look like the manifest-schema package" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DST="$ROOT/vendor/manifest-schema"

# Capture upstream provenance
HEAD_SHA="$(git -C "$GROVE_ROOT" rev-parse HEAD)"
BRANCH="$(git -C "$GROVE_ROOT" rev-parse --abbrev-ref HEAD)"
TODAY="$(date -u +%Y-%m-%d)"

echo "Syncing from $PKG"
echo "  branch: $BRANCH"
echo "  commit: $HEAD_SHA"
echo

rm -rf "$DST/src" "$DST/schemas"
mkdir -p "$DST/src" "$DST/schemas"

# Copy non-test source files
for f in "$PKG"/src/*.ts; do
  case "$f" in
    *.test.ts) ;;
    *) cp "$f" "$DST/src/" ;;
  esac
done
cp "$PKG"/schemas/*.json "$DST/schemas/"

# Rewrite provenance metadata in-place (BSD/macOS sed-compatible)
PROV="$DST/PROVENANCE.md"
sed -i.bak \
  -e "s|^- \*\*Source branch:\*\* .*|- **Source branch:** \`$BRANCH\`|" \
  -e "s|^- \*\*Upstream commit:\*\* .*|- **Upstream commit:** \`$HEAD_SHA\`|" \
  -e "s|^- \*\*Vendored on:\*\* .*|- **Vendored on:** $TODAY|" \
  "$PROV"
rm -f "$PROV.bak"

echo "Updated $PROV"
echo "Done."
