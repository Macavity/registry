import { makeGraphqlClient } from '../shared/github';
import { loadLicenseAllowlist, loadReservedIds } from '../shared/config';
import { fetchRepoFacts } from '../stage/graphql';
import { TYPE_TO_MANIFEST_FILE, type ResourceType } from '../stage/types';
import { computeDiff, loadAllCurrentIds } from './diff';
import { runAllRules } from './validators';
import { writeReport } from './report';
import type { CheckReport, RuleResult } from './types';

const BASE_PATH = process.env.BASE_PATH ?? '.';
const HEAD_PATH = process.env.HEAD_PATH ?? './pr-head';
const MERGE_BASE_PATH = process.env.MERGE_BASE_PATH ?? './pr-base';
const REPORT_PATH = process.env.REPORT_PATH ?? './templates/check-result.md';
const TEMPLATE_PATH = './templates/check-result.md';
const LATEST_GROVE_VERSION = process.env.LATEST_GROVE_VERSION ?? '999.0.0';

function diffLevelRules(diff: Awaited<ReturnType<typeof computeDiff>>): RuleResult[] {
  const rules: RuleResult[] = [];

  if (diff.illegalFiles.length === 0) {
    rules.push({
      name: 'Only `*.txt` files changed',
      pass: true,
      message: 'Diff scope OK.',
    });
  } else {
    rules.push({
      name: 'Only `*.txt` files changed',
      pass: false,
      message: `These files outside the five source-of-truth \`*.txt\` were modified, added, or removed: ${diff.illegalFiles.map((f) => '`' + f + '`').join(', ')}. Submissions must change only the relevant \`*.txt\`.`,
    });
  }

  const allViolations = diff.perType.flatMap((p) =>
    p.formatViolations.map((v) => ({ ...v, type: p.type })),
  );
  if (allViolations.length === 0) {
    rules.push({
      name: '`.txt` files are well-formed',
      pass: true,
      message: 'Format OK (lowercase, sorted, no blanks, no duplicates).',
    });
  } else {
    rules.push({
      name: '`.txt` files are well-formed',
      pass: false,
      message: `Format violations: ${allViolations
        .map((v) => describeViolation(v))
        .join('; ')}. Run \`bun run sort\` locally to fix.`,
    });
  }

  return rules;
}

function describeViolation(v: { type: ResourceType; line?: number; kind: string }): string {
  const where = `${v.type}.txt${'line' in v && typeof v.line === 'number' ? ':' + v.line : ''}`;
  return `${where} (${v.kind})`;
}

function diffSummary(diff: Awaited<ReturnType<typeof computeDiff>>): string {
  const parts: string[] = [];
  for (const p of diff.perType) {
    if (p.added.length === 0 && p.removed.length === 0) continue;
    const adds = p.added.length > 0 ? `+${p.added.map((s) => '`' + s + '`').join(', +')}` : '';
    const rems = p.removed.length > 0 ? `-${p.removed.map((s) => '`' + s + '`').join(', -')}` : '';
    parts.push(`- **${p.type}.txt** ${[adds, rems].filter(Boolean).join(' ')}`);
  }
  if (parts.length === 0) return '_(no entries added or removed)_';
  return parts.join('\n');
}

async function fetchManifestText(
  owner: string,
  repo: string,
  tag: string,
  type: ResourceType,
): Promise<string | undefined> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${tag}/${TYPE_TO_MANIFEST_FILE[type]}`;
  const res = await fetch(url);
  if (!res.ok) return undefined;
  return res.text();
}

async function main(): Promise<void> {
  const diff = await computeDiff(MERGE_BASE_PATH, HEAD_PATH);

  const allRules: RuleResult[] = [];
  allRules.push(...diffLevelRules(diff));

  const adds = diff.perType.flatMap((p) => p.added.map((entry) => ({ type: p.type, entry })));
  if (adds.length > 0) {
    const gql = makeGraphqlClient();
    const coords = adds.map((a) => {
      const [owner, name] = a.entry.split('/');
      return { owner: owner!, name: name! };
    });
    const facts = await fetchRepoFacts(gql, coords);
    const allowedLicenses = await loadLicenseAllowlist();
    const reservedIds = await loadReservedIds();
    const existingIds = await loadAllCurrentIds(BASE_PATH);

    for (const a of adds) {
      const [owner, name] = a.entry.split('/');
      const f = facts.get(`${owner}/${name}`);
      const tag = f?.latestReleaseTag;
      const manifestText = tag
        ? await fetchManifestText(owner!, name!, tag, a.type)
        : undefined;
      const manifestJson = manifestText ? safeJsonParse(manifestText) : undefined;

      const ctx = {
        type: a.type,
        owner: owner!,
        repo: name!,
        releaseTag: tag,
        publishedAt: f?.latestReleasePublishedAt,
        manifestText,
        manifest: manifestJson,
        topics: f?.topics ?? [],
        repoExists: !!f?.exists,
        allowedLicenses,
        reservedIds,
        existingIds,
        latestGroveVersion: LATEST_GROVE_VERSION,
      };

      const rules = await runAllRules(ctx);
      // Prefix rule names with the entry so multi-add reports are readable.
      for (const r of rules) {
        allRules.push({ ...r, name: `${a.entry}: ${r.name}` });
      }
    }
  }

  const report: CheckReport = {
    allPassed: allRules.every((r) => r.pass),
    diffSummary: diffSummary(diff),
    rules: allRules,
  };

  await writeReport(TEMPLATE_PATH, REPORT_PATH, report);

  if (!report.allPassed) process.exit(1);
}

function safeJsonParse(text: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
