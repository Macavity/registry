import { readFile, writeFile } from 'node:fs/promises';
import type { CheckReport, RuleResult } from './types';

/**
 * Tiny templating: handles `{{var}}`, `{{#if cond}}…{{else}}…{{/if}}`, and
 * `{{#each list}}…{{/each}}` (with `{{key}}` and `{{#if subcond}}…{{else}}…{{/if}}`
 * inside the loop body). No nesting beyond what `templates/check-result.md` uses.
 */
export function renderTemplate(template: string, report: CheckReport): string {
  let out = template;

  // Top-level {{#if allPassed}}…{{else}}…{{/if}}.
  out = out.replace(
    /\{\{#if allPassed\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, a: string, b: string) => (report.allPassed ? a : b),
  );

  // {{#each rules}}…{{/each}} — render once per rule, substitute {{name}}, {{message}},
  // and {{#if pass}}…{{else}}…{{/if}} per iteration.
  out = out.replace(/\{\{#each rules\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, body: string) =>
    report.rules.map((rule) => renderRule(body, rule)).join(''),
  );

  out = out.replace(/\{\{diffSummary\}\}/g, report.diffSummary);
  return out;
}

function renderRule(body: string, rule: RuleResult): string {
  let s = body;
  s = s.replace(
    /\{\{#if pass\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, a: string, b: string) => (rule.pass ? a : b),
  );
  s = s.replace(/\{\{name\}\}/g, rule.name);
  s = s.replace(/\{\{message\}\}/g, rule.message);
  return s;
}

export async function writeReport(
  templatePath: string,
  outputPath: string,
  report: CheckReport,
): Promise<void> {
  const template = await readFile(templatePath, 'utf8');
  await writeFile(outputPath, renderTemplate(template, report));
}
