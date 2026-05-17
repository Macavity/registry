import { readFile } from 'node:fs/promises';
import { makeGraphqlClient, headOk } from '../shared/github';
import { parseTxt } from '../shared/txt-parser';
import {
  parseIconPackManifest,
  parsePluginManifest,
  parseTemplateManifest,
  parseThemeManifest,
  parseWidgetManifest,
  type AnyManifestParse,
} from './schema-bridge';
import { fetchRepoFacts, type RepoCoords, type RepoFacts } from './graphql';
import { fetchManifest } from './fetch';
import { newCache } from './etag-cache';
import { sanitiseManifest } from './sanitise';
import { emptyIndex, readIndex, writeIndex } from './index-writer';
import {
  RESOURCE_TYPES,
  SCHEMA_VERSION,
  type AnyManifest,
  type IndexFile,
  type RegistryEntry,
  type ResourceType,
} from './types';

const PARSERS: Record<ResourceType, AnyManifestParse> = {
  plugins: parsePluginManifest,
  themes: parseThemeManifest,
  icons: parseIconPackManifest,
  templates: parseTemplateManifest,
  widgets: parseWidgetManifest,
};

async function loadManifestSchemaVersion(): Promise<string> {
  const pkg = JSON.parse(
    await readFile('node_modules/@grove-notes/manifest-schema/package.json', 'utf8'),
  ) as { version: string };
  return pkg.version;
}

function downloadUrl(owner: string, repo: string, tag: string): string {
  return `https://github.com/${owner}/${repo}/releases/download/${tag}/package.zip`;
}

async function crossCheckPaths(
  owner: string,
  repo: string,
  tag: string,
  manifest: AnyManifest,
  type: ResourceType,
): Promise<boolean> {
  // Every type with a runtime entry: plugins, themes (icons/templates/widgets vary).
  const entryPath = (manifest as { entry?: string }).entry;
  const checks: string[] = [];
  if (entryPath) {
    checks.push(`https://raw.githubusercontent.com/${owner}/${repo}/${tag}/${entryPath}`);
  }
  if (manifest.readme) {
    for (const value of Object.values(manifest.readme)) {
      if (typeof value === 'string') {
        checks.push(`https://raw.githubusercontent.com/${owner}/${repo}/${tag}/${value}`);
      }
    }
  }
  if (type === 'themes') {
    const t = manifest as { providesIcons?: boolean; iconEntry?: string };
    if (t.providesIcons && t.iconEntry) {
      checks.push(`https://raw.githubusercontent.com/${owner}/${repo}/${tag}/${t.iconEntry}`);
    }
  }
  checks.push(downloadUrl(owner, repo, tag));

  for (const url of checks) {
    const { status } = await headOk(url);
    if (status >= 400) {
      console.warn(`[skip] ${owner}/${repo}@${tag}: ${url} → ${status}`);
      return false;
    }
  }
  return true;
}

function parseRepoLine(line: string): RepoCoords {
  const [owner, name] = line.split('/');
  return { owner: owner!, name: name! };
}

async function processType(
  type: ResourceType,
  manifestSchemaVersion: string,
): Promise<void> {
  const txt = await readFile(`${type}.txt`, 'utf8');
  const { entries: lines, violations } = parseTxt(txt);
  if (violations.length > 0) {
    console.warn(`[${type}] format violations in source-of-truth file:`, violations);
  }

  if (lines.length === 0) {
    await writeIndex(type, emptyIndex(manifestSchemaVersion));
    return;
  }

  const gql = makeGraphqlClient();
  const cache = newCache();
  const repos = lines.map(parseRepoLine);
  const facts = await fetchRepoFacts(gql, repos);

  const current = (await readIndex(type).catch(() => emptyIndex<AnyManifest>(manifestSchemaVersion)));
  const next: RegistryEntry[] = [];

  for (const r of repos) {
    const key = `${r.owner}/${r.name}`;
    const f: RepoFacts | undefined = facts.get(key);
    if (!f?.exists) {
      console.warn(`[skip] ${key}: repo missing`);
      continue;
    }
    if (!f.latestReleaseTag) {
      console.warn(`[skip] ${key}: no tagged release`);
      continue;
    }
    const existing = current.entries.find((e) => e.repository === key);
    if (existing && existing.releaseTag === f.latestReleaseTag) {
      next.push({ ...existing, stars: f.stars ?? existing.stars });
      continue;
    }
    const fetched = await fetchManifest(cache, {
      owner: r.owner,
      repo: r.name,
      tag: f.latestReleaseTag,
      type,
    });
    if (fetched.kind !== 'ok') {
      console.warn(`[skip] ${key}: manifest ${fetched.kind}`);
      continue;
    }
    let parsed: AnyManifest;
    try {
      parsed = PARSERS[type](JSON.parse(fetched.text));
    } catch (e) {
      console.warn(`[skip] ${key}: invalid manifest`, (e as Error).message);
      continue;
    }
    const ok = await crossCheckPaths(r.owner, r.name, f.latestReleaseTag, parsed, type);
    if (!ok) continue;

    const sanitised = sanitiseManifest(parsed);
    next.push({
      ...sanitised,
      repository: key,
      releaseTag: f.latestReleaseTag,
      downloadUrl: downloadUrl(r.owner, r.name, f.latestReleaseTag),
      publishedAt: f.latestReleasePublishedAt ?? new Date(0).toISOString(),
      stars: f.stars ?? 0,
      addedAt: existing?.addedAt ?? new Date().toISOString(),
    });
  }

  const index: IndexFile = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    manifestSchemaVersion,
    count: next.length,
    entries: next,
  };
  await writeIndex(type, index);
}

async function main(): Promise<void> {
  const manifestSchemaVersion = await loadManifestSchemaVersion();
  for (const type of RESOURCE_TYPES) {
    await processType(type, manifestSchemaVersion);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
