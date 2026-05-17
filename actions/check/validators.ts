import {
  safeParseIconPackManifest,
  safeParsePluginManifest,
  safeParseTemplateManifest,
  safeParseThemeManifest,
  safeParseWidgetManifest,
} from '@grove/manifest-schema';
import { headOk } from '../shared/github';
import { TYPE_TO_MANIFEST_FILE, type ResourceType } from '../stage/types';
import type { ExistingIdInfo, RuleResult } from './types';

const SAFE_PARSERS = {
  plugins: safeParsePluginManifest,
  themes: safeParseThemeManifest,
  icons: safeParseIconPackManifest,
  templates: safeParseTemplateManifest,
  widgets: safeParseWidgetManifest,
} as const;

export type ValidationContext = {
  type: ResourceType;
  owner: string;
  repo: string;
  releaseTag?: string;
  publishedAt?: string;
  manifestText?: string;
  manifest?: Record<string, unknown>;
  topics: string[];
  repoExists: boolean;
  allowedLicenses: Set<string>;
  reservedIds: Set<string>;
  existingIds: Map<string, ExistingIdInfo>;
  latestGroveVersion: string;
};

function rawUrl(ctx: ValidationContext, path: string): string {
  return `https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}/${ctx.releaseTag}/${path}`;
}

function pass(name: string, message: string): RuleResult {
  return { name, pass: true, message };
}
function fail(name: string, message: string): RuleResult {
  return { name, pass: false, message };
}

export function ruleRepoExistsAndPublic(ctx: ValidationContext): RuleResult {
  if (!ctx.repoExists) {
    return fail(
      'Repository exists and is public',
      `Could not find a public repo at \`${ctx.owner}/${ctx.repo}\`. Make sure the repo is public and the spelling matches.`,
    );
  }
  if (!ctx.releaseTag) {
    return fail(
      'Repository has a tagged release',
      `\`${ctx.owner}/${ctx.repo}\` has no tagged releases. Cut a release on GitHub (with a \`package.zip\` asset and the manifest at the repo root) and try again.`,
    );
  }
  return pass('Repository exists and is public', `Found \`${ctx.owner}/${ctx.repo}\`.`);
}

export async function rulePackageZipExists(ctx: ValidationContext): Promise<RuleResult> {
  if (!ctx.releaseTag) return fail('package.zip release asset', 'No release tag to check.');
  const url = `https://github.com/${ctx.owner}/${ctx.repo}/releases/download/${ctx.releaseTag}/package.zip`;
  const { status } = await headOk(url);
  if (status >= 200 && status < 400) {
    return pass('package.zip release asset', `Found at \`${url}\`.`);
  }
  return fail(
    'package.zip release asset',
    `Expected \`package.zip\` attached to release \`${ctx.releaseTag}\`. Got HTTP ${status}.`,
  );
}

export async function ruleManifestPresent(ctx: ValidationContext): Promise<RuleResult> {
  const file = TYPE_TO_MANIFEST_FILE[ctx.type];
  if (!ctx.releaseTag) return fail('Manifest at repo root', 'No release tag to check.');
  const url = rawUrl(ctx, file);
  const { status } = await headOk(url);
  if (status >= 200 && status < 400) return pass('Manifest at repo root', `Found \`${file}\`.`);
  return fail(
    'Manifest at repo root',
    `Expected \`${file}\` at the root of \`${ctx.owner}/${ctx.repo}\` at tag \`${ctx.releaseTag}\`. Got HTTP ${status}.`,
  );
}

export function ruleManifestValid(ctx: ValidationContext): RuleResult {
  if (!ctx.manifest) {
    return fail(
      'Manifest is valid',
      'Manifest could not be fetched or parsed as JSON. Make sure the file is valid UTF-8 JSON.',
    );
  }
  const parser = SAFE_PARSERS[ctx.type];
  const result = parser(ctx.manifest);
  if (result.success) return pass('Manifest is valid', 'Schema validation passed.');
  const first = result.issues[0];
  const path = first.path?.map((seg) => String((seg as { key: unknown }).key)).join('.') ?? '<root>';
  return fail(
    'Manifest is valid',
    `Validation failed at \`${path}\`: ${first.message}`,
  );
}

export function ruleIdUnique(ctx: ValidationContext): RuleResult {
  const id = ctx.manifest?.id as string | undefined;
  if (!id) return fail('Manifest id is unique', 'Manifest missing `id`.');
  const colliding = ctx.existingIds.get(id);
  if (!colliding) return pass('Manifest id is unique', `id \`${id}\` is free across all types.`);
  if (colliding.repo === `${ctx.owner}/${ctx.repo}`) {
    return pass('Manifest id is unique', `id \`${id}\` re-uses your existing listing.`);
  }
  return fail(
    'Manifest id is unique',
    `id \`${id}\` is already taken by \`${colliding.repo}\` (${colliding.type}). Pick a different id; ids must be unique across all extension types.`,
  );
}

