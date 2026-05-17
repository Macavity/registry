import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseTxt } from '../shared/txt-parser';
import { indexPath } from '../stage/index-writer';
import { RESOURCE_TYPES, type IndexFile, type ResourceType } from '../stage/types';
import type { AnyManifest } from '../stage/types';
import type { ChangedEntry, ExistingIdInfo } from './types';

const TXT_FILES: Record<ResourceType, string> = {
  plugins: 'plugins.txt',
  themes: 'themes.txt',
  icons: 'icons.txt',
  templates: 'templates.txt',
  widgets: 'widgets.txt',
};

async function readTxtFromTree(treePath: string, file: string): Promise<string> {
  const full = join(treePath, file);
  if (!existsSync(full)) return '';
  return readFile(full, 'utf8');
}

export type DiffSet = {
  perType: ChangedEntry[];
  illegalFiles: string[];
};

/**
 * Compute the diff between the merge-base tree (the PR's true ancestor on main)
 * and the PR head tree. Format violations are reported against the head tree.
 *
 * `basePath` is the current `main` checkout (used by callers for uniqueness
 * lookups via {@link loadAllCurrentIds}).
 */
export async function computeDiff(
  mergeBasePath: string,
  headPath: string,
): Promise<DiffSet> {
  const perType: ChangedEntry[] = [];
  for (const type of RESOURCE_TYPES) {
    const file = TXT_FILES[type];
    const baseText = await readTxtFromTree(mergeBasePath, file);
    const headText = await readTxtFromTree(headPath, file);

    const base = new Set(parseTxt(baseText).entries);
    const headParsed = parseTxt(headText);
    const head = new Set(headParsed.entries);

    const added = [...head].filter((e) => !base.has(e)).sort();
    const removed = [...base].filter((e) => !head.has(e)).sort();

    perType.push({
      type,
      added,
      removed,
      formatViolations: headParsed.violations,
    });
  }

  const illegalFiles = await detectIllegalFileChanges(mergeBasePath, headPath);

  return { perType, illegalFiles };
}

async function listFilesRecursive(root: string): Promise<Set<string>> {
  const out = new Set<string>();
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else out.add(relative(root, p));
    }
  }
  await walk(root);
  return out;
}

/**
 * Any file changed in the PR that isn't one of the five `*.txt` source-of-truth
 * files is flagged. Spec §10 says "only `*.txt` files modified."
 */
async function detectIllegalFileChanges(
  mergeBasePath: string,
  headPath: string,
): Promise<string[]> {
  const txt = new Set(Object.values(TXT_FILES));
  const baseFiles = await listFilesRecursive(mergeBasePath);
  const headFiles = await listFilesRecursive(headPath);

  const illegal = new Set<string>();
  for (const f of headFiles) {
    if (txt.has(f)) continue;
    if (!baseFiles.has(f)) {
      illegal.add(f);
      continue;
    }
    const a = await readFile(join(mergeBasePath, f), 'utf8').catch(() => null);
    const b = await readFile(join(headPath, f), 'utf8').catch(() => null);
    if (a !== b) illegal.add(f);
  }
  for (const f of baseFiles) {
    if (txt.has(f)) continue;
    if (!headFiles.has(f)) illegal.add(f);
  }
  return [...illegal].sort();
}

/**
 * Cross-type uniqueness map: every id currently in any *.json index, mapped to
 * its type + repository. Used by the id-uniqueness rule.
 */
export async function loadAllCurrentIds(basePath: string): Promise<Map<string, ExistingIdInfo>> {
  const map = new Map<string, ExistingIdInfo>();
  for (const type of RESOURCE_TYPES) {
    const path = join(basePath, indexPath(type));
    if (!existsSync(path)) continue;
    const text = await readFile(path, 'utf8');
    const idx = JSON.parse(text) as IndexFile<AnyManifest>;
    for (const entry of idx.entries) {
      map.set(entry.id, { type, repo: entry.repository });
    }
  }
  return map;
}
