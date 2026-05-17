import { describe, expect, test } from 'bun:test';
import { renderTemplate } from '../../actions/check/report';
import type { CheckReport } from '../../actions/check/types';

const TEMPLATE = `{{#if allPassed}}
## ✅ Ready to merge

All checks passed.
{{else}}
## ❌ Checks failed

See the rule list below for what needs fixing. After pushing fixes, apply the **Check** label to re-run.
{{/if}}

### Diff
{{diffSummary}}

### Rules
{{#each rules}}
- {{#if pass}}✅{{else}}❌{{/if}} **{{name}}** — {{message}}
{{/each}}

<!-- check-result -->
`;

describe('renderTemplate', () => {
  test('renders the passing variant when allPassed is true', () => {
    const report: CheckReport = {
      allPassed: true,
      diffSummary: '- **plugins.txt** +`a/b`',
      rules: [
        { name: 'r1', pass: true, message: 'ok' },
        { name: 'r2', pass: true, message: 'ok' },
      ],
    };
    const out = renderTemplate(TEMPLATE, report);
    expect(out).toContain('## ✅ Ready to merge');
    expect(out).not.toContain('## ❌ Checks failed');
    expect(out).toContain('- ✅ **r1** — ok');
    expect(out).toContain('- ✅ **r2** — ok');
    expect(out).toContain('- **plugins.txt** +`a/b`');
  });

  test('renders the failing variant when allPassed is false and marks failing rules', () => {
    const report: CheckReport = {
      allPassed: false,
      diffSummary: '_(no entries added or removed)_',
      rules: [
        { name: 'good', pass: true, message: 'fine' },
        { name: 'bad', pass: false, message: 'broken' },
      ],
    };
    const out = renderTemplate(TEMPLATE, report);
    expect(out).toContain('## ❌ Checks failed');
    expect(out).not.toContain('## ✅ Ready to merge');
    expect(out).toContain('- ✅ **good** — fine');
    expect(out).toContain('- ❌ **bad** — broken');
  });

  test('renders empty rules block when there are no rules', () => {
    const report: CheckReport = {
      allPassed: true,
      diffSummary: '_(no entries added or removed)_',
      rules: [],
    };
    const out = renderTemplate(TEMPLATE, report);
    expect(out).toContain('### Rules\n\n');
  });
});