export function ruleIdNotReserved(ctx: ValidationContext): RuleResult {
  const id = ctx.manifest?.id as string | undefined;
  if (!id) return fail('Manifest id is not reserved', 'Manifest missing `id`.');
  if (ctx.reservedIds.has(id)) {
    return fail(
      'Manifest id is not reserved',
      `id \`${id}\` is reserved. See \`config/reserved-ids.txt\`.`,
    );
  }
  return pass('Manifest id is not reserved', `id \`${id}\` is not reserved.`);
}

export function ruleVersionMatchesTag(ctx: ValidationContext): RuleResult {
  const version = ctx.manifest?.version as string | undefined;
  const tag = ctx.releaseTag;
  if (!version || !tag) {
    return fail('Manifest version matches release tag', 'Missing version or release tag.');
  }
  const normalisedTag = tag.replace(/^v/, '');
  if (normalisedTag !== version) {
    return fail(
      'Manifest version matches release tag',
      `Manifest version \`${version}\` does not match release tag \`${tag}\`. Update one to match the other.`,
    );
  }
  return pass(
    'Manifest version matches release tag',
    `Version \`${version}\` matches tag \`${tag}\`.`,
  );
}

export function ruleLicenseAllowed(ctx: ValidationContext): RuleResult {
  const license = ctx.manifest?.license as string | undefined;
  if (!license) return fail('License in allowlist', 'Manifest missing `license`.');
  if (ctx.allowedLicenses.has(license)) {
    return pass('License in allowlist', `\`${license}\` is allowed.`);
  }
  return fail(
    'License in allowlist',
    `License \`${license}\` is not in the allowlist. Either pick a license from \`config/licenses.txt\` or PR-add yours first.`,
  );
}

function semverCompare(a: string, b: string): number {
  const pa = a.split('.').map((s) => parseInt(s, 10));
  const pb = b.split('.').map((s) => parseInt(s, 10));
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export function ruleMinGroveVersion(ctx: ValidationContext): RuleResult {
  const min = ctx.manifest?.minGroveVersion as string | undefined;
  const ruleName = 'Min host version satisfied';
  if (!min) return fail(ruleName, 'Manifest missing `minGroveVersion`.');
  if (semverCompare(min, ctx.latestGroveVersion) > 0) {
    return fail(
      ruleName,
      `\`minGroveVersion\` \`${min}\` is newer than the latest published host (\`${ctx.latestGroveVersion}\`). Lower it or wait for the next host release.`,
    );
  }
  return pass(ruleName, `\`${min}\` ≤ \`${ctx.latestGroveVersion}\`.`);
}

export async function rulePathsResolve(ctx: ValidationContext): Promise<RuleResult> {
  if (!ctx.manifest || !ctx.releaseTag) {
    return fail('Manifest paths resolve', 'No manifest or release tag available.');
  }
  const paths: string[] = [];
  const m = ctx.manifest as {
    entry?: string;
    readme?: Record<string, string>;
    providesIcons?: boolean;
    iconEntry?: string;
  };
  if (typeof m.entry === 'string') paths.push(m.entry);
  if (m.readme) {
    for (const v of Object.values(m.readme)) {
      if (typeof v === 'string') paths.push(v);
    }
  }
  if (ctx.type === 'themes' && m.providesIcons && typeof m.iconEntry === 'string') {
    paths.push(m.iconEntry);
  }

  const failures: string[] = [];
  for (const p of paths) {
    const { status } = await headOk(rawUrl(ctx, p));
    if (status >= 400) failures.push(`\`${p}\` → HTTP ${status}`);
  }
  if (failures.length === 0) {
    return pass('Manifest paths resolve', `All ${paths.length} declared path(s) resolve.`);
  }
  return fail(
    'Manifest paths resolve',
    `These declared paths could not be found at tag \`${ctx.releaseTag}\`: ${failures.join('; ')}.`,
  );
}

export function ruleHasGroveExtensionTopic(ctx: ValidationContext): RuleResult {
  if (ctx.topics.includes('host-extension')) {
    return pass('Repository has `host-extension` topic', 'Topic present.');
  }
  return fail(
    'Repository has `host-extension` topic',
    'Add the topic `host-extension` to your repo (Settings → Topics) so users can discover it via GitHub search.',
  );
}

export async function runAllRules(ctx: ValidationContext): Promise<RuleResult[]> {
  const sync: RuleResult[] = [];
  sync.push(ruleRepoExistsAndPublic(ctx));
  // Short-circuit when the repo doesn't exist; subsequent rules need the release tag.
  if (!ctx.repoExists || !ctx.releaseTag) return sync;

  sync.push(await rulePackageZipExists(ctx));
  sync.push(await ruleManifestPresent(ctx));
  sync.push(ruleManifestValid(ctx));
  sync.push(ruleIdUnique(ctx));
  sync.push(ruleIdNotReserved(ctx));
  sync.push(ruleVersionMatchesTag(ctx));
  sync.push(ruleLicenseAllowed(ctx));
  sync.push(ruleMinGroveVersion(ctx));
  sync.push(await rulePathsResolve(ctx));
  sync.push(ruleHasGroveExtensionTopic(ctx));
  return sync;
}
